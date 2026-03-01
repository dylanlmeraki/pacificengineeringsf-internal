import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { proposalId, recipientEmail } = await req.json();

    if (!proposalId || !recipientEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get proposal details
    const proposal = await base44.asServiceRole.entities.Proposal.get(proposalId);
    
    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Generate proposal URL
    const proposalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/ProposalDashboard?id=${proposalId}`;

    // Send email with proposal link
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0B67A6 0%, #0891B2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #0B67A6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Proposal Shared with You</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>A proposal has been shared with you by <strong>${user.full_name}</strong> from Pacific Engineering & Construction Inc.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #0B67A6;">${proposal.title}</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Proposal #:</strong> ${proposal.proposal_number}</p>
            ${proposal.amount ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Amount:</strong> $${proposal.amount.toLocaleString()}</p>` : ''}
          </div>

          <p>Click the button below to view the full proposal:</p>
          <p style="text-align: center;">
            <a href="${proposalUrl}" class="button">View Proposal</a>
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Or copy this link: <br/>
            <a href="${proposalUrl}" style="color: #0B67A6; word-break: break-all;">${proposalUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>Pacific Engineering & Construction Inc.</strong></p>
          <p>470 3rd St, San Francisco, CA 94107 | (415)-419-6079 | dylanl.peci@gmail.com</p>
        </div>
      </body>
      </html>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipientEmail,
      from_name: 'Pacific Engineering Portal',
      subject: `Proposal Shared: ${proposal.title}`,
      body: emailHtml
    });

    return Response.json({ 
      success: true,
      message: `Proposal shared with ${recipientEmail}`
    });

  } catch (error) {
    console.error('Error sharing proposal:', error);
    return Response.json({ 
      error: 'Failed to share proposal',
      details: error.message 
    }, { status: 500 });
  }
});