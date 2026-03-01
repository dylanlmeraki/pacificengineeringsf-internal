/**
 * MIGRATE PROJECT TO TEMPLATE VERSION
 * 
 * Migrates an existing project to a new template version.
 * Creates new tasks, milestones, and custom fields based on the new template.
 * 
 * Safe operation: 
 * - Does not delete existing data
 * - Skips tasks/milestones that already exist
 * - Marks new fields for manual review if needed
 */

import { base44 } from "@/api/base44Client";

export default async function migrateProjectToTemplateVersion(req) {
  try {
    const { project_id, template_version_id } = req.body;

    if (!project_id || !template_version_id) {
      return Response.json(
        { error: "Missing project_id or template_version_id" },
        { status: 400 }
      );
    }

    console.log(
      `[migrateProjectToTemplateVersion] Migrating project ${project_id} to version ${template_version_id}`
    );

    // Fetch project and template version
    const [projectData, templateVersion] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }),
      base44.entities.ProjectTemplateVersion.filter({ id: template_version_id }),
    ]);

    if (!projectData || projectData.length === 0) {
      throw new Error(`Project not found: ${project_id}`);
    }

    if (!templateVersion || templateVersion.length === 0) {
      throw new Error(`Template version not found: ${template_version_id}`);
    }

    const project = projectData[0];
    const template = templateVersion[0];

    let migrationSummary = {
      tasks_added: 0,
      milestones_added: 0,
      fields_added: 0,
      warnings: [],
    };

    // 1. Add default tasks that don't already exist
    if (template.default_tasks && template.default_tasks.length > 0) {
      const existingTasks = await base44.entities.ProjectTask.filter({
        project_id,
      });

      const existingTaskNames = new Set(existingTasks.map((t) => t.task_name));

      for (const task of template.default_tasks) {
        if (!existingTaskNames.has(task.task_name)) {
          await base44.entities.ProjectTask.create({
            project_id,
            task_name: task.task_name,
            description: task.description,
            priority: task.priority || "medium",
            duration_days: task.duration_days,
            dependencies: task.dependencies || [],
            assigned_to: task.assigned_to || [],
            status: "not_started",
            progress_percentage: 0,
          });
          migrationSummary.tasks_added++;
        }
      }
    }

    // 2. Add default milestones that don't already exist
    if (template.default_milestones && template.default_milestones.length > 0) {
      const existingMilestones = await base44.entities.ProjectMilestone.filter({
        project_id,
      });

      const existingMilestoneNames = new Set(
        existingMilestones.map((m) => m.milestone_name)
      );

      const projectStartDate = new Date(project.start_date || Date.now());

      for (const milestone of template.default_milestones) {
        if (!existingMilestoneNames.has(milestone.milestone_name)) {
          const dueDate = new Date(projectStartDate);
          dueDate.setDate(
            dueDate.getDate() + (milestone.days_from_start || 30)
          );

          await base44.entities.ProjectMilestone.create({
            project_id,
            milestone_name: milestone.milestone_name,
            description: milestone.description,
            due_date: dueDate.toISOString(),
            amount: milestone.amount || 0,
            status: "pending",
            progress_percentage: 0,
          });
          migrationSummary.milestones_added++;
        }
      }
    }

    // 3. Add custom fields to project metadata
    if (template.custom_fields && template.custom_fields.length > 0) {
      const projectMetadata = project.metadata || {};
      const newCustomFields = {};

      for (const field of template.custom_fields) {
        if (!projectMetadata[field.field_name]) {
          newCustomFields[field.field_name] = {
            type: field.field_type,
            required: field.is_required,
            default: field.default_value,
            description: field.description,
            migrated_from_template: true,
            migrated_at: new Date().toISOString(),
          };
          migrationSummary.fields_added++;
        }
      }

      if (Object.keys(newCustomFields).length > 0) {
        await base44.entities.Project.update(project_id, {
          metadata: {
            ...projectMetadata,
            ...newCustomFields,
          },
        });
      }
    }

    // 4. Assign default assignees if they don't exist
    if (template.default_assignees && template.default_assignees.length > 0) {
      const existingAssignments = await base44.entities.TeamAssignment.filter({
        project_id,
      });

      const existingEmails = new Set(
        existingAssignments.map((a) => a.user_email)
      );

      for (const assignee of template.default_assignees) {
        if (!existingEmails.has(assignee.user_email)) {
          await base44.entities.TeamAssignment.create({
            project_id,
            user_email: assignee.user_email,
            user_name: assignee.user_name,
            role: assignee.role,
            start_date: new Date().toISOString().split("T")[0],
          });
        }
      }
    }

    // 5. Record migration in project metadata
    await base44.entities.Project.update(project_id, {
      template_version_id,
      last_migration_date: new Date().toISOString(),
    });

    console.log(
      `[migrateProjectToTemplateVersion] Migration complete: ${JSON.stringify(migrationSummary)}`
    );

    return Response.json({
      success: true,
      message: "Project migrated to new template version",
      summary: migrationSummary,
    });
  } catch (error) {
    console.error("[migrateProjectToTemplateVersion] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}