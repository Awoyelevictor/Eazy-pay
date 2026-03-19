
# Integrating VTU & Gaming Gateways

Eazy-pay uses a multi-provider strategy to ensure reliability and the best prices.

### 1. VTpass (Main Utility)
- **Use for**: Airtime, Data, Electricity, Cable TV.
- **Config**: `VTU_CONFIG` in `src/firebase/config.ts`.
- **API Reference**: https://www.vtpass.com/rest-api

### 2. Shago Payments (Gaming)
- **Use for**: CODM, Free Fire, Mobile Legends, PUBG.
- **Config**: `SHAGO_CONFIG` in `src/firebase/config.ts`.
- **Note**: Requires a `Hash Key` from your Shago developer dashboard.

### 3. Pay1st (Alternative VTU)
- **Use for**: Competitive MTN/Glo data bundles.
- **Config**: `PAY1ST_CONFIG` in `src/firebase/config.ts`.
- **Integration**: We've included a server action `src/app/actions/pay1st.ts` ready for implementation if you wish to switch providers.

### How to Switch Providers
To switch a service (e.g., Airtime) from VTpass to Pay1st:
1. Open the service page (e.g., `src/app/services/airtime/page.tsx`).
2. Import the Pay1st action: `import { processPay1stAirtime } from "@/app/actions/pay1st"`.
3. Replace the `processPayment` call inside `handlePurchase` with your new action.
