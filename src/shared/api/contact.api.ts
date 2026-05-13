import { invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Submit a contact form message
 * Sends the message to the backend for processing
 */
export async function submitContactForm(data: ContactFormData): Promise<void> {
  try {
    await invokeEdgeFunction('send-contact-message', {
      method: 'POST',
      body: data,
    });
  } catch (error) {
    throw new Error(`Failed to submit contact form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
