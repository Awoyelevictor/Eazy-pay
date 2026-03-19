
# Integrating a Real VTU API

To send real airtime and data, you need to connect Eazy-pay to a Virtual Top-Up (VTU) gateway.

### 1. Choose a Provider
Register for a developer account at one of these popular Nigerian providers:
- **VTpass** (https://www.vtpass.com/rest-api)
- **ClubKonnect** (https://www.clubkonnect.com/)
- **Shago Payments** (https://shagopayments.com/)

### 2. Get Your API Keys
Once registered, you will find your **API Key** and **Public Key** in your developer dashboard.

### 3. Update `src/firebase/config.ts`
Copy your keys into the `VTU_CONFIG` object in `src/firebase/config.ts`.

### 4. Connect the API Call
In `src/app/services/airtime/page.tsx` and `src/app/services/data/page.tsx`, look for the `handlePurchase` function. Replace the "SIMULATED API CALL" block with a real `fetch` request to your provider.

**Example (VTpass):**
```javascript
const response = await fetch('https://api-service.vtpass.com/api/pay', {
  method: 'POST',
  headers: {
    'api-key': VTU_CONFIG.API_KEY,
    'public-key': VTU_CONFIG.PUBLIC_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    request_id: Date.now().toString(),
    serviceID: selectedNetwork.toLowerCase(), // e.g., 'mtn'
    billersCode: phoneNumber,
    variation_code: 'airtime',
    amount: purchaseAmount,
    phone: phoneNumber
  })
});

const result = await response.json();
if (result.code !== '000') throw new Error('Network Delivery Failed');
```

### 5. Fund Your VTU Wallet
Most providers require you to fund a separate wallet on *their* platform. They will deduct from that wallet whenever your app makes a successful API call.
