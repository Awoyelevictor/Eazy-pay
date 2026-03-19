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
  PieChart as PieChartIcon,
  Loader2,
  RefreshCcw,
  LayoutDashboard,
  BellRing
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser } from '@/firebase';
import { getGlobalStats, broadcastGlobalNotification } from '@/services/admin-service';
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
  Pie,
  AreaChart,
  Area
} from 'recharts';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  
  // AI Assistant State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchStats = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const data = await getGlobalStats(db);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [db]);

  const handleBroadcast = async () => {
    if (!db || !broadcastMsg || !user) return;
    setBroadcasting(true);
    try {
      await broadcastGlobalNotification(db, broadcastMsg, user.displayName || 'Owner');
      toast({ title: "Broadcast Sent", description: "All users have been notified via AI message." });
      setBroadcastMsg('');
    } catch (e) {
      toast({ title: "Broadcast Failed", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !stats) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setAiLoading(true);

    try {
      const result = await adminAssistant({
        message: userMsg.text,
        appContext: {
          userCount: stats.userCount,
          transactionCount: stats.transactionCount,
          totalVolume: stats.totalVolume,
          activeBalance: stats.activeBalance,
          successRate: stats.successRate,
        }
      });
      setChatMessages(prev => [...prev, { role: 'model', text: result.response }]);
    } catch (e) {
      toast({ title: "Assistant Error", description: "The P.A. is resting. Try again later.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    // Group transactions by type for pie chart
    const groups: Record<string, number> = {};
    stats.transactions.forEach((t: any) => {
      groups[t.type] = (groups[t.type] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary h-12 w-12" />
      <p className="font-black text-xs uppercase tracking-[0.3em] opacity-50">Initializing Admin OS</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center">
              <ShieldAlert className="text-white h-4 w-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Command Center</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900">App Analytics</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={fetchStats}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Sync Data
          </Button>
          <Button className="rounded-xl shadow-lg">
            <LayoutDashboard className="mr-2 h-4 w-4" /> Reports
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Users', value: stats.userCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Transactions', value: stats.transactionCount, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Volume', value: `₦${stats.totalVolume.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Success Rate', value: stats.successRate, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item) => (
          <Card key={item.label} className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                <item.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{item.label}</p>
                <p className="text-2xl font-black text-slate-900">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black">Service Distribution</CardTitle>
            <CardDescription>Breakdown of top-ups by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-xl font-black">Live Broadcast</CardTitle>
            <CardDescription className="text-slate-400">Notify all users instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Announcement Description</label>
              <textarea 
                className="w-full bg-slate-800 border-none rounded-2xl p-4 text-sm h-32 focus:ring-2 ring-primary resize-none placeholder:text-slate-600"
                placeholder="e.g. System maintenance scheduled for Sunday midnight..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
              />
            </div>
            <Button 
              className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90" 
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastMsg}
            >
              {broadcasting ? <Loader2 className="animate-spin" /> : <><BellRing className="mr-2" /> Blast to All</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm rounded-[2.5rem] flex flex-col h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <MessageSquare className="text-primary" /> Fyre Assistant
              </CardTitle>
              <CardDescription>Your Admin Personal Assistant</CardDescription>
            </div>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 px-6 mb-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-10">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity size={32} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400">"Ask me what's up with the app status!"</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none">
                  <Loader2 className="animate-spin h-4 w-4 text-primary" />
                </div>
              </div>
            )}
          </CardContent>
          <div className="p-6 pt-0 border-t mt-auto bg-white rounded-b-[2.5rem]">
            <form onSubmit={handleChat} className="relative">
              <Input 
                placeholder="Talk to your assistant..."
                className="h-14 pr-14 bg-slate-50 border-none rounded-xl font-medium"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-2 top-2 h-10 w-10 rounded-lg"
                disabled={aiLoading}
              >
                <Send size={18} />
              </Button>
            </form>
          </div>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black">Active Users</CardTitle>
              <CardDescription>Top users by wallet balance</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full"><Search size={20} /></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.users.sort((a:any, b:any) => (b.balance || 0) - (a.balance || 0)).slice(0, 6).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-black text-primary shadow-sm border border-slate-100">
                      {u.displayName?.charAt(0) || u.email?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{u.displayName || 'Guest User'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">₦{u.balance?.toLocaleString()}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">Balance</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
