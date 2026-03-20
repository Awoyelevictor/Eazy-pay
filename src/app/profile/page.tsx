
"use client";

import { useState, useMemo } from "react";
import { 
  Settings, 
  User, 
  Shield, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  CheckCircle, 
  Loader2,
  Mail,
  Key,
  Edit2,
  Save,
  Lock,
  AlertCircle
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useAuth, useFirestore, useDoc } from "@/firebase";
import { signOut, updateProfile, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: "",
    phoneNumber: "",
    transactionPin: ""
  });
  const [isSaving, setIsEditingLoading] = useState(false);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  const handleEditInit = () => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || "",
        phoneNumber: profile.phoneNumber || "",
        transactionPin: profile.transactionPin || ""
      });
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !userRef) return;
    setIsEditingLoading(true);

    try {
      // 1. Update Auth Profile (Display Name)
      await updateProfile(user, {
        displayName: editData.displayName
      });

      // 2. Update Auth Password (PIN)
      // Note: Firebase updatePassword might require recent-login. 
      // If it fails, we still update Firestore but notify user.
      try {
        if (editData.transactionPin && editData.transactionPin.length >= 6) {
          await updatePassword(user, editData.transactionPin);
        }
      } catch (authError: any) {
        console.warn("Auth password update failed (likely needs recent login):", authError);
        if (authError.code === 'auth/requires-recent-login') {
          toast({ 
            title: "Security Update Needed", 
            description: "To change your PIN, please sign out and sign back in first.", 
            variant: "destructive" 
          });
          setIsEditingLoading(false);
          return;
        }
      }

      // 3. Update Firestore Doc
      await updateDoc(userRef, {
        displayName: editData.displayName,
        phoneNumber: editData.phoneNumber,
        transactionPin: editData.transactionPin
      });

      toast({ title: "Profile Updated", description: "Your changes have been saved successfully." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsEditingLoading(false);
    }
  };

  if (userLoading || profileLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="p-8 bg-primary text-primary-foreground rounded-b-[3rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <User size={180} />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-white/20 shadow-2xl">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={48} className="m-auto mt-4" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-accent text-accent-foreground h-7 w-7 rounded-full flex items-center justify-center border-2 border-primary">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black">{user.displayName || "User"}</h1>
            <p className="text-sm opacity-80">{user.email}</p>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              Secure Live Account
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        {/* Profile Actions */}
        <div className="flex justify-center">
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button onClick={handleEditInit} className="rounded-full gap-2 font-bold bg-secondary text-primary hover:bg-secondary/80 border-none px-8">
                <Edit2 size={16} /> Edit Profile & PIN
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Edit Profile</DialogTitle>
                <DialogDescription>Update your personal info and transaction security.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={editData.displayName} 
                    onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={editData.phoneNumber} 
                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Security PIN (Min 6 digits)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input 
                      type="password"
                      maxLength={6}
                      value={editData.transactionPin} 
                      onChange={(e) => setEditData({...editData, transactionPin: e.target.value.replace(/\D/g, '')})}
                      className="h-12 pl-10 rounded-xl font-bold tracking-[0.5em]"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground italic px-1">Note: This will also update your login password.</p>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black text-lg mt-4" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} className="mr-2" /> Save Changes</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Authentication Summary */}
        <section className="space-y-3">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Security Status</h2>
          <Card className="rounded-3xl border-none shadow-sm bg-secondary/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">Protection</p>
                    <p className="text-sm font-bold">PIN Secured</p>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-black uppercase">Active</div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Button 
          variant="destructive" 
          className="w-full h-16 rounded-3xl gap-2 font-black text-lg shadow-xl shadow-red-100 mt-4 transition-transform active:scale-95"
          onClick={handleSignOut}
        >
          <LogOut size={22} /> Sign Out
        </Button>

        <p className="text-center text-[10px] text-muted-foreground font-medium">
          Eazy-pay Secure Account<br/>
          Protected by Firebase Authentication
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
