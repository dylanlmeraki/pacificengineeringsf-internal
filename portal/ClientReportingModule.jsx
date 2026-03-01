import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Calendar, Plus, Trash2, FileDown, Loader2 } from "lucide-react";
import EnhancedAnalyticsDashboard from "./EnhancedAnalyticsDashboard";

export default function ClientReportingModule({ projects, allMilestones, allChangeOrders, user }) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    reportName: "",
    reportType: "comprehensive",
    frequency: "monthly",
    format: "pdf",
    dayOfWeek: 1,
    dayOfMonth: 1,
    recipientEmails: []
  });
  const queryClient = useQueryClient();

  const { data: scheduledReports = [] } = useQuery({
    queryKey: ['scheduled-reports', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.ScheduledReport.filter({ client_email: user.email }, '-created_date');
    },
    enabled: !!user
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData) => {
      return await base44.entities.ScheduledReport.create({
        client_email: user.email,
        ...scheduleData,
        active: true,
        recipient_emails: scheduleData.recipientEmails || [user.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setShowScheduleDialog(false);
      setReportConfig({
        reportName: "",
        reportType: "comprehensive",
        frequency: "monthly",
        format: "pdf",
        dayOfWeek: 1,
        dayOfMonth: 1,
        recipientEmails: []
      });
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId) => {
      return await base44.entities.ScheduledReport.delete(scheduleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    }
  });

  const handleGenerateReport = async (format) => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateClientReport', {
        reportType: 'comprehensive',
        format: format,
        projectIds: projects.map(p => p.id)
      });

      // Download the file
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-report-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Generation */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Generate Custom Reports</h3>
            <p className="text-sm text-gray-600">
              Export project status, budget adherence, and performance metrics
            </p>
          </div>
          <Button
            onClick={() => setShowScheduleDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Schedule Report
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => handleGenerateReport('pdf')}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Export as PDF
              </>
            )}
          </Button>
          <Button
            onClick={() => handleGenerateReport('csv')}
            disabled={generating}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export as CSV
          </Button>
        </div>
      </Card>

      {/* Scheduled Reports */}
      {scheduledReports.length > 0 && (
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Scheduled Reports</h3>
          <div className="space-y-3">
            {scheduledReports.map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{schedule.report_name}</h4>
                    <Badge variant="outline">{schedule.frequency}</Badge>
                    <Badge>{schedule.format.toUpperCase()}</Badge>
                    {schedule.active && <Badge className="bg-green-100 text-green-800">Active</Badge>}
                  </div>
                  <p className="text-sm text-gray-600">
                    Type: {schedule.report_type.replace(/_/g, ' ')}
                  </p>
                  {schedule.recipient_emails && schedule.recipient_emails.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Recipients: {schedule.recipient_emails.join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Analytics Dashboard */}
      <EnhancedAnalyticsDashboard
        projects={projects}
        documents={[]}
        projectMessages={[]}
        proposalMessages={[]}
        milestones={allMilestones}
        changeOrders={allChangeOrders}
      />

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Recurring Report</DialogTitle>
            <DialogDescription>
              Configure automatic report generation and delivery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
              <Input
                value={reportConfig.reportName}
                onChange={(e) => setReportConfig({ ...reportConfig, reportName: e.target.value })}
                placeholder="Monthly Project Status Report"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <Select
                  value={reportConfig.reportType}
                  onValueChange={(value) => setReportConfig({ ...reportConfig, reportType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_status">Project Status</SelectItem>
                    <SelectItem value="budget_adherence">Budget Adherence</SelectItem>
                    <SelectItem value="milestone_progress">Milestone Progress</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <Select
                  value={reportConfig.frequency}
                  onValueChange={(value) => setReportConfig({ ...reportConfig, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reportConfig.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                <Select
                  value={reportConfig.dayOfWeek.toString()}
                  onValueChange={(value) => setReportConfig({ ...reportConfig, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportConfig.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={reportConfig.dayOfMonth}
                  onChange={(e) => setReportConfig({ ...reportConfig, dayOfMonth: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <Select
                value={reportConfig.format}
                onValueChange={(value) => setReportConfig({ ...reportConfig, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients (comma-separated emails)
              </label>
              <Input
                value={reportConfig.recipientEmails.join(', ')}
                onChange={(e) => setReportConfig({ 
                  ...reportConfig, 
                  recipientEmails: e.target.value.split(',').map(e => e.trim()).filter(Boolean)
                })}
                placeholder={user?.email}
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: Your email ({user?.email})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Projects (leave empty for all)
              </label>
              <Select
                value=""
                onValueChange={(value) => {
                  const selected = reportConfig.include_projects || [];
                  if (!selected.includes(value)) {
                    setReportConfig({ 
                      ...reportConfig, 
                      include_projects: [...selected, value]
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reportConfig.include_projects?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reportConfig.include_projects.map(projectId => {
                    const project = projects?.find(p => p.id === projectId);
                    return (
                      <Badge key={projectId} variant="outline" className="gap-1">
                        {project?.project_name || projectId}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createScheduleMutation.mutate(reportConfig)}
              disabled={!reportConfig.reportName}
              className="bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}