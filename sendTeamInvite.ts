import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteToken, invitedEmail, invitedName, companyName, role } = await req.json();

    const inviteLink = `${Deno.env.get('BASE44_APP_URL') || 'https://portal.pacificengineeringsf.com'}/accept-invite?token=${inviteToken}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">You've Been Invited to Join the Pacific Engineering Client Portal</h2>
        <p>Hello ${invitedName || invitedEmail},</p>
        <p>${user.full_name} from ${companyName || 'their company'} has invited you to join their team on the Pacific Engineering Client Portal.</p>
        <p><strong>Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
        <p>Click the button below to accept this invitation and set up your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: invitedEmail,
      subject: `Team Invitation from ${companyName || user.full_name}`,
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});