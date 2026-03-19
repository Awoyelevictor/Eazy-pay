
'use server';

import { PAY1ST_CONFIG } from "@/firebase/config";

/**
 * Server action to interact with Pay1st API.
 * Known for cheap data and stable airtime delivery.
 */
async function pay1stFetch(endpoint: string, body: any) {
  const url = `${PAY1ST_CONFIG.BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAY1ST_CONFIG.API_KEY}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Pay1st Gateway Error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Pay1st Connection Failure:`, error.message);
    throw new Error(error.message || "Could not connect to Pay1st gateway");
  }
}

export async function processPay1stAirtime(payload: {
  network: string;
  amount: number;
  phone: string;
}) {
  return await pay1stFetch('/airtime', {
    network: payload.network,
    amount: payload.amount,
    mobile_number: payload.phone,
    Ported_number: true
  });
}

export async function processPay1stData(payload: {
  network: string;
  planId: string;
  phone: string;
}) {
  return await pay1stFetch('/data', {
    network: payload.network,
    plan: payload.planId,
    mobile_number: payload.phone,
    Ported_number: true
  });
}
