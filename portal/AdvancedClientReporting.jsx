import React, { useState, useMemo } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell 
} from "recharts";
import { 
  Download, FileText, Filter, BarChart3, TrendingUp, DollarSign, 
  Calendar, Users, Loader2, CheckCircle2, Clock, AlertCircle 
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import AIReportSummary from "../reporting/AIReportSummary";
import ReportFilterPresets from "../reporting/ReportFilterPresets";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const DATE_RANGES = [
  { label: "Last 7 Days", value: "7d", getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "Last 30 Days", value: "30d", getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "Last 3 Months", value: "3m", getDates: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { label: "This Month", value: "this_month", getDates: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: "Custom", value: "custom", getDates: null },
];

export default function AdvancedClientReporting({ user, projects = [] }) {
  const [dateRange, setDateRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTeamMember, setSelectedTeamMember] = useState("all");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [advancedFilters, setAdvancedFilters] = useState({
    projectTypes: [],
    tags: [],
    selectedStatus: "all",
    budgetStart: "",
    budgetEnd: "",
    milestoneStart: "",
    milestoneEnd: "",
  });

  // Fetch comprehensive data
  const { data: allMilestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['reporting-milestones', user?.email],
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

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['reporting-expenses', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const expenses = await Promise.all(
        projectIds.map(id => portalApi.entities.ProjectExpense.filter({ project_id: id }))
      );
      return expenses.flat();
    },
    enabled: !!user && projects.length > 0
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['reporting-messages', user?.email],
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

  const { data: teamAssignments = [] } = useQuery({
    queryKey: ['reporting-team', user?.email],
    queryFn: async () => {
      if (!user || projects.length === 0) return [];
      const projectIds = projects.map(p => p.id);
      const assignments = await Promise.all(
        projectIds.map(id => portalApi.entities.TeamAssignment.filter({ project_id: id }))
      );
      return assignments.flat();
    },
    enabled: !!user && projects.length > 0
  });

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = projects;

    // Date range filter
    if (dateRange !== "all") {
      const range = DATE_RANGES.find(r => r.value === dateRange);
      if (range && range.getDates) {
        const { start, end } = range.getDates();
        filtered = filtered.filter(p => {
          const createdDate = new Date(p.created_date);
          return createdDate >= start && createdDate <= end;
        });
      } else if (dateRange === "custom" && customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        filtered = filtered.filter(p => {
          const createdDate = new Date(p.created_date);
          return createdDate >= start && createdDate <= end;
        });
      }
    }

    // Project filter
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(p => selectedProjects.includes(p.id));
    }

    // Status filter (both from basic and advanced)
    const activeStatus = advancedFilters.selectedStatus !== "all" ? advancedFilters.selectedStatus : selectedStatus;
    if (activeStatus !== "all") {
      filtered = filtered.filter(p => p.status === activeStatus);
    }

    // Project type filter (advanced)
    if (advancedFilters.projectTypes.length > 0) {
      filtered = filtered.filter(p => advancedFilters.projectTypes.includes(p.project_type));
    }

    return filtered;
  }, [projects, dateRange, customStart, customEnd, selectedProjects, selectedStatus, advancedFilters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalBudget = filteredData.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = allExpenses
      .filter(e => filteredData.some(p => p.id === e.project_id))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const completedProjects = filteredData.filter(p => p.status === "Completed").length;
    const activeProjects = filteredData.filter(p => p.status === "In Progress").length;
    
    const completedMilestones = allMilestones
      .filter(m => filteredData.some(p => p.id === m.project_id) && m.status === "Completed")
      .length;
    
    const totalMilestones = allMilestones
      .filter(m => filteredData.some(p => p.id === m.project_id))
      .length;

    const avgProgress = filteredData.length > 0
      ? filteredData.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / filteredData.length
      : 0;

    return {
      totalBudget,
      totalSpent,
      budgetRemaining: totalBudget - totalSpent,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      completedProjects,
      activeProjects,
      totalProjects: filteredData.length,
      completedMilestones,
      totalMilestones,
      milestoneCompletion: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
      avgProgress,
    };
  }, [filteredData, allExpenses, allMilestones]);

  // Project status distribution
  const statusData = useMemo(() => {
    const statusCounts = filteredData.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Budget spending over time
  const budgetData = useMemo(() => {
    const expensesByMonth = {};
    allExpenses
      .filter(e => filteredData.some(p => p.id === e.project_id))
      .forEach(e => {
        const month = format(new Date(e.expense_date || e.created_date), 'MMM yyyy');
        expensesByMonth[month] = (expensesByMonth[month] || 0) + (e.amount || 0);
      });
    
    return Object.entries(expensesByMonth)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [allExpenses, filteredData]);

  // Communication activity
  const communicationData = useMemo(() => {
    const messagesByWeek = {};
    allMessages
      .filter(m => filteredData.some(p => p.id === m.project_id))
      .forEach(m => {
        const week = format(new Date(m.created_date), 'MMM dd');
        messagesByWeek[week] = (messagesByWeek[week] || 0) + 1;
      });
    
    return Object.entries(messagesByWeek)
      .map(([week, count]) => ({ week, count }))
      .slice(-10);
  }, [allMessages, filteredData]);

  // Project progress data
  const progressData = useMemo(() => {
    return filteredData
      .slice(0, 10)
      .map(p => ({
        name: p.project_name.substring(0, 20),
        progress: p.progress_percentage || 0,
      }));
  }, [filteredData]);

  const handleExport = async () => {
    toast.info(`Generating ${exportFormat.toUpperCase()} report...`);
    
    try {
      const reportData = {
        user: user?.email,
        dateRange,
        filters: { selectedProjects, selectedStatus },
        metrics,
        generatedAt: new Date().toISOString(),
      };

      if (exportFormat === "csv") {
        // Generate CSV
        const csvRows = [
          ["Metric", "Value"],
          ["Total Projects", metrics.totalProjects],
          ["Active Projects", metrics.activeProjects],
          ["Completed Projects", metrics.completedProjects],
          ["Total Budget", `$${metrics.totalBudget.toFixed(2)}`],
          ["Total Spent", `$${metrics.totalSpent.toFixed(2)}`],
          ["Budget Remaining", `$${metrics.budgetRemaining.toFixed(2)}`],
          ["Budget Utilization", `${metrics.budgetUtilization.toFixed(1)}%`],
          ["Average Progress", `${metrics.avgProgress.toFixed(1)}%`],
          ["Milestone Completion", `${metrics.milestoneCompletion.toFixed(1)}%`],
        ];
        
        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `client-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.success("CSV report downloaded");
      } else {
        // For PDF, we'd call a backend function
        toast.info("PDF generation coming soon - use CSV for now");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const isLoading = milestonesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Advanced Reporting Dashboard</h2>
            <p className="text-blue-100">Create custom reports with filters and visualizations</p>
          </div>
          <BarChart3 className="w-12 h-12 opacity-50" />
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Label className="mb-2 block">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <>
              <div>
                <Label className="mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block">End Date</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <Label className="mb-2 block">Project Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Export Format</Label>
            <div className="flex gap-2">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <Badge className="bg-blue-100 text-blue-700">{metrics.totalProjects}</Badge>
          </div>
          <h4 className="text-sm font-medium text-gray-600">Total Projects</h4>
          <p className="text-xs text-gray-500 mt-1">{metrics.activeProjects} active</p>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <Badge className="bg-green-100 text-green-700">
              {metrics.budgetUtilization.toFixed(0)}%
            </Badge>
          </div>
          <h4 className="text-sm font-medium text-gray-600">Budget Utilization</h4>
          <p className="text-xs text-gray-500 mt-1">
            ${metrics.totalSpent.toFixed(0)} / ${metrics.totalBudget.toFixed(0)}
          </p>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <Badge className="bg-purple-100 text-purple-700">
              {metrics.avgProgress.toFixed(0)}%
            </Badge>
          </div>
          <h4 className="text-sm font-medium text-gray-600">Avg Progress</h4>
          <p className="text-xs text-gray-500 mt-1">Across all projects</p>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-8 h-8 text-cyan-600" />
            <Badge className="bg-cyan-100 text-cyan-700">
              {metrics.completedMilestones}/{metrics.totalMilestones}
            </Badge>
          </div>
          <h4 className="text-sm font-medium text-gray-600">Milestones</h4>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.milestoneCompletion.toFixed(0)}% complete
          </p>
        </Card>
      </div>

      {/* Advanced Filters with Presets */}
      <ReportFilterPresets
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        projects={projects}
        user={user}
      />

      {/* AI Report Tools */}
      <AIReportSummary
        metrics={metrics}
        filteredData={filteredData}
        allMilestones={allMilestones}
        allExpenses={allExpenses}
        allMessages={allMessages}
      />

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Budget Spending Over Time */}
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Budget Spending Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Project Progress */}
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Project Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <RechartsTooltip />
              <Bar dataKey="progress" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Communication Activity */}
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Communication Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={communicationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <RechartsTooltip />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}