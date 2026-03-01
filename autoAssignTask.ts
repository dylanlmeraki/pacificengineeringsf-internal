/**
 * AUTO ASSIGN TASK
 * 
 * Automatically assigns tasks to team members based on:
 * 1. Current workload
 * 2. Availability schedule
 * 3. Skill matching (if metadata provided)
 * 4. Task priority
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function calculateWorkload(base44, userEmail) {
  const tasks = await base44.entities.ProjectTask.filter({
    assigned_to: { $contains: userEmail },
    status: { $in: ["not_started", "in_progress"] },
  });
  
  return tasks.length;
}

async function checkAvailability(base44, userEmail, targetDate) {
  const availability = await base44.entities.TeamAvailability.filter({
    user_email: userEmail,
    date: targetDate,
  });

  if (availability.length === 0) return true; // No schedule = available

  const availRecord = availability[0];
  return availRecord.status === "available";
}

async function findBestAssignee(base44, projectId, taskPriority) {
  // Get all team members assigned to the project
  const assignments = await base44.entities.TeamAssignment.filter({
    project_id: projectId,
  });

  if (assignments.length === 0) {
    console.log("No team members assigned to project");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const candidates = [];

  for (const assignment of assignments) {
    const workload = await calculateWorkload(base44, assignment.user_email);
    const isAvailable = await checkAvailability(base44, assignment.user_email, today);

    if (isAvailable) {
      candidates.push({
        email: assignment.user_email,
        name: assignment.user_name,
        role: assignment.role,
        workload,
      });
    }
  }

  if (candidates.length === 0) {
    console.log("No available team members");
    return null;
  }

  // Sort by workload (ascending) to balance load
  candidates.sort((a, b) => a.workload - b.workload);

  // Prefer specific roles for high priority tasks
  if (taskPriority === "critical" || taskPriority === "high") {
    const managers = candidates.filter(c => 
      c.role === "project_manager" || c.role === "lead"
    );
    if (managers.length > 0) {
      return managers[0];
    }
  }

  return candidates[0];
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { task_id, project_id, priority } = body;

    if (!task_id || !project_id) {
      return Response.json(
        { error: "Missing task_id or project_id" },
        { status: 400 }
      );
    }

    console.log(`[autoAssignTask] Processing task ${task_id} for project ${project_id}`);

    const base44 = createClientFromRequest(req);

    // Find best assignee
    const assignee = await findBestAssignee(base44, project_id, priority || "medium");

    if (!assignee) {
      console.log("[autoAssignTask] No suitable assignee found");
      return Response.json({
        success: false,
        message: "No available team members found",
      });
    }

    // Assign task
    await base44.entities.ProjectTask.update(task_id, {
      assigned_to: [assignee.email],
    });

    // Notify assignee
    await base44.entities.Notification.create({
      recipient_email: assignee.email,
      type: "task",
      title: "New Task Assigned",
      message: `You have been automatically assigned a new task`,
      link: `/ProjectDetail?id=${project_id}`,
      priority: priority === "critical" ? "urgent" : "medium",
    });

    console.log(`[autoAssignTask] Assigned to ${assignee.email}`);

    return Response.json({
      success: true,
      assigned_to: assignee.email,
      assigned_name: assignee.name,
      workload: assignee.workload,
    });
  } catch (error) {
    console.error("[autoAssignTask] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});