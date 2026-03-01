import React from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  FileText,
  MessageSquare
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";

export default function EnhancedClientDashboard({ user, projects = [] }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices-dashboard', user?.email],
    queryFn: async () => {
      try {
        return await portalApi.entities.Invoice.filter({ client_email: user.email });
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        return [];
      }
    },
    enabled: !!user,
    retry: 2
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['client-tasks-dashboard', user?.email],
    queryFn: async () => {
      try {
        return await portalApi.entities.ClientTask.filter({ assigned_to: user.email });
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return [];
      }
    },
    enabled: !!user,
    retry: 2
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['client-milestones-dashboard'],
    queryFn: async () => {
      try {
        const projectIds = projects.map(p => p.id);
        if (projectIds.length === 0) return [];
        const allMilestones = await Promise.all(
          projectIds.map(id => portalApi.entities.ProjectMilestone.filter({ project_id: id }))
        );
        return allMilestones.flat();
      } catch (error) {
        console.error('Failed to fetch milestones:', error);
        return [];
      }
    },
    enabled: projects.length > 0,
    retry: 2
  });

  // Invoice metrics
  const totalOwed = invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;

  // Task metrics
  const upcomingTasks = tasks.filter(t => {
    if (t.status === 'Completed') return false;
    const dueDate = new Date(t.due_date);
    const now = new Date();
    return isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 7));
  });

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'Completed') return false;
    return isBefore(new Date(t.due_date), new Date());
  });

  // Milestone metrics
  const upcomingMilestones = milestones.filter(m => {
    if (m.status === 'completed') return false;
    const dueDate = new Date(m.due_date);
    const now = new Date();
    return isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 14));
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Active Projects</p>
                <p className="text-3xl font-bold">{projects.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Outstanding Balance</p>
                <p className="text-3xl font-bold">${totalOwed.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Upcoming Tasks</p>
                <p className="text-3xl font-bold">{upcomingTasks.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-pink-500 text-white overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-red-100">Overdue Items</p>
                <p className="text-3xl font-bold">{overdueTasks.length + overdueInvoices}</p>
              </div>
              <AlertTriangle className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Widget */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Invoice Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Paid Invoices</p>
              <p className="text-2xl font-bold text-green-600">{paidInvoices}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">${totalOwed.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overdueInvoices}</p>
            </div>
          </div>
          {invoices.slice(0, 3).map(invoice => (
            <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded mb-2">
              <div>
                <p className="font-medium text-sm">{invoice.invoice_number}</p>
                <p className="text-xs text-gray-500">Due: {format(new Date(invoice.due_date), 'MMM d')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${(Number(invoice.total_amount) || 0).toLocaleString()}</p>
                <Badge className={
                  invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                  invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines Widget */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 && overdueTasks.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending tasks</p>
            ) : (
              <div className="space-y-3">
                {overdueTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm text-red-900">{task.task_title}</p>
                      <Badge className="bg-red-100 text-red-700">Overdue</Badge>
                    </div>
                    <p className="text-xs text-red-700">Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</p>
                  </div>
                ))}
                {upcomingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="p-3 bg-blue-50 rounded">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm">{task.task_title}</p>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-600">Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Upcoming Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming milestones</p>
            ) : (
              <div className="space-y-3">
                {upcomingMilestones.slice(0, 4).map(milestone => (
                  <div key={milestone.id} className="p-3 bg-purple-50 rounded">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{milestone.milestone_name}</p>
                      <Badge className="bg-purple-100 text-purple-700">{milestone.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Due: {format(new Date(milestone.due_date), 'MMM d')}</span>
                      {milestone.amount && (
                        <span className="font-bold text-purple-600">${(Number(milestone.amount) || 0).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}