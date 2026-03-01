import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { milestone_id } = await req.json();

    const milestone = await base44.asServiceRole.entities.ProjectMilestone.filter({ id: milestone_id });
    if (!milestone || milestone.length === 0) {
      return Response.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const milestoneData = milestone[0];
    const project = await base44.asServiceRole.entities.Project.filter({ id: milestoneData.project_id });
    
    if (!project || project.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = project[0];

    // Notify client
    await base44.functions.invoke('createNotificationForEvent', {
      recipientEmail: projectData.client_email,
      eventType: 'milestone_reached',
      title: 'Milestone Reached',
      message: `The milestone "${milestoneData.milestone_name}" has been completed for project ${projectData.project_name}.`,
      link: `/client-portal?tab=projects&project=${projectData.id}`,
      priority: 'high',
      metadata: {
        project_id: projectData.id,
        milestone_id: milestoneData.id
      }
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});