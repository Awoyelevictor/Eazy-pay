
'use server';

import { SMEPLUG_CONFIG } from "@/firebase/config";

/**
 * Generic SMEPlug requester to handle server-side calls with Bearer Token.
 */
async function smeplugFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  const secretKey = process.env.SMEPLUG_SECRET_KEY || SMEPLUG_CONFIG.SECRET_KEY;
  
  const headers: any = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const url = `${SMEPLUG_CONFIG.BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`SMEPLUG REQUEST [${method}] ${endpoint}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SMEPLUG HTTP ERROR (${response.status}):`, errorText);
      throw new Error(`SMEPlug Gateway Error: ${response.status}`);
    }

    const data = await response.json();
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
  network_id: number; // 1=MTN, 2=Glo, 3=Airtel, 4=9mobile
  amount: number;
  phone_number: string;
}) {
  return await smeplugFetch('/airtime/purchase', 'POST', payload);
}

/**
 * Purchase Data via SMEPlug.
 */
export async function processSMEPlugData(payload: {
  network_id: number;
  plan_id: number | string;
  phone_number: string;
  customer_reference?: string;
}) {
  return await smeplugFetch('/data/purchase', 'POST', payload);
}

/**
 * Get Data Plans from SMEPlug.
 */
export async function getSMEPlugDataPlans() {
  return await smeplugFetch('/data/plans', 'GET');
}

/**
 * Helper to get Network ID from Name
 */
export function getSMEPlugNetworkId(name: string): number {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('mtn')) return 1;
  if (lowerName.includes('airtel')) return 2;
  if (lowerName.includes('9mobile') || lowerName.includes('etisalat')) return 3;
  if (lowerName.includes('glo')) return 4;
  return 1; // Default to MTN
}
