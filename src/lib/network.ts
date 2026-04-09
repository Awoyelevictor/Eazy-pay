
/**
 * Synchronous network ID mapping for Connect Bridge.
 * 1=MTN, 2=Airtel, 3=Glo, 4=9mobile
 */
export function getConnectBridgeNetworkId(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('mtn')) return "1";
  if (lower.includes('airtel')) return "2";
  if (lower.includes('glo')) return "3";
  if (lower.includes('9mobile') || lower.includes('etisalat')) return "4";
  return "1";
}

/**
 * Synchronous network ID mapping for SMEPlug.
 * Standard SMEPlug ordering: 1=MTN, 2=Glo, 3=Airtel, 4=9mobile
 * If this still fails, the real IDs will be fetched from /networks endpoint.
 */
export function getSMEPlugNetworkId(name: string): number {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('mtn')) return 1;
  if (lowerName.includes('glo')) return 2;
  if (lowerName.includes('airtel')) return 3;
  if (lowerName.includes('9mobile') || lowerName.includes('etisalat')) return 4;
  return 1; // Default to MTN
}
