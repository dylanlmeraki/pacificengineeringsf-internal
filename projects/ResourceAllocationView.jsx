import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function ResourceAllocationView({ tasks = [], teamMembers = [] }) {
  // Group tasks by assigned team member
  const resourceMap = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      (task.assigned_to || []).forEach((email) => {
        if (!map[email]) {
          map[email] = {
            email,
            tasks: [],
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            blockedTasks: 0,
          };
        }
        map[email].tasks.push(task);
        map[email].totalTasks++;
        if (task.status === "completed") map[email].completedTasks++;
        if (task.status === "in_progress") map[email].activeTasks++;
        if (task.status === "blocked") map[email].blockedTasks++;
      });
    });
    return Object.values(map).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [tasks]);

  // Unassigned tasks
  const unassignedTasks = useMemo(() => {
    return tasks.filter((t) => !t.assigned_to || t.assigned_to.length === 0);
  }, [tasks]);

  // Utilization stats
  const stats = useMemo(() => {
    const totalAssigned = resourceMap.reduce((sum, r) => sum + r.totalTasks, 0);
    const avgLoad = resourceMap.length > 0 ? totalAssigned / resourceMap.length : 0;
    const overloaded = resourceMap.filter((r) => r.totalTasks > avgLoad * 1.5).length;
    return { totalAssigned, avgLoad, overloaded, unassigned: unassignedTasks.length };
  }, [resourceMap, unassignedTasks]);

  const getLoadColor = (taskCount, avg) => {
    if (taskCount > avg * 1.5) return "text-red-600";
    if (taskCount > avg) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-purple-600" />
          Resource Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-semibold">Team Members</p>
            <p className="text-xl font-bold text-blue-800">{resourceMap.length}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-700 font-semibold">Avg Load</p>
            <p className="text-xl font-bold text-green-800">{stats.avgLoad.toFixed(1)} tasks</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-700 font-semibold">Overloaded</p>
            <p className="text-xl font-bold text-orange-800">{stats.overloaded}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-700 font-semibold">Unassigned Tasks</p>
            <p className="text-xl font-bold text-gray-800">{stats.unassigned}</p>
          </div>
        </div>

        {/* Resource Bars */}
        {resourceMap.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p>No tasks have team members assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resourceMap.map((resource) => {
              const completionRate = resource.totalTasks > 0
                ? (resource.completedTasks / resource.totalTasks) * 100
                : 0;
              return (
                <div key={resource.email} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                        {resource.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{resource.email.split("@")[0]}</p>
                        <p className="text-[10px] text-gray-500">{resource.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`font-bold ${getLoadColor(resource.totalTasks, stats.avgLoad)}`}>
                        {resource.totalTasks} tasks
                      </span>
                      <div className="flex gap-1">
                        {resource.activeTasks > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                            <Clock className="w-2.5 h-2.5 mr-0.5" /> {resource.activeTasks}
                          </Badge>
                        )}
                        {resource.completedTasks > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> {resource.completedTasks}
                          </Badge>
                        )}
                        {resource.blockedTasks > 0 && (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> {resource.blockedTasks}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Progress value={completionRate} className="h-1.5" />
                  <p className="text-[10px] text-gray-500 mt-1">{completionRate.toFixed(0)}% complete</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned Tasks Warning */}
        {unassignedTasks.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-sm text-amber-800">{unassignedTasks.length} Unassigned Tasks</p>
            </div>
            <div className="space-y-1">
              {unassignedTasks.slice(0, 5).map((t) => (
                <p key={t.id} className="text-xs text-amber-700">• {t.task_name}</p>
              ))}
              {unassignedTasks.length > 5 && (
                <p className="text-xs text-amber-600 italic">...and {unassignedTasks.length - 5} more</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}