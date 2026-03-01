import React, { useState, useEffect } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery } from "@tanstack/react-query";
import { getInternalPortalUrl, isClientPortal } from "@/components/utils/subdomainHelpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FolderKanban, 
  Search, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  BarChart3,
  PlusCircle,
  Plus,
  Inbox,
  Download,
  User,
  RefreshCw,
  Settings
} from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { parseError, logError } from "../components/utils/errorHandler";
import { warn, error as logErrorMsg } from "../components/utils/logger";
import ClientPortalErrorBoundary from "../components/portal/ClientPortalErrorBoundary";
import ProjectCard from "../components/portal/ProjectCard";
import ClientDashboard from "../components/portal/ClientDashboard";
import DocumentUploader from "../components/portal/DocumentUploader";
import MilestoneApproval from "../components/portal/MilestoneApproval";
import ChangeOrderApproval from "../components/portal/ChangeOrderApproval";
import ProposalsList from "../components/portal/ProposalsList";
import ClientProposalView from "../components/portal/ClientProposalView";
import DocumentsManager from "../components/portal/DocumentsManager";
import CommunicationHub from "../components/portal/CommunicationHub";
import ClientAnalytics from "../components/portal/ClientAnalytics";
import ProjectRequestForm from "../components/portal/ProjectRequestForm";
import ProjectProgressTracker from "../components/portal/ProjectProgressTracker";
import NotificationBell from "../components/portal/NotificationBell";
import MessageThread from "../components/portal/MessageThread";
import ContractsApprovals from "../components/portal/ContractsApprovals";
import ClientInvoices from "../components/portal/ClientInvoices";
import ClientProfileSettings from "../components/portal/ClientProfileSettings";
import ClientDocumentUploader from "../components/portal/ClientDocumentUploader";
import ClientNotificationFeed from "../components/portal/ClientNotificationFeed";
import EnhancedClientDashboard from "../components/portal/EnhancedClientDashboard";
import SecureDocumentViewer from "../components/portal/SecureDocumentViewer";
import EnhancedClientOnboarding from "../components/portal/EnhancedClientOnboarding";
import AdvancedClientReporting from "../components/portal/AdvancedClientReporting";
import EnhancedCommunicationHub from "../components/communications/EnhancedCommunicationHub";
import TaskManagementPanel from "../components/projects/TaskManagementPanel";
import ProjectManagementModule from "../components/portal/ProjectManagementModule";
import ClientCommunicationsHub from "../components/portal/ClientCommunicationsHub";
import EnhancedAnalyticsDashboard from "../components/portal/EnhancedAnalyticsDashboard";
import ClientTeamManagement from "../components/portal/ClientTeamManagement";
import NotificationPreferences from "../components/portal/NotificationPreferences";
import ProjectsHubModule from "../components/portal/ProjectsHubModule";
import ClientWorkflowSettings from "../components/portal/ClientWorkflowSettings";
import PortalGuard from "../components/portal/PortalGuard";
import ProjectDetailsCard from "../components/portal/ProjectDetailsCard";
import AIAssistant from "../components/portal/AIAssistant";
import FeedbackForm from "../components/portal/FeedbackForm";
import ScheduledReportManager from "../components/reporting/ScheduledReportManager";
import GranularRoleAssignment from "../components/portal/GranularRoleAssignment";
import ProjectLiveChat from "../components/collaboration/ProjectLiveChat";
import AIProjectBriefGenerator from "../components/portal/AIProjectBriefGenerator";
import DocumentApprovalCenter from "../components/portal/DocumentApprovalCenter";
import ServiceRecommendations from "../components/portal/ServiceRecommendations";
import AIOnboardingAssistant from "../components/portal/AIOnboardingAssistant";
import ProjectManagementSuite from "../components/projects/ProjectManagementSuite";
import { format } from "date-fns";

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [viewingProposal, setViewingProposal] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setAuthLoading(true);
        setAuthError(null);
        
        const isAuth = await portalApi.auth.isAuthenticated();
        if (!isAuth) {
          // Redirect to auth page if not authenticated
          const currentPath = window.location.pathname + window.location.search;
          portalApi.auth.redirectToLogin(currentPath);
          return;
        }
        
        const currentUser = await portalApi.auth.me();
        setUser(currentUser);
        
        // Show onboarding if user hasn't completed it
        if (!currentUser?.onboarding_complete) {
          setShowOnboarding(true);
        }
      } catch (error) {
        logError(error, { context: 'ClientPortal - fetchUser' });
        logErrorMsg("Failed to fetch user in ClientPortal", { error: error?.message });
        const parsed = parseError(error);
        
        if (parsed.statusCode === 401 || parsed.type === 'AUTH_ERROR') {
          const currentPath = window.location.pathname + window.location.search;
          portalApi.auth.redirectToLogin(currentPath);
        } else {
          setAuthError(parsed);
        }
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const { data: projects = [], isLoading, error: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ['client-projects', user?.email],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await portalApi.entities.Project.filter(
          { client_email: user.email },
          '-created_date',
          100
        );
      } catch (error) {
        logError(error, { context: 'ClientPortal - fetchProjects', userEmail: user?.email });
        throw error;
      }
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['client-milestones', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const milestones = await Promise.all(
        projectIds.map(id => portalApi.entities.ProjectMilestone.filter({ project_id: id }))
      );
      return milestones.flat();
    },
    enabled: !!user && projects.length > 0
  });

  const { data: allChangeOrders = [] } = useQuery({
    queryKey: ['client-change-orders', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const orders = await Promise.all(
        projectIds.map(id => portalApi.entities.ChangeOrder.filter({ project_id: id }))
      );
      return orders.flat();
    },
    enabled: !!user && projects.length > 0
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['client-documents', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const docs = await Promise.all(
        projectIds.map(id => portalApi.entities.ProjectDocument.filter({ project_id: id }))
      );
      return docs.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user && projects.length > 0
  });

  const { data: clientProposals = [] } = useQuery({
    queryKey: ['client-proposals', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const proposals = await Promise.all(
        projectIds.map(id => portalApi.entities.Proposal.filter({ project_id: id }))
      );
      return proposals.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user && projects.length > 0
  });

  const { data: projectMessages = [] } = useQuery({
    queryKey: ['client-project-messages-analytics', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const messages = await Promise.all(
        projectIds.map(id => portalApi.entities.ProjectMessage.filter({ project_id: id }))
      );
      return messages.flat();
    },
    enabled: !!user && projects.length > 0
  });

  const { data: proposalMessages = [] } = useQuery({
    queryKey: ['client-proposal-messages-analytics', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const proposals = await Promise.all(
        projectIds.map(id => portalApi.entities.Proposal.filter({ project_id: id }))
      );
      const proposalIds = proposals.flat().map(p => p.id);
      if (proposalIds.length === 0) return [];
      const messages = await Promise.all(
        proposalIds.map(id => portalApi.entities.ProposalMessage.filter({ proposal_id: id }))
      );
      return messages.flat();
    },
    enabled: !!user && projects.length > 0
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-project-requests', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await portalApi.entities.ProjectRequest.filter({ client_email: user.email }, '-created_date');
    },
    enabled: !!user
  });

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.project_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingMilestones = allMilestones.filter(m => m.status === "Pending Client Approval");
  const pendingChangeOrders = allChangeOrders.filter(co => co.status === "Pending Client Approval");
  const pendingProposals = clientProposals.filter(p => ['sent', 'viewed', 'awaiting_signature'].includes(p.status));

  // Calculate stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "In Progress").length,
    completed: projects.filter(p => p.status === "Completed").length,
    pending: projects.filter(p => p.status === "Planning" || p.status === "Under Review").length
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    );
  }

  // Auth error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <ErrorDisplay 
          error={authError} 
          onRetry={() => window.location.reload()}
          showHomeButton={true}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access your client portal.</p>
          <Button 
            onClick={() => portalApi.auth.redirectToLogin(window.location.href)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Log In
          </Button>
        </Card>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <EnhancedClientOnboarding 
        user={user} 
        onComplete={() => setShowOnboarding(false)} 
      />
    );
  }

  if (viewingProposal && selectedProposal) {
    return (
      <ClientProposalView
        proposal={selectedProposal}
        onClose={() => {
          setViewingProposal(false);
          setSelectedProposal(null);
        }}
        onBack={() => setViewingProposal(false)}
      />
    );
  }

  return (
    <PortalGuard portalType="client">
    <ClientPortalErrorBoundary>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-800 text-white py-12 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar - Logo and Main Site Link */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68eb69c51ce08e4c9fdca015/fbd78afc1_Asset2-100.jpg"
                alt="Pacific Engineering"
                className="h-12 w-12 object-contain rounded-xl"
              />
              <div>
                <div className="font-bold text-lg">Pacific Engineering</div>
                <div className="text-s text-cyan-200">San Francisco</div>
              </div>
            </div>
            <a 
              href="https://pacificengineeringsf.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="border-white/40 text-black hover:bg-white/20 hover:border-white transition-all"
              >
                Visit Main Site
              </Button>
            </a>
          </div>

          {/* Main Header Content */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">Client Portal</h1>
                <p className="text-cyan-100">Welcome back, {user.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ClientNotificationFeed user={user} />
              <Button
                onClick={() => setShowNotificationPrefs(true)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                title="Notification Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => {
                  const element = document.querySelector('[data-profile-tab]');
                  element?.click();
                }}
                className="text-white hover:bg-white/20"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-6 -mt-8 mb-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-6">
          <Card className="p-6 border-0 shadow-xl bg-white">
            <div className="flex items-center justify-between mb-2">
              <FolderKanban className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Projects</p>
          </Card>

          <Card className="p-6 border-0 shadow-xl bg-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.active}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Active Projects</p>
          </Card>

          <Card className="p-6 border-0 shadow-xl bg-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-cyan-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.completed}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
          </Card>

          <Card className="p-6 border-0 shadow-xl bg-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-orange-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.pending}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Pending Review</p>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="dashboard" className="w-full">
            <div className="mb-8 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <TabsList className="h-auto bg-transparent p-0">
                  <TabsTrigger value="dashboard" className="w-full flex items-center justify-center gap-2 h-12 bg-white shadow-md hover:shadow-lg transition-all">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                </TabsList>
                <TabsList className="h-auto bg-transparent p-0">
                  <TabsTrigger value="projects" className="w-full flex items-center justify-center gap-2 h-12 bg-white shadow-md hover:shadow-lg transition-all">
                    <FolderKanban className="w-4 h-4" />
                    <span className="hidden sm:inline">Projects ({projects.length})</span>
                  </TabsTrigger>
                </TabsList>
                <TabsList className="h-auto bg-transparent p-0">
                  <TabsTrigger value="communications" className="w-full flex items-center justify-center gap-2 h-12 bg-white shadow-md hover:shadow-lg transition-all">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Communications</span>
                  </TabsTrigger>
                </TabsList>
                <TabsList className="h-auto bg-transparent p-0">
                  <TabsTrigger value="invoices" className="w-full flex items-center justify-center gap-2 h-12 bg-white shadow-md hover:shadow-lg transition-all">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Invoices</span>
                  </TabsTrigger>
                </TabsList>
                <TabsList className="h-auto bg-transparent p-0">
                  <TabsTrigger value="reports" className="w-full flex items-center justify-center gap-2 h-12 bg-white shadow-md hover:shadow-lg transition-all">
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Reports</span>
                  </TabsTrigger>
                </TabsList>
                <TabsList className="h-auto bg-transparent p-0">
                  <TabsTrigger 
                    value="profile" 
                    className="w-full flex items-center justify-center gap-2 h-12 bg-white shadow-md hover:shadow-lg transition-all"
                    data-profile-tab
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <EnhancedClientDashboard user={user} projects={projects} />

                  {/* Service Recommendations */}
                  <div className="mt-8">
                    <ServiceRecommendations user={user} projects={projects} />
                  </div>

                  {/* Document Approvals Quick View */}
                  {allDocuments.filter(d => d.status === "Under Review").length > 0 && (
                    <div className="mt-8">
                      <DocumentApprovalCenter user={user} projects={projects} />
                    </div>
                  )}

                  <div className="mt-8">
                    <ClientDashboard 
                      projects={projects}
                      pendingMilestones={pendingMilestones}
                      pendingChangeOrders={pendingChangeOrders}
                      recentDocuments={allDocuments}
                      pendingProposals={pendingProposals}
                      user={user}
                    />
                  </div>
                  <div className="mt-8">
                    <EnhancedAnalyticsDashboard 
                      projects={projects}
                      documents={allDocuments}
                      projectMessages={projectMessages}
                      proposalMessages={proposalMessages}
                      milestones={allMilestones}
                      changeOrders={allChangeOrders}
                    />
                  </div>
                </>
              )}
            </TabsContent>


            {/* Documents Tab */}
            <TabsContent value="documents">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  <Card className="p-6 border-0 shadow-lg">
                    <h3 className="text-xl font-bold mb-4">Secure Document Access</h3>
                    <p className="text-gray-600 mb-4">
                      View and download project documents securely. All downloads are logged for security.
                    </p>
                  </Card>
                  <SecureDocumentViewer documents={allDocuments} />
                </div>
              )}
            </TabsContent>

            {/* Proposals Tab */}
            <TabsContent value="proposals">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {pendingProposals.length > 0 && (
                    <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-purple-600" />
                        Action Required
                      </h3>
                      <p className="text-gray-700 mb-4">
                        You have {pendingProposals.length} proposal{pendingProposals.length > 1 ? 's' : ''} awaiting your review
                      </p>
                    </div>
                  )}
                  <ProposalsList 
                    proposals={clientProposals} 
                    onViewProposal={(proposal) => {
                      setSelectedProposal(proposal);
                      setViewingProposal(true);
                    }} 
                  />
                </>
              )}
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects">
              <div className="space-y-6">
                {/* AI Project Brief Generator */}
                <AIProjectBriefGenerator
                  user={user}
                  onSubmitBrief={async (briefData) => {
                    await portalApi.entities.ProjectRequest.create({
                      request_title: briefData.title,
                      project_type: briefData.type,
                      description: briefData.brief,
                      location: briefData.location,
                      client_email: user.email,
                      client_name: user.full_name,
                      status: "Pending Review",
                      urgency: "Medium",
                    });
                    refetchProjects();
                  }}
                />

                {projects.length > 0 && (
                  <ProjectDetailsCard project={projects[0]} />
                )}
                <ProjectsHubModule
                  user={user}
                  projects={projects}
                  allDocuments={allDocuments}
                  allMilestones={allMilestones}
                  allChangeOrders={allChangeOrders}
                  clientProposals={clientProposals}
                  isLoading={isLoading}
                />

                {/* Document Approval Center */}
                {projects.length > 0 && (
                  <DocumentApprovalCenter user={user} projects={projects} />
                )}

                {/* Full Project Management Suite */}
                {projects.length > 0 && (
                  <ProjectManagementSuite
                    projectId={projects[0]?.id}
                    project={projects[0]}
                    user={user}
                  />
                )}
                {projects.length > 0 && (
                  <div className="mt-6">
                    <ProjectLiveChat
                      projectId={projects[0]?.id}
                      user={user}
                      projectName={projects[0]?.project_name}
                    />
                  </div>
                )}
                {projects.length > 0 && (
                  <div className="mt-6">
                    <FeedbackForm 
                      projectId={projects[0]?.id}
                      type="project"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Contracts & Approvals Tab */}
            <TabsContent value="contracts">
              <ContractsApprovals user={user} projects={projects} />
            </TabsContent>

            {/* Approvals Tab */}
            <TabsContent value="approvals" className="space-y-6">
              {pendingMilestones.length === 0 && pendingChangeOrders.length === 0 ? (
                <Card className="p-12 text-center border-0 shadow-xl bg-white">
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

            {/* Upload Tab */}
            <TabsContent value="upload">
              <div className="max-w-4xl mx-auto">
                {projects.length === 0 ? (
                  <Card className="p-12 text-center border-0 shadow-xl bg-white">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Yet</h3>
                    <p className="text-gray-600">You need an active project to upload documents.</p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card className="p-6 border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <h3 className="text-2xl font-bold mb-2">Upload Project Documents</h3>
                      <p className="text-blue-100">Upload documents and link them to specific tasks or milestones</p>
                    </Card>
                    <div className="space-y-6">
                      {projects.map(project => (
                        <details key={project.id} className="group">
                          <summary className="cursor-pointer list-none p-4 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-300">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg">{project.project_name}</h4>
                                <p className="text-sm text-gray-600">#{project.project_number}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700">{project.status}</Badge>
                                <span className="text-sm text-gray-500">Click to upload</span>
                              </div>
                            </div>
                          </summary>
                          <div className="mt-4">
                            <ClientDocumentUploader projectId={project.id} user={user} />
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <ClientInvoices clientEmail={user?.email} />
            </TabsContent>

            {/* Profile Tab - Sub-tabs */}
            <TabsContent value="profile">
              <Tabs defaultValue="settings" className="w-full">
                <TabsList className="mb-6 flex-wrap">
                  <TabsTrigger value="settings">Account Settings</TabsTrigger>
                  <TabsTrigger value="team">Team Management</TabsTrigger>
                  <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                  <ClientProfileSettings 
                    user={user} 
                    onUpdate={async () => {
                      const updatedUser = await portalApi.auth.me();
                      setUser(updatedUser);
                    }}
                  />
                </TabsContent>

                <TabsContent value="team">
                  <ClientTeamManagement user={user} />
                </TabsContent>

                <TabsContent value="roles">
                  <GranularRoleAssignment user={user} projects={projects} />
                </TabsContent>

                <TabsContent value="workflow">
                  <ClientWorkflowSettings 
                    projectId={projects[0]?.id} 
                    clientEmail={user.email}
                    milestones={allMilestones}
                    project={projects[0]}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <div className="space-y-8">
                <AdvancedClientReporting user={user} projects={projects} />
                <ScheduledReportManager user={user} projects={projects} />
              </div>
            </TabsContent>

            {/* Communications Tab */}
            <TabsContent value="communications">
              <EnhancedCommunicationHub user={user} projects={projects} />
            </TabsContent>
          </Tabs>

          {/* Notification Preferences Dialog */}
          <NotificationPreferences 
            user={user} 
            open={showNotificationPrefs} 
            onOpenChange={setShowNotificationPrefs}
          />
        </div>
      </section>

      {/* AI Assistant */}
      <AIAssistant 
        user={user} 
        projects={projects}
        proposals={clientProposals}
        documents={allDocuments}
      />

      {/* AI Onboarding Assistant */}
      <AIOnboardingAssistant
        user={user}
        projects={projects}
        industry={user?.industry}
      />
    </div>
    </ClientPortalErrorBoundary>
    </PortalGuard>
  );
}