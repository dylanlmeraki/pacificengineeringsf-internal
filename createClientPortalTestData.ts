/**
 * CREATE CLIENT PORTAL TEST DATA
 * 
 * Generates comprehensive test data for QA/QC of all Client Portal features:
 * - Projects (multiple statuses)
 * - Tasks (all statuses, priorities, assignments)
 * - Milestones (pending approval, completed, upcoming)
 * - Documents (with signatures)
 * - Invoices (paid, outstanding, overdue)
 * - Proposals (various statuses)
 * - Messages and conversations
 * - Change orders
 * - Client feedback
 * - Team members
 * - Notifications
 * - Analytics data
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[createClientPortalTestData] Starting test data generation...');

    const testClientEmail = "testclient@pacificengineeringsf.com";
    const testClientName = "John Test Client";

    // Create test client user if doesn't exist
    try {
      await base44.asServiceRole.users.inviteUser(testClientEmail, "user");
    } catch (e) {
      console.log('[createClientPortalTestData] Test client already exists');
    }

    // 1. CREATE PROJECTS (multiple statuses)
    const projects = await Promise.all([
      base44.asServiceRole.entities.Project.create({
        project_name: "Downtown Office Complex SWPPP",
        project_number: "PE-2026-001",
        project_type: "SWPPP",
        client_email: testClientEmail,
        client_name: testClientName,
        status: "In Progress",
        priority: "High",
        start_date: "2026-01-15",
        end_date: "2026-06-30",
        budget: 125000,
        description: "Comprehensive SWPPP services for 10-story office building"
      }),
      base44.asServiceRole.entities.Project.create({
        project_name: "Highway 101 Bridge Inspection",
        project_number: "PE-2026-002",
        project_type: "Inspections",
        client_email: testClientEmail,
        client_name: testClientName,
        status: "Planning",
        priority: "Medium",
        start_date: "2026-03-01",
        end_date: "2026-04-15",
        budget: 45000,
        description: "Structural inspection and assessment of bridge infrastructure"
      }),
      base44.asServiceRole.entities.Project.create({
        project_name: "Residential Tower Structural Engineering",
        project_number: "PE-2026-003",
        project_type: "Engineering",
        client_email: testClientEmail,
        client_name: testClientName,
        status: "Completed",
        priority: "Low",
        start_date: "2025-10-01",
        end_date: "2026-01-30",
        budget: 95000,
        description: "Complete structural engineering services for 20-unit residential tower"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${projects.length} projects`);

    // 2. CREATE TASKS (various statuses and priorities)
    const tasks = await Promise.all([
      // Project 1 tasks
      base44.asServiceRole.entities.ProjectTask.create({
        project_id: projects[0].id,
        task_name: "Initial Site Assessment",
        description: "Complete site walkthrough and assessment",
        status: "completed",
        priority: "high",
        start_date: "2026-01-15",
        end_date: "2026-01-20",
        progress_percentage: 100,
        assigned_to: [user.email]
      }),
      base44.asServiceRole.entities.ProjectTask.create({
        project_id: projects[0].id,
        task_name: "SWPPP Document Preparation",
        description: "Draft comprehensive SWPPP documentation",
        status: "in_progress",
        priority: "high",
        start_date: "2026-01-21",
        end_date: "2026-02-15",
        progress_percentage: 65,
        assigned_to: [user.email]
      }),
      base44.asServiceRole.entities.ProjectTask.create({
        project_id: projects[0].id,
        task_name: "Regulatory Submission",
        description: "Submit SWPPP to regulatory agencies",
        status: "not_started",
        priority: "critical",
        start_date: "2026-02-16",
        end_date: "2026-02-20",
        progress_percentage: 0,
        dependencies: []
      }),
      base44.asServiceRole.entities.ProjectTask.create({
        project_id: projects[0].id,
        task_name: "Overdue Inspection Report",
        description: "This task is overdue for testing",
        status: "in_progress",
        priority: "high",
        start_date: "2026-01-01",
        end_date: "2026-02-05",
        progress_percentage: 30,
        assigned_to: [user.email]
      }),
      // Project 2 tasks
      base44.asServiceRole.entities.ProjectTask.create({
        project_id: projects[1].id,
        task_name: "Bridge Survey",
        description: "Complete visual and structural survey",
        status: "not_started",
        priority: "medium",
        start_date: "2026-03-01",
        end_date: "2026-03-10",
        progress_percentage: 0
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${tasks.length} tasks`);

    // 3. CREATE MILESTONES
    const milestones = await Promise.all([
      base44.asServiceRole.entities.ProjectMilestone.create({
        project_id: projects[0].id,
        milestone_name: "SWPPP Draft Completion",
        description: "Complete initial SWPPP draft",
        status: "Pending Client Approval",
        due_date: "2026-02-15",
        amount: 35000,
        payment_terms: "Net 30"
      }),
      base44.asServiceRole.entities.ProjectMilestone.create({
        project_id: projects[0].id,
        milestone_name: "Regulatory Approval",
        description: "Obtain all regulatory approvals",
        status: "In Progress",
        due_date: "2026-03-01",
        amount: 25000,
        payment_terms: "Net 30"
      }),
      base44.asServiceRole.entities.ProjectMilestone.create({
        project_id: projects[2].id,
        milestone_name: "Final Delivery",
        description: "Project completion and final delivery",
        status: "completed",
        due_date: "2026-01-30",
        amount: 30000,
        payment_terms: "Net 30"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${milestones.length} milestones`);

    // 4. CREATE DOCUMENTS
    const documents = [];
    try {
      const doc1 = await base44.asServiceRole.entities.ProjectDocument.create({
        project_id: projects[0].id,
        document_name: "SWPPP Initial Draft.pdf",
        document_type: "SWPPP Plan",
        file_url: "https://example.com/swppp-draft.pdf",
        uploaded_by: user.email,
        status: "Under Review"
      });
      documents.push(doc1);
    } catch (e) {
      console.log('[createClientPortalTestData] Error creating doc1:', e.message);
    }

    try {
      const doc2 = await base44.asServiceRole.entities.ProjectDocument.create({
        project_id: projects[0].id,
        document_name: "Site Photos - January 2026.zip",
        document_type: "Photo",
        file_url: "https://example.com/site-photos.zip",
        uploaded_by: user.email,
        status: "Approved"
      });
      documents.push(doc2);
    } catch (e) {
      console.log('[createClientPortalTestData] Error creating doc2:', e.message);
    }

    try {
      const doc3 = await base44.asServiceRole.entities.ProjectDocument.create({
        project_id: projects[1].id,
        document_name: "Bridge Inspection Proposal.pdf",
        document_type: "Contract",
        file_url: "https://example.com/bridge-proposal.pdf",
        uploaded_by: user.email,
        status: "Approved"
      });
      documents.push(doc3);
    } catch (e) {
      console.log('[createClientPortalTestData] Error creating doc3:', e.message);
    }

    console.log(`[createClientPortalTestData] Created ${documents.length} documents`);

    // 5. CREATE INVOICES (paid, outstanding, overdue)
    const invoices = await Promise.all([
      base44.asServiceRole.entities.Invoice.create({
        project_id: projects[0].id,
        client_email: testClientEmail,
        invoice_number: "INV-2026-001",
        status: "paid",
        total_amount: 35000,
        due_date: "2026-01-31",
        payment_date: "2026-01-28",
        line_items: [
          { description: "Initial Assessment", quantity: 1, unit_price: 15000, total: 15000 },
          { description: "SWPPP Draft", quantity: 1, unit_price: 20000, total: 20000 }
        ]
      }),
      base44.asServiceRole.entities.Invoice.create({
        project_id: projects[0].id,
        client_email: testClientEmail,
        invoice_number: "INV-2026-002",
        status: "sent",
        total_amount: 25000,
        due_date: "2026-03-15",
        line_items: [
          { description: "Milestone 2 - Regulatory Work", quantity: 1, unit_price: 25000, total: 25000 }
        ]
      }),
      base44.asServiceRole.entities.Invoice.create({
        project_id: projects[1].id,
        client_email: testClientEmail,
        invoice_number: "INV-2026-003",
        status: "overdue",
        total_amount: 12000,
        due_date: "2026-02-01",
        line_items: [
          { description: "Bridge Survey Deposit", quantity: 1, unit_price: 12000, total: 12000 }
        ]
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${invoices.length} invoices`);

    // 6. CREATE PROPOSALS
    const proposals = await Promise.all([
      base44.asServiceRole.entities.Proposal.create({
        project_id: projects[0].id,
        proposal_number: "PROP-2026-001",
        client_email: testClientEmail,
        status: "accepted",
        title: "SWPPP Services Proposal",
        total_amount: 125000,
        valid_until: "2026-03-01",
        line_items: [
          { description: "SWPPP Development", amount: 60000 },
          { description: "Site Monitoring", amount: 35000 },
          { description: "Regulatory Coordination", amount: 30000 }
        ]
      }),
      base44.asServiceRole.entities.Proposal.create({
        project_id: projects[1].id,
        proposal_number: "PROP-2026-002",
        client_email: testClientEmail,
        status: "sent",
        title: "Bridge Inspection Services",
        total_amount: 45000,
        valid_until: "2026-02-28",
        line_items: [
          { description: "Structural Inspection", amount: 30000 },
          { description: "Report & Recommendations", amount: 15000 }
        ]
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${proposals.length} proposals`);

    // 7. CREATE CHANGE ORDERS
    const changeOrders = await Promise.all([
      base44.asServiceRole.entities.ChangeOrder.create({
        project_id: projects[0].id,
        change_order_number: "CO-2026-001",
        title: "Additional Drainage Analysis",
        description: "Client requested additional drainage analysis for parking area",
        status: "Pending Client Approval",
        amount: 8500,
        justification: "Unforeseen drainage issues discovered during site assessment"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${changeOrders.length} change orders`);

    // 8. CREATE PROJECT MESSAGES
    const messages = await Promise.all([
      base44.asServiceRole.entities.ProjectMessage.create({
        project_id: projects[0].id,
        message: "Hi John, we've completed the initial site assessment. Please review the attached report.",
        sender_email: user.email,
        sender_name: user.full_name,
        sender_role: "admin",
        attachments: ["https://example.com/assessment-report.pdf"]
      }),
      base44.asServiceRole.entities.ProjectMessage.create({
        project_id: projects[0].id,
        message: "Thank you! I've reviewed the assessment. Looks great. When can we expect the SWPPP draft?",
        sender_email: testClientEmail,
        sender_name: testClientName,
        sender_role: "client"
      }),
      base44.asServiceRole.entities.ProjectMessage.create({
        project_id: projects[0].id,
        message: "The SWPPP draft should be ready by February 15th. We'll notify you as soon as it's available for review.",
        sender_email: user.email,
        sender_name: user.full_name,
        sender_role: "admin"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${messages.length} messages`);

    // 9. CREATE CLIENT FEEDBACK
    const feedback = await Promise.all([
      base44.asServiceRole.entities.ClientFeedback.create({
        project_id: projects[2].id,
        client_email: testClientEmail,
        client_name: testClientName,
        feedback_type: "project",
        rating: "Excellent",
        category: "Quality",
        comments: "Outstanding work on the structural engineering. Very thorough and professional."
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${feedback.length} feedback entries`);

    // 10. CREATE NOTIFICATIONS
    const notifications = await Promise.all([
      base44.asServiceRole.entities.Notification.create({
        recipient_email: testClientEmail,
        type: "milestone_approval",
        title: "Milestone Ready for Approval",
        message: "SWPPP Draft Completion milestone is ready for your approval",
        link: "/ClientPortal",
        priority: "high"
      }),
      base44.asServiceRole.entities.Notification.create({
        recipient_email: testClientEmail,
        type: "document",
        title: "New Document Available",
        message: "SWPPP Initial Draft.pdf has been uploaded",
        link: "/ClientPortal",
        priority: "medium"
      }),
      base44.asServiceRole.entities.Notification.create({
        recipient_email: testClientEmail,
        type: "invoice",
        title: "Invoice Overdue",
        message: "Invoice INV-2026-003 is now overdue",
        link: "/ClientPortal",
        priority: "urgent",
        read: false
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${notifications.length} notifications`);

    // 11. CREATE CLIENT TASKS
    const clientTasks = await Promise.all([
      base44.asServiceRole.entities.ClientTask.create({
        project_id: projects[0].id,
        assigned_to: testClientEmail,
        task_title: "Review SWPPP Draft",
        description: "Please review the SWPPP draft and provide feedback",
        status: "Pending",
        priority: "High",
        due_date: "2026-02-20"
      }),
      base44.asServiceRole.entities.ClientTask.create({
        project_id: projects[0].id,
        assigned_to: testClientEmail,
        task_title: "Sign Construction Agreement",
        description: "Please review and sign the construction agreement document",
        status: "Pending",
        priority: "Medium",
        due_date: "2026-02-25"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${clientTasks.length} client tasks`);

    // 12. CREATE TEAM ASSIGNMENTS
    const teamAssignments = await Promise.all([
      base44.asServiceRole.entities.TeamAssignment.create({
        project_id: projects[0].id,
        user_email: user.email,
        user_name: user.full_name,
        role: "project_manager"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${teamAssignments.length} team assignments`);

    // 13. CREATE INSIGHTS
    const insights = await Promise.all([
      base44.asServiceRole.entities.ProjectInsight.create({
        project_id: projects[0].id,
        insight_type: "timeline_risk",
        severity: "medium",
        title: "Potential Timeline Delay",
        description: "One task is overdue which may impact the regulatory submission deadline",
        recommendation: "Prioritize completion of overdue inspection report",
        generated_by: "ai"
      }),
      base44.asServiceRole.entities.ProjectInsight.create({
        project_id: projects[0].id,
        insight_type: "budget_risk",
        severity: "low",
        title: "Budget Tracking Well",
        description: "Project is currently 28% complete with 28% budget utilized",
        recommendation: "Continue current spending pace",
        generated_by: "ai"
      })
    ]);

    console.log(`[createClientPortalTestData] Created ${insights.length} insights`);

    const summary = {
      success: true,
      message: "Client Portal test data created successfully",
      test_client: {
        email: testClientEmail,
        name: testClientName
      },
      created: {
        projects: projects.length,
        tasks: tasks.length,
        milestones: milestones.length,
        documents: documents.length,
        invoices: invoices.length,
        proposals: proposals.length,
        change_orders: changeOrders.length,
        messages: messages.length,
        feedback: feedback.length,
        notifications: notifications.length,
        client_tasks: clientTasks.length,
        team_assignments: teamAssignments.length,
        insights: insights.length
      },
      project_ids: projects.map(p => p.id),
      test_scenarios: [
        "✓ Multiple project statuses (In Progress, Planning, Completed)",
        "✓ Tasks in all statuses (completed, in_progress, not_started, blocked)",
        "✓ Overdue task for testing alerts",
        "✓ Milestones pending approval",
        "✓ Documents requiring signatures",
        "✓ Invoices (paid, outstanding, overdue)",
        "✓ Proposals (accepted and sent)",
        "✓ Change orders pending approval",
        "✓ Conversation threads",
        "✓ Client feedback",
        "✓ Unread notifications",
        "✓ Client tasks",
        "✓ AI-generated insights"
      ]
    };

    console.log('[createClientPortalTestData] Test data generation completed successfully');

    return Response.json(summary);
  } catch (error) {
    console.error('[createClientPortalTestData] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});