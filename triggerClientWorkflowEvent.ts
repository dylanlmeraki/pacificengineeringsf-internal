/**
 * TRIGGER CLIENT WORKFLOW EVENT
 * 
 * Call this function whenever a significant project event occurs
 * It will automatically execute all matching automations
 * 
 * Usage Examples:
 *   - After task status update: triggerClientWorkflowEvent('task_status_changed', taskId, projectId, clientEmail)
 *   - After milestone approval: triggerClientWorkflowEvent('milestone_approved', milestoneId, projectId, clientEmail)
 *   - After invoice creation: triggerClientWorkflowEvent('invoice_created', invoiceId, projectId, clientEmail)
 * 
 * Node.js migration note: This will use environment variables and Prisma queries
 */

export default async function triggerClientWorkflowEvent(req) {
  try {
    const { trigger_event, trigger_entity_id, project_id, client_email } = req.body;

    // Validate inputs
    if (!trigger_event || !project_id || !client_email) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(
      `[triggerClientWorkflowEvent] Event: ${trigger_event}, Project: ${project_id}, Entity: ${trigger_entity_id}`
    );

    // Call the execution function
    const executeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/client-workflows/execute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_event,
          trigger_entity_id,
          project_id,
          client_email,
        }),
      }
    );

    if (!executeResponse.ok) {
      throw new Error(`Execution failed: ${executeResponse.statusText}`);
    }

    const result = await executeResponse.json();
    return Response.json(result);
  } catch (error) {
    console.error("[triggerClientWorkflowEvent] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * HELPER: Call from within component when event occurs
 * 
 * Usage in component:
 *   import { triggerWorkflowEvent } from "@/lib/workflowHelpers";
 *   
 *   const handleTaskComplete = async (taskId, projectId) => {
 *     await triggerWorkflowEvent("task_completed", taskId, projectId, user.email);
 *   };
 */
export async function triggerWorkflowEvent(
  triggerEvent,
  entityId,
  projectId,
  clientEmail
) {
  try {
    const response = await fetch("/api/client-workflows/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger_event: triggerEvent,
        trigger_entity_id: entityId,
        project_id: projectId,
        client_email: clientEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger workflow: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[triggerWorkflowEvent] Error:", error);
    throw error;
  }
}