'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  ShieldAlert, 
  Send, 
  Search, 
  TrendingUp, 
  Loader2,
  RefreshCcw,
  Wallet,
  ArrowUpDown,
  AlertCircle,
  ShieldX,
  SearchCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirestore, useUser } from '@/firebase';
import { getGlobalStats, adminUpdateUserBalance, broadcastGlobalNotification, findUserByEmail } from '@/services/admin-service';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  
  // Direct Lookup State (For bypassing 'list' permission issues)
  const [directEmail, setDirectEmail] = useState('');
  const [directUser, setDirectUser] = useState<any>(null);
  const [searchingDirect, setSearchingDirect] = useState(false);

  const [editingBalance, setEditingBalance] = useState<{id: string, email: string, current: number} | null>(null);
  const [newBalanceValue, setNewBalanceValue] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchStats = async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGlobalStats(db);
      setStats(data);
    } catch (e: any) {
      console.error("Dashboard Load Error:", e);
      setError("Permission Restricted. Use the 'Direct Email Search' below if the directory is empty.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [db]);

  const handleDirectSearch = async () => {
    if (!db || !directEmail) return;
    setSearchingDirect(true);
    setDirectUser(null);
    try {
      const found = await findUserByEmail(db, directEmail);
      if (found) {
        setDirectUser(found);
        toast({ title: "User Found", description: `Located ${found.email}` });
      } else {
        toast({ title: "Not Found", description: "No user matches that email exactly.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Search Error", description: e.message, variant: "destructive" });
    } finally {
      setSearchingDirect(false);
    }
  };

  const handleManualAdjustment = async () => {
    if (!db || !editingBalance || !newBalanceValue) return;
    setAdjusting(true);
    try {
      await adminUpdateUserBalance(db, editingBalance.id, parseFloat(newBalanceValue), "Admin Correction");
      toast({ title: "Balance Updated" });
      setEditingBalance(null);
      fetchStats();
      if (directUser && directUser.id === editingBalance.id) {
         setDirectUser({...directUser, balance: parseFloat(newBalanceValue)});
      }
    } catch (e) {
      toast({ title: "Update Failed", variant: "destructive" });
    } finally {
      setAdjusting(false);
    }
  };

  const handleBroadcast = async () => {
    if (!db || !broadcastMsg || !user) return;
    setBroadcasting(true);
    try {
      await broadcastGlobalNotification(db, broadcastMsg, user.displayName || 'Admin');
      toast({ title: "Broadcast Sent" });
      setBroadcastMsg('');
    } catch (e) {
      toast({ title: "Broadcast Failed", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!stats?.users) return [];
    return stats.users.filter((u: any) => u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  }, [stats, userSearch]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-primary h-12 w-12" />
      <p className="font-black text-[10px] uppercase tracking-widest opacity-40">Accessing Master Node...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="text-primary h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Admin Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900">App Management</h1>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={fetchStats}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Sync Stats
        </Button>
      </header>

      {error && (
        <Alert variant="destructive" className="mb-8 rounded-3xl border-2 bg-red-50">
          <ShieldX className="h-5 w-5" />
          <AlertTitle className="font-black">Restricted View</AlertTitle>
          <AlertDescription className="text-xs">
            {error} Use the <b>Direct User Search</b> below to find and credit specific users.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.userCount || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Transactions', value: stats?.transactionCount || 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'System Balance', value: `₦${(stats?.activeBalance || 0).toLocaleString()}`, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Success Rate', value: stats?.successRate || '100%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item) => (
          <Card key={item.label} className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                <p className="text-lg font-black text-slate-900">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border h-14">
          <TabsTrigger value="search" className="rounded-xl h-12 px-6 font-bold">Direct Search</TabsTrigger>
          <TabsTrigger value="directory" className="rounded-xl h-12 px-6 font-bold">Full Directory</TabsTrigger>
          <TabsTrigger value="broadcast" className="rounded-xl h-12 px-6 font-bold">Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-black">Direct User Lookup</CardTitle>
              <CardDescription>Bypass collection listing issues by searching for an exact email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input 
                  placeholder="user@example.com" 
                  className="h-14 rounded-2xl bg-slate-50 border-none text-lg"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                />
                <Button className="h-14 px-8 rounded-2xl font-black" onClick={handleDirectSearch} disabled={searchingDirect}>
                  {searchingDirect ? <Loader2 className="animate-spin" /> : <><SearchCode className="mr-2" /> Find User</>}
                </Button>
              </div>

              {directUser && (
                <div className="p-6 bg-slate-900 text-white rounded-[2rem] flex items-center justify-between animate-in zoom-in-95">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Found User</p>
                    <p className="text-xl font-bold">{directUser.email}</p>
                    <p className="text-primary font-black text-2xl">₦{(Number(directUser.balance) || 0).toLocaleString()}</p>
                  </div>
                  <Button 
                    className="h-14 rounded-2xl px-6 bg-white text-slate-900 hover:bg-slate-100 font-black"
                    onClick={() => {
                      setEditingBalance({ id: directUser.id, email: directUser.email, current: Number(directUser.balance) || 0 });
                      setNewBalanceValue((Number(directUser.balance) || 0).toString());
                    }}
                  >
                    <ArrowUpDown className="mr-2" size={20} /> Adjust Balance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black">System Directory</CardTitle>
              <Input 
                placeholder="Filter results..." 
                className="max-w-[200px] rounded-xl h-10"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                    <tr>
                      <th className="pb-4">Email</th>
                      <th className="pb-4">Balance</th>
                      <th className="pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id}>
                        <td className="py-4 font-bold text-sm">{u.email}</td>
                        <td className="py-4 font-black text-primary">₦{(Number(u.balance) || 0).toLocaleString()}</td>
                        <td className="py-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-lg h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                            onClick={() => {
                              setEditingBalance({ id: u.id, email: u.email, current: Number(u.balance) || 0 });
                              setNewBalanceValue((Number(u.balance) || 0).toString());
                            }}
                          >
                            <ArrowUpDown size={14} /> Adjust
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-400 italic">
                          No users detected in the directory sync.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
           <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-xl font-black">Global Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <textarea 
                  className="w-full bg-slate-800 border-none rounded-2xl p-6 text-lg h-40 focus:ring-2 ring-primary resize-none"
                  placeholder="Message for all users..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
                <Button 
                  className="w-full h-16 rounded-2xl font-black text-xl bg-primary hover:bg-primary/90" 
                  onClick={handleBroadcast}
                  disabled={broadcasting || !broadcastMsg}
                >
                  {broadcasting ? <Loader2 className="animate-spin" /> : "Blast Announcement"}
                </Button>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Balance Edit Modal */}
      {editingBalance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-2xl font-black">Manual Credit</CardTitle>
              <CardDescription>Setting balance for <span className="font-bold text-primary">{editingBalance.email}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Set New Balance (₦)</p>
                <Input 
                  type="number"
                  className="h-16 rounded-2xl text-2xl font-black bg-slate-50 border-none"
                  value={newBalanceValue}
                  onChange={(e) => setNewBalanceValue(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setEditingBalance(null)}>Cancel</Button>
                <Button className="h-14 rounded-2xl font-black" onClick={handleManualAdjustment} disabled={adjusting}>
                  {adjusting ? <Loader2 className="animate-spin" /> : "Apply Change"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
