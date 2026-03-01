import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create test project manager (admin user)
    const pmEmail = 'pm.test@pacificengineering.com';
    
    // Create test project
    const project = await base44.asServiceRole.entities.Project.create({
      project_name: 'Test SWPPP Implementation - Downtown Plaza',
      project_number: `PROJ-TEST-${Date.now()}`,
      project_type: 'SWPPP',
      client_email: user.email,
      client_name: user.full_name,
      status: 'In Progress',
      priority: 'High',
      description: 'Comprehensive Storm Water Pollution Prevention Plan for the new Downtown Plaza development project. Includes site inspection, plan development, and ongoing monitoring.',
      location: 'San Francisco, CA',
      start_date: new Date().toISOString(),
      estimated_completion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      progress_percentage: 35,
      assigned_pm_email: pmEmail,
      assigned_pm_name: 'Sarah Johnson',
      assigned_team_members: [pmEmail, 'engineer@pacificengineering.com'],
      budget: 45000,
      actual_cost: 15750
    });

    // Create test milestones
    const milestone1 = await base44.asServiceRole.entities.ProjectMilestone.create({
      project_id: project.id,
      milestone_name: 'Initial Site Assessment',
      description: 'Complete initial site walkthrough and hazard identification',
      status: 'Completed',
      due_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 5000,
      progress_percentage: 100,
      completed_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    });

    const milestone2 = await base44.asServiceRole.entities.ProjectMilestone.create({
      project_id: project.id,
      milestone_name: 'SWPPP Document Preparation',
      description: 'Draft comprehensive SWPPP document with all required sections',
      status: 'Pending Client Approval',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 15000,
      progress_percentage: 85
    });

    const milestone3 = await base44.asServiceRole.entities.ProjectMilestone.create({
      project_id: project.id,
      milestone_name: 'Training and Implementation',
      description: 'On-site training for construction crew and plan implementation',
      status: 'Not Started',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 10000,
      progress_percentage: 0
    });

    // Create test invoice
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: `INV-TEST-${Date.now()}`,
      client_email: user.email,
      client_name: user.full_name,
      project_id: project.id,
      status: 'sent',
      issue_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: 5000,
      tax_amount: 450,
      total_amount: 5450,
      line_items: [
        {
          description: 'Initial Site Assessment and Report',
          quantity: 1,
          unit_price: 5000,
          total: 5000
        }
      ],
      notes: 'Payment for completed Initial Site Assessment phase. Thank you for your business!',
      payment_terms: 'Net 30'
    });

    // Create test messages
    await base44.asServiceRole.entities.ProjectMessage.create({
      project_id: project.id,
      sender_email: pmEmail,
      sender_name: 'Sarah Johnson',
      sender_role: 'admin',
      message: 'Welcome to your project! I\'ll be your project manager for this SWPPP implementation. Feel free to reach out with any questions.',
      message_type: 'general'
    });

    await base44.asServiceRole.entities.ProjectMessage.create({
      project_id: project.id,
      sender_email: pmEmail,
      sender_name: 'Sarah Johnson',
      sender_role: 'admin',
      message: 'Great progress on the initial assessment! The draft SWPPP document is ready for your review. Please check the Milestones section.',
      message_type: 'update'
    });

    // Create test document
    await base44.asServiceRole.entities.ProjectDocument.create({
      project_id: project.id,
      document_name: 'Preliminary Site Assessment Report',
      document_type: 'Inspection Report',
      description: 'Initial findings from site walkthrough and hazard assessment',
      file_url: 'https://picsum.photos/seed/doc1/800/1000',
      version: '1.0',
      uploaded_by: pmEmail
    });

    return Response.json({ 
      success: true,
      data: {
        project_id: project.id,
        project_name: project.project_name,
        invoice_id: invoice.id,
        milestones: [milestone1.id, milestone2.id, milestone3.id]
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return Response.json({ 
      error: 'Failed to create test data',
      details: error.message 
    }, { status: 500 });
  }
});