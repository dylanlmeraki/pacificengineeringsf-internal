/**
 * AI PROJECT ASSISTANT
 * 
 * Provides intelligent insights for project managers and clients:
 * - Summarizes project status, risks, and deadlines
 * - Drafts project update reports
 * - Answers queries about project details
 * - Suggests task assignments and identifies bottlenecks
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function gatherProjectData(base44, projectId) {
  const [project, tasks, milestones, invoices, messages] = await Promise.all([
    base44.entities.Project.filter({ id: projectId }).then(arr => arr[0]),
    base44.entities.ProjectTask.filter({ project_id: projectId }),
    base44.entities.ProjectMilestone.filter({ project_id: projectId }),
    base44.entities.Invoice.filter({ project_id: projectId }),
    base44.entities.ProjectMessage.filter({ project_id: projectId }),
  ]);

  const tasksByStatus = {
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    not_started: tasks.filter(t => t.status === 'not_started').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };

  const milestonesByStatus = {
    completed: milestones.filter(m => m.status === 'completed').length,
    pending: milestones.filter(m => m.status !== 'completed').length,
  };

  const financials = {
    budget: project?.budget || 0,
    spent: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
    outstanding: invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
  };

  const progress = {
    overall: tasks.length > 0 ? Math.round((tasksByStatus.completed / tasks.length) * 100) : 0,
    milestones: milestones.length > 0 ? Math.round((milestonesStatus.completed / milestones.length) * 100) : 0,
  };

  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && new Date(t.end_date) < new Date()
  );

  const upcomingDeadlines = tasks.filter(t => {
    const dueDate = new Date(t.end_date);
    const now = new Date();
    return t.status !== 'completed' && dueDate > now && dueDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  return {
    project,
    tasks: {
      total: tasks.length,
      byStatus: tasksByStatus,
      overdue: overdueTasks,
      upcoming: upcomingDeadlines,
      list: tasks,
    },
    milestones: {
      total: milestones.length,
      byStatus: milestonesStatus,
      list: milestones,
    },
    financials,
    progress,
    recentMessages: messages.slice(-5),
  };
}

async function generateInsights(base44, projectData) {
  const insights = [];

  // Timeline risks
  if (projectData.tasks.overdue.length > 0) {
    insights.push({
      type: "timeline_risk",
      severity: projectData.tasks.overdue.length > 3 ? "high" : "medium",
      title: `${projectData.tasks.overdue.length} Overdue Tasks`,
      description: `${projectData.tasks.overdue.length} tasks are overdue and need immediate attention.`,
    });
  }

  if (projectData.tasks.upcoming.length > 5) {
    insights.push({
      type: "bottleneck",
      severity: "medium",
      title: "High Task Density Next Week",
      description: `${projectData.tasks.upcoming.length} tasks are due in the next 7 days. Consider resource allocation.`,
    });
  }

  // Budget risks
  if (projectData.financials.spent > projectData.financials.budget * 0.8) {
    const percentUsed = Math.round((projectData.financials.spent / projectData.financials.budget) * 100);
    insights.push({
      type: "budget_risk",
      severity: percentUsed > 95 ? "critical" : "high",
      title: "Budget Nearly Exhausted",
      description: `${percentUsed}% of project budget has been spent.`,
    });
  }

  // Progress assessment
  if (projectData.progress.overall < 25 && projectData.tasks.total > 0) {
    insights.push({
      type: "trend",
      severity: "medium",
      title: "Project Progress Slower Than Expected",
      description: "Only 25% of tasks completed. Review timeline and resource allocation.",
    });
  }

  // Blocked tasks
  const blockedCount = projectData.tasks.byStatus.blocked;
  if (blockedCount > 0) {
    insights.push({
      type: "bottleneck",
      severity: blockedCount > 2 ? "high" : "medium",
      title: `${blockedCount} Blocked Tasks`,
      description: `${blockedCount} tasks are blocked and require resolution.`,
    });
  }

  return insights;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, project_id, query } = body;

    if (!project_id) {
      return Response.json({ error: "Missing project_id" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[AIProjectAssistant] Action: ${action}, Project: ${project_id}`);

    const projectData = await gatherProjectData(base44, project_id);

    if (!projectData.project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "summarize") {
      const insights = await generateInsights(base44, projectData);

      const prompt = `
        You are an expert project manager. Based on this project data, provide a concise executive summary:
        
        Project: ${projectData.project.project_name}
        Status: ${projectData.project.status}
        Overall Progress: ${projectData.progress.overall}%
        Tasks: ${projectData.tasks.byStatus.completed} completed, ${projectData.tasks.byStatus.in_progress} in progress, ${projectData.tasks.byStatus.not_started} not started
        Budget: $${projectData.financials.spent.toLocaleString()} / $${projectData.financials.budget.toLocaleString()}
        Key Issues: ${insights.map(i => i.title).join(", ")}
        
        Provide a brief summary (max 200 words) including:
        1. Current status
        2. Key risks or concerns
        3. Next immediate actions
      `;

      const summary = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      return Response.json({
        action: "summarize",
        summary: summary,
        insights,
        data: projectData,
      });
    }

    if (action === "draft_report") {
      const insights = await generateInsights(base44, projectData);

      const prompt = `
        Draft a professional project update report for "${projectData.project.project_name}":
        
        Overview:
        - Status: ${projectData.project.status}
        - Progress: ${projectData.progress.overall}%
        - Timeline: Started ${projectData.project.start_date}, Due ${projectData.project.end_date}
        
        Task Summary:
        - Completed: ${projectData.tasks.byStatus.completed}/${projectData.tasks.total}
        - In Progress: ${projectData.tasks.byStatus.in_progress}
        - Blocked: ${projectData.tasks.byStatus.blocked}
        
        Budget Status:
        - Budget: $${projectData.financials.budget.toLocaleString()}
        - Spent: $${projectData.financials.spent.toLocaleString()}
        - Outstanding: $${projectData.financials.outstanding.toLocaleString()}
        
        Key Issues: ${insights.map(i => i.description).join("; ")}
        
        Generate a professional HTML report (max 500 words) with sections for Overview, Progress, Budget, Risks, and Next Steps.
      `;

      const report = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      return Response.json({
        action: "draft_report",
        report,
        insights,
      });
    }

    if (action === "answer_query") {
      if (!query) {
        return Response.json({ error: "Missing query" }, { status: 400 });
      }

      const contextStr = `
        Project: ${projectData.project.project_name}
        Status: ${projectData.project.status}
        Progress: ${projectData.progress.overall}%
        Tasks: ${JSON.stringify(projectData.tasks.byStatus)}
        Budget: $${projectData.financials.spent}/$${projectData.financials.budget}
        Milestones: ${projectData.milestones.list.map(m => `${m.milestone_name} (${m.status})`).join(", ")}
      `;

      const prompt = `
        You are a project assistant. Answer this query about the project using the provided context.
        
        Context: ${contextStr}
        
        Query: ${query}
        
        Provide a helpful, accurate response based on the project data.
      `;

      const answer = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      return Response.json({
        action: "answer_query",
        query,
        answer,
      });
    }

    if (action === "suggest_assignments") {
      const unassignedTasks = projectData.tasks.list.filter(t => !t.assigned_to || t.assigned_to.length === 0);

      const prompt = `
        Analyze these unassigned tasks and suggest optimal assignments based on task complexity, priority, and dependencies.
        
        Unassigned Tasks:
        ${unassignedTasks.map(t => `- ${t.task_name} (Priority: ${t.priority}, Dependencies: ${t.dependencies?.length || 0})`).join("\n")}
        
        Provide suggestions in JSON format with task_id and recommended_priority for assignment.
      `;

      const suggestions = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  recommended_priority: { type: "string" },
                  reasoning: { type: "string" },
                },
              },
            },
          },
        },
        add_context_from_internet: false,
      });

      return Response.json({
        action: "suggest_assignments",
        suggestions: suggestions.suggestions,
      });
    }

    if (action === "identify_bottlenecks") {
      const insights = await generateInsights(base44, projectData);
      const bottlenecks = insights.filter(i => 
        i.type === "bottleneck" || i.type === "timeline_risk" || i.type === "dependency_issue"
      );

      const prompt = `
        Identify potential project bottlenecks and suggest mitigation strategies.
        
        Current Issues: ${bottlenecks.map(b => b.description).join("; ")}
        Blocked Tasks: ${projectData.tasks.byStatus.blocked}
        Overdue Tasks: ${projectData.tasks.overdue.length}
        
        Provide actionable recommendations to resolve bottlenecks.
      `;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      return Response.json({
        action: "identify_bottlenecks",
        bottlenecks,
        analysis,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[AIProjectAssistant] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});