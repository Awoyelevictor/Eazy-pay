
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  MessageSquare, 
  Sparkles, 
  TrendingUp, 
  AlertCircle,
  Activity,
  Zap,
  Loader2,
  Minimize2,
  Maximize2,
  Terminal,
  Brain,
  Volume2,
  VolumeX,
  Camera, 
  Eye, 
  UserCheck,
  Mic,
  MicOff,
  Move
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminAssistant } from '@/ai/flows/admin-assistant-flow';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'model';
  text: string;
  isBriefing?: boolean;
}

interface AdminAIAssistantProps {
  stats: any;
  onStatsRefresh: () => void;
}

// Vector Robot Style Eyes
const VectorEyes = ({ active }: { active: boolean }) => (
  <div className="flex gap-4 items-center justify-center p-2 relative">
    <div className={`h-12 w-16 bg-cyan-400 rounded-[1.5rem] shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-300 ${active ? 'animate-pulse scale-y-100' : 'scale-y-[0.1] opacity-50'}`} />
    <div className={`h-12 w-16 bg-cyan-400 rounded-[1.5rem] shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-300 ${active ? 'animate-pulse scale-y-100 delay-75' : 'scale-y-[0.1] opacity-50'}`} />
  </div>
);

// Vector Robotic Mouth (Smooth Wave)
const VectorMouth = ({ active }: { active: boolean }) => (
  <div className="h-4 flex items-center justify-center gap-1 mt-2">
    {[...Array(5)].map((_, i) => (
      <div 
        key={i} 
        className={`w-1.5 bg-cyan-400 rounded-full transition-all duration-200 shadow-[0_0_10px_rgba(34,211,238,0.5)] ${active ? 'animate-pulse h-4' : 'h-1.5 opacity-30'}`}
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
);

export default function AdminAIAssistant({ stats, onStatsRefresh }: AdminAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVisionEnabled, setIsVisionEnabled] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 }); // Offset from bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const speak = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~]/g, '').replace(/₦/g, 'Naira');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.onstart = () => setIsTalking(true);
    utterance.onend = () => setIsTalking(false);
    utterance.onerror = () => setIsTalking(false);

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Natural') ||
      v.name.includes('English (United Kingdom)')
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // STT: Microphone Listening Logic
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Mic Error", description: "Browser does not support Speech Recognition.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setInputValue(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Dragging Logic
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMinimized) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = dragStartPos.current.x - e.clientX;
      const dy = dragStartPos.current.y - e.clientY;
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startVision = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsVisionEnabled(true);
      
      // Proactive Speak: Remy sees you!
      const greeting = "Boss, I see you! Remy is online and ready to manage the business.";
      setMessages(prev => [...prev, { role: 'model', text: greeting }]);
      speak(greeting);
    } catch (e) {
      toast({ title: "Vision Failed", description: "Camera access denied or unavailable.", variant: "destructive" });
    }
  };

  const stopVision = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsVisionEnabled(false);
  };

  const handleSendMessage = async (msgText: string, isAuto?: boolean) => {
    if (!msgText.trim()) return;
    if (!isAuto) setMessages(prev => [...prev, { role: 'user', text: msgText }]);
    setInputValue('');
    setLoading(true);

    try {
      const result = await adminAssistant({
        message: msgText,
        appContext: {
          userCount: stats?.userCount || 0,
          transactionCount: stats?.transactionCount || 0,
          totalVolume: stats?.totalVolume || 0,
          activeBalance: stats?.activeBalance || 0,
          successRate: stats?.successRate || '100%',
        }
      });

      setMessages(prev => [...prev, { role: 'model', text: result.response }]);
      speak(result.response);
      
      if (result.response.toLowerCase().includes('successfully updated') || 
          result.response.toLowerCase().includes('broadcast completed') ||
          result.response.toLowerCase().includes('notification sent')) {
        onStatsRefresh();
      }
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) {
        const quotaMsg = "Boss, I've used up my thinking quota for the moment. My processors need a few minutes to cool down before I can analyze more data.";
        setMessages(prev => [...prev, { role: 'model', text: quotaMsg }]);
        speak(quotaMsg);
      } else {
        toast({ title: "Remy Sync Error", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleSendMessage("Hello Boss, I'm Remy. Please briefing me on the business stats.", true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 h-20 w-20 rounded-[2rem] shadow-2xl animate-bounce hover:animate-none bg-slate-900 border-4 border-cyan-400/50 text-white z-[100] group flex flex-col items-center justify-center gap-1"
        style={{ bottom: position.y, right: position.x }}
      >
        <div className="flex gap-1">
          <div className="h-1.5 w-3 bg-cyan-400 rounded-full animate-pulse" />
          <div className="h-1.5 w-3 bg-cyan-400 rounded-full animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-tighter">Remy</span>
      </Button>
    );
  }

  return (
    <Card 
      className={`fixed border-2 border-cyan-400/20 shadow-[-20px_20px_60px_rgba(0,0,0,0.4)] rounded-[2.5rem] bg-slate-900/95 backdrop-blur-xl text-white z-[120] flex flex-col transition-shadow duration-500 overflow-hidden ${isMinimized ? 'w-80 h-auto' : 'w-[450px] h-[750px]'} ${isDragging ? 'cursor-grabbing opacity-90' : ''}`}
      style={{ bottom: position.y, right: position.x }}
    >
      <CardHeader 
        onMouseDown={handleDragStart}
        className="bg-slate-900/50 border-b border-white/5 flex flex-row items-center justify-between p-6 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-400/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
             <Move size={20} className={isDragging ? 'animate-spin' : ''} />
          </div>
          <div>
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              Remy
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Interactive Biometric Sync</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); isVisionEnabled ? stopVision() : startVision(); }} 
            className={`p-2 rounded-xl transition-all ${isVisionEnabled ? 'bg-cyan-400/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'hover:bg-white/10 text-slate-400'}`}
            title={isVisionEnabled ? "Disable Vision" : "Enable Vision"}
          >
             {isVisionEnabled ? <Eye size={18} /> : <Camera size={18} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsVoiceEnabled(!isVoiceEnabled); }} 
            className={`p-2 rounded-xl transition-all ${isVoiceEnabled ? 'bg-cyan-400/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'hover:bg-white/10 text-slate-400'}`}
          >
             {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
             {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <>
          <div className="bg-slate-950/80 p-8 border-b border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1)_0%,transparent_70%)]" />
            
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              className={`absolute top-4 right-4 w-24 h-24 rounded-2xl object-cover border-2 border-cyan-400/50 grayscale opacity-40 transition-all duration-500 ${isVisionEnabled ? 'scale-100' : 'scale-0'}`}
            />

            <div className="flex flex-col items-center">
              <VectorEyes active={loading || isVisionEnabled || isTalking} />
              <VectorMouth active={isTalking} />
            </div>
            
            {(isVisionEnabled || isListening) && (
              <div className="mt-2 flex items-center gap-2 text-cyan-400 animate-pulse">
                {isListening ? <Mic size={12} className="text-red-400" /> : <UserCheck size={12} />}
                <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${isListening ? 'text-red-400' : ''}`}>
                  {isListening ? 'Remy is Listening...' : 'Owner Recognized'}
                </span>
              </div>
            )}
          </div>

          <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <div className="text-center py-4 opacity-40">
              <Terminal size={14} className="inline mr-2" />
              <span className="text-[9px] font-black uppercase tracking-widest">Neural Link Synchronized...</span>
            </div>

            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-4 rounded-3xl ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{m.text}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing request...</span>
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-6 border-t border-white/5 bg-slate-900/50">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
               {[
                 { label: "Briefing", icon: Activity, q: "Boss, update me on the business." },
                 { label: "Refund Account", icon: Zap, q: "Refund account 'awoyeleemma1@gmail.com' with 1000 naira." },
                 { label: "Analysis", icon: TrendingUp, q: "Remy, look for any trends in today's sales." },
               ].map(btn => (
                 <button 
                  key={btn.label}
                  onClick={() => handleSendMessage(btn.q)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-cyan-400/20 border border-white/10 rounded-xl whitespace-nowrap text-[10px] font-bold transition-all"
                 >
                   <btn.icon size={12} className="text-cyan-400" /> {btn.label}
                 </button>
               ))}
            </div>
            <div className="relative group">
              <Input 
                placeholder={isListening ? "Listening..." : "Talk to Remy..."}
                className={`h-16 pl-6 pr-24 rounded-2xl bg-white/5 border-white/10 focus:ring-cyan-400 text-white text-lg transition-all ${isListening ? 'ring-2 ring-red-400/50 bg-red-400/5' : ''}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              />
              <div className="absolute right-2 top-2 flex gap-2">
                <Button 
                  onClick={isListening ? stopListening : startListening}
                  variant="ghost"
                  size="icon" 
                  className={`h-12 w-12 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-slate-400'}`}
                >
                  {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                </Button>
                <Button 
                  onClick={() => handleSendMessage(inputValue)}
                  size="icon" 
                  className={`h-12 w-12 rounded-xl bg-cyan-400 text-slate-900 hover:bg-cyan-300 shadow-lg shadow-cyan-400/20`}
                  disabled={loading || !inputValue.trim()}
                >
                  <Send size={20} />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
