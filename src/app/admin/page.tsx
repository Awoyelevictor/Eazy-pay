
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  ShieldAlert, 
  Send, 
  MessageSquare, 
  Search, 
  TrendingUp, 
  Loader2,
  RefreshCcw,
  BellRing,
  AlertCircle,
  PieChart as PieIcon,
  CreditCard,
  UserCheck,
  ArrowUpDown,
  Wallet,
  ShieldX
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirestore, useUser } from '@/firebase';
import { getGlobalStats, broadcastGlobalNotification, adminUpdateUserBalance } from '@/services/admin-service';
import { adminAssistant } from '@/ai/flows/admin-assistant-flow';
import { useToast } from '@/hooks/use-toast';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  
  // Search & Balance Editor
  const [userSearch, setUserSearch] = useState('');
  const [editingBalance, setEditingBalance] = useState<{id: string, email: string, current: number} | null>(null);
  const [newBalanceValue, setNewBalanceValue] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // AI Assistant State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchStats = async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGlobalStats(db);
      setStats(data);
    } catch (e: any) {
      console.error("Dashboard Sync Error:", e);
      setError("Security Access Restricted. Ensure you have 'Admin' privileges and 'List' permissions enabled in Firestore Security Rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [db]);

  const handleManualAdjustment = async () => {
    if (!db || !editingBalance || !newBalanceValue) return;
    setAdjusting(true);
    try {
      await adminUpdateUserBalance(
        db, 
        editingBalance.id, 
        parseFloat(newBalanceValue), 
        "Manual Admin Correction"
      );
      toast({ title: "Balance Updated", description: `${editingBalance.email} is now at ₦${newBalanceValue}` });
      setEditingBalance(null);
      fetchStats();
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
      await broadcastGlobalNotification(db, broadcastMsg, user.displayName || 'Owner');
      toast({ title: "Broadcast Sent", description: "All users notified." });
      setBroadcastMsg('');
    } catch (e) {
      toast({ title: "Broadcast Failed", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!stats?.users) return [];
    return stats.users.filter((u: any) => {
      const email = u.email?.toLowerCase() || "";
      const name = u.displayName?.toLowerCase() || "";
      const search = userSearch.toLowerCase();
      return email.includes(search) || name.includes(search);
    });
  }, [stats, userSearch]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-primary h-12 w-12" />
      <p className="font-black text-[10px] uppercase tracking-widest opacity-40">Syncing Master Node...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-10">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="text-primary h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Master Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900">App Ecosystem</h1>
        </div>
        <Button variant="outline" className="rounded-xl bg-white shadow-sm" onClick={fetchStats}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Sync Live Data
        </Button>
      </header>

      {error && (
        <Alert variant="destructive" className="mb-8 rounded-[1.5rem] border-2 bg-red-50">
          <ShieldX className="h-5 w-5" />
          <AlertTitle className="font-black">Access Denied</AlertTitle>
          <AlertDescription className="text-xs font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.userCount || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Transactions', value: stats?.transactionCount || 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Balances', value: `₦${(stats?.activeBalance || 0).toLocaleString()}`, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Success Rate', value: stats?.successRate || '100%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item) => (
          <Card key={item.label} className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                <item.icon size={22} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                <p className="text-xl font-black text-slate-900">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="management" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border h-14">
          <TabsTrigger value="management" className="rounded-xl h-12 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">User Management</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl h-12 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Analytics</TabsTrigger>
          <TabsTrigger value="communications" className="rounded-xl h-12 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">User Directory</CardTitle>
                <CardDescription>Search, view balances, and manually credit wallets.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Search by email..." 
                  className="pl-10 h-10 rounded-xl bg-slate-50 border-none"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                    <tr>
                      <th className="pb-4">User Details</th>
                      <th className="pb-4">Balance</th>
                      <th className="pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-sm">{u.displayName || 'Unnamed User'}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </td>
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
                            <ArrowUpDown size={14} /> Adjust Balance
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-400 italic">
                          {userSearch ? `No users matching "${userSearch}"` : "Waiting for directory sync..."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {editingBalance && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Manual Credit</CardTitle>
                  <CardDescription>Adjusting balance for <span className="font-bold text-primary">{editingBalance.email}</span></CardDescription>
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
                      {adjusting ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-[2.5rem]">
              <CardHeader><CardTitle className="text-lg font-black">Service Distribution</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {stats?.transactions?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(stats.transactions.reduce((acc: any, t: any) => {
                      acc[t.type] = (acc[t.type] || 0) + 1;
                      return acc;
                    }, {})).map(([name, value]) => ({ name: name.toUpperCase(), value }))}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 italic">No activity yet.</div>}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2.5rem]">
              <CardHeader><CardTitle className="text-lg font-black">Success Ratio</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {stats?.transactions?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={Object.entries(stats.transactions.reduce((acc: any, t: any) => {
                          acc[t.status] = (acc[t.status] || 0) + 1;
                          return acc;
                        }, {})).map(([name, value]) => ({ name: name.toUpperCase(), value }))}
                        innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                         <Cell fill="#10b981" />
                         <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400 italic">No records.</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
           <Card className="border-none shadow-sm rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5"><BellRing size={200} /></div>
              <CardHeader>
                <CardTitle className="text-2xl font-black">Global Announcement</CardTitle>
                <CardDescription className="text-slate-400">Broadcast a message to all registered users instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <textarea 
                  className="w-full bg-slate-800 border-none rounded-2xl p-6 text-lg h-48 focus:ring-2 ring-primary resize-none placeholder:text-slate-600"
                  placeholder="e.g. System maintenance scheduled for 12AM..."
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
    </div>
  );
}
