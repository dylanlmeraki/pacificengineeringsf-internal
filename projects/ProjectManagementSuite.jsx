import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Calendar, Link2, Users, Shield, ListTodo, Loader2, RefreshCw
} from "lucide-react";

import TaskManagementPanel from "./TaskManagementPanel";
import EnhancedGanttChart from "./EnhancedGanttChart";
import DependencyTracker from "./DependencyTracker";
import ResourceAllocationView from "./ResourceAllocationView";
import RiskAssessmentPanel from "./RiskAssessmentPanel";

export default function ProjectManagementSuite({ projectId, project, user }) {
  const [activeView, setActiveView] = useState("kanban");

  // Fetch tasks for this project
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: () => portalApi.entities.ProjectTask.filter({ project_id: projectId }, "-created_date"),
    enabled: !!projectId,
  });

  // Fetch milestones
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ["project-milestones-suite", projectId],
    queryFn: () => portalApi.entities.ProjectMilestone.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Fetch team assignments
  const { data: teamAssignments = [] } = useQuery({
    queryKey: ["team-assignments-suite", projectId],
    queryFn: () => portalApi.entities.TeamAssignment.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <Card className="p-12 text-center border-0 shadow-lg">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Project</h3>
        <p className="text-gray-600">Choose a project to access full project management tools.</p>
      </Card>
    );
  }

  if (tasksLoading || milestonesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{project?.project_name || "Project"}</h2>
            <p className="text-indigo-100">Full-suite project management with timeline, dependencies, resources & risk assessment</p>
          </div>
          <Button variant="outline" onClick={() => refetchTasks()} className="border-white/40 text-black hover:bg-white/20">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl font-bold">{tasks.length}</p>
            <p className="text-xs text-indigo-200">Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{tasks.filter(t => t.status === "completed").length}</p>
            <p className="text-xs text-indigo-200">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{milestones.length}</p>
            <p className="text-xs text-indigo-200">Milestones</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{tasks.filter(t => t.dependencies?.length > 0).length}</p>
            <p className="text-xs text-indigo-200">With Dependencies</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{new Set(tasks.flatMap(t => t.assigned_to || [])).size}</p>
            <p className="text-xs text-indigo-200">Team Members</p>
          </div>
        </div>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto bg-white shadow-lg rounded-lg p-1">
          <TabsTrigger value="kanban" className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-indigo-50">
            <ListTodo className="w-4 h-4" />
            <span className="text-xs">Kanban</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-indigo-50">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="dependencies" className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-indigo-50">
            <Link2 className="w-4 h-4" />
            <span className="text-xs">Dependencies</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-indigo-50">
            <Users className="w-4 h-4" />
            <span className="text-xs">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-indigo-50">
            <Shield className="w-4 h-4" />
            <span className="text-xs">Risks</span>
          </TabsTrigger>
        </TabsList>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-6">
          <TaskManagementPanel projectId={projectId} user={user} />
        </TabsContent>

        {/* Timeline / Gantt View */}
        <TabsContent value="timeline" className="mt-6">
          <EnhancedGanttChart tasks={tasks} milestones={milestones} />
        </TabsContent>

        {/* Dependency Tracker */}
        <TabsContent value="dependencies" className="mt-6">
          <DependencyTracker tasks={tasks} projectId={projectId} />
        </TabsContent>

        {/* Resource Allocation */}
        <TabsContent value="resources" className="mt-6">
          <ResourceAllocationView tasks={tasks} teamMembers={teamAssignments} />
        </TabsContent>

        {/* Risk Assessment */}
        <TabsContent value="risks" className="mt-6">
          <RiskAssessmentPanel projectId={projectId} project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}