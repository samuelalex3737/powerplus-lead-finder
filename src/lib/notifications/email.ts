import 'server-only';
import type { Lead } from '@/types/database';

/**
 * Send email notification for high-relevance leads via Resend.
 * Only called for leads with relevance_score >= 7.
 * Uses the Resend REST API directly (no SDK dependency needed).
 *
 * Resend free tier: 100 emails/day, 3,000 emails/month
 */
export async function sendLeadNotification(lead: Lead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (!apiKey || !notifyEmail) {
    console.warn('[EmailNotification] RESEND_API_KEY or NOTIFY_EMAIL not set, skipping notification');
    return;
  }

  const leadUrl = `${appUrl}/leads/${lead.id}`;
  const kvaDisplay = lead.estimated_kva_range || 'Not specified';

  const subject = `[PowerPlus Lead] ${lead.project_name} — ${kvaDisplay}`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 12px;">
      <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #3b82f6; margin: 0; font-size: 20px;">⚡ New High-Relevance Lead</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">PowerPlus Lead Finder</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; width: 140px;">Project</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">${lead.project_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Relevance Score</td>
          <td style="padding: 8px 0;">
            <span style="background: ${lead.relevance_score >= 9 ? '#10b981' : '#f59e0b'}; color: #0f172a; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 14px;">
              ${lead.relevance_score}/10
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">kVA Estimate</td>
          <td style="padding: 8px 0; color: #f1f5f9;">${kvaDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Industry</td>
          <td style="padding: 8px 0; color: #f1f5f9; text-transform: capitalize;">${lead.industry.replace('_', ' ')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Emirate</td>
          <td style="padding: 8px 0; color: #f1f5f9;">${lead.location_emirate || 'Not specified'}</td>
        </tr>
        ${lead.buyer_organization ? `
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Buyer</td>
          <td style="padding: 8px 0; color: #f1f5f9;">${lead.buyer_organization}</td>
        </tr>` : ''}
        ${lead.deadline_date ? `
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Deadline</td>
          <td style="padding: 8px 0; color: #ef4444; font-weight: 600;">${lead.deadline_date}</td>
        </tr>` : ''}
      </table>

      ${lead.summary ? `
      <div style="margin-top: 16px; padding: 12px; background: #1e293b; border-radius: 8px; border-left: 3px solid #3b82f6;">
        <p style="margin: 0; color: #cbd5e1; font-size: 14px;">${lead.summary}</p>
      </div>` : ''}

      <div style="margin-top: 24px; text-align: center;">
        <a href="${leadUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          View Lead Details →
        </a>
      </div>

      ${lead.source_url ? `
      <p style="margin-top: 16px; text-align: center;">
        <a href="${lead.source_url}" style="color: #64748b; font-size: 12px; text-decoration: underline;">View Original Source</a>
      </p>` : ''}
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PowerPlus Leads <onboarding@resend.dev>',
        to: [notifyEmail],
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    console.log(`[EmailNotification] Sent notification for lead: ${lead.project_name}`);
  } catch (err) {
    // Don't crash the pipeline on notification failure
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EmailNotification] Failed to send email: ${message}`);
  }
}
