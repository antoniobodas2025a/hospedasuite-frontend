import { registerHandler } from '@/lib/event-handlers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleEmailSend(event: any): Promise<void> {
  const { template, recipient, data } = event.payload as { 
    template: string; 
    recipient: string; 
    data: Record<string, unknown>;
  };

  // In production, call Resend API
  console.log(`[email] Would send ${template} to ${recipient}`, data);
}

// This handler is registered for email.send events (not in the 21 schemas)
registerHandler('email.send' as any, handleEmailSend);
