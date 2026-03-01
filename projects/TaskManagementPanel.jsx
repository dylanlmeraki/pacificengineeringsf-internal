import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, Clock, AlertCircle, Plus, Edit, Trash2,
  Users, Calendar, DollarSign, Target, Loader2, Filter
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG = {
  "not_started": { label: "Not Started", icon: Circle, color: "text-gray-400" },
  "in_progress": { label: "In Progress", icon: Clock, color: "text-blue-600" },
  "completed": { label: "Completed", icon: CheckCircle2, color: "text-green-600" },
  "blocked": { label: "Blocked", icon: AlertCircle, color: "text-red-600" },
};

const PRIORITY_COLORS = {
  "low": "bg-gray-100 text-gray-700",
  "medium": "bg-blue-100 text-blue-700",
  "high": "bg-orange-100 text-orange-700",
  "critical": "bg-red-100 text-red-700",
};

export default function TaskManagementPanel({ projectId, user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [formData, setFormData] = useState({
    task_name: "",
    description: "",
    status: "not_started",
    priority: "medium",
    start_date: "",
    end_date: "",
    assigned_to: [],
    estimated_cost: 0,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  // Fetch milestones for linking
  const { data: milestones = [] } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-assignments', projectId],
    queryFn: () => base44.entities.TeamAssignment.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Create/Update task mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const data = { ...taskData, project_id: projectId };
      if (editingTask) {
        return await base44.entities.ProjectTask.update(editingTask.id, data);
      }
      return await base44.entities.ProjectTask.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      resetForm();
      setShowDialog(false);
      toast.success(editingTask ? "Task updated" : "Task created");
    }
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status, progress }) => 
      base44.entities.ProjectTask.update(taskId, { status, progress_percentage: progress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast.success("Task status updated");
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.ProjectTask.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast.success("Task deleted");
    }
  });

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      task_name: "",
      description: "",
      status: "not_started",
      priority: "medium",
      start_date: "",
      end_date: "",
      assigned_to: [],
      estimated_cost: 0,
    });
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      task_name: task.task_name,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      start_date: task.start_date || "",
      end_date: task.end_date || "",
      assigned_to: task.assigned_to || [],
      estimated_cost: task.estimated_cost || 0,
    });
    setShowDialog(true);
  };

  const handleStatusChange = (taskId, newStatus) => {
    const progressMap = {
      "not_started": 0,
      "in_progress": 50,
      "completed": 100,
      "blocked": 0,
    };
    updateStatusMutation.mutate({
      taskId,
      status: newStatus,
      progress: progressMap[newStatus]
    });
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const statusMatch = statusFilter === "all" || task.status === statusFilter;
      const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
      return statusMatch && priorityMatch;
    });
  }, [tasks, statusFilter, priorityFilter]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    return {
      not_started: filteredTasks.filter(t => t.status === "not_started"),
      in_progress: filteredTasks.filter(t => t.status === "in_progress"),
      completed: filteredTasks.filter(t => t.status === "completed"),
      blocked: filteredTasks.filter(t => t.status === "blocked"),
    };
  }, [filteredTasks]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const blocked = tasks.filter(t => t.status === "blocked").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, inProgress, blocked, completionRate };
  }, [tasks]);

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              Task Management
            </h2>
            <p className="text-gray-600 mt-1">{metrics.total} total tasks</p>
          </div>
          <Button
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
                <p className="text-sm text-gray-600">Total Tasks</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.inProgress}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.blocked}</p>
                <p className="text-sm text-gray-600">Blocked</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Completion</span>
            <span className="font-semibold text-gray-900">{metrics.completionRate.toFixed(0)}%</span>
          </div>
          <Progress value={metrics.completionRate} className="h-2" />
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-lg">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <div className="flex gap-4 flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      <div className="grid md:grid-cols-4 gap-4">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
          const config = STATUS_CONFIG[status];
          const StatusIcon = config.icon;

          return (
            <Card key={status} className="p-4 border-0 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <StatusIcon className={`w-5 h-5 ${config.color}`} />
                <h3 className="font-bold text-gray-900">{config.label}</h3>
                <Badge variant="outline" className="ml-auto">{statusTasks.length}</Badge>
              </div>

              <div className="space-y-3">
                {statusTasks.map(task => (
                  <Card key={task.id} className="p-3 bg-gray-50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm text-gray-900 flex-1">
                        {task.task_name}
                      </h4>
                      <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="space-y-2 text-xs text-gray-500">
                      {task.assigned_to?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{task.assigned_to.length} assigned</span>
                        </div>
                      )}

                      {task.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(task.end_date), 'MMM d')}</span>
                        </div>
                      )}

                      {task.progress_percentage > 0 && (
                        <div>
                          <Progress value={task.progress_percentage} className="h-1" />
                          <span className="text-xs text-gray-500 mt-1">
                            {task.progress_percentage}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 mt-3">
                      <Select
                        value={task.status}
                        onValueChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([value, conf]) => (
                            <SelectItem key={value} value={value}>{conf.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button size="sm" variant="ghost" onClick={() => handleEdit(task)} className="h-7 px-2">
                        <Edit className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this task?")) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        className="h-7 px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Task Name *</Label>
              <Input
                value={formData.task_name}
                onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe the task..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Estimated Cost</Label>
              <Input
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveTaskMutation.mutate(formData)}
                disabled={!formData.task_name}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}