import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

export default function GanttChart({ tasks = [] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 text-gray-500">
          No tasks to display
        </CardContent>
      </Card>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.start_date) - new Date(b.start_date)
  );

  const projectStart = new Date(sortedTasks[0].start_date);
  const projectEnd = new Date(sortedTasks[sortedTasks.length - 1].end_date);
  const totalDays = differenceInDays(projectEnd, projectStart);

  const getTaskPosition = (task) => {
    const start = differenceInDays(new Date(task.start_date), projectStart);
    const duration = differenceInDays(new Date(task.end_date), new Date(task.start_date));
    return {
      left: `${(start / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const statusColors = {
    not_started: 'bg-gray-400',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    blocked: 'bg-red-500'
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Project Timeline (Gantt Chart)</CardTitle>
        <div className="flex gap-4 mt-2 text-xs">
          <span>Start: {format(projectStart, 'MMM d, yyyy')}</span>
          <span>End: {format(projectEnd, 'MMM d, yyyy')}</span>
          <span>Duration: {totalDays} days</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedTasks.map(task => {
            const position = getTaskPosition(task);
            return (
              <div key={task.id} className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium w-48 truncate">{task.task_name}</span>
                  <Badge variant="outline" className="text-xs">{task.status}</Badge>
                  <span className="text-xs text-gray-500">
                    {task.progress_percentage}%
                  </span>
                </div>
                <div className="relative h-8 bg-gray-100 rounded">
                  <div
                    className={`absolute h-full ${statusColors[task.status]} rounded transition-all`}
                    style={position}
                  >
                    <div className="h-full bg-white bg-opacity-30" style={{ width: `${task.progress_percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}