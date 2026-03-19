
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, ShieldCheck, FileText, Download, Car, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { VTU_CONFIG } from "@/firebase/config";

export default function InsurancePurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loadingOptions, setLoadingLoadingOptions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [certUrl, setCertUrl] = useState("");

  // API Data Options
  const [variations, setVariations] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [engineCapacities, setEngineCapacities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [lgas, setLgas] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    variation_code: "",
    insured_name: "",
    phone: "",
    email: "",
    chasis_number: "",
    plate_number: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    engine_capacity: "",
    year_of_make: new Date().getFullYear().toString(),
    state: "",
    lga: ""
  });

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  // Fetch Initial Options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const headers = {
          'api-key': VTU_CONFIG.API_KEY,
          'public-key': VTU_CONFIG.PUBLIC_KEY,
          'Content-Type': 'application/json'
        };

        const [vRes, cRes, eRes, sRes, bRes] = await Promise.all([
          fetch(`${VTU_CONFIG.BASE_URL}/service-variations?serviceID=ui-insure`, { headers }),
          fetch(`${VTU_CONFIG.BASE_URL}/universal-insurance/options/color`, { headers }),
          fetch(`${VTU_CONFIG.BASE_URL}/universal-insurance/options/engine-capacity`, { headers }),
          fetch(`${VTU_CONFIG.BASE_URL}/universal-insurance/options/state`, { headers }),
          fetch(`${VTU_CONFIG.BASE_URL}/universal-insurance/options/brand`, { headers })
        ]);

        const [vData, cData, eData, sData, bData] = await Promise.all([
          vRes.json(), cRes.json(), eRes.json(), sRes.json(), bRes.json()
        ]);

        setVariations(vData.content?.variations || []);
        setColors(cData.content || []);
        setEngineCapacities(eData.content || []);
        setStates(sData.content || []);
        setBrands(bData.content || []);
      } catch (error) {
        console.error("Failed to load insurance options", error);
      } finally {
        setLoadingLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  // Dependent Fetches: LGAs
  useEffect(() => {
    if (!formData.state) return;
    const fetchLgas = async () => {
      const res = await fetch(`${VTU_CONFIG.BASE_URL}/universal-insurance/options/lga/${formData.state}`, {
        headers: { 'api-key': VTU_CONFIG.API_KEY, 'public-key': VTU_CONFIG.PUBLIC_KEY }
      });
      const data = await res.json();
      setLgas(data.content || []);
    };
    fetchLgas();
  }, [formData.state]);

  // Dependent Fetches: Models
  useEffect(() => {
    if (!formData.vehicle_make) return;
    const fetchModels = async () => {
      const res = await fetch(`${VTU_CONFIG.BASE_URL}/universal-insurance/options/model/${formData.vehicle_make}`, {
        headers: { 'api-key': VTU_CONFIG.API_KEY, 'public-key': VTU_CONFIG.PUBLIC_KEY }
      });
      const data = await res.json();
      setModels(data.content || []);
    };
    fetchModels();
  }, [formData.vehicle_make]);

  const selectedVariation = variations.find(v => v.variation_code === formData.variation_code);
  const totalAmount = selectedVariation ? parseFloat(selectedVariation.variation_amount) : 0;

  const generateRequestId = () => {
    const now = new Date();
    const part1 = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const part2 = Math.random().toString(36).substring(2, 10);
    return part1 + part2;
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedVariation) return;

    if (profile && profile.balance < totalAmount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = generateRequestId();
      const payload = {
        request_id: requestId,
        serviceID: "ui-insure",
        variation_code: formData.variation_code,
        billersCode: formData.plate_number,
        phone: formData.phone || user.phoneNumber || "08000000000",
        Insured_Name: formData.insured_name,
        engine_capacity: formData.engine_capacity,
        Chasis_Number: formData.chasis_number,
        Plate_Number: formData.plate_number,
        vehicle_make: formData.vehicle_make,
        vehicle_color: formData.vehicle_color,
        vehicle_model: formData.vehicle_model,
        YearofMake: formData.year_of_make,
        state: formData.state,
        lga: formData.lga,
        email: formData.email || user.email
      };

      const response = await fetch(`${VTU_CONFIG.BASE_URL}/pay`, {
        method: 'POST',
        headers: {
          'api-key': VTU_CONFIG.API_KEY,
          'public-key': VTU_CONFIG.PUBLIC_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.code !== '000') {
        throw new Error(result.response_description || "Insurance Registration Failed");
      }

      setCertUrl(result.certUrl || "");

      const transactionData = {
        type: "insurance",
        amount: totalAmount,
        service: `Motor Insurance (${selectedVariation.name})`,
        recipient: formData.plate_number,
        status: "success",
        requestId: requestId,
        certUrl: result.certUrl || null,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(userRef, { balance: increment(-totalAmount) });
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);
      
      setIsSuccess(true);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to process insurance.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Insurance Active!</h1>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
          Your policy for <span className="font-bold text-foreground">{formData.plate_number}</span> is now active.
        </p>

        {certUrl && (
          <Card className="w-full max-w-sm border-2 border-primary/20 bg-primary/5 rounded-3xl mb-8 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <FileText size={16} /> Digital Certificate
              </div>
              <Link href={certUrl} target="_blank">
                <Button className="w-full h-14 rounded-2xl gap-2 font-bold shadow-lg">
                  <Download size={20} /> Download Certificate
                </Button>
              </Link>
              <p className="text-[10px] text-muted-foreground italic">You can also find this link in your transaction history.</p>
            </CardContent>
          </Card>
        )}

        <div className="w-full max-w-xs space-y-4">
          <Button variant="outline" className="w-full rounded-2xl h-14 text-lg font-bold border-secondary" onClick={() => window.location.reload()}>
            New Registration
          </Button>
          <Link href="/dashboard" className="block">
            <Button className="w-full rounded-2xl h-14 text-lg font-bold">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <h1 className="text-xl font-black">Motor Insurance</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-2xl mx-auto pb-24">
        {loadingOptions ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary h-10 w-10" />
            <p className="text-sm font-bold text-muted-foreground">Loading Insurance Options...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Section 1: Plan */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest">1. Select Policy Type</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {variations.map((v) => (
                  <button
                    key={v.variation_code}
                    onClick={() => setFormData({ ...formData, variation_code: v.variation_code })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.variation_code === v.variation_code ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-secondary grayscale opacity-70"
                    }`}
                  >
                    <p className="font-bold text-sm">{v.name}</p>
                    <p className="text-primary font-black">₦{parseFloat(v.variation_amount).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Section 2: Vehicle */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Car size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest">2. Vehicle Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Vehicle Make</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, vehicle_make: val, vehicle_model: "" })} value={formData.vehicle_make}>
                    <SelectTrigger className="h-12 rounded-xl border-secondary">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(b => <SelectItem key={b.VehicleMakeCode} value={b.VehicleMakeCode}>{b.VehicleMakeName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Vehicle Model</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, vehicle_model: val })} value={formData.vehicle_model} disabled={!formData.vehicle_make}>
                    <SelectTrigger className="h-12 rounded-xl border-secondary">
                      <SelectValue placeholder={formData.vehicle_make ? "Select Model" : "Select Brand First"} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(m => <SelectItem key={m.VehicleModelCode} value={m.VehicleModelCode}>{m.VehicleModelName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Vehicle Color</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, vehicle_color: val })} value={formData.vehicle_color}>
                    <SelectTrigger className="h-12 rounded-xl border-secondary">
                      <SelectValue placeholder="Select Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map(c => <SelectItem key={c.ColourCode} value={c.ColourCode}>{c.ColourName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Engine Capacity</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, engine_capacity: val })} value={formData.engine_capacity}>
                    <SelectTrigger className="h-12 rounded-xl border-secondary">
                      <SelectValue placeholder="Select CC" />
                    </SelectTrigger>
                    <SelectContent>
                      {engineCapacities.map(e => <SelectItem key={e.CapacityCode} value={e.CapacityCode}>{e.CapacityName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Plate Number</Label>
                  <Input placeholder="e.g. ATU480ER" className="h-12 rounded-xl border-secondary font-bold uppercase" value={formData.plate_number} onChange={e => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Chassis Number</Label>
                  <Input placeholder="17-character VIN" className="h-12 rounded-xl border-secondary font-bold uppercase" value={formData.chasis_number} onChange={e => setFormData({ ...formData, chasis_number: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Year of Make</Label>
                  <Input type="number" className="h-12 rounded-xl border-secondary font-bold" value={formData.year_of_make} onChange={e => setFormData({ ...formData, year_of_make: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Section 3: Owner */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <User size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest">3. Owner Details</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Full Name (Insured)</Label>
                  <Input placeholder="John Doe" className="h-12 rounded-xl border-secondary font-bold" value={formData.insured_name} onChange={e => setFormData({ ...formData, insured_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">State</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, state: val, lga: "" })} value={formData.state}>
                      <SelectTrigger className="h-12 rounded-xl border-secondary">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(s => <SelectItem key={s.StateCode} value={s.StateCode}>{s.StateName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">LGA</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, lga: val })} value={formData.lga} disabled={!formData.state}>
                      <SelectTrigger className="h-12 rounded-xl border-secondary">
                        <SelectValue placeholder={formData.state ? "Select LGA" : "Select State First"} />
                      </SelectTrigger>
                      <SelectContent>
                        {lgas.map(l => <SelectItem key={l.LGACode} value={l.LGACode}>{l.LGAName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <Card className="bg-primary/5 border-none rounded-[2rem]">
              <CardContent className="p-6 flex gap-4 text-primary items-center">
                <Info size={24} className="flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Policy Price: <span className="font-black text-lg">₦{totalAmount.toLocaleString()}</span></p>
                  <p className="text-[10px] opacity-70">Wallet Balance: ₦{profile?.balance?.toLocaleString() || "0.00"}</p>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50" 
              onClick={handlePurchase}
              disabled={isProcessing || !formData.variation_code || !formData.plate_number || !formData.insured_name}
            >
              {isProcessing ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" /> Registering Policy...
                </div>
              ) : `Pay ₦${totalAmount.toLocaleString()}`}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
