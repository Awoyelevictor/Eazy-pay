
'use server';

import { VTU_CONFIG } from "@/firebase/config";

/**
 * Generic VTpass requester to handle server-side calls.
 * This prevents CORS issues and hides API keys from the client.
 */
async function vtpassFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  const headers: any = {
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
    console.log(`VTPASS REQUEST [${method}] ${endpoint}:`, body ? JSON.stringify(body) : 'No Body');
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`VTPASS HTTP ERROR (${response.status}):`, errorText);
      throw new Error(`Gateway Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`VTPASS RESPONSE [${endpoint}]:`, JSON.stringify(data));
    return data;
  } catch (error: any) {
    console.error(`VTpass Connection Failure (${endpoint}):`, error.message);
    throw new Error(error.message || "Could not connect to VTpass gateway");
  }
}

export async function processPayment(payload: any) {
  return await vtpassFetch('/pay', 'POST', payload);
}

export async function verifyMerchant(payload: { billersCode: string; serviceID: string; type: string }) {
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
