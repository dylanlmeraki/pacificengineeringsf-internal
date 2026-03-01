/**
 * CLIENT WORKFLOW AUTOMATION EXECUTOR
 * 
 * Triggered when specific project events occur (task complete, milestone approved, etc.)
 * Executes configured automations (send notifications, create invoices, etc.)
 * 
 * Usage: Called by event listeners in ClientPortal and backend webhooks
 * 
 * Portable note: This will be migrated to use Prisma queries instead of base44.entities
 */

import { base44 } from "@/api/base44Client";

async function executeClientWorkflowAutomation(req) {
  try {
    const { trigger_event, trigger_entity_id, project_id, client_email } = req.body;

    if (!trigger_event || !project_id || !client_email) {
      return Response.json(
        { error: "Missing required fields: trigger_event, project_id, client_email" },
        { status: 400 }
      );
    }

    console.log(`[executeClientWorkflowAutomation] Event: ${trigger_event}, Project: ${project_id}`);

    // Fetch all active automations for this project that match the trigger event
    const automations = await base44.entities.ClientWorkflowAutomation.filter({
      project_id,
      client_email,
      trigger_event,
      is_active: true,
    });

    if (automations.length === 0) {
      console.log(`[executeClientWorkflowAutomation] No automations found for ${trigger_event}`);
      return Response.json({ message: "No automations to execute", count: 0 });
    }

    console.log(
      `[executeClientWorkflowAutomation] Found ${automations.length} automation(s) to execute`
    );

    // Execute each automation
    const results = await Promise.all(
      automations.map((automation) =>
        executeAutomationAction(automation, trigger_entity_id, project_id)
      )
    );

    // Log results
    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(
      `[executeClientWorkflowAutomation] Executed: ${successful} success, ${failed} failed`
    );

    return Response.json({
      message: "Automations executed",
      count: automations.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error("[executeClientWorkflowAutomation] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Execute a single automation action
 */
async function executeAutomationAction(automation, trigger_entity_id, project_id) {
  const executionLog = automation.execution_log || [];
  const logEntry = {
    triggered_at: new Date().toISOString(),
    trigger_entity_id,
    status: "pending",
  };

  try {
    console.log(
      `[executeAutomationAction] Automation: ${automation.automation_name}, Action: ${automation.action_type}`
    );

    let actionResult;

    switch (automation.action_type) {
      case "send_notification":
        actionResult = await sendNotification(automation, trigger_entity_id);
        break;

      case "send_email":
        actionResult = await sendEmailAction(automation, trigger_entity_id);
        break;

      case "create_invoice":
        actionResult = await createInvoiceAction(automation, project_id);
        break;

      case "update_status":
        actionResult = await updateStatusAction(automation, trigger_entity_id);
        break;

      case "assign_task":
        actionResult = await assignTaskAction(automation, trigger_entity_id);
        break;

      default:
        throw new Error(`Unknown action type: ${automation.action_type}`);
    }

    logEntry.status = "success";

    // Update automation execution count and last_executed
    await base44.entities.ClientWorkflowAutomation.update(automation.id, {
      execution_count: (automation.execution_count || 0) + 1,
      last_executed: new Date().toISOString(),
      execution_log: [...executionLog, logEntry],
    });

    console.log(
      `[executeAutomationAction] Success: ${automation.automation_name}`
    );

    return { status: "success", automation_id: automation.id, action_result: actionResult };
  } catch (error) {
    console.error(
      `[executeAutomationAction] Error in ${automation.automation_name}:`,
      error.message
    );

    logEntry.status = "failed";
    logEntry.error_message = error.message;

    // Update automation with failure log
    try {
      await base44.entities.ClientWorkflowAutomation.update(automation.id, {
        execution_log: [...executionLog, logEntry],
      });
    } catch (updateError) {
      console.error("[executeAutomationAction] Failed to log error:", updateError);
    }

    return { status: "failed", automation_id: automation.id, error: error.message };
  }
}

/**
 * Send in-app notification to client
 */
async function sendNotification(automation, trigger_entity_id) {
  const recipients = automation.notification_recipients || [];

  const notificationPromises = recipients.map((email) =>
    base44.entities.Notification.create({
      recipient_email: email,
      type: "project_update",
      title: automation.automation_name,
      message: `Automated notification from workflow: ${automation.automation_name}`,
      priority: "normal",
      related_id: trigger_entity_id,
      metadata: { automation_id: automation.id },
    })
  );

  const results = await Promise.all(notificationPromises);
  console.log(`[sendNotification] Sent to ${results.length} recipients`);
  return { notifications_sent: results.length };
}

/**
 * Send email based on automation config
 */
async function sendEmailAction(automation, trigger_entity_id) {
  const { subject = "Project Update" } = automation.action_config || {};
  const recipients = automation.notification_recipients || [];

  const emailPromises = recipients.map((email) =>
    base44.integrations.Core.SendEmail({
      to: email,
      subject,
      body: `<p>Automated email from workflow: ${automation.automation_name}</p>`,
    })
  );

  const results = await Promise.all(emailPromises);
  console.log(`[sendEmailAction] Sent to ${results.length} recipients`);
  return { emails_sent: results.length };
}

/**
 * Auto-create invoice on milestone approval
 */
async function createInvoiceAction(automation, project_id) {
  const project = await base44.entities.Project.filter({
    id: project_id,
  });

  if (!project || project.length === 0) {
    throw new Error(`Project not found: ${project_id}`);
  }

  const invoice = await base44.entities.Invoice.create({
    project_id,
    invoice_number: `INV-${Date.now()}`,
    client_email: automation.client_email,
    total_amount: automation.action_config.amount || 0,
    amount_paid: 0,
    amount_due: automation.action_config.amount || 0,
    status: "Draft",
  });

  console.log(`[createInvoiceAction] Created invoice: ${invoice.id}`);
  return { invoice_id: invoice.id };
}

/**
 * Update status of related entity
 */
async function updateStatusAction(automation, trigger_entity_id) {
  const { entity_type = "ProjectTask", new_status } = automation.action_config || {};

  if (!new_status) {
    throw new Error("update_status action requires new_status in action_config");
  }

  const updated = await base44.entities[entity_type].update(trigger_entity_id, {
    status: new_status,
  });

  console.log(`[updateStatusAction] Updated ${entity_type} to ${new_status}`);
  return { entity_type, new_status };
}

/**
 * Assign task to team members
 */
async function assignTaskAction(automation, trigger_entity_id) {
  const { assigned_to = [] } = automation.action_config || {};

  if (assigned_to.length === 0) {
    throw new Error("assign_task action requires assigned_to in action_config");
  }

  const updated = await base44.entities.ProjectTask.update(trigger_entity_id, {
    assigned_to,
  });

  console.log(`[assignTaskAction] Assigned task to ${assigned_to.length} people`);
  return { assigned_to };
}

export default executeClientWorkflowAutomation;