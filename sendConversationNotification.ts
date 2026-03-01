import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { messageId, conversationId } = await req.json();

    // Fetch message and conversation
    const message = await base44.asServiceRole.entities.ConversationMessage.filter({ id: messageId });
    const conversation = await base44.asServiceRole.entities.Conversation.filter({ id: conversationId });

    if (!message.length || !conversation.length) {
      return Response.json({ error: 'Message or conversation not found' }, { status: 404 });
    }

    const msg = message[0];
    const conv = conversation[0];

    // Determine recipients (all participants except sender)
    const recipients = conv.participants.filter(email => email !== msg.sender_email);

    // Fetch notification preferences for each recipient
    for (const recipientEmail of recipients) {
      const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
        user_email: recipientEmail,
        event_type: 'message_received'
      });

      const pref = prefs.length > 0 ? prefs[0] : { email_enabled: true, sms_enabled: false };

      // Send email notification if enabled
      if (pref.email_enabled) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `New message in ${conv.title}`,
          body: `
            <h2>New Message from ${msg.sender_name}</h2>
            <p><strong>Project:</strong> ${conv.title}</p>
            <p><strong>Message:</strong></p>
            <p>${msg.message}</p>
            ${msg.attachments?.length > 0 ? `<p><strong>${msg.attachments.length} file(s) attached</strong></p>` : ''}
            <p><a href="https://yourdomain.com/client-portal">View in Portal</a></p>
          `
        });
      }

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: recipientEmail,
        type: 'message_received',
        title: 'New Message',
        message: `${msg.sender_name} sent a message in ${conv.title}`,
        related_entity: 'Conversation',
        related_id: conversationId,
        priority: 'medium',
        read: false
      });
    }

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});