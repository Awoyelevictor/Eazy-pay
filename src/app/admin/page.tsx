'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { getGlobalStats, adminUpdateUserBalance, broadcastGlobalNotification, findUserByEmail, getAccountingMetrics } from '@/services/admin-service';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAdminMessage, fixPaymentIssue, getAnalytics } from '@/app/actions/admin-ai';

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

  // AI Features State
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [messageReason, setMessageReason] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageType, setMessageType] = useState<'all' | 'specific'>('all');
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [paymentIssues, setPaymentIssues] = useState<any[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [autoFixLog, setAutoFixLog] = useState<any[]>([]);

  // Accounting Metrics State
  const [accounting, setAccounting] = useState<any>(null);
  const [loadingAccounting, setLoadingAccounting] = useState(false);

  // Fetch users for AI features - use useCallback to stabilize query creation
  const buildUsersQuery = useCallback(() => {
    if (!db) return null;
    return query(collection(db, 'users'), limit(1000));
  }, [db]);
  
  const usersQuery = useMemo(() => buildUsersQuery(), [buildUsersQuery]);
  const { data: allUsers } = useCollection(usersQuery);

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

  const fetchAccounting = async () => {
    if (!db) return;
    setLoadingAccounting(true);
    try {
      const data = await getAccountingMetrics(db);
      setAccounting(data);
    } catch (e: any) {
      console.error("Accounting Metrics Error:", e);
    } finally {
      setLoadingAccounting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAccounting();
    
    // Auto-check for the specific user requested
    if (db) {
      findUserByEmail(db, 'awoyeleemma1@gmail.com').then(found => {
        if (found) setSpecificUserFound(found);
      });
    }

    // Fetch AI Analytics
    const fetchAiAnalytics = async () => {
      try {
        const data = await getAnalytics();
        setAiAnalytics(data);
      } catch (error) {
        console.error('Analytics fetch error:', error);
      }
    };
    fetchAiAnalytics();
    const analyticsInterval = setInterval(fetchAiAnalytics, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(analyticsInterval);
  }, [db]);

  // Auto-detect payment issues
  useEffect(() => {
    const checkPaymentIssues = async () => {
      if (!db || !allUsers?.length) return;

      const issues: any[] = [];
      for (const userDoc of allUsers) {
        const userData = userDoc;
        if (userData?.lastFailedTransaction) {
          const failedTime = userData.lastFailedTransaction.seconds 
            ? new Date(userData.lastFailedTransaction.seconds * 1000)
            : new Date(userData.lastFailedTransaction);
          const hoursSince = (Date.now() - failedTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSince < 24) {
            issues.push({
              userId: userData.id,
              userName: userData.displayName || userData.email,
              issue: userData.lastFailedTransactionError,
              timestamp: failedTime,
              amount: userData.lastFailedTransactionAmount
            });
          }
        }
      }
      setPaymentIssues(issues);
    };

    checkPaymentIssues();
  }, [allUsers, db]);

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
      const amount = prompt(`Enter amount to ADD to ${targetUser.email}'s wallet:`, "1000");
      if (amount) {
        const currentBal = Number(targetUser.balance) || 0;
        const newBal = currentBal + parseFloat(amount);
        await adminUpdateUserBalance(db, targetUser.id, newBal, `Emergency Recovery: Refund for funding`);
        toast({ title: "User Repaired", description: `Added ₦${amount} to ${targetUser.email}` });
        fetchStats();
        if (directUser?.email === targetUser.email) setDirectUser({...directUser, balance: newBal});
        if (specificUserFound?.email === targetUser.email) setSpecificUserFound({...specificUserFound, balance: newBal});
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

  // AI Handler: Generate Message with Gemini
  const handleGenerateMessage = async () => {
    if (!messageReason) return;
    setIsGenerating(true);
    try {
      const message = await generateAdminMessage(messageReason, messageType);
      setGeneratedMessage(message);
    } catch (error) {
      toast({ title: "Generation Failed", description: "Could not generate message", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Handler: Send AI-Generated Message
  const handleSendAiMessage = async () => {
    if (!generatedMessage || !db) return;
    setIsSending(true);
    try {
      if (messageType === 'all') {
        await broadcastGlobalNotification(db, generatedMessage, 'AI Assistant');
      } else if (messageType === 'specific' && targetUserEmail) {
        const targetUser = await findUserByEmail(db, targetUserEmail);
        if (targetUser) {
          await broadcastGlobalNotification(db, generatedMessage, 'AI Assistant');
        } else {
          toast({ title: "User Not Found", variant: "destructive" });
        }
      }
      toast({ title: "Message Sent Successfully" });
      setGeneratedMessage('');
      setMessageReason('');
      setTargetUserEmail('');
    } catch (error) {
      toast({ title: "Send Failed", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // AI Handler: Auto-Fix Payment Issue
  const handleAutoFixPayment = async (issue: any) => {
    if (!db) return;
    setIsFixing(true);
    try {
      const result = await fixPaymentIssue(issue.userId);
      setAutoFixLog([...autoFixLog, { userId: issue.userId, result, timestamp: new Date() }]);
      toast({ title: "Payment Fixed", description: result.description });
      // Refresh payment issues
      const checkPaymentIssues = async () => {
        if (!allUsers?.length) return;
        const issues: any[] = [];
        for (const userDoc of allUsers) {
          const userData = userDoc;
          if (userData?.lastFailedTransaction) {
            const failedTime = userData.lastFailedTransaction.seconds 
              ? new Date(userData.lastFailedTransaction.seconds * 1000)
              : new Date(userData.lastFailedTransaction);
            const hoursSince = (Date.now() - failedTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursSince < 24) {
              issues.push({
                userId: userData.id,
                userName: userData.displayName || userData.email,
                issue: userData.lastFailedTransactionError,
                timestamp: failedTime,
                amount: userData.lastFailedTransactionAmount
              });
            }
          }
        }
        setPaymentIssues(issues);
      };
      checkPaymentIssues();
    } catch (error) {
      toast({ title: "Auto-Fix Failed", variant: "destructive" });
    } finally {
      setIsFixing(false);
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

      {/* Emergency Alert for awoyeleemma1@gmail.com */}
      {specificUserFound && (
        <Alert className="mb-8 border-primary bg-primary/5 rounded-[2rem] border-2 shadow-lg animate-in slide-in-from-top-4">
          <Zap className="h-6 w-6 text-primary" />
          <AlertTitle className="font-black text-lg">Special Action Required</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <span className="text-sm">User <b>{specificUserFound.email}</b> is active. Current Balance: <b>₦{specificUserFound.balance.toLocaleString()}</b></span>
            <Button size="sm" className="rounded-xl font-black text-xs uppercase px-6" onClick={() => handleRepairUser(specificUserFound)} disabled={repairingSpecific}>
              {repairingSpecific ? <Loader2 className="animate-spin" /> : "Refund This User Now"}
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
          <TabsTrigger value="ai-assistant" className="rounded-xl h-12 px-6 font-bold">🤖 AI Assistant</TabsTrigger>
          <TabsTrigger value="payment-issues" className="rounded-xl h-12 px-6 font-bold">⚠️ Payment Issues</TabsTrigger>
          <TabsTrigger value="broadcast" className="rounded-xl h-12 px-6 font-bold">Global Message</TabsTrigger>
          <TabsTrigger value="accounting" className="rounded-xl h-12 px-6 font-bold">💰 Accounting</TabsTrigger>
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
                      <Zap className="mr-2" size={18} /> Refund Wallet
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

        <TabsContent value="ai-assistant">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-black">🤖 AI Message Generator</CardTitle>
              <CardDescription>AI powered by Gemini - Generates professional messages automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Analytics Summary */}
              {aiAnalytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-blue-50 rounded-xl">
                  <div>
                    <p className="text-xs font-black text-slate-500">Total Users</p>
                    <p className="text-lg font-black text-blue-600">{aiAnalytics.totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500">Total Revenue</p>
                    <p className="text-lg font-black text-green-600">₦{aiAnalytics.totalRevenue?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500">Transactions</p>
                    <p className="text-lg font-black text-purple-600">{aiAnalytics.totalTransactions}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500">Success Rate</p>
                    <p className="text-lg font-black text-emerald-600">{aiAnalytics.successRate}%</p>
                  </div>
                </div>
              )}

              {/* Message Type Selection */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-slate-500">Message Type</p>
                <div className="flex gap-2">
                  <Button 
                    variant={messageType === 'all' ? 'default' : 'outline'}
                    className="rounded-xl font-bold"
                    onClick={() => { setMessageType('all'); setTargetUserEmail(''); }}
                  >
                    📢 Broadcast All
                  </Button>
                  <Button 
                    variant={messageType === 'specific' ? 'default' : 'outline'}
                    className="rounded-xl font-bold"
                    onClick={() => setMessageType('specific')}
                  >
                    👤 Specific User
                  </Button>
                </div>
              </div>

              {/* Target User (if specific) */}
              {messageType === 'specific' && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-slate-500">Target User Email</p>
                  <Input 
                    placeholder="user@example.com"
                    className="h-12 rounded-2xl bg-slate-50 border-none"
                    value={targetUserEmail}
                    onChange={(e) => setTargetUserEmail(e.target.value)}
                  />
                </div>
              )}

              {/* Reason Input */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-slate-500">Message Reason/Topic</p>
                <textarea 
                  placeholder="e.g., System maintenance, special offer, urgent announcement..."
                  className="w-full h-24 p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-primary resize-none"
                  value={messageReason}
                  onChange={(e) => setMessageReason(e.target.value)}
                />
              </div>

              {/* Generate Button */}
              <Button 
                className="w-full h-14 rounded-2xl font-black text-lg"
                onClick={handleGenerateMessage}
                disabled={isGenerating || !messageReason}
              >
                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : "✨ Generate Message"}
              </Button>

              {/* Generated Message */}
              {generatedMessage && (
                <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200 space-y-4">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-700 mb-2">Generated Message (Edit if needed)</p>
                    <textarea 
                      className="w-full h-24 p-4 rounded-2xl bg-white border-none focus:ring-2 ring-primary resize-none"
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSendAiMessage}
                    disabled={isSending}
                  >
                    {isSending ? <Loader2 className="animate-spin mr-2" /> : "📤 Send Message"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-issues">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-black">⚠️ Auto-Detected Payment Issues</CardTitle>
              <CardDescription>AI automatically detects and can fix failed transactions from the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {paymentIssues.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 size={40} className="mx-auto mb-4 opacity-40" />
                  <p className="font-black">All systems healthy! ✨</p>
                  <p className="text-sm">No payment issues detected in the last 24 hours.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentIssues.map((issue, idx) => (
                    <div key={idx} className="p-6 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <p className="font-bold text-slate-900">{issue.userName}</p>
                        <p className="text-sm text-slate-600">Error: {issue.issue}</p>
                        <p className="text-xs text-slate-500">Amount: ₦{issue.amount?.toLocaleString() || 0}</p>
                        <p className="text-xs text-slate-400">{issue.timestamp.toLocaleString()}</p>
                      </div>
                      <Button 
                        className="rounded-xl font-black bg-red-600 hover:bg-red-700"
                        onClick={() => handleAutoFixPayment(issue)}
                        disabled={isFixing}
                      >
                        {isFixing ? <Loader2 className="animate-spin" /> : "🔧 Auto-Fix"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-Fix Log */}
              {autoFixLog.length > 0 && (
                <div className="p-4 bg-slate-100 rounded-xl">
                  <p className="text-xs font-black uppercase text-slate-600 mb-3">Recent Fixes</p>
                  {autoFixLog.slice(-5).map((log, idx) => (
                    <p key={idx} className="text-xs text-slate-700 mb-1">
                      ✅ {log.userId} - {log.result.description}
                    </p>
                  ))}
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

        <TabsContent value="accounting">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-black">💰 Business Accounting</CardTitle>
              <CardDescription>Track your revenue, costs, and net profit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingAccounting ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : accounting ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <p className="text-[10px] font-black uppercase text-green-700 tracking-widest">Total Revenue</p>
                        <p className="text-3xl font-black text-green-900">₦{accounting.totalRevenue?.toLocaleString()}</p>
                        <p className="text-xs text-green-700">From user deposits</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-none rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <p className="text-[10px] font-black uppercase text-red-700 tracking-widest">Total Costs</p>
                        <p className="text-3xl font-black text-red-900">₦{accounting.totalCosts?.toLocaleString()}</p>
                        <p className="text-xs text-red-700">PeyFlex purchases</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <p className="text-[10px] font-black uppercase text-blue-700 tracking-widest">Net Profit</p>
                        <p className={`text-3xl font-black ${accounting.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                          ₦{accounting.netProfit?.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-700">Revenue - Costs</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none rounded-2xl">
                      <CardContent className="p-6 space-y-2">
                        <p className="text-[10px] font-black uppercase text-purple-700 tracking-widest">Profit Margin</p>
                        <p className="text-3xl font-black text-purple-900">{accounting.marginPercent}%</p>
                        <p className="text-xs text-purple-700">{accounting.transactionCount} transactions</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-slate-50 border-slate-200 rounded-2xl">
                    <AlertTitle className="font-black text-base">Money Flow Breakdown</AlertTitle>
                    <AlertDescription className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                        <span className="font-bold">💵 User Deposits (Revenue)</span>
                        <span className="font-black text-green-600">₦{accounting.totalRevenue?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                        <span className="font-bold">📤 PeyFlex Spending (Costs)</span>
                        <span className="font-black text-red-600">-₦{accounting.totalCosts?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                        <span className="font-black">Your Profit</span>
                        <span className="font-black text-lg text-green-700">₦{accounting.netProfit?.toLocaleString()}</span>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button className="w-full h-14 rounded-2xl font-black" onClick={fetchAccounting}>
                    <RefreshCcw className="mr-2" /> Refresh Metrics
                  </Button>
                </>
              ) : (
                <Alert className="bg-slate-50">
                  <AlertTitle>No Data Available</AlertTitle>
                  <AlertDescription>Click refresh to load accounting metrics.</AlertDescription>
                </Alert>
              )}
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
