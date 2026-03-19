
'use server';
/**
 * @fileOverview A Genkit flow to compose personalized and context-aware notifications.
 *
 * - composeNotification - A function that generates a notification title and message based on an event.
 * - ComposeNotificationInput - The input type for the composeNotification function.
 * - ComposeNotificationOutput - The return type for the composeNotification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ComposeNotificationInputSchema = z.object({
  eventDescription: z.string().describe('The event that triggered the notification, e.g., "User funded wallet with N5000", "Airtime purchase of N1000 failed".'),
  userName: z.string().optional().describe('The name of the user to personalize the message.'),
});
export type ComposeNotificationInput = z.infer<typeof ComposeNotificationInputSchema>;

const ComposeNotificationOutputSchema = z.object({
  title: z.string().describe('A concise and engaging title for the notification.'),
  message: z.string().describe('A friendly and informative message for the notification.'),
  type: z.enum(['info', 'success', 'warning', 'error']).describe('The semantic type of the notification.'),
});
export type ComposeNotificationOutput = z.infer<typeof ComposeNotificationOutputSchema>;

export async function composeNotification(input: ComposeNotificationInput): Promise<ComposeNotificationOutput> {
  return composeNotificationFlow(input);
}

const composeNotificationPrompt = ai.definePrompt({
  name: 'composeNotificationPrompt',
  input: { schema: ComposeNotificationInputSchema },
  output: { schema: ComposeNotificationOutputSchema },
  prompt: `You are an AI assistant for Eazy-pay, a high-performance VTU and financial services app.
Your task is to compose a notification title and message based on a user event.

Guidelines:
- Keep it friendly, professional, and concise.
- Use the user's name if provided.
- Ensure the tone matches the event (e.g., celebratory for success, helpful for errors).
- The title should be no more than 5 words.
- The message should be no more than 25 words.

Event: {{{eventDescription}}}
User Name: {{{userName}}}`,
});

const composeNotificationFlow = ai.defineFlow(
  {
    name: 'composeNotificationFlow',
    inputSchema: ComposeNotificationInputSchema,
    outputSchema: ComposeNotificationOutputSchema,
  },
  async (input) => {
    const { output } = await composeNotificationPrompt(input);
    if (!output) throw new Error('AI failed to generate notification content');
    return output;
  }
);
