import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, AlertCircle, Loader2, Bot } from "lucide-react";
import { format } from "date-fns";

export default function AdvancedAnalyticsEngine({ projectId, user }) {
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["project-insights", projectId],
    queryFn: () => base44.entities.ProjectInsight.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: projectData = {} } = useQuery({
    queryKey: ["project-analytics", projectId],
    queryFn: async () => {
      const project = await base44.entities.Project.filter({ id: projectId }).then(arr => arr[0]);
      const tasks = await base44.entities.ProjectTask.filter({ project_id: projectId });
      const milestones = await base44.entities.ProjectMilestone.filter({ project_id: projectId });
      const invoices = await base44.entities.Invoice.filter({ project_id: projectId });

      const taskProgress = tasks.map((t, i) => ({
        date: format(new Date(t.created_date), "MMM d"),
        completed: tasks.filter(tk => tk.status === 'completed' && new Date(tk.updated_date) <= new Date(t.created_date)).length,
        total: tasks.length,
      }));

      const budgetTrend = invoices
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        .map((inv, i) => ({
          date: format(new Date(inv.created_date), "MMM d"),
          spent: invoices.filter(i => new Date(i.created_date) <= new Date(inv.created_date)).reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
          budget: project?.budget || 0,
        }));

      return {
        project,
        taskProgress: taskProgress.slice(0, 10),
        budgetTrend: budgetTrend.slice(0, 10),
      };
    },
    enabled: !!projectId,
  });

  const generateAISummaryMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke("AIProjectAssistant", {
        action: "summarize",
        project_id: projectId,
      }),
    onSuccess: (res) => {
      setAiSummary(res.data.summary || res.data);
    },
  });

  const severityColors = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const severityIcons = {
    low: <TrendingUp className="w-4 h-4" />,
    medium: <AlertCircle className="w-4 h-4" />,
    high: <AlertTriangle className="w-4 h-4" />,
    critical: <AlertTriangle className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Bot className="w-4 h-4 mr-2" />
            AI Summary
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {insightsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : insights.length === 0 ? (
            <Card className="p-12 text-center border-0 shadow-lg bg-white">
              <p className="text-gray-500">No insights available yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight) => (
                <Card
                  key={insight.id}
                  className={`p-4 border-0 shadow-md cursor-pointer hover:shadow-lg transition-all ${
                    selectedInsight?.id === insight.id ? "ring-2 ring-blue-400" : ""
                  }`}
                  onClick={() => setSelectedInsight(insight)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{severityIcons[insight.severity]}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <Badge className={severityColors[insight.severity]}>
                          {insight.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      {insight.recommendation && (
                        <p className="text-sm text-blue-600 font-medium">
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Task Progress Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Task Completion Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectData.taskProgress || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    name="Completed Tasks"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    name="Total Tasks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Budget Trend Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💰 Budget Utilization Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectData.budgetTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="spent" fill="#f59e0b" name="Spent" />
                  <Bar dataKey="budget" fill="#d1d5db" name="Budget" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Summary Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="p-6 border-0 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">AI-Powered Summary</h3>
            </div>

            {!aiSummary ? (
              <button
                onClick={() => generateAISummaryMutation.mutate()}
                disabled={generateAISummaryMutation.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {generateAISummaryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  "Generate AI Summary"
                )}
              </button>
            ) : (
              <div className="prose prose-sm max-w-none">
                <div className="bg-blue-50 p-4 rounded-lg text-gray-700 text-sm leading-relaxed">
                  {aiSummary}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}