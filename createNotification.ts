import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Support both old and new field names for backward compatibility
    const recipientEmail = payload.recipient_email || payload.user_email;
    const type = payload.type || payload.notification_type;
    const relatedId = payload.related_id || payload.relatedId;
    
    const { title, message, link, priority, metadata } = payload;

    if (!recipientEmail || !type || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: recipientEmail,
      type,
      title,
      message,
      link: link || '',
      priority: priority || 'medium',
      related_id: relatedId || '',
      metadata: metadata || {},
      read: false
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});