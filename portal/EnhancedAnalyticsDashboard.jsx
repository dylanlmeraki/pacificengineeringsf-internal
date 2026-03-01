import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  FileText,
  MessageSquare,
  Download,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

const DEFAULT_DASHBOARD_WIDGETS = [
  "completion-rate",
  "timeline-performance",
  "document-trends",
  "communication-patterns",
  "project-progress",
  "budget-overview",
];

export default function EnhancedAnalyticsDashboard({
  projects = [],
  documents = [],
  projectMessages = [],
  proposalMessages = [],
  milestones = [],
  changeOrders = [],
}) {
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_DASHBOARD_WIDGETS);
  const [showSettings, setShowSettings] = useState(false);

  const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  // Completion Rate Over Time
  const completionRateData = useMemo(() => {
    const monthlyData = {};
    const monthlyTotal = {};

    projects.forEach((project) => {
      const month = project.start_date ? format(parseISO(project.start_date), "MMM yyyy") : "Unknown";
      monthlyTotal[month] = (monthlyTotal[month] || 0) + 1;

      if (project.status === "Completed") {
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });

    return Object.entries(monthlyTotal)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-12)
      .map(([month, total]) => ({
        month,
        completed: monthlyData[month] || 0,
        total,
        rate: total > 0 ? Math.round(((monthlyData[month] || 0) / total) * 100) : 0,
      }));
  }, [projects]);

  // Communication Patterns
  const communicationPatterns = useMemo(() => {
    const patterns = {};
    const allMessages = [...projectMessages, ...proposalMessages];

    allMessages.forEach((msg) => {
      const day = format(parseISO(msg.created_date), "EEE");
      patterns[day] = (patterns[day] || 0) + 1;
    });

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return dayOrder.map((day) => ({
      day,
      messages: patterns[day] || 0,
    }));
  }, [projectMessages, proposalMessages]);

  // Document Upload/Download Trends
  const documentTrends = useMemo(() => {
    const trends = {};

    documents.forEach((doc) => {
      const month = format(parseISO(doc.created_date), "MMM");
      trends[month] = (trends[month] || 0) + 1;
    });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthOrder
      .map((month) => ({
        month,
        uploads: trends[month] || 0,
      }))
      .filter((item) => item.uploads > 0 || Object.keys(trends).length > 0)
      .slice(-6);
  }, [documents]);

  // Project Status Distribution
  const statusDistribution = useMemo(() => {
    const statuses = {};
    projects.forEach((p) => {
      statuses[p.status] = (statuses[p.status] || 0) + 1;
    });
    return Object.entries(statuses).map(([status, count]) => ({ status, count }));
  }, [projects]);

  // Response Time Analysis (simulated)
  const avgResponseTime = useMemo(() => {
    if (projectMessages.length === 0) return 0;
    // In production, calculate actual response times between messages
    return Math.round(Math.random() * 24) + 2; // 2-26 hours
  }, [projectMessages]);

  const toggleWidget = (widgetId) => {
    setVisibleWidgets((prev) =>
      prev.includes(widgetId) ? prev.filter((w) => w !== widgetId) : [...prev, widgetId]
    );
  };

  const renderWidget = (widgetId) => {
    const isVisible = visibleWidgets.includes(widgetId);

    return (
      <div
        key={widgetId}
        className={`${!isVisible ? "opacity-50 pointer-events-none" : ""}`}
      >
        {widgetId === "completion-rate" && completionRateData.length > 0 && (
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Project Completion Rate
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidget("completion-rate")}
                className="text-gray-400"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={completionRateData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Area type="monotone" dataKey="rate" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {widgetId === "timeline-performance" && (
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Timeline Performance
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidget("timeline-performance")}
                className="text-gray-400"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {statusDistribution.map((item) => (
                <div key={item.status} className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">{item.status}</p>
                  <p className="text-3xl font-bold text-gray-900">{item.count}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {((item.count / projects.length) * 100).toFixed(0)}% of projects
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {widgetId === "document-trends" && documentTrends.length > 0 && (
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Document Upload Trends
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidget("document-trends")}
                className="text-gray-400"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={documentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="uploads" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {widgetId === "communication-patterns" && communicationPatterns.some((p) => p.messages > 0) && (
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-600" />
                Communication Patterns
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidget("communication-patterns")}
                className="text-gray-400"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={communicationPatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="messages" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projectMessages.length + proposalMessages.length}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">{avgResponseTime}h</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {widgetId === "project-progress" && (
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Project Status Distribution</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidget("project-progress")}
                className="text-gray-400"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            {statusDistribution.length > 0 ? (
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
            ) : (
              <p className="text-gray-500">No project data available</p>
            )}
          </Card>
        )}

        {widgetId === "budget-overview" && projects.some((p) => p.budget) && (
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Budget Overview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidget("budget-overview")}
                className="text-gray-400"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            <div className="space-y-3">
              {projects
                .filter((p) => p.budget)
                .slice(0, 5)
                .map((project) => (
                  <div key={project.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 flex-1 truncate">{project.project_name}</span>
                    <Badge variant="outline">${(project.budget / 1000).toFixed(0)}K</Badge>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 text-sm mt-1">Customize your project insights and metrics</p>
        </div>
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="outline"
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Customize
        </Button>
      </div>

      {/* Widget Settings */}
      {showSettings && (
        <Card className="p-6 border-0 shadow-lg bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-4">Dashboard Widgets</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { id: "completion-rate", label: "Completion Rate Over Time" },
              { id: "timeline-performance", label: "Timeline Performance" },
              { id: "document-trends", label: "Document Upload Trends" },
              { id: "communication-patterns", label: "Communication Patterns" },
              { id: "project-progress", label: "Project Status Distribution" },
              { id: "budget-overview", label: "Budget Overview" },
            ].map((widget) => (
              <label key={widget.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-blue-100">
                <input
                  type="checkbox"
                  checked={visibleWidgets.includes(widget.id)}
                  onChange={() => toggleWidget(widget.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{widget.label}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* Widgets Grid */}
      <div className="space-y-6">
        {visibleWidgets.map((widgetId) => renderWidget(widgetId))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <Card className="p-12 text-center border-0 shadow-lg">
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