import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  FolderKanban,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MessageSquare,
  DollarSign,
  Loader2,
} from "lucide-react";
import ProjectRequestForm from "./ProjectRequestForm";
import ProjectManagementModule from "./ProjectManagementModule";
import MilestoneApproval from "./MilestoneApproval";
import ChangeOrderApproval from "./ChangeOrderApproval";
import ProposalsList from "./ProposalsList";
import ContractsApprovals from "./ContractsApprovals";
import ClientReportingModule from "./ClientReportingModule";
import SecureDocumentViewer from "./SecureDocumentViewer";

export default function ProjectsHubModule({ user, projects, allDocuments, allMilestones, allChangeOrders, clientProposals, isLoading }) {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const queryClient = useQueryClient();

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-project-requests', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await portalApi.entities.ProjectRequest.filter({ client_email: user.email }, '-created_date');
    },
    enabled: !!user
  });

  const pendingMilestones = allMilestones.filter(m => m.status === "Pending Client Approval");
  const pendingChangeOrders = allChangeOrders.filter(co => co.status === "Pending Client Approval");
  const pendingProposals = clientProposals.filter(p => ['sent', 'viewed', 'awaiting_signature'].includes(p.status));

  return (
    <div className="space-y-6">
      {/* Project Hub Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Projects Hub</h2>
            <p className="text-blue-100">Comprehensive project management and tracking</p>
          </div>
          <Button
            onClick={() => setShowNewRequest(true)}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <div className="text-3xl font-bold">{projects.length}</div>
            <div className="text-sm text-blue-100 mt-1">Total Projects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{projects.filter(p => p.status === "In Progress").length}</div>
            <div className="text-sm text-blue-100 mt-1">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{allDocuments.length}</div>
            <div className="text-sm text-blue-100 mt-1">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{pendingMilestones.length + pendingChangeOrders.length}</div>
            <div className="text-sm text-blue-100 mt-1">Approvals</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{pendingProposals.length}</div>
            <div className="text-sm text-blue-100 mt-1">Proposals</div>
          </div>
        </div>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto bg-white shadow-md p-1">
          <TabsTrigger value="projects" className="flex flex-col items-center gap-1 py-3">
            <FolderKanban className="w-4 h-4" />
            <span className="text-xs">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex flex-col items-center gap-1 py-3">
            <Plus className="w-4 h-4" />
            <span className="text-xs">Requests</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 py-3">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex flex-col items-center gap-1 py-3">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex flex-col items-center gap-1 py-3">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs">Approvals</span>
            {(pendingMilestones.length + pendingChangeOrders.length) > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs">
                {pendingMilestones.length + pendingChangeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="proposals" className="flex flex-col items-center gap-1 py-3">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Proposals</span>
            {pendingProposals.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-600 text-white text-xs">
                {pendingProposals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex flex-col items-center gap-1 py-3">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Contracts</span>
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6">
          <ProjectManagementModule
            projects={projects}
            allDocuments={allDocuments}
            allMilestones={allMilestones}
            isLoading={isLoading}
            user={user}
          />
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="mt-6">
          <div className="space-y-6">
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">My Service Requests</h3>
                  <p className="text-sm text-gray-600 mt-1">Track your project requests and their status</p>
                </div>
                <Button onClick={() => setShowNewRequest(true)} className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </div>

              {showNewRequest && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <ProjectRequestForm 
                    onClose={() => setShowNewRequest(false)}
                    onSuccess={() => {
                      setShowNewRequest(false);
                      queryClient.invalidateQueries({ queryKey: ['my-project-requests'] });
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                {myRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No service requests submitted yet</p>
                  </div>
                ) : (
                  myRequests.map(request => (
                    <Card key={request.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{request.request_type}</h4>
                            <Badge className={
                              request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{request.description}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>Type: {request.project_type}</span>
                            <span>•</span>
                            <span>Urgency: {request.urgency}</span>
                            {request.preferred_start_date && (
                              <>
                                <span>•</span>
                                <span>Start: {new Date(request.preferred_start_date).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <ClientReportingModule 
            projects={projects}
            allMilestones={allMilestones}
            allChangeOrders={allChangeOrders}
            user={user}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card className="p-6 border-0 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6">All Project Documents</h3>
            <SecureDocumentViewer documents={allDocuments} />
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="mt-6 space-y-6">
          {pendingMilestones.length === 0 && pendingChangeOrders.length === 0 ? (
            <Card className="p-12 text-center border-0 shadow-lg">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">You have no pending approvals at this time.</p>
            </Card>
          ) : (
            <>
              {pendingMilestones.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Pending Milestones ({pendingMilestones.length})
                  </h3>
                  <div className="grid gap-4">
                    {pendingMilestones.map(milestone => (
                      <MilestoneApproval key={milestone.id} milestone={milestone} />
                    ))}
                  </div>
                </div>
              )}

              {pendingChangeOrders.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Pending Change Orders ({pendingChangeOrders.length})
                  </h3>
                  <div className="grid gap-4">
                    {pendingChangeOrders.map(co => (
                      <ChangeOrderApproval key={co.id} changeOrder={co} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="mt-6">
          {pendingProposals.length > 0 && (
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                Action Required
              </h3>
              <p className="text-gray-700">
                You have {pendingProposals.length} proposal{pendingProposals.length > 1 ? 's' : ''} awaiting your review
              </p>
            </div>
          )}
          <ProposalsList proposals={clientProposals} />
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-6">
          <ContractsApprovals user={user} projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}