import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, differenceInDays, addDays, startOfWeek, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { Link2, ZoomIn, ZoomOut, ArrowRight, AlertTriangle } from "lucide-react";

const STATUS_COLORS = {
  not_started: { bar: "bg-gray-400", text: "text-gray-600" },
  in_progress: { bar: "bg-blue-500", text: "text-blue-600" },
  completed: { bar: "bg-green-500", text: "text-green-600" },
  blocked: { bar: "bg-red-500", text: "text-red-600" },
};

const PRIORITY_DOT = {
  low: "bg-gray-300",
  medium: "bg-blue-400",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export default function EnhancedGanttChart({ tasks = [], milestones = [], onTaskClick }) {
  const [zoom, setZoom] = useState("weeks"); // days, weeks, months

  // Combine tasks and milestones into timeline items
  const timelineItems = useMemo(() => {
    const items = [];

    tasks.forEach((t) => {
      if (t.start_date && t.end_date) {
        items.push({
          id: t.id,
          name: t.task_name,
          start: new Date(t.start_date),
          end: new Date(t.end_date),
          status: t.status || "not_started",
          priority: t.priority || "medium",
          progress: t.progress_percentage || 0,
          type: "task",
          dependencies: t.dependencies || [],
          assigned: t.assigned_to || [],
          raw: t,
        });
      }
    });

    milestones.forEach((m) => {
      if (m.due_date) {
        items.push({
          id: m.id,
          name: m.milestone_name,
          start: new Date(m.due_date),
          end: new Date(m.due_date),
          status: m.status === "Completed" ? "completed" : "in_progress",
          priority: "high",
          progress: m.completion_percentage || 0,
          type: "milestone",
          dependencies: [],
          assigned: [],
          raw: m,
        });
      }
    });

    return items.sort((a, b) => a.start - b.start);
  }, [tasks, milestones]);

  // Calculate timeline bounds
  const bounds = useMemo(() => {
    if (timelineItems.length === 0) return { start: new Date(), end: addDays(new Date(), 30), totalDays: 30 };
    const earliest = new Date(Math.min(...timelineItems.map((i) => i.start)));
    const latest = new Date(Math.max(...timelineItems.map((i) => i.end)));
    const start = addDays(earliest, -7);
    const end = addDays(latest, 14);
    return { start, end, totalDays: Math.max(differenceInDays(end, start), 1) };
  }, [timelineItems]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    if (zoom === "weeks") {
      return eachWeekOfInterval({ start: bounds.start, end: bounds.end }).map((d) => ({
        date: d,
        label: format(d, "MMM d"),
        position: (differenceInDays(d, bounds.start) / bounds.totalDays) * 100,
      }));
    }
    if (zoom === "months") {
      return eachMonthOfInterval({ start: bounds.start, end: bounds.end }).map((d) => ({
        date: d,
        label: format(d, "MMM yyyy"),
        position: (differenceInDays(d, bounds.start) / bounds.totalDays) * 100,
      }));
    }
    // days - show every 3 days
    const markers = [];
    let current = bounds.start;
    while (current <= bounds.end) {
      markers.push({
        date: current,
        label: format(current, "M/d"),
        position: (differenceInDays(current, bounds.start) / bounds.totalDays) * 100,
      });
      current = addDays(current, 3);
    }
    return markers;
  }, [bounds, zoom]);

  // Today line position
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (today < bounds.start || today > bounds.end) return null;
    return (differenceInDays(today, bounds.start) / bounds.totalDays) * 100;
  }, [bounds]);

  // Dependency lines
  const dependencyLines = useMemo(() => {
    const lines = [];
    const itemMap = {};
    timelineItems.forEach((item) => { itemMap[item.id] = item; });

    timelineItems.forEach((item, idx) => {
      (item.dependencies || []).forEach((depId) => {
        const dep = itemMap[depId];
        if (dep) {
          const depIdx = timelineItems.findIndex((i) => i.id === depId);
          lines.push({
            fromIdx: depIdx,
            toIdx: idx,
            fromEnd: (differenceInDays(dep.end, bounds.start) / bounds.totalDays) * 100,
            toStart: (differenceInDays(item.start, bounds.start) / bounds.totalDays) * 100,
            isBlocked: item.status === "blocked",
          });
        }
      });
    });
    return lines;
  }, [timelineItems, bounds]);

  if (timelineItems.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Project Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 text-gray-500">
          No tasks or milestones with dates to display. Add start/end dates to tasks to see them here.
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              Project Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={zoom} onValueChange={setZoom}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 text-xs mt-2 flex-wrap">
            {Object.entries(STATUS_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${val.bar}`} />
                <span className="capitalize text-gray-600">{key.replace("_", " ")}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-purple-500 rotate-45" />
              <span className="text-gray-600">Milestone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">Dependency</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Time Header */}
              <div className="relative h-8 bg-gray-50 border-b border-gray-200">
                {timeMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="absolute text-[10px] text-gray-500 font-medium"
                    style={{ left: `calc(200px + ${marker.position}% * (100% - 200px) / 100)` }}
                  >
                    {marker.label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="relative">
                {/* Today marker */}
                {todayPosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
                    style={{ left: `calc(200px + ${todayPosition}% * (100% - 200px) / 100)` }}
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded">
                      Today
                    </div>
                  </div>
                )}

                {/* Dependency lines (SVG overlay) */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none z-5"
                  style={{ height: `${timelineItems.length * 48}px` }}
                >
                  {dependencyLines.map((line, idx) => {
                    const fromY = line.fromIdx * 48 + 24;
                    const toY = line.toIdx * 48 + 24;
                    const fromX = 200 + (line.fromEnd / 100) * (800 - 200);
                    const toX = 200 + (line.toStart / 100) * (800 - 200);
                    return (
                      <g key={idx}>
                        <path
                          d={`M ${fromX} ${fromY} C ${fromX + 30} ${fromY}, ${toX - 30} ${toY}, ${toX} ${toY}`}
                          fill="none"
                          stroke={line.isBlocked ? "#ef4444" : "#9ca3af"}
                          strokeWidth="1.5"
                          strokeDasharray={line.isBlocked ? "4,3" : "none"}
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    );
                  })}
                  <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                      <polygon points="0 0, 6 2, 0 4" fill="#9ca3af" />
                    </marker>
                  </defs>
                </svg>

                {timelineItems.map((item, idx) => {
                  const startPos = (differenceInDays(item.start, bounds.start) / bounds.totalDays) * 100;
                  const duration = Math.max(differenceInDays(item.end, item.start), 1);
                  const widthPct = (duration / bounds.totalDays) * 100;
                  const colors = STATUS_COLORS[item.status] || STATUS_COLORS.not_started;

                  return (
                    <div
                      key={item.id}
                      className="relative h-12 flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* Label */}
                      <div className="w-[200px] flex-shrink-0 px-3 flex items-center gap-2 overflow-hidden">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />
                        <span className="text-xs font-medium text-gray-800 truncate">{item.name}</span>
                        {item.dependencies.length > 0 && (
                          <Link2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        {item.status === "blocked" && (
                          <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Bar area */}
                      <div className="flex-1 relative h-full">
                        {item.type === "milestone" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute w-4 h-4 bg-purple-500 rotate-45 cursor-pointer hover:scale-125 transition-transform z-10"
                                style={{
                                  left: `${startPos}%`,
                                  top: "50%",
                                  transform: `translateY(-50%) rotate(45deg)`,
                                }}
                                onClick={() => onTaskClick?.(item.raw)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-xs">Due: {format(item.start, "MMM d, yyyy")}</p>
                              <p className="text-xs">Status: {item.raw.status}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-6 ${colors.bar} rounded cursor-pointer hover:opacity-80 transition-opacity z-10`}
                                style={{
                                  left: `${startPos}%`,
                                  width: `${Math.max(widthPct, 0.5)}%`,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                                onClick={() => onTaskClick?.(item.raw)}
                              >
                                {/* Progress fill */}
                                <div
                                  className="h-full bg-white/30 rounded-l"
                                  style={{ width: `${item.progress}%` }}
                                />
                                {widthPct > 8 && (
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                                    {item.progress}%
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-xs">{format(item.start, "MMM d")} — {format(item.end, "MMM d, yyyy")}</p>
                              <p className="text-xs">Progress: {item.progress}% | Priority: {item.priority}</p>
                              {item.assigned.length > 0 && (
                                <p className="text-xs">Assigned: {item.assigned.join(", ")}</p>
                              )}
                              {item.dependencies.length > 0 && (
                                <p className="text-xs text-orange-600">Has {item.dependencies.length} dependency(ies)</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}