import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, Plus, Trash2, AlertTriangle, ArrowRight, CheckCircle2, Clock, Circle } from "lucide-react";
import { toast } from "sonner";

const STATUS_ICONS = {
  not_started: { icon: Circle, color: "text-gray-400" },
  in_progress: { icon: Clock, color: "text-blue-600" },
  completed: { icon: CheckCircle2, color: "text-green-600" },
  blocked: { icon: AlertTriangle, color: "text-red-600" },
};

export default function DependencyTracker({ tasks = [], projectId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [selectedDependency, setSelectedDependency] = useState("");

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, dependencies }) =>
      base44.entities.ProjectTask.update(taskId, { dependencies }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      toast.success("Dependency updated");
    },
  });

  // Build dependency graph
  const dependencyGraph = useMemo(() => {
    const taskMap = {};
    tasks.forEach((t) => { taskMap[t.id] = t; });

    const deps = [];
    tasks.forEach((task) => {
      (task.dependencies || []).forEach((depId) => {
        const dep = taskMap[depId];
        if (dep) {
          deps.push({
            from: dep,
            to: task,
            isBlocked: dep.status !== "completed" && task.status === "blocked",
            isReady: dep.status === "completed",
          });
        }
      });
    });
    return deps;
  }, [tasks]);

  // Find tasks with unmet dependencies
  const blockedTasks = useMemo(() => {
    const taskMap = {};
    tasks.forEach((t) => { taskMap[t.id] = t; });

    return tasks.filter((task) => {
      if (!task.dependencies || task.dependencies.length === 0) return false;
      return task.dependencies.some((depId) => {
        const dep = taskMap[depId];
        return dep && dep.status !== "completed";
      });
    });
  }, [tasks]);

  // Tasks with no dependencies (can start immediately)
  const readyTasks = useMemo(() => {
    const taskMap = {};
    tasks.forEach((t) => { taskMap[t.id] = t; });

    return tasks.filter((task) => {
      if (task.status === "completed") return false;
      if (!task.dependencies || task.dependencies.length === 0) return true;
      return task.dependencies.every((depId) => {
        const dep = taskMap[depId];
        return dep && dep.status === "completed";
      });
    });
  }, [tasks]);

  const handleAddDependency = () => {
    if (!selectedTask || !selectedDependency || selectedTask === selectedDependency) return;
    const task = tasks.find((t) => t.id === selectedTask);
    if (!task) return;

    // Check for circular dependency
    const visited = new Set();
    const checkCircular = (id) => {
      if (id === selectedTask) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      const t = tasks.find((t) => t.id === id);
      return (t?.dependencies || []).some(checkCircular);
    };
    if (checkCircular(selectedDependency)) {
      toast.error("Cannot add: this would create a circular dependency");
      return;
    }

    const existingDeps = task.dependencies || [];
    if (existingDeps.includes(selectedDependency)) {
      toast.error("This dependency already exists");
      return;
    }

    updateTaskMutation.mutate({
      taskId: selectedTask,
      dependencies: [...existingDeps, selectedDependency],
    });
    setShowAddDialog(false);
    setSelectedTask("");
    setSelectedDependency("");
  };

  const handleRemoveDependency = (taskId, depId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTaskMutation.mutate({
      taskId,
      dependencies: (task.dependencies || []).filter((d) => d !== depId),
    });
  };

  const getTaskName = (id) => {
    const task = tasks.find((t) => t.id === id);
    return task?.task_name || "Unknown";
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="w-5 h-5 text-blue-600" />
            Task Dependencies
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Add Dependency
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 font-semibold mb-1">Ready to Start</p>
            <p className="text-xl font-bold text-green-800">{readyTasks.length}</p>
            <p className="text-[10px] text-green-600">All dependencies met</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-700 font-semibold mb-1">Blocked</p>
            <p className="text-xl font-bold text-red-800">{blockedTasks.length}</p>
            <p className="text-[10px] text-red-600">Waiting on dependencies</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold mb-1">Total Links</p>
            <p className="text-xl font-bold text-blue-800">{dependencyGraph.length}</p>
            <p className="text-[10px] text-blue-600">Dependency connections</p>
          </div>
        </div>

        {/* Dependency List */}
        {dependencyGraph.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p>No task dependencies defined yet.</p>
            <p className="text-sm">Add dependencies to track task order and blockers.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dependencyGraph.map((dep, idx) => {
              const FromIcon = STATUS_ICONS[dep.from.status]?.icon || Circle;
              const ToIcon = STATUS_ICONS[dep.to.status]?.icon || Circle;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    dep.isBlocked ? "bg-red-50 border-red-200" : dep.isReady ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FromIcon className={`w-4 h-4 flex-shrink-0 ${STATUS_ICONS[dep.from.status]?.color}`} />
                    <span className="text-sm font-medium truncate">{dep.from.task_name}</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 ${dep.isBlocked ? "text-red-500" : "text-gray-400"}`} />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ToIcon className={`w-4 h-4 flex-shrink-0 ${STATUS_ICONS[dep.to.status]?.color}`} />
                    <span className="text-sm font-medium truncate">{dep.to.task_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dep.isBlocked && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">Blocking</Badge>
                    )}
                    {dep.isReady && (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">Ready</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveDependency(dep.to.id, dep.from.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Dependency Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task Dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task (depends on...)</label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.task_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span>depends on</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prerequisite Task</label>
              <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                <SelectTrigger><SelectValue placeholder="Select prerequisite" /></SelectTrigger>
                <SelectContent>
                  {tasks.filter((t) => t.id !== selectedTask).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.task_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button
                onClick={handleAddDependency}
                disabled={!selectedTask || !selectedDependency}
                className="bg-blue-600"
              >
                Add Dependency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}