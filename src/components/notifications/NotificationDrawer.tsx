
'use client';

import { useMemo } from 'react';
import { Bell, CheckCircle2, Info, AlertTriangle, XCircle, Clock, CheckCheck } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function NotificationDrawer() {
  const { user } = useUser();
  const firestore = useFirestore();

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, user]);

  const { data: notifications, loading } = useCollection(notificationsQuery);

  const unreadCount = useMemo(() => {
    return notifications?.filter((n) => !n.read).length || 0;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, 'users', user.uid, 'notifications', id);
    updateDoc(ref, { read: true });
  };

  const markAllAsRead = async () => {
    if (!firestore || !user || !notifications) return;
    const batch = writeBatch(firestore);
    notifications.forEach((n) => {
      if (!n.read) {
        const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <XCircle className="text-red-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors relative">
          <Bell size={20} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 h-4 w-4 bg-red-500 text-[8px] text-white font-bold rounded-full border-2 border-background flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-black">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary" onClick={markAllAsRead}>
                <CheckCheck size={14} className="mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto opacity-20">
                <Bell size={32} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground/60">Your AI-powered alerts will appear here.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-5 flex gap-4 transition-colors hover:bg-secondary/20 cursor-pointer",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-bold", !n.read ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock size={10} /> {formatDistanceToNow(new Date(n.createdAt))} ago
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
