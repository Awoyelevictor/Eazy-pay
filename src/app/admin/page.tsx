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
  LayoutDashboard,
  BellRing,
  AlertCircle,
  PieChart as PieIcon,
  AreaChart as AreaIcon
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
  const [error, setError] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  
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
      console.error(e);
      setError("Failed to fetch app statistics. Database may be busy.");
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
      toast({ title: "Broadcast Sent", description: "All users have been notified." });
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
    const currentInput = chatInput;
    setChatInput('');
    setAiLoading(true);

    try {
      const result = await adminAssistant({
        message: currentInput,
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
      toast({ title: "Assistant Error", description: "Check API availability.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const barChartData = useMemo(() => {
    if (!stats || !stats.transactions) return [];
    const groups: Record<string, number> = {};
    stats.transactions.forEach((t: any) => {
      const type = t.type || 'other';
      groups[type] = (groups[type] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [stats]);

  const pieChartData = useMemo(() => {
    if (!stats || !stats.transactions) return [];
    const statusMap: Record<string, number> = {};
    stats.transactions.forEach((t: any) => {
      const status = t.status || 'unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [stats]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-primary h-12 w-12" />
      <p className="font-black text-xs uppercase tracking-[0.3em] opacity-50">Syncing Admin OS...</p>
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
          <h1 className="text-4xl font-black text-slate-900">App Ecosystem</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={fetchStats}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </header>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Users', value: stats.userCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Events', value: stats.transactionCount, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Volume', value: `₦${stats.totalVolume.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Stability', value: stats.successRate, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item) => (
          <Card key={item.label} className="border-none shadow-sm rounded-3xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                <item.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                <p className="text-2xl font-black text-slate-900">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Service Bar Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2"><BarChart3 size={20} /> Service Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Success Pie */}
        <Card className="border-none shadow-sm rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2"><PieIcon size={20} /> Success Ratio</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'SUCCESS' ? '#10b981' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Admin Chat */}
        <Card className="border-none shadow-sm rounded-[2.5rem] flex flex-col h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <MessageSquare className="text-primary" /> Fyre P.A.
            </CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 px-6">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && <Loader2 className="animate-spin h-6 w-6 text-primary mx-auto" />}
          </CardContent>
          <div className="p-6 pt-0 border-t mt-auto bg-white rounded-b-[2.5rem]">
            <form onSubmit={handleChat} className="relative">
              <Input 
                placeholder="Ask me anything about the app..."
                className="h-14 pr-14 bg-slate-50 border-none rounded-xl"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <Button type="submit" size="icon" className="absolute right-2 top-2 h-10 w-10" disabled={aiLoading}>
                <Send size={18} />
              </Button>
            </form>
          </div>
        </Card>

        {/* Global Broadcast */}
        <Card className="border-none shadow-sm rounded-[2.5rem] bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2"><BellRing size={20} /> Global Broadcast</CardTitle>
            <CardDescription className="text-slate-400">Notify every user instantly using AI composition.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <textarea 
              className="w-full bg-slate-800 border-none rounded-2xl p-4 text-sm h-48 focus:ring-2 ring-primary resize-none placeholder:text-slate-600 text-white"
              placeholder="e.g. System maintenance at 2AM..."
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
      </div>
    </div>
  );
}
