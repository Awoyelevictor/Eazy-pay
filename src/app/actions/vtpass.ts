
'use server';

import { VTU_CONFIG } from "@/firebase/config";

/**
 * Generic VTpass requester to handle server-side calls.
 * This prevents CORS issues and hides API keys from the client.
 */
async function vtpassFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  const headers = {
    'api-key': VTU_CONFIG.API_KEY,
    'public-key': VTU_CONFIG.PUBLIC_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

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
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`VTpass API Error (${endpoint}):`, error);
    throw new Error("Could not connect to VTpass gateway");
  }
}

export async function processPayment(payload: any) {
  return await vtpassFetch('/pay', 'POST', payload);
}

export async function verifyMerchant(payload: { billersCode: string; serviceID: string; type: string }) {
  // Note: verification uses a slightly different endpoint sometimes, but merchant-verify is standard
  return await vtpassFetch('/merchant-verify', 'POST', payload);
}

export async function getVariations(serviceID: string) {
  return await vtpassFetch(`/service-variations?serviceID=${serviceID}`, 'GET');
}

export async function getInsuranceOptions(type: string, param?: string) {
  const endpoint = param 
    ? `/universal-insurance/options/${type}/${param}`
    : `/universal-insurance/options/${type}`;
  return await vtpassFetch(endpoint, 'GET');
}
