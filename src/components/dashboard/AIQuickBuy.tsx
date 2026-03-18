
"use client";

import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { quickPurchaseAssistant } from "@/ai/flows/quick-purchase-assistant";
import { useToast } from "@/hooks/use-toast";

export function AIQuickBuy() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const result = await quickPurchaseAssistant({ naturalLanguagePrompt: prompt });
      toast({
        title: "Assistant Ready",
        description: result.confirmationMessage,
      });
      setPrompt("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-accent bg-secondary/30 shadow-inner">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4 fill-primary" />
          Fyre AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePurchase} className="relative">
          <Input
            placeholder="e.g. N1000 MTN data for 080123..."
            className="pr-12 bg-background/80 border-accent/20 focus-visible:ring-accent"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute right-1 top-1 text-primary hover:text-accent"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 px-1">
          Try: "N500 Glo airtime" or "2GB data for my number"
        </p>
      </CardContent>
    </Card>
  );
}
