
'use server';

// import { SMEPLUG_CONFIG } from "@/firebase/config";

/**
 * Generic SMEPlug requester to handle server-side calls with Bearer Token.
 */
async function smeplugFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  const secretKey = process.env.SMEPLUG_SECRET_KEY; // || SMEPLUG_CONFIG.SECRET_KEY;
  
  const headers: any = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const url = `https://smeplug.ng/api/v1${endpoint}`; // `${SMEPLUG_CONFIG.BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`SMEPLUG REQUEST [${method}] ${endpoint}`, body ? JSON.stringify(body) : '');
    
    const response = await fetch(url, options);
    const text = await response.text();
    
    // Try to parse as JSON regardless of status
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`SMEPLUG RESPONSE [${response.status}] ${endpoint}:`, JSON.stringify(data).slice(0, 400));

    if (!response.ok) {
      // Surface the real error message from SMEPlug
      const msg = data?.msg || data?.message || data?.error || data?.description || `SMEPlug Error ${response.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (error: any) {
    console.error(`SMEPlug Connection Failure (${endpoint}):`, error.message);
    throw new Error(error.message || "Could not connect to SMEPlug");
  }
}

/**
 * Purchase Airtime via SMEPlug.
 */
export async function processSMEPlugAirtime(payload: {
  network_id: number | string; // Could be 1,2,3,4 OR 'T1','T2','T3','T4'
  amount: number;
  phone_number: string;
}) {
  // Documentation shows /vtu for airtime/topup
  return await smeplugFetch('/vtu', 'POST', payload);
}

/**
 * Purchase Data via SMEPlug.
 */
export async function processSMEPlugData(payload: {
  network_id: number | string;
  plan_id: number | string;
  phone_number: string;
  customer_reference?: string;
}) {
  // Documentation shows /data for data purchase
  return await smeplugFetch('/data', 'POST', payload);
}

/**
 * Get Data Plans from SMEPlug.
 */
export async function getSMEPlugDataPlans() {
  return await smeplugFetch('/data/plans', 'GET');
}

/**
 * Get available Networks from SMEPlug (returns real network IDs).
 */
export async function getSMEPlugNetworks() {
  return await smeplugFetch('/networks', 'GET');
}

/**
 * Get Wallet Balance from SMEPlug.
 */
export async function getSMEPlugBalance() {
  return await smeplugFetch('/wallet/balance', 'GET');
}

/**
 * Verify a merchant/customer (e.g. Electricity Meter or Cable TV SmartCard)
 */
export async function verifySMEPlugMerchant(payload: { 
  customer_id: string; 
  service_id: string; // e.g., 'dstv', 'gotv', 'ikeja-electric'
  variation_id?: string;
}) {
  return await smeplugFetch('/bill-payment/verify', 'POST', payload);
}

/**
 * Purchase TV Subscription via SMEPlug.
 */
export async function processSMEPlugTV(payload: {
  service_id: string;
  variation_id: string;
  customer_id: string;
}) {
  return await smeplugFetch('/bill-payment/tv/purchase', 'POST', payload);
}

/**
 * Purchase Electricity via SMEPlug.
 */
export async function processSMEPlugElectricity(payload: {
  service_id: string;
  variation_id: string; // 'prepaid' or 'postpaid'
  customer_id: string;
  amount: number;
}) {
  return await smeplugFetch('/bill-payment/electricity/purchase', 'POST', payload);
}

