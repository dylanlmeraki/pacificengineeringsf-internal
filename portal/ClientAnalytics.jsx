import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  Calendar, 
  FileText, 
  MessageSquare, 
  DollarSign,
  Clock,
  CheckCircle2,
  Target
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { safeParseISO, toMonthBucket, safeDateDifference } from "@/components/utils/dataHelpers";
import { CHART_COLORS } from "@/components/utils/constants";

export default function ClientAnalytics({ 
  projects = [], 
  documents = [], 
  projectMessages = [], 
  proposalMessages = [],
  milestones = [],
  changeOrders = []
}) {
  // Calculate project timeline metrics with safe date parsing
  const timelineMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === "In Progress");
    const completedProjects = projects.filter(p => p.status === "Completed");
    
    let onTimeCount = 0;
    let delayedCount = 0;
    let totalCompletionDays = 0;
    let validCompletions = 0;

    completedProjects.forEach(project => {
      const days = safeDateDifference(project.start_date, project.actual_completion);
      
      if (days !== null && Number.isFinite(days)) {
        totalCompletionDays += days;
        validCompletions++;

        const estimatedDays = safeDateDifference(project.start_date, project.estimated_completion);
        if (estimatedDays !== null && Number.isFinite(estimatedDays)) {
          if (days <= estimatedDays) {
            onTimeCount++;
          } else {
            delayedCount++;
          }
        }
      }
    });

    const avgCompletionTime = validCompletions > 0 
      ? Math.round(totalCompletionDays / validCompletions) 
      : 0;

    return {
      onTimeCount,
      delayedCount,
      avgCompletionTime,
      totalCompleted: completedProjects.length,
      validCompletions
    };
  }, [projects]);

  // Budget adherence data
  const budgetData = useMemo(() => {
    return projects
      .filter(p => p.budget && p.budget > 0)
      .map(p => ({
        name: p.project_name.substring(0, 20),
        budget: p.budget,
        progress: p.progress_percentage || 0
      }));
  }, [projects]);

  // Document activity over time with safe date parsing and month bucketing
  const documentActivity = useMemo(() => {
    const monthlyDocs = {};
    documents.forEach(doc => {
      const date = safeParseISO(doc.created_date);
      if (date) {
        const bucket = toMonthBucket(date);
        if (bucket) {
          monthlyDocs[bucket.key] = {
            month: bucket.label,
            count: (monthlyDocs[bucket.key]?.count || 0) + 1
          };
        }
      }
    });

    return Object.values(monthlyDocs)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [documents]);

  // Document types distribution
  const documentTypes = useMemo(() => {
    const types = {};
    documents.forEach(doc => {
      types[doc.document_type] = (types[doc.document_type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => ({ type, count }));
  }, [documents]);

  // Communication response metrics with safe date parsing
  const communicationMetrics = useMemo(() => {
    const totalMessages = projectMessages.length + proposalMessages.length;
    const messagesPerMonth = {};
    
    [...projectMessages, ...proposalMessages].forEach(msg => {
      const date = safeParseISO(msg.created_date);
      if (date) {
        const bucket = toMonthBucket(date);
        if (bucket) {
          messagesPerMonth[bucket.key] = {
            month: bucket.label,
            count: (messagesPerMonth[bucket.key]?.count || 0) + 1
          };
        }
      }
    });

    return {
      total: totalMessages,
      projectMessages: projectMessages.length,
      proposalMessages: proposalMessages.length,
      perMonth: Object.values(messagesPerMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6)
    };
  }, [projectMessages, proposalMessages]);

  // Project status distribution
  const statusDistribution = useMemo(() => {
    const statuses = {};
    projects.forEach(p => {
      statuses[p.status] = (statuses[p.status] || 0) + 1;
    });
    return Object.entries(statuses).map(([status, count]) => ({ status, count }));
  }, [projects]);

  // Progress distribution
  const progressData = useMemo(() => {
    return projects
      .filter(p => p.status === "In Progress")
      .map(p => ({
        name: p.project_name.substring(0, 20),
        progress: p.progress_percentage || 0
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);
  }, [projects]);

  const COLORS = CHART_COLORS;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <div className="text-3xl font-bold">{projects.length}</div>
              <div className="text-sm opacity-90">Total Projects</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <div className="text-3xl font-bold">
                {timelineMetrics.onTimeCount}/{timelineMetrics.totalCompleted}
              </div>
              <div className="text-sm opacity-90">On Time</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <div className="text-3xl font-bold">{documents.length}</div>
              <div className="text-sm opacity-90">Documents</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <MessageSquare className="w-8 h-8 opacity-80" />
            <div className="text-right">
              <div className="text-3xl font-bold">{communicationMetrics.total}</div>
              <div className="text-sm opacity-90">Messages</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline Performance */}
      <Card className="p-6 border-0 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Project Timeline Performance
        </h3>
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{timelineMetrics.onTimeCount}</div>
            <div className="text-sm text-gray-600 mt-1">Completed On Time</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{timelineMetrics.delayedCount}</div>
            <div className="text-sm text-gray-600 mt-1">Delayed</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{timelineMetrics.avgCompletionTime}</div>
            <div className="text-sm text-gray-600 mt-1">Avg Days to Complete</div>
          </div>
        </div>

        {statusDistribution.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Project Progress */}
      {progressData.length > 0 && (
        <Card className="p-6 border-0 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Active Projects Progress
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="progress" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Budget Overview */}
      {budgetData.length > 0 && (
        <Card className="p-6 border-0 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Budget Overview
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Budget ($)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="budget" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Document Activity */}
      {documentActivity.length > 0 && (
        <Card className="p-6 border-0 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Document Activity (Last 6 Months)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={documentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Documents Uploaded" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {documentTypes.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold text-gray-900 mb-4">Document Types Distribution</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {documentTypes.map((type, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                      <span className="text-gray-700">{type.type}</span>
                      <Badge variant="outline">{type.count}</Badge>
                    </div>
                  ))}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={documentTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, count }) => `${type.substring(0, 8)}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {documentTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Communication Metrics */}
      {communicationMetrics.perMonth.length > 0 && (
        <Card className="p-6 border-0 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-600" />
            Communication Activity
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{communicationMetrics.projectMessages}</div>
              <div className="text-sm text-gray-600">Project Messages</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{communicationMetrics.proposalMessages}</div>
              <div className="text-sm text-gray-600">Proposal Messages</div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={communicationMetrics.perMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {projects.length === 0 && (
        <Card className="p-12 text-center border-0 shadow-xl">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Analytics Data Yet</h3>
          <p className="text-gray-600">
            Analytics will appear here as your projects progress and data accumulates.
          </p>
        </Card>
      )}
    </div>
  );
}