import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workflowId, projectId, triggerEvent } = await req.json();

    // Fetch workflow definition
    const workflows = await base44.asServiceRole.entities.WorkflowDefinition.filter({ id: workflowId });
    if (!workflows.length || !workflows[0].active) {
      return Response.json({ error: 'Workflow not found or inactive' }, { status: 404 });
    }

    const workflow = workflows[0];

    // Create execution record
    const execution = await base44.asServiceRole.entities.WorkflowExecution.create({
      workflow_id: workflowId,
      workflow_name: workflow.workflow_name,
      project_id: projectId,
      trigger_event: triggerEvent,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      completed_actions: [],
      failed_actions: [],
      execution_log: [{
        timestamp: new Date().toISOString(),
        action: 'workflow_started',
        result: 'success',
        details: { trigger: triggerEvent }
      }]
    });

    const executionLog = execution.execution_log;
    const completedActions = [];
    const failedActions = [];

    // Execute each action
    for (const action of workflow.actions || []) {
      try {
        // Check condition if exists
        if (action.condition && !evaluateCondition(action.condition, triggerEvent)) {
          executionLog.push({
            timestamp: new Date().toISOString(),
            action: action.action_type,
            result: 'skipped',
            details: { reason: 'condition not met' }
          });
          continue;
        }

        // Apply delay if specified
        if (action.delay_minutes > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay_minutes * 60 * 1000));
        }

        // Execute action based on type
        let actionResult;
        switch (action.action_type) {
          case 'send_notification':
            actionResult = await executeNotificationAction(base44, action.action_config, projectId);
            break;
          case 'create_task':
            actionResult = await executeTaskAction(base44, action.action_config, projectId);
            break;
          case 'update_project':
            actionResult = await executeProjectUpdateAction(base44, action.action_config, projectId);
            break;
          case 'assign_user':
            actionResult = await executeAssignUserAction(base44, action.action_config, projectId);
            break;
          case 'send_email':
            actionResult = await executeSendEmailAction(base44, action.action_config);
            break;
          case 'webhook':
            actionResult = await executeWebhookAction(action.action_config, { projectId, triggerEvent });
            break;
          default:
            throw new Error(`Unknown action type: ${action.action_type}`);
        }

        completedActions.push(action.action_type);
        executionLog.push({
          timestamp: new Date().toISOString(),
          action: action.action_type,
          result: 'success',
          details: actionResult
        });
      } catch (error) {
        failedActions.push({
          action_id: action.action_type,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        executionLog.push({
          timestamp: new Date().toISOString(),
          action: action.action_type,
          result: 'failed',
          details: { error: error.message }
        });
      }
    }

    // Update execution record
    await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, {
      status: failedActions.length > 0 ? 'completed' : 'completed',
      completed_actions: completedActions,
      failed_actions: failedActions,
      execution_log: executionLog,
      completed_at: new Date().toISOString()
    });

    // Update workflow execution count
    await base44.asServiceRole.entities.WorkflowDefinition.update(workflowId, {
      execution_count: (workflow.execution_count || 0) + 1,
      last_executed: new Date().toISOString()
    });

    return Response.json({
      success: true,
      execution_id: execution.id,
      completed: completedActions.length,
      failed: failedActions.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper functions
function evaluateCondition(condition, context) {
  // Simple condition evaluation - can be expanded
  return true;
}

async function executeNotificationAction(base44, config, projectId) {
  const notification = await base44.asServiceRole.entities.Notification.create({
    user_email: config.recipient_email,
    type: config.notification_type || 'project_update',
    title: config.title,
    message: config.message,
    related_entity: 'Project',
    related_id: projectId,
    priority: config.priority || 'medium',
    read: false
  });
  return { notification_id: notification.id };
}

async function executeTaskAction(base44, config, projectId) {
  const task = await base44.asServiceRole.entities.Task.create({
    project_id: projectId,
    task_type: config.task_type || 'Other',
    title: config.title,
    description: config.description,
    priority: config.priority || 'Medium',
    status: 'Pending',
    due_date: config.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_to: config.assigned_to,
    automated: true
  });
  return { task_id: task.id };
}

async function executeProjectUpdateAction(base44, config, projectId) {
  const updateData = {};
  if (config.status) updateData.status = config.status;
  if (config.progress_percentage !== undefined) updateData.progress_percentage = config.progress_percentage;
  if (config.notes) updateData.notes = config.notes;

  await base44.asServiceRole.entities.Project.update(projectId, updateData);
  return { updated_fields: Object.keys(updateData) };
}

async function executeAssignUserAction(base44, config, projectId) {
  const project = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  if (!project.length) throw new Error('Project not found');

  const currentTeam = project[0].assigned_team_members || [];
  if (!currentTeam.includes(config.user_email)) {
    await base44.asServiceRole.entities.Project.update(projectId, {
      assigned_team_members: [...currentTeam, config.user_email]
    });
  }
  return { assigned_user: config.user_email };
}

async function executeSendEmailAction(base44, config) {
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: config.recipient_email,
    subject: config.subject,
    body: config.body
  });
  return { email_sent: config.recipient_email };
}

async function executeWebhookAction(config, data) {
  const response = await fetch(config.webhook_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.auth_header ? { [config.auth_header]: config.auth_token } : {})
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }

  return { webhook_status: response.status };
}