import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar, Clock, FileText, Plus, Trash2, Loader2,
  Play, Pause, Sparkles, Mail, Download, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

const AVAILABLE_METRICS = [
  { key: "project_status", label: "Project Status Summary" },
  { key: "budget_overview", label: "Budget Overview" },
  { key: "milestone_progress", label: "Milestone Progress" },
  { key: "expense_breakdown", label: "Expense Breakdown" },
  { key: "timeline_analysis", label: "Timeline Analysis" },
  { key: "communication_activity", label: "Communication Activity" },
  { key: "risk_assessment", label: "Risk Assessment" },
  { key: "team_utilization", label: "Team Utilization" },
];

const SCHEDULE_DAYS = [
  { value: "Monday 9:00 AM", label: "Monday 9AM" },
  { value: "Tuesday 9:00 AM", label: "Tuesday 9AM" },
  { value: "Wednesday 9:00 AM", label: "Wednesday 9AM" },
  { value: "Thursday 9:00 AM", label: "Thursday 9AM" },
  { value: "Friday 9:00 AM", label: "Friday 9AM" },
  { value: "1st of month", label: "1st of Month" },
  { value: "15th of month", label: "15th of Month" },
];

export default function ScheduledReportManager({ user, projects = [] }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [formData, setFormData] = useState({
    report_name: "",
    description: "",
    schedule_frequency: "weekly",
    schedule_day: "Monday 9:00 AM",
    recipients: "",
    export_format: ["pdf"],
    metrics: ["project_status", "budget_overview"],
    filters: {},
    is_active: true,
  });

  const { data: scheduledReports = [], isLoading } = useQuery({
    queryKey: ["scheduled-reports", user?.email],
    queryFn: () => portalApi.entities.ScheduledReport.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => portalApi.entities.ScheduledReport.create({
      ...data,
      created_by: user?.email,
      last_run_status: "pending",
      run_count: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      setShowCreateDialog(false);
      resetForm();
      toast.success("Scheduled report created");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => portalApi.entities.ScheduledReport.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => portalApi.entities.ScheduledReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Report schedule deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      report_name: "",
      description: "",
      schedule_frequency: "weekly",
      schedule_day: "Monday 9:00 AM",
      recipients: "",
      export_format: ["pdf"],
      metrics: ["project_status", "budget_overview"],
      filters: {},
      is_active: true,
    });
  };

  const handleMetricToggle = (metricKey) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricKey)
        ? prev.metrics.filter(m => m !== metricKey)
        : [...prev.metrics, metricKey],
    }));
  };

  const handleFormatToggle = (fmt) => {
    setFormData(prev => ({
      ...prev,
      export_format: prev.export_format.includes(fmt)
        ? prev.export_format.filter(f => f !== fmt)
        : [...prev.export_format, fmt],
    }));
  };

  const handleAISuggest = async () => {
    setAiGenerating(true);
    try {
      const result = await portalApi.integrations.Core.InvokeLLM({
        prompt: `You are a project management report advisor. Based on the following project data, suggest the ideal report configuration.

Projects: ${projects.slice(0, 5).map(p => `${p.project_name} (${p.status}, ${p.project_type})`).join(", ")}
Total projects: ${projects.length}

Suggest:
1. A clear report name
2. A brief description (1-2 sentences)
3. Which metrics to include from: ${AVAILABLE_METRICS.map(m => m.key).join(", ")}
4. Recommended frequency

Return as JSON with keys: report_name, description, metrics (array of metric keys), frequency`,
        response_json_schema: {
          type: "object",
          properties: {
            report_name: { type: "string" },
            description: { type: "string" },
            metrics: { type: "array", items: { type: "string" } },
            frequency: { type: "string" },
          },
        },
      });

      setFormData(prev => ({
        ...prev,
        report_name: result.report_name || prev.report_name,
        description: result.description || prev.description,
        metrics: result.metrics?.filter(m => AVAILABLE_METRICS.some(am => am.key === m)) || prev.metrics,
        schedule_frequency: FREQUENCIES.some(f => f.value === result.frequency) ? result.frequency : prev.schedule_frequency,
      }));
      toast.success("AI suggestions applied");
    } catch (err) {
      console.error("AI suggest error:", err);
      toast.error("Failed to get AI suggestions");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreate = () => {
    if (!formData.report_name.trim()) {
      toast.error("Report name is required");
      return;
    }
    const recipients = formData.recipients
      .split(",")
      .map(e => e.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      toast.error("At least one recipient is required");
      return;
    }
    if (formData.metrics.length === 0) {
      toast.error("Select at least one metric");
      return;
    }

    createMutation.mutate({
      ...formData,
      recipients,
    });
  };

  const getStatusColor = (status) => {
    const map = { success: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700", pending: "bg-yellow-100 text-yellow-700" };
    return map[status] || map.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Scheduled Reports</h2>
            <p className="text-violet-100">Automate report generation and delivery</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-white text-purple-700 hover:bg-gray-100">
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </Card>

      {/* Scheduled Reports List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : scheduledReports.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-lg">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Scheduled Reports</h3>
          <p className="text-gray-600 mb-4">Set up automated reports to be generated and emailed on a schedule.</p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Schedule
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scheduledReports.map((report) => (
            <Card key={report.id} className="p-5 border-0 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-gray-900 text-lg">{report.report_name}</h4>
                    <Badge className={report.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                      {report.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Badge className={getStatusColor(report.last_run_status)}>
                      Last: {report.last_run_status}
                    </Badge>
                  </div>
                  {report.description && (
                    <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.schedule_frequency} — {report.schedule_day}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {report.recipients?.length || 0} recipient(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {report.export_format?.join(", ").toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {report.metrics?.length || 0} metrics
                    </span>
                    {report.run_count > 0 && (
                      <span>Runs: {report.run_count}</span>
                    )}
                  </div>
                  {report.metrics?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {report.metrics.map(m => (
                        <Badge key={m} variant="outline" className="text-xs">
                          {AVAILABLE_METRICS.find(am => am.key === m)?.label || m}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleMutation.mutate({ id: report.id, is_active: !report.is_active })}
                    title={report.is_active ? "Pause" : "Resume"}
                  >
                    {report.is_active ? <Pause className="w-4 h-4 text-yellow-600" /> : <Play className="w-4 h-4 text-green-600" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(report.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Schedule Automated Report
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* AI Assist */}
            <Button
              variant="outline"
              onClick={handleAISuggest}
              disabled={aiGenerating}
              className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI: Suggest Report Configuration
            </Button>

            {/* Name & Description */}
            <div>
              <Label className="mb-2 block">Report Name *</Label>
              <Input
                value={formData.report_name}
                onChange={(e) => setFormData(prev => ({ ...prev, report_name: e.target.value }))}
                placeholder="e.g., Weekly Project Status Summary"
              />
            </div>
            <div>
              <Label className="mb-2 block">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this report covers"
                rows={2}
              />
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Frequency *</Label>
                <Select value={formData.schedule_frequency} onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Day / Time</Label>
                <Select value={formData.schedule_day} onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_day: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <Label className="mb-2 block">Recipients * (comma-separated emails)</Label>
              <Input
                value={formData.recipients}
                onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="client@example.com, manager@example.com"
              />
            </div>

            {/* Export Formats */}
            <div>
              <Label className="mb-2 block">Export Formats</Label>
              <div className="flex gap-4">
                {FORMATS.map(fmt => (
                  <label key={fmt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.export_format.includes(fmt.value)}
                      onCheckedChange={() => handleFormatToggle(fmt.value)}
                    />
                    <span className="text-sm">{fmt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <Label className="mb-2 block">Metrics to Include *</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_METRICS.map(metric => (
                  <label key={metric.key} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                    <Checkbox
                      checked={formData.metrics.includes(metric.key)}
                      onCheckedChange={() => handleMetricToggle(metric.key)}
                    />
                    <span className="text-sm">{metric.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                Create Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}