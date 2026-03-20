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
  SearchCode,
  Zap,
  CheckCircle2
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
  
  // Direct Lookup State
  const [directEmail, setDirectEmail] = useState('');
  const [directUser, setDirectUser] = useState<any>(null);
  const [searchingDirect, setSearchingDirect] = useState(false);

  // Emergency Repair State for awoyeleemma1@gmail.com
  const [repairingSpecific, setRepairingSpecific] = useState(false);
  const [specificUserFound, setSpecificUserFound] = useState<any>(null);

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
      setError("Standard listing is restricted. Use the 'Direct Search' tool below to find users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Check for the specific user requested
    if (db) {
      findUserByEmail(db, 'awoyeleemma1@gmail.com').then(found => {
        if (found) setSpecificUserFound(found);
      });
    }
  }, [db]);

  const handleDirectSearch = async () => {
    if (!db || !directEmail) return;
    setSearchingDirect(true);
    setDirectUser(null);
    try {
      const found = await findUserByEmail(db, directEmail.trim());
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

  const handleRepairUser = async (targetUser: any) => {
    if (!db || !targetUser) return;
    setRepairingSpecific(true);
    try {
      // Find the user first to get current balance
      const current = await findUserByEmail(db, targetUser.email);
      if (current) {
         // Ask for amount via prompt as an emergency tool
         const amount = prompt(`Enter amount to ADD to ${targetUser.email}'s wallet:`, "1000");
         if (amount) {
            const newBal = (Number(current.balance) || 0) + parseFloat(amount);
            await adminUpdateUserBalance(db, current.id, newBal, `Emergency Recovery: Refund for funding`);
            toast({ title: "User Repaired", description: `Added ₦${amount} to ${targetUser.email}` });
            fetchStats();
            if (directUser?.email === targetUser.email) setDirectUser({...directUser, balance: newBal});
         }
      }
    } catch (e: any) {
      toast({ title: "Repair Failed", description: e.message, variant: "destructive" });
    } finally {
      setRepairingSpecific(false);
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-primary h-12 w-12" />
      <p className="font-black text-[10px] uppercase tracking-widest opacity-40">Connecting to Server...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="text-primary h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Master Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900">App Analysis</h1>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={fetchStats}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Sync Data
        </Button>
      </header>

      {/* Emergency Alert for Specific User Request */}
      {specificUserFound && (
        <Alert className="mb-8 border-primary bg-primary/5 rounded-[2rem] animate-in slide-in-from-top-4">
          <Zap className="h-5 w-5 text-primary" />
          <AlertTitle className="font-black">Special Case Detected</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 mt-2">
            <span className="text-xs">User <b>{specificUserFound.email}</b> is in the database with balance ₦{specificUserFound.balance}.</span>
            <Button size="sm" className="rounded-xl font-black text-[10px] uppercase" onClick={() => handleRepairUser(specificUserFound)} disabled={repairingSpecific}>
              {repairingSpecific ? <Loader2 className="animate-spin" /> : "Repair Balance Now"}
            </Button>
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
          <TabsTrigger value="search" className="rounded-xl h-12 px-6 font-bold">Direct Lookup</TabsTrigger>
          <TabsTrigger value="directory" className="rounded-xl h-12 px-6 font-bold">Full Directory</TabsTrigger>
          <TabsTrigger value="broadcast" className="rounded-xl h-12 px-6 font-bold">Global Message</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-black">Find Any User</CardTitle>
              <CardDescription>Enter an exact email to pull their record directly from the server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input 
                  placeholder="name@example.com" 
                  className="h-14 rounded-2xl bg-slate-50 border-none text-lg"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                />
                <Button className="h-14 px-8 rounded-2xl font-black" onClick={handleDirectSearch} disabled={searchingDirect}>
                  {searchingDirect ? <Loader2 className="animate-spin" /> : <><SearchCode className="mr-2" /> Find Account</>}
                </Button>
              </div>

              {directUser && (
                <div className="p-8 bg-slate-900 text-white rounded-[2rem] flex items-center justify-between animate-in zoom-in-95">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Database Record</p>
                    <p className="text-2xl font-bold">{directUser.email}</p>
                    <p className="text-primary font-black text-3xl">₦{(Number(directUser.balance) || 0).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button 
                      className="h-12 rounded-xl px-6 bg-white text-slate-900 hover:bg-slate-100 font-black"
                      onClick={() => {
                        setEditingBalance({ id: directUser.id, email: directUser.email, current: Number(directUser.balance) || 0 });
                        setNewBalanceValue((Number(directUser.balance) || 0).toString());
                      }}
                    >
                      <ArrowUpDown className="mr-2" size={18} /> Edit Balance
                    </Button>
                    <Button variant="ghost" className="text-primary font-bold hover:bg-primary/10" onClick={() => handleRepairUser(directUser)}>
                      <Zap className="mr-2" size={18} /> Repair Account
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black">System Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="py-12 text-center text-slate-400 italic flex flex-col items-center gap-4">
                  <AlertCircle size={40} className="opacity-20" />
                  <p className="max-w-xs">{error}</p>
                  <Button variant="link" onClick={() => setDirectEmail('awoyeleemma1@gmail.com')}>Try searching for a user directly instead</Button>
                </div>
              )}
              {!error && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                      <tr>
                        <th className="pb-4">User Details</th>
                        <th className="pb-4">Balance</th>
                        <th className="pb-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(stats?.users || []).map((u: any) => (
                        <tr key={u.id}>
                          <td className="py-4">
                            <p className="font-bold text-sm">{u.email}</p>
                            <p className="text-[10px] text-slate-400 font-medium">UID: {u.id.substring(0,8)}...</p>
                          </td>
                          <td className="py-4 font-black text-primary">₦{(Number(u.balance) || 0).toLocaleString()}</td>
                          <td className="py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-lg h-10 font-black uppercase tracking-widest gap-2"
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
                      {(!stats?.users || stats.users.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-slate-400 italic">
                            Directory is empty. Use "Direct Lookup" for specific users.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
           <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-xl font-black">Global Announcement</CardTitle>
                <CardDescription className="text-slate-400">This will notify every registered user instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <textarea 
                  className="w-full bg-slate-800 border-none rounded-2xl p-6 text-lg h-40 focus:ring-2 ring-primary resize-none"
                  placeholder="Type your message here..."
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
