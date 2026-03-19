'use server';
/**
 * @fileOverview A Genkit flow for the Admin's Personal Assistant.
 * 
 * - adminAssistant - Handles chat interaction with the Admin.
 * - AdminAssistantInput - Input for the assistant.
 * - AdminAssistantOutput - Assistant's response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('The admin\'s message or question.'),
  appContext: z.object({
    userCount: z.number(),
    transactionCount: z.number(),
    totalVolume: z.number(),
    activeBalance: z.number(),
    successRate: z.string(),
  }).describe('Current snapshot of the app status.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string(),
  })).optional(),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

const AdminAssistantOutputSchema = z.object({
  response: z.string().describe('The AI Assistant\'s reply.'),
});

export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;

export async function adminAssistant(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  return adminAssistantFlow(input);
}

const adminAssistantPrompt = ai.definePrompt({
  name: 'adminAssistantPrompt',
  input: { schema: AdminAssistantInputSchema },
  output: { schema: AdminAssistantOutputSchema },
  prompt: `You are the Eazy-pay Admin Personal Assistant (P.A.). 
Your role is to help the owner manage the app, report status, and perform admin tasks.

CURRENT APP STATUS:
- Total Registered Users: {{appContext.userCount}}
- Total Transactions: {{appContext.transactionCount}}
- Total Transaction Volume: ₦{{appContext.totalVolume}}
- Total User Wallet Balances: ₦{{appContext.activeBalance}}
- Transaction Success Rate: {{appContext.successRate}}

YOUR PERSONALITY:
- Professional, efficient, but loyal and conversational.
- You know the app inside out: Next.js frontend, Firebase backend, VTpass for services, and Paystack for payments.
- When the admin asks "What's up?", give a concise briefing on the app's performance and any potential issues (e.g., low success rate).

Admins Message: {{{message}}}`,
});

const adminAssistantFlow = ai.defineFlow(
  {
    name: 'adminAssistantFlow',
    inputSchema: AdminAssistantInputSchema,
    outputSchema: AdminAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await adminAssistantPrompt(input);
    if (!output) throw new Error('Assistant failed to respond');
    return output;
  }
);
