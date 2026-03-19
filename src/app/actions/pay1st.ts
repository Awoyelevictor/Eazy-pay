'use server';

import { PAY1ST_CONFIG } from "@/firebase/config";

/**
 * Server action to interact with Pay1st (Carry1st) Shop Gateway API.
 * Focused on Gaming fulfillments.
 */
async function pay1stFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  const url = `${PAY1ST_CONFIG.BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAY1ST_CONFIG.API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pay1st/Carry1st Error (${response.status}):`, errorText);
      throw new Error(`Gateway Error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Pay1st Connection Failure:`, error.message);
    throw new Error(error.message || "Could not connect to Pay1st/Carry1st gateway");
  }
}

/**
 * Process a gaming top-up via Pay1st/Carry1st.
 */
export async function processPay1stGameTopup(payload: {
  sku: string;
  recipientIdentifier: string;
  externalReference: string;
}) {
  return await pay1stFetch('/fulfillments', 'POST', {
    sku: payload.sku,
    recipient: payload.recipientIdentifier,
    externalReference: payload.externalReference,
  });
}

/**
 * Fetch available game catalogs/SKUs.
 */
export async function getPay1stProducts() {
  return await pay1stFetch('/products', 'GET');
}
