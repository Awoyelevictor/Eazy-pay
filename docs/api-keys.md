
# Locating Your API Credentials

To make Eazy-pay fully functional, you need to input keys from your provider dashboards into `src/firebase/config.ts`.

### 1. Paystack (Payments & Wallet Funding)
*   **Where to find**: [dashboard.paystack.com](https://dashboard.paystack.com/)
*   **Steps**:
    1. Log in to your Paystack Dashboard.
    2. Go to **Settings** (Gear icon at the bottom left).
    3. Click the **API Keys & Webhooks** tab.
    4. Copy the `Secret Key` and `Public Key` (Use the **Live** versions for production).

### 2. VTpass (Airtime, Data, Utilities)
*   **Where to find**: [vtpass.com](https://www.vtpass.com/rest-api)
*   **Steps**:
    1. Log in to your VTpass account.
    2. Go to **My Account** > **API Integration**.
    3. You will find your `API Key`, `Public Key`, and `Secret Key` listed there.
    4. Ensure your account is funded to process live transactions.

### 3. Gemini / Google AI (AI Assistant)
*   **Where to find**: [aistudio.google.com](https://aistudio.google.com/app/apikey)
*   **Steps**:
    1. Log in with your Google Account.
    2. Click **Create API Key**.
    3. Copy the key and add it to your environment variables as `GOOGLE_GENAI_API_KEY`.

### 4. Pay1st / Carry1st (Gaming)
*   **Where to find**: [carry1st.shop](https://carry1st.shop/) (Merchant/Developer Portal)
*   **Note**: This is the provider for Bloodstrike and CODM. You must register as a developer to get your specific API token.

---

### Important Security Note
Never share your **Secret Keys** on GitHub or with anyone else. Always store them in your environment variables (`.env`) for production deployments.
