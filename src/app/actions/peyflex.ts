'use server';

import { PEYFLEX_CONFIG } from "@/firebase/config";

/**
 * Map common network names to PeyFlex network identifiers
 */
const NETWORK_ID_MAPPING: Record<string, string> = {
  // Airtime networks
  'mtn': 'mtn',
  'glo': 'glo',
  'airtel': 'airtel',
  '9mobile': '9mobile',
  
  // Data networks - these are what PeyFlex data API expects
  'mtn_data': 'mtn_data',
  'mtn': 'mtn_data',  // Default MTN to data access
  'glo_data': 'glo_data',
  'glo': 'glo_data',  // Default GLO to data access
  'airtel_data': 'airtel_data',
  'airtel': 'airtel_data',  // Default AIRTEL to data access
  '9mobile_data': '9mobile_data',
  '9mobile': '9mobile_data',  // Default 9MOBILE to data access
  
  // Uppercase variants for data
  'MTN': 'mtn_data',
  'GLO': 'glo_data',
  'AIRTEL': 'airtel_data',
  '9MOBILE': '9mobile_data',
  
  // Cable TV identifiers
  'startimes': 'startimes',
  'dstv': 'dstv',
  'gotv': 'gotv',
  
  // Electricity
  'electricity': 'electricity',
};

/**
 * Resolve network identifier - converts common names to PeyFlex API format
 */
function resolveNetworkId(network: string): string {
  const normalized = network.toLowerCase().trim();
  return NETWORK_ID_MAPPING[normalized] || network; // Return as-is if not found in mapping
}

/**
 * Generic Peyflex requester to handle server-side calls.
 * This prevents CORS issues and hides API keys from the client.
 */
async function peyflexFetch(endpoint: string, method: 'GET' | 'POST' | 'OPTIONS', body?: any) {
  // Validate API key is present
  if (!PEYFLEX_CONFIG.API_KEY) {
    console.error('❌ PEYFLEX_API_KEY is missing from .env.local');
    throw new Error('Server Configuration Error: PeyFlex API key not configured. Contact administrator.');
  }

  const headers: any = {
    'Authorization': `Token ${PEYFLEX_CONFIG.API_KEY}`, // Peyflex uses "Token" prefix
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Base URL for Peyflex API
  const url = `${PEYFLEX_CONFIG.BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`PEYFLEX LIVE REQUEST [${method}] ${endpoint}`);
    console.log(`PEYFLEX REQUEST URL:`, url);
    console.log(`PEYFLEX REQUEST BODY:`, body);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PEYFLEX HTTP ERROR (${response.status}):`, errorText);
      console.error(`PEYFLEX RESPONSE BODY:`, errorText);
      throw new Error(`Service Gateway Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Peyflex responses typically have status/message fields
    if (data.status && data.status.toLowerCase() === 'failed') {
      console.warn(`PEYFLEX SERVICE REJECTION: ${data.message || 'Unknown error'}`);
    }

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "Unknown error";
    
    // Distinguish between network errors and other errors
    if (errorMsg.includes('fetch failed') || errorMsg.includes('ERR_')) {
      console.error(`❌ PEYFLEX NETWORK ERROR (${endpoint}):`, errorMsg);
      console.error(`   - Ensure PeyFlex API is reachable at: ${PEYFLEX_CONFIG.BASE_URL}`);
      console.error(`   - URL being called: ${PEYFLEX_CONFIG.BASE_URL}${endpoint}`);
      console.error(`   - Check your internet connection`);
      throw new Error(`Network Unreachable: Could not connect to PeyFlex API. ${errorMsg}`);
    }
    
    console.error(`❌ Peyflex Connection Failure (${endpoint}):`, errorMsg);
    throw new Error(errorMsg || "Could not connect to service provider");
  }
}

/**
 * Get user wallet balance from Peyflex.
 */
export async function getPeyflexBalance() {
  return await peyflexFetch('/api/wallet/balance/', 'GET');
}

/**
 * Get user profile from Peyflex.
 */
export async function getPeyflexProfile() {
  return await peyflexFetch('/api/user/profile/', 'GET');
}

/**
 * Get available airtime networks from Peyflex.
 */
export async function getPeyflexAirtimeNetworks() {
  return await peyflexFetch('/api/airtime/networks/', 'GET');
}

/**
 * Process airtime purchase via Peyflex.
 * @param network - Network identifier (e.g., 'mtn', 'glo', 'airtel', '9mobile')
 * @param amount - Amount in naira
 * @param mobile_number - Nigerian phone number (e.g., '08144216361')
 */
export async function processPeyflexAirtime(payload: {
  network: string;
  amount: number;
  mobile_number: string;
}) {
  const resolvedNetwork = resolveNetworkId(payload.network);
  return await peyflexFetch('/api/airtime/topup/', 'POST', {
    ...payload,
    network: resolvedNetwork,
  });
}

/**
 * Get available data networks from Peyflex.
 */
export async function getPeyflexDataNetworks() {
  return await peyflexFetch('/api/data/networks/', 'GET');
}

/**
 * Get data plans for a specific network from Peyflex.
 * @param network - Network identifier (e.g., 'mtn', 'glo', 'airtel', '9mobile')
 */
export async function getPeyflexDataPlans(network: string) {
  const resolvedNetwork = resolveNetworkId(network);
  console.log(`📊 Fetching data plans for network: "${network}" → resolved to: "${resolvedNetwork}"`);
  try {
    const result = await peyflexFetch(`/api/data/plans/?network=${resolvedNetwork}`, 'GET');
    console.log(`✅ Data plans fetched for ${resolvedNetwork}:`, result);
    return result;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`❌ FAILED: ${network} (${resolvedNetwork})`);
    console.error(`   Error: ${errorMsg}`);
    console.error(`   URL attempted: /api/data/plans/?network=${resolvedNetwork}`);
    console.error(`   Available networks might be: MTN, GLO, AIRTEL, 9MOBILE`);
    // Return empty plans array so fetch continues for other networks
    return { data: [], status: 'failed', message: errorMsg };
  }
}

/**
 * Get all data plans grouped by network.
 * Fetches plans for all available networks at once.
 */
export async function getPeyflexAllDataPlans() {
  try {
    const networksResponse = await getPeyflexDataNetworks();
    
    if (!networksResponse || !Array.isArray(networksResponse.data)) {
      throw new Error("Unable to fetch data networks");
    }

    const allPlans: Record<string, any> = {};

    // Fetch plans for each network in parallel
    const planPromises = networksResponse.data.map(async (network: any) => {
      try {
        const plans = await getPeyflexDataPlans(network.identifier || network.id);
        allPlans[network.identifier || network.id] = {
          network: network,
          plans: plans.data || plans
        };
      } catch (error) {
        console.warn(`Failed to fetch plans for network ${network.identifier}:`, error);
        allPlans[network.identifier || network.id] = {
          network: network,
          plans: []
        };
      }
    });

    await Promise.all(planPromises);
    return allPlans;
  } catch (error) {
    console.error("Error fetching all data plans:", error);
    throw error;
  }
}

/**
 * Process data purchase via Peyflex.
 * @param network - Network identifier (e.g., 'mtn_data_share', 'mtn_gifting_data')
 * @param plan_code - Plan code from data plans list (e.g., 'M1GBS')
 * @param mobile_number - Nigerian phone number
 */
export async function processPeyflexData(payload: {
  network: string;
  plan_code: string;
  mobile_number: string;
}) {
  const resolvedNetwork = resolveNetworkId(payload.network);
  return await peyflexFetch('/api/data/purchase/', 'POST', {
    ...payload,
    network: resolvedNetwork,
  });
}

/**
 * Get available cable TV providers from Peyflex.
 */
export async function getPeyflexCableProviders() {
  return await peyflexFetch('/api/cable/providers/', 'GET');
}

/**
 * Get all cable TV plans and subscriptions grouped by provider.
 */
export async function getPeyflexAllCablePlans() {
  try {
    const providersResponse = await getPeyflexCableProviders();
    
    const providers = Array.isArray(providersResponse) ? providersResponse
      : Array.isArray(providersResponse.data) ? providersResponse.data
      : Array.isArray(providersResponse.providers) ? providersResponse.providers
      : [];

    const allPlans: Record<string, any> = {};

    // Fetch plans for each provider in parallel
    const planPromises = providers.map(async (provider: any) => {
      try {
        const identifier = provider.identifier || provider.id || provider.name?.toLowerCase();
        const plans = await getPeyflexCablePlans(identifier);
        const planList = Array.isArray(plans) ? plans
          : Array.isArray(plans.data) ? plans.data
          : Array.isArray(plans.plans) ? plans.plans
          : [];
        
        allPlans[identifier] = {
          provider: provider,
          plans: planList
        };
      } catch (error) {
        console.warn(`Failed to fetch plans for provider ${provider.identifier}:`, error);
        allPlans[provider.identifier || provider.id] = {
          provider: provider,
          plans: []
        };
      }
    });

    await Promise.all(planPromises);
    return allPlans;
  } catch (error) {
    console.error("Error fetching all cable plans:", error);
    throw error;
  }
}

/**
 * Get cable TV plans for a specific provider from Peyflex.
 * @param provider - Cable provider (e.g., 'startimes', 'dstv', 'gotv')
 */
export async function getPeyflexCablePlans(provider: string) {
  const resolvedProvider = resolveNetworkId(provider);
  return await peyflexFetch(`/api/cable/plans/?provider=${resolvedProvider}`, 'GET');
}

/**
 * Verify cable TV IUC/smartcard number via Peyflex.
 * @param iuc - IUC number to verify
 * @param identifier - Cable provider identifier (e.g., 'startimes', 'dstv', 'gotv')
 */
export async function verifyPeyflexCableIUC(payload: {
  iuc: string;
  identifier: string;
}) {
  const resolvedIdentifier = resolveNetworkId(payload.identifier);
  return await peyflexFetch('/api/cable/verify/', 'POST', {
    ...payload,
    identifier: resolvedIdentifier,
  });
}

/**
 * Process cable TV recharge via Peyflex.
 * Supports flexible naming for cross-compatibility
 */
export async function processPeyflexCable(payload: {
  provider?: string;
  identifier?: string;
  plan_code?: string;
  plan?: string;
  iuc_number?: string;
  iuc?: string;
  phone?: string;
  amount?: string | number;
}) {
  // Support both naming conventions
  const identifier = (payload.provider || payload.identifier || 'dstv').toLowerCase();
  const planCode = payload.plan_code || payload.plan || '';
  const iucNumber = payload.iuc_number || payload.iuc || '';
  
  const body: any = {
    identifier,
    plan: planCode,
    iuc: iucNumber,
  };

  // Only add optional fields if provided
  if (payload.phone) body.phone = payload.phone;
  if (payload.amount) body.amount = payload.amount;

  const resolvedIdentifier = resolveNetworkId(identifier);
  return await peyflexFetch('/api/cable/subscribe/', 'POST', {
    ...body,
    identifier: resolvedIdentifier,
  });
}

/**
 * Get available electricity discos from Peyflex.
 */
export async function getPeyflexElectricityDiscos() {
  return await peyflexFetch('/api/electricity/discos/', 'GET');
}

/**
 * Get available electricity plans from Peyflex.
 */
export async function getPeyflexElectricityPlansForDisco(identifier: string = 'electricity') {
  return await peyflexFetch(`/api/electricity/plans/?identifier=${identifier}`, 'GET');
}

/**
 * Verify electricity meter number via Peyflex.
 * Accepts payload object for flexibility
 */
export async function verifyPeyflexElectricityMeter(payload: {
  disco?: string;
  meter_number: string;
  meter_type: 'prepaid' | 'postpaid';
}) {
  const disco = payload.disco || 'electricity';
  return await peyflexFetch(
    `/api/electricity/verify/?disco=${disco}&meter=${payload.meter_number}&type=${payload.meter_type}`,
    'GET'
  );
}

/**
 * Process electricity recharge via Peyflex.
 * Accepts flexible payload for different API requirements
 */
export async function processPeyflexElectricity(payload: {
  disco?: string;
  meter_number?: string;
  meter_type?: 'prepaid' | 'postpaid';
  amount: number;
  identifier?: string;
  meter?: string;
  plan?: string;
  type?: 'prepaid' | 'postpaid';
  phone?: string;
}) {
  // Support both naming conventions
  const disco = payload.disco || payload.identifier || 'electricity';
  const meter = payload.meter_number || payload.meter;
  const meterType = payload.meter_type || payload.type || 'prepaid';
  
  return await peyflexFetch('/api/electricity/subscribe/', 'POST', {
    disco,
    meter,
    amount: payload.amount,
    type: meterType,
    phone: payload.phone,
  });
}