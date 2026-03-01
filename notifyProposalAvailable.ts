import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { proposal_id } = await req.json();

    const proposal = await base44.asServiceRole.entities.Proposal.filter({ id: proposal_id });
    if (!proposal || proposal.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposalData = proposal[0];

    // Send to all recipients
    const recipients = proposalData.recipient_emails || [];
    
    for (const email of recipients) {
      await base44.functions.invoke('createNotificationForEvent', {
        recipientEmail: email,
        eventType: 'proposal_available',
        title: 'New Proposal Ready for Review',
        message: `A new proposal "${proposalData.title}" is ready for your review. Amount: $${proposalData.amount?.toLocaleString() || 'N/A'}`,
        link: `/client-portal?tab=proposals`,
        priority: 'high',
        metadata: {
          proposal_id: proposalData.id
        }
      });
    }

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});