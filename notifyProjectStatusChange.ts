import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (event.type !== 'update' || event.entity_name !== 'Project') {
      return Response.json({ success: true, message: 'Not a project update' });
    }

    // Check if status changed
    if (!old_data || data.status === old_data.status) {
      return Response.json({ success: true, message: 'Status unchanged' });
    }

    const statusChangeMessage = `Project "${data.project_name}" status changed from "${old_data.status}" to "${data.status}".`;

    // Notify client
    if (data.client_email) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: data.client_email,
        type: 'project_update',
        title: 'Project Status Update',
        message: statusChangeMessage,
        link: `/ProjectDetail?id=${data.id}`,
        priority: 'high'
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: data.client_email,
        from_name: 'Pacific Engineering Portal',
        subject: `Project Status Update: ${data.project_name}`,
        body: `
          <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0B67A6 0%, #0891B2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Project Status Update</h1>
            </div>
            <div style="padding: 30px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
              <p>Hello ${data.client_name || 'valued client'},</p>
              <p>${statusChangeMessage}</p>
              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Project:</strong> ${data.project_name}</p>
                <p style="margin: 5px 0;"><strong>Previous Status:</strong> ${old_data.status}</p>
                <p style="margin: 5px 0;"><strong>New Status:</strong> ${data.status}</p>
                ${data.progress_percentage ? `<p style="margin: 5px 0;"><strong>Progress:</strong> ${data.progress_percentage}%</p>` : ''}
              </div>
              <p>Log in to your client portal for more details.</p>
            </div>
          </body>
          </html>
        `
      });
    }

    // Notify assigned PM
    if (data.assigned_pm_email && data.assigned_pm_email !== data.client_email) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: data.assigned_pm_email,
        type: 'project_update',
        title: 'Project Status Changed',
        message: `You updated project "${data.project_name}" status to "${data.status}".`,
        link: `/ProjectDetail?id=${data.id}`,
        priority: 'medium'
      });
    }

    return Response.json({ success: true, notifications_sent: 2 });

  } catch (error) {
    console.error('Error notifying project status change:', error);
    return Response.json({ 
      error: 'Failed to send notifications',
      details: error.message 
    }, { status: 500 });
  }
});