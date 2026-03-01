import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GripVertical, Settings, Eye, EyeOff, Save } from "lucide-react";

const availableWidgets = [
  { id: "project_status", label: "Project Status", description: "Overview of all projects" },
  { id: "recent_activity", label: "Recent Activity", description: "Latest updates and messages" },
  { id: "pending_approvals", label: "Pending Approvals", description: "Items awaiting your approval" },
  { id: "outstanding_invoices", label: "Outstanding Invoices", description: "Unpaid invoices" },
  { id: "milestones", label: "Upcoming Milestones", description: "Next project milestones" },
  { id: "documents", label: "Recent Documents", description: "Latest uploaded documents" },
  { id: "analytics", label: "Analytics Overview", description: "Key metrics and charts" }
];

export default function DashboardCustomizer({ user, currentConfig, onSave }) {
  const [widgets, setWidgets] = useState(currentConfig || availableWidgets.map((w, i) => ({ 
    ...w, 
    enabled: true, 
    position: i,
    size: "medium" 
  })));
  const [draggedItem, setDraggedItem] = useState(null);
  const queryClient = useQueryClient();

  const savePreferenceMutation = useMutation({
    mutationFn: async (config) => {
      const existing = await base44.entities.DashboardPreference.filter({ user_email: user.email });
      
      if (existing.length > 0) {
        return await base44.entities.DashboardPreference.update(existing[0].id, {
          widget_config: config
        });
      } else {
        return await base44.entities.DashboardPreference.create({
          user_email: user.email,
          widget_config: config
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] });
      onSave?.();
    }
  });

  const toggleWidget = (widgetId) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newWidgets = [...widgets];
    const draggedWidget = newWidgets[draggedItem];
    newWidgets.splice(draggedItem, 1);
    newWidgets.splice(index, 0, draggedWidget);
    
    setWidgets(newWidgets.map((w, i) => ({ ...w, position: i })));
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = () => {
    savePreferenceMutation.mutate(widgets);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Customize Dashboard</h3>
          <p className="text-sm text-gray-600">Select and arrange widgets to personalize your view</p>
        </div>
        <Button onClick={handleSave} disabled={savePreferenceMutation.isPending} className="bg-blue-600">
          <Save className="w-4 h-4 mr-2" />
          Save Layout
        </Button>
      </div>

      <div className="space-y-2">
        {widgets.map((widget, index) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between p-4 bg-white border rounded-lg cursor-move hover:shadow-md transition-all ${
              draggedItem === index ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{widget.label}</h4>
                <p className="text-xs text-gray-500">{widget.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                Position {index + 1}
              </Badge>
              <Switch
                checked={widget.enabled}
                onCheckedChange={() => toggleWidget(widget.id)}
              />
              {widget.enabled ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}