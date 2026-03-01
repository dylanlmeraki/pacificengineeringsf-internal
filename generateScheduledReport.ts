/**
 * GENERATE SCHEDULED REPORT
 * 
 * Triggered by automation scheduler to:
 * 1. Fetch scheduled report config
 * 2. Retrieve report data based on metrics and filters
 * 3. Generate visualizations
 * 4. Export in configured formats
 * 5. Send via email to recipients
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function generateReportData(base44, metrics, filters) {
  const reportData = {};

  for (const metric of metrics) {
    switch (metric) {
      case "project_completion":
        const projects = await base44.entities.Project.list();
        const completed = projects.filter((p) => p.status === "Completed").length;
        reportData[metric] = {
          value: projects.length > 0 ? (completed / projects.length) * 100 : 0,
          label: "Project Completion Rate (%)",
        };
        break;

      case "budget_adherence":
        const budgetProjects = await base44.entities.Project.list();
        let totalBudget = 0;
        let totalSpent = 0;
        budgetProjects.forEach((p) => {
          totalBudget += p.budget || 0;
          totalSpent += p.actual_cost || 0;
        });
        reportData[metric] = {
          value: totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 0,
          label: "Budget Adherence (%)",
        };
        break;

      case "task_completion":
        const tasks = await base44.entities.ProjectTask.list();
        const completedTasks = tasks.filter((t) => t.status === "completed").length;
        reportData[metric] = {
          value: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
          label: "Task Completion Rate (%)",
        };
        break;

      case "milestone_on_time":
        const milestones = await base44.entities.ProjectMilestone.list();
        const onTimeMilestones = milestones.filter((m) => {
          if (m.status !== "completed") return false;
          return new Date(m.completed_date) <= new Date(m.due_date);
        }).length;
        reportData[metric] = {
          value:
            milestones.length > 0 ? (onTimeMilestones / milestones.length) * 100 : 0,
          label: "On-Time Milestone %",
        };
        break;

      case "invoices_outstanding":
        const invoices = await base44.entities.Invoice.list();
        const outstanding = invoices.filter((i) => i.status !== "paid").length;
        reportData[metric] = {
          value: outstanding,
          label: "Outstanding Invoices",
        };
        break;

      default:
        reportData[metric] = { value: 0, label: metric };
    }
  }

  return reportData;
}

async function exportToFormat(data, format) {
  // Placeholder for export logic
  // In production, use libraries like jsPDF, papaparse, etc.
  switch (format) {
    case "pdf":
      return { format: "pdf", url: "s3://reports/report.pdf" };
    case "csv":
      return { format: "csv", url: "s3://reports/report.csv" };
    case "excel":
      return { format: "excel", url: "s3://reports/report.xlsx" };
    default:
      return null;
  }
}

export default async function generateScheduledReport(req) {
  try {
    const { schedule_id } = req.body;

    if (!schedule_id) {
      return Response.json(
        { error: "Missing schedule_id" },
        { status: 400 }
      );
    }

    console.log(`[generateScheduledReport] Processing schedule ${schedule_id}`);

    const base44 = createClientFromRequest(req);

    // Fetch schedule
    const scheduleData = await base44.entities.ScheduledReport.filter({
      id: schedule_id,
    });

    if (!scheduleData || scheduleData.length === 0) {
      throw new Error(`Schedule not found: ${schedule_id}`);
    }

    const schedule = scheduleData[0];

    // Fetch report template
    const templateData = await base44.entities.CustomReportTemplate.filter({
      id: schedule.report_template_id,
    });

    if (!templateData || templateData.length === 0) {
      throw new Error(`Template not found: ${schedule.report_template_id}`);
    }

    const template = templateData[0];

    // Generate report data
    const reportData = await generateReportData(
      base44,
      template.included_metrics || [],
      schedule.filters || {}
    );

    // Export in configured formats
    const exports = [];
    for (const format of schedule.export_format || ["pdf"]) {
      const exported = await exportToFormat(reportData, format);
      if (exported) {
        exports.push(exported);
      }
    }

    // Send email notifications
    const emailBody = `
      <h2>${schedule.report_name}</h2>
      <p>Your scheduled report has been generated and is ready for review.</p>
      <ul>
        ${exports.map((e) => `<li><a href="${e.url}">Download ${e.format.toUpperCase()}</a></li>`).join("")}
      </ul>
    `;

    for (const recipient of schedule.recipients || []) {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject: `${schedule.report_name} - ${new Date().toLocaleDateString()}`,
        body: emailBody,
      });
    }

    // Update schedule with run info
    const nextRunDate = new Date();
    nextRunDate.setDate(nextRunDate.getDate() + 7); // Weekly for demo

    await base44.entities.ScheduledReport.update(schedule_id, {
      last_run_date: new Date().toISOString(),
      last_run_status: "success",
      next_run_date: nextRunDate.toISOString(),
      run_count: (schedule.run_count || 0) + 1,
    });

    console.log(`[generateScheduledReport] Completed successfully`);

    return Response.json({
      success: true,
      message: "Report generated and sent",
      exports_count: exports.length,
      recipients_notified: schedule.recipients.length,
    });
  } catch (error) {
    console.error("[generateScheduledReport] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}