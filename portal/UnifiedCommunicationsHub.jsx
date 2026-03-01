import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Bell, FileText, Loader2, TrendingUp } from "lucide-react";
import { NOTIFICATION_ICONS, NOTIFICATION_PRIORITY_COLORS } from "@/components/utils/constants";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function UnifiedCommunicationsHub({ user }) {
  const [activeTab, setActiveTab] = useState("all");

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['client-notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Notification.filter(
        { recipient_email: user.email },
        '-created_date',
        100
      );
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const { data: projectMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['client-project-messages', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const projects = await base44.entities.Project.filter({ client_email: user.email });
      const projectIds = projects.map(p => p.id);
      
      const messages = [];
      for (const projectId of projectIds) {
        const msgs = await base44.entities.ProjectMessage.filter(
          { project_id: projectId, is_internal: false },
          '-created_date',
          20
        );
        messages.push(...msgs);
      }
      
      return messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const { data: proposalMessages = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['client-proposal-messages', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const proposals = await base44.entities.Proposal.filter({ client_email: user.email });
      const proposalIds = proposals.map(p => p.id);
      
      const messages = [];
      for (const proposalId of proposalIds) {
        const msgs = await base44.entities.ProposalMessage.filter(
          { proposal_id: proposalId },
          '-created_date',
          20
        );
        messages.push(...msgs);
      }
      
      return messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const isLoading = loadingNotifications || loadingMessages || loadingProposals;

  const notificationCount = notifications.filter(n => !n.read).length;
  const projectMessageCount = projectMessages.length;
  const proposalMessageCount = proposalMessages.length;
  const totalCount = notificationCount + projectMessageCount + proposalMessageCount;

  const getNotificationIcon = (type) => {
    const Icon = NOTIFICATION_ICONS[type] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  const getPriorityColor = (priority) => {
    return NOTIFICATION_PRIORITY_COLORS[priority] || NOTIFICATION_PRIORITY_COLORS.medium;
  };

  const getFilteredContent = () => {
    switch (activeTab) {
      case "notifications":
        return notifications;
      case "project_messages":
        return projectMessages;
      case "proposal_messages":
        return proposalMessages;
      case "all":
      default:
        return [
          ...notifications.map(n => ({ ...n, _type: 'notification' })),
          ...projectMessages.map(m => ({ ...m, _type: 'project_message' })),
          ...proposalMessages.map(m => ({ ...m, _type: 'proposal_message' }))
        ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  };

  const filteredContent = getFilteredContent();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Communications</h3>
            <TrendingUp className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-3xl font-bold">{totalCount}</p>
        </Card>

        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Notifications</h3>
            <Bell className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-3xl font-bold">{notificationCount}</p>
          <p className="text-xs opacity-75 mt-1">Unread</p>
        </Card>

        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Project Messages</h3>
            <MessageSquare className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-3xl font-bold">{projectMessageCount}</p>
        </Card>

        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Proposal Discussions</h3>
            <FileText className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-3xl font-bold">{proposalMessageCount}</p>
        </Card>
      </div>

      {/* Unified Feed */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <h2 className="text-2xl font-bold mb-2">Communications Hub</h2>
          <p className="text-blue-100">All your notifications, messages, and discussions in one place</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b bg-gray-50 px-6">
            <TabsList className="bg-transparent border-b-0">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                All ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
                Notifications ({notificationCount})
              </TabsTrigger>
              <TabsTrigger value="project_messages" className="data-[state=active]:bg-white">
                Project Messages ({projectMessageCount})
              </TabsTrigger>
              <TabsTrigger value="proposal_messages" className="data-[state=active]:bg-white">
                Proposals ({proposalMessageCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="p-6 max-h-[800px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Communications Yet</h3>
                <p className="text-gray-600">Communications will appear here as they come in</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContent.map((item, idx) => {
                  if (item._type === 'notification') {
                    return (
                      <Card key={`notification-${item.id}-${idx}`} className={`p-4 border transition-all ${
                        !item.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1 text-blue-600">
                            {getNotificationIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{item.title}</h4>
                              {!item.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{item.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {format(new Date(item.created_date), 'MMM d, h:mm a')}
                              </span>
                              {item.priority && (
                                <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                  {item.priority}
                                </Badge>
                              )}
                            </div>
                            {item.link && (
                              <Link
                                to={item.link}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                              >
                                View Details →
                              </Link>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  } else if (item._type === 'project_message') {
                    return (
                      <Card key={`project-${item.id}-${idx}`} className="p-4 border border-gray-200 bg-white">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">{item.sender_name}</span>
                              <Badge variant="outline" className="text-xs">Project Message</Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{item.message}</p>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.created_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  } else if (item._type === 'proposal_message') {
                    return (
                      <Card key={`proposal-${item.id}-${idx}`} className="p-4 border border-gray-200 bg-white">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">{item.sender_name}</span>
                              <Badge variant="outline" className="text-xs">Proposal Discussion</Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{item.message}</p>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.created_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}