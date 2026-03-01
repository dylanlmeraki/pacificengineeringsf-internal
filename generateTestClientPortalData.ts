import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const testClientEmail = 'testclient@example.com';
    const testClientName = 'Test Client User';

    // Create test project
    const project = await base44.asServiceRole.entities.Project.create({
      project_name: 'Demo Construction Project',
      project_number: 'PROJ-2026-001',
      client_email: testClientEmail,
      client_name: testClientName,
      project_type: 'SWPPP',
      status: 'In Progress',
      priority: 'High',
      start_date: '2026-01-15',
      estimated_completion: '2026-06-30',
      location: '123 Main Street, San Francisco, CA',
      description: 'Comprehensive SWPPP and construction management for commercial development',
      progress_percentage: 45,
      budget: 125000
    });

    // Create milestones
    await base44.asServiceRole.entities.ProjectMilestone.bulkCreate([
      {
        project_id: project.id,
        milestone_name: 'Site Preparation Complete',
        due_date: '2026-02-28',
        status: 'completed',
        amount: 25000,
        completion_date: '2026-02-25'
      },
      {
        project_id: project.id,
        milestone_name: 'Foundation & Structural Work',
        due_date: '2026-03-31',
        status: 'pending_approval',
        amount: 40000
      },
      {
        project_id: project.id,
        milestone_name: 'MEP Systems Installation',
        due_date: '2026-05-15',
        status: 'in_progress',
        amount: 35000
      }
    ]);

    // Create documents
    await base44.asServiceRole.entities.ProjectDocument.bulkCreate([
      {
        project_id: project.id,
        document_name: 'SWPPP Plan v2.1',
        document_type: 'SWPPP Plan',
        file_url: 'https://example.com/swppp.pdf',
        file_size: 2048000,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
        description: 'Updated Storm Water Pollution Prevention Plan',
        status: 'Approved'
      },
      {
        project_id: project.id,
        document_name: 'Site Inspection Report',
        document_type: 'Inspection Report',
        file_url: 'https://example.com/inspection.pdf',
        file_size: 1024000,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
        status: 'Under Review'
      }
    ]);

    // Create conversation
    const conversation = await base44.asServiceRole.entities.Conversation.create({
      project_id: project.id,
      title: 'Project Updates & Questions',
      client_email: testClientEmail,
      assigned_pm_email: user.email,
      participants: [testClientEmail, user.email],
      status: 'active',
      last_message_at: new Date().toISOString()
    });

    // Create messages
    await base44.asServiceRole.entities.ConversationMessage.bulkCreate([
      {
        conversation_id: conversation.id,
        project_id: project.id,
        sender_email: testClientEmail,
        sender_name: testClientName,
        sender_role: 'client',
        message: 'Hello! I have a few questions about the project timeline. When can we expect the foundation work to be completed?',
        read_by: [{ email: user.email, read_at: new Date().toISOString() }],
        urgency: 'normal'
      },
      {
        conversation_id: conversation.id,
        project_id: project.id,
        sender_email: user.email,
        sender_name: user.full_name,
        sender_role: 'admin',
        message: 'Hi! The foundation work is progressing well. We expect to complete it by March 31st as scheduled. I\'ll send you detailed progress photos tomorrow.',
        read_by: [{ email: testClientEmail, read_at: new Date().toISOString() }],
        urgency: 'normal'
      }
    ]);

    // Create invoices
    await base44.asServiceRole.entities.Invoice.bulkCreate([
      {
        invoice_number: 'INV-2026-001',
        client_email: testClientEmail,
        client_name: testClientName,
        project_id: project.id,
        description: 'Site Preparation & Initial Work',
        total_amount: 25000,
        due_date: '2026-02-15',
        paid_date: '2026-02-10',
        status: 'paid'
      },
      {
        invoice_number: 'INV-2026-002',
        client_email: testClientEmail,
        client_name: testClientName,
        project_id: project.id,
        description: 'Foundation Work - Progress Payment',
        total_amount: 40000,
        due_date: '2026-03-15',
        status: 'sent'
      }
    ]);

    // Create tasks
    await base44.asServiceRole.entities.ClientTask.bulkCreate([
      {
        project_id: project.id,
        task_title: 'Review Updated SWPPP Plan',
        task_description: 'Please review the updated SWPPP plan and provide feedback',
        assigned_to: testClientEmail,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending',
        priority: 'High'
      },
      {
        project_id: project.id,
        task_title: 'Approve Foundation Milestone',
        task_description: 'Review and approve the foundation work completion',
        assigned_to: testClientEmail,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending',
        priority: 'Medium'
      }
    ]);

    // Create change orders
    await base44.asServiceRole.entities.ChangeOrder.create({
      project_id: project.id,
      title: 'Additional Drainage System',
      description: 'Add enhanced drainage system per city requirements',
      change_type: 'scope_addition',
      cost_impact: 8500,
      timeline_impact: '2 weeks',
      status: 'pending',
      requested_by: testClientEmail,
      requested_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Test client portal data created successfully',
      data: {
        project_id: project.id,
        conversation_id: conversation.id,
        test_client_email: testClientEmail,
        note: 'You can now test the client portal with this data'
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});