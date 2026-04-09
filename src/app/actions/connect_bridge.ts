
'use server';

// import { CONNECT_BRIDGE_CONFIG } from "@/firebase/config";

/**
 * Generic Connect Bridge requester to handle server-side calls.
 */
async function connectBridgeFetch(endpoint: string, method: 'GET' | 'POST', body?: any) {
  const apiKey = process.env.CONNECT_BRIDGE_API_KEY; // || CONNECT_BRIDGE_CONFIG.API_KEY;
  
  const headers: any = {
    'Authorization': apiKey, 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const url = `https://connectbridge.com.ng/api${endpoint}`; // `${CONNECT_BRIDGE_CONFIG.BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`CONNECT BRIDGE [${method}] ${endpoint}`);
    
    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error(`CONNECT BRIDGE NON-JSON RESPONSE:`, text);
        throw new Error(`Invalid response from provider: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      console.error(`CONNECT BRIDGE ERROR (${response.status}):`, data);
      throw new Error(data.message || `Service Gateway Error: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Connect Bridge Failure (${endpoint}):`, error.message);
    throw new Error(error.message || "Could not connect to service provider");
  }
}

/**
 * Get Wallet Balance
 */
export async function getConnectBridgeBalance() {
  return await connectBridgeFetch('/user', 'GET');
}

/**
 * Process Airtime Purchase
 */
export async function processConnectBridgeAirtime(payload: {
  amount: number | string;
  network: string | number;
  phone: string;
  bypass?: boolean;
}) {
  return await connectBridgeFetch('/airtime', 'POST', {
    amount: payload.amount.toString(),
    network: payload.network.toString(),
    phone: payload.phone,
    Ported_number: payload.bypass ?? true
  });
}

/**
 * Process Data Purchase
 */
export async function processConnectBridgeData(payload: {
  plan: string | number;
  phone: string;
  bypass?: boolean;
}) {
  return await connectBridgeFetch('/data', 'POST', {
    plan: payload.plan.toString(),
    phone: payload.phone,
    Ported_number: payload.bypass ?? true
  });
}

/**
 * Get Data Plans (Inferred endpoint)
 */
export async function getConnectBridgeDataPlans() {
  return await connectBridgeFetch('/data_plans', 'GET');
}

/**
 * Process TV Subscription (Inferred endpoint)
 */
export async function processConnectBridgeTV(payload: {
  smartcard: string;
  plan: string | number;
  provider: string;
  phone?: string;
}) {
  return await connectBridgeFetch('/tv', 'POST', {
    smartcard: payload.smartcard,
    plan: payload.plan.toString(),
    provider: payload.provider,
    phone: payload.phone,
    Ported_number: true
  });
}

/**
 * Process Electricity Payment (Inferred endpoint)
 */
export async function processConnectBridgeElectricity(payload: {
  meter: string;
  amount: number | string;
  provider: string;
  meter_type: string;
  phone?: string;
}) {
  return await connectBridgeFetch('/electricity', 'POST', {
    meter: payload.meter,
    amount: payload.amount.toString(),
    provider: payload.provider,
    meter_type: payload.meter_type,
    phone: payload.phone,
    Ported_number: true
  });
}

/**
 * Verify a merchant/customer (e.g. Electricity Meter or Cable TV SmartCard)
 * (Inferred endpoint)
 */
export async function verifyConnectBridgeMerchant(payload: { 
  billersCode: string; 
  serviceID: string; 
  type?: string 
}) {
  return await connectBridgeFetch('/verify', 'POST', {
    billersCode: payload.billersCode,
    serviceID: payload.serviceID,
    type: payload.type
  });
}
