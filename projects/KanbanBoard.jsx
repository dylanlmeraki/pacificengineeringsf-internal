import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  MoreVertical,
  Calendar,
  User,
  AlertCircle,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const COLUMNS = [
  { id: "not_started", title: "To Do", color: "bg-gray-100" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100" },
  { id: "completed", title: "Completed", color: "bg-green-100" },
  { id: "blocked", title: "Blocked", color: "bg-red-100" },
];

const PRIORITY_COLORS = {
  low: "bg-gray-200 text-gray-700",
  medium: "bg-yellow-200 text-yellow-800",
  high: "bg-orange-200 text-orange-800",
  critical: "bg-red-200 text-red-800",
};

export default function KanbanBoard({ projectId, user }) {
  const queryClient = useQueryClient();
  const [showAddTask, setShowAddTask] = useState(null);
  const [newTask, setNewTask] = useState({
    task_name: "",
    description: "",
    priority: "medium",
    assigned_to: [],
  });

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["kanban-tasks", projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Update task status
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) =>
      base44.entities.ProjectTask.update(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      toast.success("Task updated");
    },
    onError: () => toast.error("Failed to update task"),
  });

  // Create task
  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.ProjectTask.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      setNewTask({ task_name: "", description: "", priority: "medium", assigned_to: [] });
      setShowAddTask(null);
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    updateTaskMutation.mutate({
      taskId: draggableId,
      updates: {
        status: newStatus,
        ...(newStatus === "completed" && { progress_percentage: 100 }),
      },
    });
  };

  const handleCreateTask = (columnId) => {
    if (!newTask.task_name.trim()) {
      toast.error("Task name required");
      return;
    }

    createTaskMutation.mutate({
      project_id: projectId,
      ...newTask,
      status: columnId,
    });
  };

  const groupedTasks = COLUMNS.reduce((acc, column) => {
    acc[column.id] = tasks.filter((task) => task.status === column.id);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Task Board</h3>
        <Badge variant="outline" className="text-sm">
          {tasks.length} total tasks
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((column) => (
              <div key={column.id} className="flex flex-col">
                <div className={`${column.color} rounded-t-lg p-3 border-b-2 border-gray-300`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900">{column.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {groupedTasks[column.id]?.length || 0}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddTask(column.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 min-h-[400px] rounded-b-lg ${
                        snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50"
                      }`}
                    >
                      {/* Add Task Form */}
                      {showAddTask === column.id && (
                        <Card className="p-3 border-2 border-blue-300 bg-white">
                          <div className="space-y-2">
                            <Input
                              placeholder="Task name"
                              value={newTask.task_name}
                              onChange={(e) =>
                                setNewTask({ ...newTask, task_name: e.target.value })
                              }
                              autoFocus
                            />
                            <Textarea
                              placeholder="Description (optional)"
                              value={newTask.description}
                              onChange={(e) =>
                                setNewTask({ ...newTask, description: e.target.value })
                              }
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleCreateTask(column.id)}
                                disabled={createTaskMutation.isPending}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                              >
                                {createTaskMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Add"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowAddTask(null)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Task Cards */}
                      {groupedTasks[column.id]?.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 cursor-grab active:cursor-grabbing border-0 shadow-md hover:shadow-lg transition-all ${
                                snapshot.isDragging ? "shadow-xl rotate-2" : ""
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="font-semibold text-sm text-gray-900 line-clamp-2">
                                    {task.task_name}
                                  </h5>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 flex-shrink-0"
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={PRIORITY_COLORS[task.priority] + " text-xs"}>
                                    {task.priority}
                                  </Badge>

                                  {task.progress_percentage > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.progress_percentage}%
                                    </Badge>
                                  )}
                                </div>

                                {task.end_date && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Calendar className="w-3 h-3" />
                                    <span>{format(new Date(task.end_date), "MMM d")}</span>
                                  </div>
                                )}

                                {task.assigned_to?.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <User className="w-3 h-3" />
                                    <span>{task.assigned_to.length} assigned</span>
                                  </div>
                                )}

                                {task.dependencies?.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{task.dependencies.length} dependencies</span>
                                  </div>
                                )}
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}