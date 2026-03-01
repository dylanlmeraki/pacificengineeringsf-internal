import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { change_order_id } = await req.json();

    const changeOrder = await base44.asServiceRole.entities.ChangeOrder.filter({ id: change_order_id });
    if (!changeOrder || changeOrder.length === 0) {
      return Response.json({ error: 'Change order not found' }, { status: 404 });
    }

    const coData = changeOrder[0];
    const project = await base44.asServiceRole.entities.Project.filter({ id: coData.project_id });
    
    if (!project || project.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = project[0];

    await base44.functions.invoke('createNotificationForEvent', {
      recipientEmail: projectData.client_email,
      eventType: 'change_order_available',
      title: 'Change Order Requires Approval',
      message: `A change order "${coData.title}" for project ${projectData.project_name} needs your approval. Cost impact: $${coData.cost_impact?.toLocaleString() || 'TBD'}`,
      link: `/client-portal?tab=projects&project=${projectData.id}`,
      priority: coData.priority === 'Urgent' ? 'urgent' : 'high',
      metadata: {
        project_id: projectData.id,
        change_order_id: coData.id
      }
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});