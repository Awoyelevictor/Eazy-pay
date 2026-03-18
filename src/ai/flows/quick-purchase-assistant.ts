'use server';
/**
 * @fileOverview A Genkit flow to assist users with quick purchases by parsing natural language prompts.
 *
 * - quickPurchaseAssistant - A function that handles parsing a natural language purchase request.
 * - QuickPurchaseAssistantInput - The input type for the quickPurchaseAssistant function.
 * - QuickPurchaseAssistantOutput - The return type for the quickPurchaseAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuickPurchaseAssistantInputSchema = z.object({
  naturalLanguagePrompt: z.string().min(1).describe('A natural language request from the user for a purchase, e.g., "N1000 MTN data for my registered number".'),
});
export type QuickPurchaseAssistantInput = z.infer<typeof QuickPurchaseAssistantInputSchema>;

const QuickPurchaseAssistantOutputSchema = z.object({
  serviceType: z.enum(['airtime', 'data']).describe('The type of service requested (airtime or data).'),
  networkProvider: z.enum(['MTN', 'Glo', 'Airtel', '9mobile', 'unknown']).describe('The network provider for the service. Use "unknown" if not specified or unclear.'),
  amount: z.number().positive().describe('The monetary value or data bundle amount for the purchase. This should be a number, e.g., 1000 for N1000 or 2 for 2GB.'),
  phoneNumber: z.string().optional().describe('The target phone number for the transaction, if specified. If the user refers to "my registered number" or implies using their own, leave this field empty.'),
  confirmationMessage: z.string().describe('A concise message summarizing the parsed request for user confirmation.'),
});
export type QuickPurchaseAssistantOutput = z.infer<typeof QuickPurchaseAssistantOutputSchema>;

export async function quickPurchaseAssistant(input: QuickPurchaseAssistantInput): Promise<QuickPurchaseAssistantOutput> {
  // Validate input before calling the flow to avoid Genkit/Gemini trimEnd errors on empty strings
  if (!input.naturalLanguagePrompt || input.naturalLanguagePrompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }
  return quickPurchaseAssistantFlow(input);
}

const quickPurchaseAssistantPrompt = ai.definePrompt({
  name: 'quickPurchaseAssistantPrompt',
  input: {schema: QuickPurchaseAssistantInputSchema},
  output: {schema: QuickPurchaseAssistantOutputSchema},
  prompt: `You are an AI assistant designed to parse natural language requests for virtual top-up services (airtime and data).
Your goal is to extract the service type, network provider, amount, and an optional phone number from the user's prompt.

If the user refers to "my registered number" or implies using their own number, do not provide a phone number in the output.
If the network provider is not explicitly mentioned or is unclear, set it to "unknown".
The amount should be a positive number.

Example 1:
User: "I want to buy N1000 MTN data for 08012345678"
Output: {
  "serviceType": "data",
  "networkProvider": "MTN",
  "amount": 1000,
  "phoneNumber": "08012345678",
  "confirmationMessage": "You want to buy 1000 NGN MTN data for 08012345678."
}

Example 2:
User: "N500 airtime for my registered number"
Output: {
  "serviceType": "airtime",
  "networkProvider": "unknown",
  "amount": 500,
  "confirmationMessage": "You want to buy 500 NGN airtime for your registered number."
}

Example 3:
User: "2GB Glo data"
Output: {
  "serviceType": "data",
  "networkProvider": "Glo",
  "amount": 2,
  "confirmationMessage": "You want to buy 2 GB Glo data."
}

Example 4:
User: "Get me N2000 Airtel airtime"
Output: {
  "serviceType": "airtime",
  "networkProvider": "Airtel",
  "amount": 2000,
  "confirmationMessage": "You want to buy 2000 NGN Airtel airtime."
}

Parse the following prompt:
{{{naturalLanguagePrompt}}}`,
});

const quickPurchaseAssistantFlow = ai.defineFlow(
  {
    name: 'quickPurchaseAssistantFlow',
    inputSchema: QuickPurchaseAssistantInputSchema,
    outputSchema: QuickPurchaseAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await quickPurchaseAssistantPrompt(input);
    if (!output) throw new Error('AI failed to generate a response');
    return output;
  }
);
