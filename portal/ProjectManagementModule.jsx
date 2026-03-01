import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FolderKanban,
  FileText,
  MessageSquare,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import ProjectProgressTracker from "./ProjectProgressTracker";
import EnhancedCommunicationsHub from "./EnhancedCommunicationsHub";
import SecureDocumentViewer from "./SecureDocumentViewer";
import DocumentUploader from "./DocumentUploader";

export default function ProjectManagementModule({
  projects,
  allDocuments,
  allMilestones,
  isLoading,
  user
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProjectTab, setSelectedProjectTab] = useState(
    projects.length > 0 ? projects[0].id : null
  );

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.project_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      "Planning": "bg-yellow-100 text-yellow-800",
      "In Progress": "bg-blue-100 text-blue-800",
      "On Hold": "bg-orange-100 text-orange-800",
      "Under Review": "bg-purple-100 text-purple-800",
      "Completed": "bg-green-100 text-green-800",
      "Closed": "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="p-12 text-center border-0 shadow-xl bg-white">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FolderKanban className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No Projects Yet
        </h3>
        <p className="text-gray-600">
          Contact us to get started with your first project!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project List & Search */}
      <Card className="p-6 border-0 shadow-lg bg-white">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name or number..."
                className="pl-10 h-12"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "All" },
                { value: "In Progress", label: "Active" },
                { value: "Planning", label: "Planning" },
                { value: "Completed", label: "Complete" },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  onClick={() => setStatusFilter(filter.value)}
                  className={
                    statusFilter === filter.value ? "bg-blue-600" : ""
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {projects.length}
              </p>
              <p className="text-xs text-gray-600">Total Projects</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {projects.filter((p) => p.status === "In Progress").length}
              </p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {projects.filter((p) => p.status === "Completed").length}
              </p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {allMilestones.filter(
                  (m) => m.status === "Pending Client Approval"
                ).length}
              </p>
              <p className="text-xs text-gray-600">Awaiting Approval</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Projects Grid */}
      <div className="grid gap-4">
        {filteredProjects.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-lg bg-white">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">
              No projects match your search filters.
            </p>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden bg-white"
            >
              {/* Project Header */}
              <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-blue-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {project.project_name}
                      </h3>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Project #{project.project_number}
                    </p>
                  </div>

                  {project.priority && (
                    <Badge variant="outline" className="w-fit">
                      {project.priority} Priority
                    </Badge>
                  )}
                </div>

                {project.description && (
                  <p className="text-gray-700 mt-3">{project.description}</p>
                )}

                {/* Key Dates */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t text-sm">
                  {project.start_date && (
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(project.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {project.estimated_completion && (
                    <div>
                      <p className="text-gray-600">Est. Completion</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(
                          project.estimated_completion
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {project.location && (
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-semibold text-gray-900">
                        {project.location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Content Tabs */}
              <Tabs defaultValue="progress" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-gray-50 p-0 border-b">
                  <TabsTrigger value="progress" className="rounded-none">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Progress
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-none">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="rounded-none">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Communication
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="progress" className="m-0">
                    <ProjectProgressTracker
                      project={project}
                      milestones={allMilestones.filter(
                        (m) => m.project_id === project.id
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="m-0 space-y-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Project Documents
                        </h4>
                        <SecureDocumentViewer
                          documents={allDocuments.filter(
                            (d) => d.project_id === project.id
                          )}
                        />
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Upload Document
                        </h4>
                        <DocumentUploader projectId={project.id} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="communication" className="m-0">
                    <EnhancedCommunicationsHub projectId={project.id} user={user} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}