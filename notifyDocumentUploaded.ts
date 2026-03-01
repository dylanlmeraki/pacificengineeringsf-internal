import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { document_id } = await req.json();

    const doc = await base44.asServiceRole.entities.ProjectDocument.filter({ id: document_id });
    if (!doc || doc.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = doc[0];
    const project = await base44.asServiceRole.entities.Project.filter({ id: docData.project_id });
    
    if (!project || project.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = project[0];

    // Notify client if document was uploaded by internal team
    if (docData.uploaded_by !== projectData.client_email) {
      await base44.functions.invoke('createNotificationForEvent', {
        recipientEmail: projectData.client_email,
        eventType: 'document_upload',
        title: 'New Document Available',
        message: `A new ${docData.document_type} has been uploaded to project ${projectData.project_name}: ${docData.document_name}`,
        link: `/client-portal?tab=projects&project=${projectData.id}`,
        priority: 'normal',
        metadata: {
          project_id: projectData.id,
          document_id: docData.id
        }
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});