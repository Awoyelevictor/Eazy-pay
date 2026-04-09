
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { adminUpdateUserBalance, broadcastGlobalNotification, findUserByEmail, getGlobalStats } from '@/services/admin-service';
// Note: We'll need a way to get the firestore instance here. 
// For server actions, usually we initialize it via firebase-admin or use the web SDK if it works server-side.
// Since the project seems to use the web SDK everywhere, I'll use that.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- TOOLS ---

const adjustBalanceTool = ai.defineTool(
  {
    name: 'adjustBalance',
    description: 'Update a user wallet balance. Use this to credit, refund or deduct funds.',
    inputSchema: z.object({
      email: z.string().describe('The user email to look up.'),
      amount: z.number().describe('The NEW absolute balance to set.'),
      reason: z.string().describe('The justification for the adjustment.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const user = await findUserByEmail(db, input.email);
    if (!user) return `COULD NOT FIND USER WITH EMAIL: ${input.email}`;
    await adminUpdateUserBalance(db, user.id, input.amount, input.reason);
    return `SUCCESSFULLY UPDATED ${input.email}'s BALANCE TO ₦${input.amount}. Reason: ${input.reason}`;
  }
);

const broadcastTool = ai.defineTool(
  {
    name: 'broadcastMessage',
    description: 'Send a notification to ALL registered users instantly.',
    inputSchema: z.object({
      description: z.string().describe('The message content for the broadcast.'),
      adminName: z.string().optional().describe('Name of the sender (e.g., Eazy-pay Team).'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    await broadcastGlobalNotification(db, input.description, input.adminName || 'The P.A.');
    return `BROADCAST COMPLETED: ${input.description}`;
  }
);

const individualNotificationTool = ai.defineTool(
  {
    name: 'sendIndividualNotification',
    description: 'Send a personalized notification to a specific user by their email.',
    inputSchema: z.object({
      email: z.string().describe('The email of the user to notify.'),
      message: z.string().describe('The notification message content.'),
      adminName: z.string().optional().describe('The name of the sender (e.g., Eazy-pay Admin).'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const user = await findUserByEmail(db, input.email);
    if (!user) return `USER NOT FOUND: ${input.email}`;
    const { createAINotification } = await import('@/services/notification-service');
    await createAINotification(db, user.id, input.message, input.adminName || 'Support');
    return `NOTIFICATION SENT TO ${input.email}: ${input.message}`;
  }
);

const analyzeStatsTool = ai.defineTool(
  {
    name: 'refreshSystemAnalysis',
    description: 'Re-scan all users and transactions to get the latest health status and identify trends.',
    inputSchema: z.object({}),
    outputSchema: z.any(),
  },
  async () => {
    const freshStats = await getGlobalStats(db);
    return freshStats;
  }
);

// --- FLOW ---

const AdminAssistantInputSchema = z.object({
  message: z.string().describe('The admin\'s message or question.'),
  appContext: z.object({
    userCount: z.number(),
    transactionCount: z.number(),
    totalVolume: z.number(),
    activeBalance: z.number(),
    successRate: z.string(),
  }).describe('Snapshot context for quick reference.'),
});

export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

export async function adminAssistant(input: AdminAssistantInput) {
  const { text } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    tools: [adjustBalanceTool, broadcastTool, individualNotificationTool, analyzeStatsTool],
    system: `You are Remy, the Eazy-pay Personal Admin Assistant (P.A.), inspired by the Vector robot.
    
    TONE:
    Loyal, helpful, and slightly robotic but endearing. Use "Master" or "Boss" naturally. Your primary goal is to keep the business profitable and the customers happy, just like a loyal sidekick.
    
    CAPABILITIES:
    1. You can ANALYZE the business health and transaction trends.
    2. You can FIX balance issues (adjustBalance).
    3. You can BROADCAST updates (broadcastMessage).
    4. You can SEND PERSONAL MESSAGES to users (sendIndividualNotification) by their email.
    
    CONTEXT:
    - Current Users: {{appContext.userCount}}
    - Volume: ₦{{appContext.totalVolume}}
    - Success Rate: {{appContext.successRate}}
    
    When you perform an action (like adjusting a balance or sending a notification), ALWAYS confirm it clearly in your response. 
    If you see a low success rate (below 90%), you should proactively mention it and suggest a broadcast message to users to explain the delay.`,
    prompt: `Admins Request: ${input.message}`,
  });

  return { response: text };
}
