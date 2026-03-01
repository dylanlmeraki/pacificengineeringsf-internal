import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { 
      recipientEmail, 
      eventType, 
      title, 
      message, 
      link, 
      priority = 'normal',
      metadata = {}
    } = await req.json();

    if (!recipientEmail || !eventType || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check user's notification preferences
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_email: recipientEmail,
      event_type: eventType
    });

    const pref = prefs[0] || {
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true
    };

    // Create in-app notification if enabled
    if (pref.in_app_enabled) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: recipientEmail,
        type: eventType,
        title,
        message,
        link,
        priority,
        read: false,
        metadata
      });
    }

    // Send email notification if enabled
    if (pref.email_enabled) {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #1e40af, #0891b2); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${title}</h2>
          </div>
          <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151;">${message}</p>
            ${link ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${link}" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Details
                </a>
              </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
              You're receiving this notification because you have email notifications enabled for ${eventType.replace(/_/g, ' ')}.
              <br>You can manage your notification preferences in your portal settings.
            </p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Pacific Engineering',
        to: recipientEmail,
        subject: title,
        body: emailBody
      });
    }

    // TODO: Implement SMS notifications when SMS service is configured
    // if (pref.sms_enabled) {
    //   await sendSMS(recipientPhone, message);
    // }

    return Response.json({ success: true, channels: {
      in_app: pref.in_app_enabled,
      email: pref.email_enabled,
      sms: pref.sms_enabled
    }});
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});