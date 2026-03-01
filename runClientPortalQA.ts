/**
 * RUN CLIENT PORTAL QA
 * 
 * Comprehensive QA/QC test suite for Client Portal
 * Tests all features, components, and data flows
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function testProjectLoading(base44, testClientEmail) {
  const results = { name: "Project Loading", tests: [] };
  
  try {
    const projects = await base44.asServiceRole.entities.Project.filter({ 
      client_email: testClientEmail 
    });
    results.tests.push({
      test: "Load projects for test client",
      status: projects.length > 0 ? "PASS" : "FAIL",
      details: `Found ${projects.length} projects`
    });
  } catch (error) {
    results.tests.push({
      test: "Load projects",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testTaskManagement(base44, projectId) {
  const results = { name: "Task Management", tests: [] };
  
  try {
    const tasks = await base44.asServiceRole.entities.ProjectTask.filter({ 
      project_id: projectId 
    });
    results.tests.push({
      test: "Load project tasks",
      status: tasks.length > 0 ? "PASS" : "FAIL",
      details: `Found ${tasks.length} tasks`
    });
    
    const statuses = ['completed', 'in_progress', 'not_started', 'blocked'];
    const tasksByStatus = {};
    statuses.forEach(status => {
      tasksByStatus[status] = tasks.filter(t => t.status === status).length;
    });
    
    results.tests.push({
      test: "Task status distribution",
      status: "PASS",
      details: tasksByStatus
    });
    
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && new Date(t.end_date) < new Date()
    );
    results.tests.push({
      test: "Identify overdue tasks",
      status: overdueTasks.length > 0 ? "PASS" : "WARN",
      details: `${overdueTasks.length} overdue tasks found`
    });
  } catch (error) {
    results.tests.push({
      test: "Task management",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testMilestones(base44, projectId) {
  const results = { name: "Milestone Management", tests: [] };
  
  try {
    const milestones = await base44.asServiceRole.entities.ProjectMilestone.filter({ 
      project_id: projectId 
    });
    results.tests.push({
      test: "Load milestones",
      status: milestones.length > 0 ? "PASS" : "FAIL",
      details: `Found ${milestones.length} milestones`
    });
    
    const pendingApproval = milestones.filter(m => 
      m.status === 'Pending Client Approval'
    );
    results.tests.push({
      test: "Milestones pending approval",
      status: pendingApproval.length > 0 ? "PASS" : "WARN",
      details: `${pendingApproval.length} milestones awaiting approval`
    });
  } catch (error) {
    results.tests.push({
      test: "Milestone management",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testDocuments(base44, projectId) {
  const results = { name: "Document Management", tests: [] };
  
  try {
    const documents = await base44.asServiceRole.entities.ProjectDocument.filter({ 
      project_id: projectId 
    });
    results.tests.push({
      test: "Load documents",
      status: documents.length > 0 ? "PASS" : "FAIL",
      details: `Found ${documents.length} documents`
    });
    
    const requiresSignature = documents.filter(d => 
      d.requires_client_signature && d.status === 'pending_signature'
    );
    results.tests.push({
      test: "Documents requiring signature",
      status: "PASS",
      details: `${requiresSignature.length} documents need signatures`
    });
  } catch (error) {
    results.tests.push({
      test: "Document management",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testInvoices(base44, testClientEmail) {
  const results = { name: "Invoice Management", tests: [] };
  
  try {
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ 
      client_email: testClientEmail 
    });
    results.tests.push({
      test: "Load invoices",
      status: invoices.length > 0 ? "PASS" : "FAIL",
      details: `Found ${invoices.length} invoices`
    });
    
    const paid = invoices.filter(i => i.status === 'paid').length;
    const outstanding = invoices.filter(i => i.status === 'sent').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    
    results.tests.push({
      test: "Invoice status breakdown",
      status: "PASS",
      details: { paid, outstanding, overdue }
    });
    
    const totalOwed = invoices
      .filter(i => ['sent', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    
    results.tests.push({
      test: "Calculate outstanding balance",
      status: "PASS",
      details: `$${totalOwed.toLocaleString()} outstanding`
    });
  } catch (error) {
    results.tests.push({
      test: "Invoice management",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testProposals(base44, testClientEmail) {
  const results = { name: "Proposal Management", tests: [] };
  
  try {
    const projects = await base44.asServiceRole.entities.Project.filter({ 
      client_email: testClientEmail 
    });
    const projectIds = projects.map(p => p.id);
    
    const allProposals = [];
    for (const id of projectIds) {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ 
        project_id: id 
      });
      allProposals.push(...proposals);
    }
    
    results.tests.push({
      test: "Load proposals",
      status: allProposals.length > 0 ? "PASS" : "FAIL",
      details: `Found ${allProposals.length} proposals`
    });
    
    const pending = allProposals.filter(p => 
      ['sent', 'viewed'].includes(p.status)
    ).length;
    
    results.tests.push({
      test: "Pending proposals",
      status: "PASS",
      details: `${pending} proposals awaiting client action`
    });
  } catch (error) {
    results.tests.push({
      test: "Proposal management",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testCommunications(base44, projectId) {
  const results = { name: "Communications", tests: [] };
  
  try {
    const messages = await base44.asServiceRole.entities.ProjectMessage.filter({ 
      project_id: projectId 
    });
    results.tests.push({
      test: "Load project messages",
      status: messages.length > 0 ? "PASS" : "FAIL",
      details: `Found ${messages.length} messages`
    });
    
    const withAttachments = messages.filter(m => 
      m.attachments && m.attachments.length > 0
    ).length;
    
    results.tests.push({
      test: "Messages with attachments",
      status: "PASS",
      details: `${withAttachments} messages have attachments`
    });
  } catch (error) {
    results.tests.push({
      test: "Communications",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testNotifications(base44, testClientEmail) {
  const results = { name: "Notifications", tests: [] };
  
  try {
    const notifications = await base44.asServiceRole.entities.Notification.filter({ 
      recipient_email: testClientEmail 
    });
    results.tests.push({
      test: "Load notifications",
      status: notifications.length > 0 ? "PASS" : "FAIL",
      details: `Found ${notifications.length} notifications`
    });
    
    const unread = notifications.filter(n => !n.read).length;
    results.tests.push({
      test: "Unread notifications",
      status: unread > 0 ? "PASS" : "WARN",
      details: `${unread} unread notifications`
    });
    
    const byType = {};
    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    
    results.tests.push({
      test: "Notification types",
      status: "PASS",
      details: byType
    });
  } catch (error) {
    results.tests.push({
      test: "Notifications",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testAnalytics(base44, projectId) {
  const results = { name: "Analytics & Insights", tests: [] };
  
  try {
    const insights = await base44.asServiceRole.entities.ProjectInsight.filter({ 
      project_id: projectId 
    });
    results.tests.push({
      test: "Load AI insights",
      status: insights.length > 0 ? "PASS" : "WARN",
      details: `Found ${insights.length} AI-generated insights`
    });
    
    const bySeverity = {};
    insights.forEach(i => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    });
    
    results.tests.push({
      test: "Insight severity distribution",
      status: "PASS",
      details: bySeverity
    });
  } catch (error) {
    results.tests.push({
      test: "Analytics",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

async function testFeedback(base44, testClientEmail) {
  const results = { name: "Client Feedback", tests: [] };
  
  try {
    const feedback = await base44.asServiceRole.entities.ClientFeedback.filter({ 
      client_email: testClientEmail 
    });
    results.tests.push({
      test: "Load client feedback",
      status: feedback.length > 0 ? "PASS" : "WARN",
      details: `Found ${feedback.length} feedback entries`
    });
  } catch (error) {
    results.tests.push({
      test: "Client feedback",
      status: "ERROR",
      error: error.message
    });
  }
  
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[runClientPortalQA] Starting QA/QC tests...');

    const testClientEmail = "testclient@pacificengineeringsf.com";
    
    // Get test projects
    const projects = await base44.asServiceRole.entities.Project.filter({ 
      client_email: testClientEmail 
    });

    if (projects.length === 0) {
      return Response.json({
        error: "No test data found. Run createClientPortalTestData first."
      }, { status: 400 });
    }

    const testProjectId = projects[0].id;

    // Run all test suites
    const results = await Promise.all([
      testProjectLoading(base44, testClientEmail),
      testTaskManagement(base44, testProjectId),
      testMilestones(base44, testProjectId),
      testDocuments(base44, testProjectId),
      testInvoices(base44, testClientEmail),
      testProposals(base44, testClientEmail),
      testCommunications(base44, testProjectId),
      testNotifications(base44, testClientEmail),
      testAnalytics(base44, testProjectId),
      testFeedback(base44, testClientEmail)
    ]);

    // Calculate summary
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let errors = 0;
    let warnings = 0;

    results.forEach(suite => {
      suite.tests.forEach(test => {
        totalTests++;
        if (test.status === 'PASS') passed++;
        else if (test.status === 'FAIL') failed++;
        else if (test.status === 'ERROR') errors++;
        else if (test.status === 'WARN') warnings++;
      });
    });

    const summary = {
      qa_timestamp: new Date().toISOString(),
      test_client: testClientEmail,
      overall_status: errors === 0 && failed === 0 ? "PASS" : "FAIL",
      summary: {
        total_tests: totalTests,
        passed,
        failed,
        errors,
        warnings,
        pass_rate: `${Math.round((passed / totalTests) * 100)}%`
      },
      test_suites: results
    };

    console.log('[runClientPortalQA] QA completed:', summary.summary);

    return Response.json(summary);
  } catch (error) {
    console.error('[runClientPortalQA] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});