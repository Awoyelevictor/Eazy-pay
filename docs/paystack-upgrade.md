# Paystack Account Upgrade Guide

## Problem
Your Paystack account is currently a **Starter Business** account, which cannot process third-party payouts/transfers. Users cannot withdraw funds to their bank accounts.

## Error Message
```
"transfer rejected you cannot initiate third party payout as a starter business"
```

## Solution: Upgrade Your Account

### Step 1: Access Paystack Dashboard
1. Go to [https://dashboard.paystack.co](https://dashboard.paystack.co)
2. Sign in with your credentials

### Step 2: Navigate to Business Settings
1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **Business**
3. Click on **Information**

### Step 3: Upgrade Account Tier
1. Look for your current tier (showing as "Starter")
2. Click **"Upgrade Account"** or **"Request Upgrade"**
3. Select tier: **SME** or **Enterprise** recommended for production

### Step 4: Complete Verification
You'll need to provide:
- **Business Registration** (CAC - Corporate Affairs Commission)
  - Registration Number
  - Document upload
- **Director/Owner Information**
  - Full name
  - Date of birth
  - Government-issued ID
- **Business Address** confirmation
- **Bank Account** details (for payouts)

### Step 5: Await Approval
- Approval usually takes **24-48 hours**
- You'll receive email confirmation
- Your account will be automatically upgraded

## What Changes After Upgrade?
✅ Users can withdraw funds to bank accounts  
✅ Higher transaction limits  
✅ Better support tier  
✅ More payment methods available  

## Timeline
- **Current Status**: Withdrawals disabled (Coming Soon)
- **After Upgrade**: Withdrawals fully functional

## Support
If you have issues with the upgrade process:
- Contact [Paystack Support](https://support.paystack.com)
- Email: support@paystack.com
- Phone: +234 (0) 1-888-8220

## Technical Note for Developers
Once upgraded, the withdrawal feature will be re-enabled in `src/components/dashboard/WalletCard.tsx`:
- Remove the `opacity-50 cursor-not-allowed` classes from the Withdraw button
- Change button text from "Withdraw (Coming Soon)" to "Withdraw"
- The transfer logic is already implemented and ready
