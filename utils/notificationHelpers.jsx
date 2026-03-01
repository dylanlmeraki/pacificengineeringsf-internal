import { portalApi } from "@/components/services/portalApi";

/**
 * Centralized notification creation with consistent error handling
 */
export async function createNotification({
  recipientEmail,
  type,
  title,
  message,
  link = "",
  priority = "medium",
  relatedId = "",
  metadata = {}
}) {
  try {
    await portalApi.functions.invoke('createNotification', {
      recipient_email: recipientEmail,
      type,
      title,
      message,
      link,
      priority,
      related_id: relatedId,
      metadata
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error };
  }
}

/**
 * Notify all admins
 */
export async function notifyAdmins({
  type,
  title,
  message,
  link = "",
  priority = "medium",
  metadata = {}
}) {
  try {
    const adminUsers = await portalApi.entities.User.filter({ role: 'admin' });
    const results = await Promise.allSettled(
      adminUsers.map(admin =>
        createNotification({
          recipientEmail: admin.email,
          type,
          title,
          message,
          link,
          priority,
          metadata
        })
      )
    );
    
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} admin notifications failed`);
    }
    
    return { success: true, sent: results.length - failures.length, failed: failures.length };
  } catch (error) {
    console.error('Failed to notify admins:', error);
    return { success: false, error };
  }
}

/**
 * Notify team members assigned to a project
 */
export async function notifyProjectTeam({
  projectId,
  type,
  title,
  message,
  link = "",
  priority = "medium",
  excludeEmails = []
}) {
  try {
    const project = await portalApi.entities.Project.get(projectId);
    if (!project || !project.assigned_team_members) {
      return { success: true, sent: 0 };
    }

    const teamEmails = project.assigned_team_members.filter(
      email => !excludeEmails.includes(email)
    );

    const results = await Promise.allSettled(
      teamEmails.map(email =>
        createNotification({
          recipientEmail: email,
          type,
          title,
          message,
          link,
          priority,
          metadata: { project_id: projectId }
        })
      )
    );

    const failures = results.filter(r => r.status === 'rejected');
    return { success: true, sent: results.length - failures.length, failed: failures.length };
  } catch (error) {
    console.error('Failed to notify project team:', error);
    return { success: false, error };
  }
}