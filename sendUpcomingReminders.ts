import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays, isBefore, isAfter, differenceInDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const reminderWindow = addDays(now, 3);
    const reminders = [];

    // Check upcoming milestones
    const milestones = await base44.asServiceRole.entities.ProjectMilestone.list();
    const upcomingMilestones = milestones.filter(m => {
      if (m.status === 'Completed' || m.status === 'Cancelled') return false;
      const dueDate = new Date(m.due_date);
      return isAfter(dueDate, now) && isBefore(dueDate, reminderWindow);
    });

    for (const milestone of upcomingMilestones) {
      const project = await base44.asServiceRole.entities.Project.get(milestone.project_id);
      if (!project) continue;

      const daysUntilDue = differenceInDays(new Date(milestone.due_date), now);
      
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: project.client_email,
        type: 'milestone',
        title: 'Upcoming Milestone Deadline',
        message: `Milestone "${milestone.milestone_name}" for ${project.project_name} is due in ${daysUntilDue} days.`,
        link: `/ProjectDetail?id=${project.id}`,
        priority: daysUntilDue <= 1 ? 'urgent' : 'high'
      });

      reminders.push({ type: 'milestone', name: milestone.milestone_name, days: daysUntilDue });
    }

    // Check upcoming invoice due dates
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const upcomingInvoices = invoices.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      const dueDate = new Date(i.due_date);
      return isAfter(dueDate, now) && isBefore(dueDate, reminderWindow);
    });

    for (const invoice of upcomingInvoices) {
      const daysUntilDue = differenceInDays(new Date(invoice.due_date), now);
      
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: invoice.client_email,
        type: 'invoice',
        title: 'Invoice Payment Reminder',
        message: `Invoice ${invoice.invoice_number} ($${invoice.total_amount.toLocaleString()}) is due in ${daysUntilDue} days.`,
        priority: daysUntilDue <= 1 ? 'urgent' : 'high'
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: invoice.client_email,
        from_name: 'Pacific Engineering Billing',
        subject: `Payment Reminder: Invoice ${invoice.invoice_number}`,
        body: `
          <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0B67A6;">Payment Reminder</h2>
            <p>This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> is due in ${daysUntilDue} days.</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${invoice.total_amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
            <p>Please log in to your client portal to view and pay your invoice.</p>
          </body>
          </html>
        `
      });

      reminders.push({ type: 'invoice', number: invoice.invoice_number, days: daysUntilDue });
    }

    // Check expiring proposals
    const proposals = await base44.asServiceRole.entities.Proposal.list();
    const expiringProposals = proposals.filter(p => {
      if (!p.expiration_date || p.status === 'signed' || p.status === 'declined') return false;
      const expiryDate = new Date(p.expiration_date);
      return isAfter(expiryDate, now) && isBefore(expiryDate, reminderWindow);
    });

    for (const proposal of expiringProposals) {
      const daysUntilExpiry = differenceInDays(new Date(proposal.expiration_date), now);
      
      if (proposal.recipient_emails && proposal.recipient_emails.length > 0) {
        for (const email of proposal.recipient_emails) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: email,
            type: 'proposal',
            title: 'Proposal Expiring Soon',
            message: `Proposal "${proposal.title}" expires in ${daysUntilExpiry} days. Please review and respond.`,
            priority: daysUntilExpiry <= 1 ? 'urgent' : 'high'
          });
        }
      }

      reminders.push({ type: 'proposal', title: proposal.title, days: daysUntilExpiry });
    }

    return Response.json({ 
      success: true,
      reminders_sent: reminders.length,
      reminders
    });

  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json({ 
      error: 'Failed to send reminders',
      details: error.message 
    }, { status: 500 });
  }
});