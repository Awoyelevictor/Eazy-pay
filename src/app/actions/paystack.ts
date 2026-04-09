'use server';

export async function getPaystackBanks() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  
  const res = await fetch('https://api.paystack.co/bank?currency=NGN', {
    headers: { Authorization: `Bearer ${secret}` },
    // Cache banks for an hour since they rarely change
    next: { revalidate: 3600 } 
  });
  
  if (!res.ok) {
    throw new Error('Could not fetch banks from Paystack');
  }
  
  const data = await res.json();
  return data.data; // Returns array of { name, code, ... }
}

export async function processPaystackWithdrawal(payload: {
  amount: number;
  bankCode: string;
  accountNumber: string;
  reason: string;
}) {
  const SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!SECRET) throw new Error("Server missing Paystack Keys");

  // Step 1: Create a Transfer Recipient to get the exact destination code
  const rcptRes = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: "nuban",
      name: "Eazy-pay Withdrawal", // Paystack will resolve their real Bank Auth Name automatically
      account_number: payload.accountNumber,
      bank_code: payload.bankCode,
      currency: "NGN"
    })
  });
  
  const rcptData = await rcptRes.json();
  if (!rcptData.status) {
    throw new Error(rcptData.message || "Account details failed validation");
  }

  const recipientCode = rcptData.data.recipient_code;

  // Step 2: Initiate the Transfer 
  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: "balance", // Important: pulls strictly from your Paystack Business Balance
      amount: Math.round(payload.amount * 100), // Convert to Kobo
      recipient: recipientCode,
      reason: payload.reason
    })
  });
  
  const transferData = await transferRes.json();
  if (!transferData.status) {
    // Enhanced error logging for debugging
    console.error('PAYSTACK TRANSFER ERROR:', {
      status: transferRes.status,
      message: transferData.message,
      errors: transferData.errors
    });
    throw new Error(transferData.message || "Transfer initiation failed");
  }

  return transferData;
}
