
'use server';

import { VTU_CONFIG } from "@/firebase/config";

/**
 * Generic VTpass requester to handle server-side calls.
 * This prevents CORS issues and hides API keys from the client.
 */
async function vtpassFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  // Pull secrets purely on the SERVER SIDE, guaranteeing Next.js doesn't strip them!
  const headers: any = {
    'api-key': process.env.VTPASS_API_KEY || VTU_CONFIG.API_KEY,
    'public-key': process.env.NEXT_PUBLIC_VTPASS_PUBLIC_KEY || VTU_CONFIG.PUBLIC_KEY,
    'secret-key': process.env.VTPASS_SECRET_KEY || VTU_CONFIG.SECRET_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Keep sandbox link ready just in case they are trying to use test keys
  // For sandbox testing, use: https://sandbox.vtpass.com/api
  const url = `${VTU_CONFIG.BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`VTPASS LIVE REQUEST [${method}] ${endpoint}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`VTPASS HTTP ERROR (${response.status}):`, errorText);
      throw new Error(`Service Gateway Error: ${response.status}`);
    }

    const data = await response.json();
    
    // VTpass successful responses always have code '000'
    if (data.code && data.code !== '000' && data.code !== '016' && method === 'POST') {
      console.warn(`VTPASS SERVICE REJECTION: ${data.response_description || 'Unknown error'}`);
    }

    return data;
  } catch (error: any) {
    console.error(`VTpass Connection Failure (${endpoint}):`, error.message);
    throw new Error(error.message || "Could not connect to service provider");
  }
}

/**
 * Process a payment for VTpass services (Airtime, Data, Utilities, Insurance).
 */
export async function processPayment(payload: {
  request_id: string;
  serviceID: string;
  amount: number;
  phone: string;
  billersCode?: string;
  variation_code?: string;
  [key: string]: any;
}) {
  return await vtpassFetch('/pay', 'POST', payload);
}

/**
 * Verify a merchant/customer (e.g. Electricity Meter or Cable TV SmartCard).
 */
export async function verifyMerchant(payload: { billersCode: string; serviceID: string; type?: string }) {
  return await vtpassFetch('/merchant-verify', 'POST', payload);
}

/**
 * Get available service variations (bundles).
 */
export async function getVariations(serviceID: string) {
  return await vtpassFetch(`/service-variations?serviceID=${serviceID}`, 'GET');
}

/**
 * Get insurance specific options.
 */
export async function getInsuranceOptions(type: string, param?: string) {
  const endpoint = param 
    ? `/universal-insurance/options/${type}/${param}`
    : `/universal-insurance/options/${type}`;
  return await vtpassFetch(endpoint, 'GET');
}
