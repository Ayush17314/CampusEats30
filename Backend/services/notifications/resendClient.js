import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
let resendInstance = null;

if (RESEND_API_KEY && RESEND_API_KEY !== 'placeholder_key') {
  resendInstance = new Resend(RESEND_API_KEY);
  console.log('[Notification] Resend client initialized with live API key.');
} else {
  console.log('[Notification] Resend API key not set. Operating in resilient simulation mode.');
}

/**
 * Sends transactional email via Resend
 */
export async function sendEmailViaResend({ to, subject, html, text }) {
  if (resendInstance) {
    try {
      const response = await resendInstance.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'CampusEats <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      });
      return { success: true, id: response.data?.id, mode: 'live' };
    } catch (err) {
      console.warn('[Notification Error] Resend live send failed:', err.message);
      return { success: false, error: err.message, mode: 'fallback-simulated' };
    }
  }

  // Resilient mock dispatcher when RESEND_API_KEY is not configured
  const mockId = `resend-sim-${Date.now().toString(36)}`;
  console.log(`[Notification Mock] Email to ${to}: "${subject}" (Dispatch ID: ${mockId})`);
  return { success: true, id: mockId, mode: 'simulated' };
}
