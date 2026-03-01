/**
 * GENERATE WEEKLY DIGEST
 * 
 * Automatically generates and sends weekly performance summaries
 * to clients and internal teams with key metrics and insights.
 * 
 * This is called via automation on Monday mornings.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function generateProjectDigest(base44, project) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tasks, milestones, messages, invoices] = await Promise.all([
    base44.entities.ProjectTask.filter({ project_id: project.id }),
    base44.entities.ProjectMilestone.filter({ project_id: project.id }),
    base44.entities.ProjectMessage.filter({ project_id: project.id }),
    base44.entities.Invoice.filter({ project_id: project.id }),
  ]);

  const completedThisWeek = tasks.filter(t => 
    t.status === 'completed' && new Date(t.updated_date) > new Date(oneWeekAgo)
  ).length;

  const milestonesCompleted = milestones.filter(m => 
    m.status === 'completed' && new Date(m.updated_date) > new Date(oneWeekAgo)
  ).length;

  const totalProgress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
    : 0;

  const budgetUtilization = project.budget > 0
    ? Math.round((invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) / project.budget) * 100)
    : 0;

  const recentMessages = messages.slice(-5).map(m => ({
    sender: m.sender_name,
    preview: m.message.substring(0, 100),
  }));

  return {
    project_name: project.project_name,
    status: project.status,
    progress: totalProgress,
    completed_this_week: completedThisWeek,
    milestones_completed: milestonesCompleted,
    total_tasks: tasks.length,
    completed_tasks: tasks.filter(t => t.status === 'completed').length,
    budget_utilization: budgetUtilization,
    recent_activity: recentMessages,
    overdue_tasks: tasks.filter(t => t.status !== 'completed' && new Date(t.end_date) < new Date()).length,
  };
}

async function generateHTMLReport(digests, clientName) {
  const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0B67A6 0%, #0A5A8A 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .project-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .project-card h3 { margin-top: 0; color: #0B67A6; }
        .metric { display: inline-block; margin-right: 30px; margin-bottom: 10px; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .progress-bar { background: #e0e0e0; border-radius: 4px; height: 8px; margin: 10px 0; overflow: hidden; }
        .progress-fill { background: #4CAF50; height: 100%; }
        .alert { padding: 15px; border-radius: 4px; margin: 15px 0; }
        .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .alert-success { background: #d4edda; border-left: 4px solid #28a745; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Weekly Project Summary</h1>
          <p>${new Date().toLocaleDateString()}</p>
        </div>

        ${digests.map(d => `
          <div class="project-card">
            <h3>${d.project_name}</h3>
            <p>Status: <strong>${d.status}</strong></p>
            
            <div class="metric">
              <div class="metric-label">Overall Progress</div>
              <div class="metric-value">${d.progress}%</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${d.progress}%"></div>
              </div>
            </div>

            <div class="metric">
              <div class="metric-label">Tasks Completed</div>
              <div class="metric-value">${d.completed_tasks}/${d.total_tasks}</div>
            </div>

            <div class="metric">
              <div class="metric-label">This Week</div>
              <div class="metric-value">${d.completed_this_week}</div>
            </div>

            <div class="metric">
              <div class="metric-label">Budget Used</div>
              <div class="metric-value">${d.budget_utilization}%</div>
            </div>

            ${d.overdue_tasks > 0 ? `
              <div class="alert alert-warning">
                <strong>⚠️ ${d.overdue_tasks} overdue task${d.overdue_tasks > 1 ? 's' : ''}</strong> requiring attention.
              </div>
            ` : ''}

            ${d.completed_this_week > 0 ? `
              <div class="alert alert-success">
                <strong>✓ Great progress!</strong> ${d.completed_this_week} tasks and ${d.milestones_completed} milestones completed this week.
              </div>
            ` : ''}
          </div>
        `).join('')}

        <div class="footer">
          <p>This is an automated weekly summary from your project management system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return reportHTML;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { project_ids } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log(`[generateWeeklyDigest] Generating for ${project_ids?.length || 'all'} projects`);

    // Fetch projects
    let projects;
    if (project_ids && project_ids.length > 0) {
      projects = await Promise.all(
        project_ids.map(id => base44.entities.Project.filter({ id }).then(arr => arr[0]))
      );
    } else {
      projects = await base44.entities.Project.filter({ status: { $in: ['Planning', 'In Progress', 'Under Review'] } });
    }

    // Generate digest for each project
    const digests = await Promise.all(
      projects.map(p => generateProjectDigest(base44, p))
    );

    // Get recipients from report schedule
    const schedules = await base44.entities.ReportTemplate.filter({ frequency: 'weekly' });
    const recipientSet = new Set();
    schedules.forEach(s => {
      if (s.recipients) {
        s.recipients.forEach(r => recipientSet.add(r));
      }
    });

    // Generate HTML report
    const htmlReport = await generateHTMLReport(digests, user.full_name);

    // Send emails
    const recipients = Array.from(recipientSet);
    for (const recipient of recipients) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `Weekly Project Summary - ${new Date().toLocaleDateString()}`,
          body: htmlReport,
        });
      } catch (err) {
        console.error(`[generateWeeklyDigest] Failed to send email to ${recipient}:`, err);
      }
    }

    console.log(`[generateWeeklyDigest] Sent to ${recipients.length} recipients`);

    return Response.json({
      success: true,
      projects_processed: projects.length,
      recipients_emailed: recipients.length,
      digests,
    });
  } catch (error) {
    console.error('[generateWeeklyDigest] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});