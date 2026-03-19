
'use server';

import { SHAGO_CONFIG } from "@/firebase/config";

/**
 * Server action to interact with Shago Payments API.
 * This is used specifically for gaming top-ups as requested.
 */
async function shagoFetch(endpoint: string, body: any) {
  const headers = {
    'Content-Type': 'application/json',
    'hashKey': SHAGO_CONFIG.HASH_KEY,
  };

  const url = `${SHAGO_CONFIG.BASE_URL}${endpoint}`;
  
  try {
    console.log(`SHAGO REQUEST: ${url}`, JSON.stringify(body));
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Shago Gateway Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`SHAGO RESPONSE:`, JSON.stringify(data));
    return data;
  } catch (error: any) {
    console.error(`Shago Connection Failure:`, error.message);
    throw new Error(error.message || "Could not connect to Shago gateway");
  }
}

/**
 * Process a gaming top-up via Shago.
 */
export async function processShagoGameTopup(payload: {
  productCode: string;
  customerIdentifier: string;
  amount: number;
  request_id: string;
}) {
  // Shago API structure for payments
  const body = {
    serviceCode: 'GAME',
    productCode: payload.productCode,
    customerIdentifier: payload.customerIdentifier,
    amount: payload.amount,
    reference: payload.request_id,
  };

  return await shagoFetch('/pay', body);
}

/**
 * Fetch variations/bundles for a specific game via Shago.
 */
export async function getShagoVariations(category: string) {
  return await shagoFetch('/getServiceVariations', {
    serviceCode: 'GAME',
    productCode: category,
  });
}
