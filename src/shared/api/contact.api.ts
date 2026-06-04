import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

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
    const { error } = await invokeEdgeFunction('send-contact-message', {
      body: data,
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      const details = await getEdgeFunctionErrorDetails(error);
      throw new Error(details.message);
    }
  } catch (error) {
    throw new Error(`Failed to submit contact form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
