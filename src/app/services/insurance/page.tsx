
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, ShieldCheck, FileText, Download, Car, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { processPayment, getVariations, getInsuranceOptions } from "@/app/actions/vtpass";

export default function InsurancePurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [certUrl, setCertUrl] = useState("");

  const [variations, setVariations] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [engineCapacities, setEngineCapacities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [lgas, setLgas] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [vData, cData, eData, sData, bData] = await Promise.all([
          getVariations("ui-insure"),
          getInsuranceOptions("color"),
          getInsuranceOptions("engine-capacity"),
          getInsuranceOptions("state"),
          getInsuranceOptions("brand")
        ]);

        setVariations(vData.content?.variations || []);
        setColors(cData.content || []);
        setEngineCapacities(eData.content || []);
        setStates(sData.content || []);
        setBrands(bData.content || []);
      } catch (error) {
        toast({ title: "Failed to load options", variant: "destructive" });
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!formData.state) return;
    getInsuranceOptions("lga", formData.state).then(d => setLgas(d.content || []));
  }, [formData.state]);

  useEffect(() => {
    if (!formData.vehicle_make) return;
    getInsuranceOptions("model", formData.vehicle_make).then(d => setModels(d.content || []));
  }, [formData.vehicle_make]);

  const selectedVariation = variations.find(v => v.variation_code === formData.variation_code);
  const totalAmount = selectedVariation ? parseFloat(selectedVariation.variation_amount) : 0;

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedVariation) return;
    if (profile && profile.balance < totalAmount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processPayment({
        request_id: Date.now().toString(),
        serviceID: "ui-insure",
        variation_code: formData.variation_code,
        billersCode: formData.plate_number,
        phone: formData.phone || "08000000000",
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
      });

      if (result.code !== '000') {
        throw new Error(result.response_description || "Registration failed");
      }

      setCertUrl(result.certUrl || "");
      await updateDoc(userRef, { balance: increment(-totalAmount) });
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        type: "insurance",
        amount: totalAmount,
        service: `Insurance (${selectedVariation.name})`,
        recipient: formData.plate_number,
        status: "success",
        createdAt: new Date().toISOString(),
      });
      setIsSuccess(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Policy Active!</h1>
        {certUrl && (
          <Link href={certUrl} target="_blank" className="w-full max-w-sm mb-8">
            <Button className="w-full h-14 rounded-2xl gap-2 font-bold shadow-lg"><Download size={20} /> Download Certificate</Button>
          </Link>
        )}
        <div className="w-full max-w-xs space-y-4">
          <Link href="/dashboard" className="block"><Button className="w-full rounded-2xl h-14">Go to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft size={24} /></Button></Link>
        <h1 className="text-xl font-black">Insurance</h1>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto pb-24">
        {loadingOptions ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div> : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest"><ShieldCheck size={18} /> Select Plan</div>
              <div className="grid grid-cols-2 gap-3">
                {variations.map((v) => (
                  <button
                    key={v.variation_code}
                    onClick={() => setFormData({ ...formData, variation_code: v.variation_code })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.variation_code === v.variation_code ? "bg-primary/5 border-primary" : "bg-white border-secondary"
                    }`}
                  >
                    <p className="font-bold text-sm">{v.name}</p>
                    <p className="text-primary font-black">₦{v.variation_amount}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest"><Car size={18} /> Vehicle Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Plate Number</Label>
                  <Input className="uppercase" value={formData.plate_number} onChange={e => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Chassis Number</Label>
                  <Input className="uppercase" value={formData.chasis_number} onChange={e => setFormData({ ...formData, chasis_number: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Make</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, vehicle_make: val })}><SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger><SelectContent>{brands.map(b => <SelectItem key={b.VehicleMakeCode} value={b.VehicleMakeCode}>{b.VehicleMakeName}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Model</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, vehicle_model: val })}><SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger><SelectContent>{models.map(m => <SelectItem key={m.VehicleModelCode} value={m.VehicleModelCode}>{m.VehicleModelName}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
            </section>

            <Button className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl" onClick={handlePurchase} disabled={isProcessing || !formData.variation_code || !formData.plate_number}>
              {isProcessing ? <Loader2 className="animate-spin" /> : `Pay ₦${totalAmount}`}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
