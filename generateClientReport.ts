import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportType, format, projectIds } = await req.json();

    // Fetch projects
    let projects;
    if (projectIds && projectIds.length > 0) {
      projects = await Promise.all(
        projectIds.map(id => base44.entities.Project.filter({ id }))
      );
      projects = projects.flat();
    } else {
      projects = await base44.entities.Project.filter({ client_email: user.email });
    }

    // Fetch related data
    const allMilestones = await Promise.all(
      projects.map(p => base44.entities.ProjectMilestone.filter({ project_id: p.id }))
    );
    const milestones = allMilestones.flat();

    const allChangeOrders = await Promise.all(
      projects.map(p => base44.entities.ChangeOrder.filter({ project_id: p.id }))
    );
    const changeOrders = allChangeOrders.flat();

    // Generate report data
    const reportData = {
      generatedDate: new Date().toISOString(),
      clientName: user.full_name,
      reportType,
      projects: projects.map(p => ({
        name: p.project_name,
        number: p.project_number,
        status: p.status,
        progress: p.progress_percentage,
        budget: p.budget,
        startDate: p.start_date,
        estimatedCompletion: p.estimated_completion,
        milestones: milestones.filter(m => m.project_id === p.id).length,
        completedMilestones: milestones.filter(m => m.project_id === p.id && m.status === 'Completed').length
      })),
      summary: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'In Progress').length,
        completedProjects: projects.filter(p => p.status === 'Completed').length,
        totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
        totalMilestones: milestones.length,
        completedMilestones: milestones.filter(m => m.status === 'Completed').length,
        pendingApprovals: changeOrders.filter(co => co.status === 'Pending Client Approval').length
      }
    };

    if (format === 'csv' || format === 'both') {
      const csvRows = [
        ['Project Name', 'Project Number', 'Status', 'Progress %', 'Budget', 'Start Date', 'Est. Completion'].join(','),
        ...reportData.projects.map(p => 
          [p.name, p.number, p.status, p.progress, p.budget, p.startDate, p.estimatedCompletion].join(',')
        )
      ];
      const csvContent = csvRows.join('\n');
      
      if (format === 'csv') {
        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=project-report-${Date.now()}.csv`
          }
        });
      }
    }

    // Generate PDF
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Project Status Report', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Client: ${reportData.clientName}`, 20, yPos);
    yPos += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.text('Executive Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const summaryLines = [
      `Total Projects: ${reportData.summary.totalProjects}`,
      `Active Projects: ${reportData.summary.activeProjects}`,
      `Completed Projects: ${reportData.summary.completedProjects}`,
      `Total Budget: $${reportData.summary.totalBudget.toLocaleString()}`,
      `Milestones: ${reportData.summary.completedMilestones}/${reportData.summary.totalMilestones} completed`,
      `Pending Approvals: ${reportData.summary.pendingApprovals}`
    ];

    summaryLines.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 7;
    });

    yPos += 10;

    // Projects Section
    doc.setFontSize(14);
    doc.text('Project Details', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    reportData.projects.forEach((project, idx) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.text(`${idx + 1}. ${project.name}`, 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.text(`Status: ${project.status} | Progress: ${project.progress}%`, 25, yPos);
      yPos += 6;
      doc.text(`Budget: $${project.budget?.toLocaleString() || 'N/A'}`, 25, yPos);
      yPos += 6;
      doc.text(`Milestones: ${project.completedMilestones}/${project.milestones} completed`, 25, yPos);
      yPos += 10;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=project-report-${Date.now()}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});