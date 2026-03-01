import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings, Zap, Trash2, Edit, Save, Bell, ListTodo } from "lucide-react";
import AIWorkflowSuggestions from "./AIWorkflowSuggestions";

export default function ClientWorkflowSettings({ projectId, clientEmail, milestones = [], project }) {
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [newStage, setNewStage] = useState({ stage_name: "", color: "#3b82f6", description: "" });
  const [newTrigger, setNewTrigger] = useState({
    trigger_name: "",
    trigger_event: "stage_change",
    actions: [{ action_type: "send_notification", recipients: [], message_template: "", task_template: "" }],
    active: true,
    ai_generated: false
  });
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['client-workflow-settings', projectId],
    queryFn: async () => {
      const result = await portalApi.entities.ClientWorkflowSettings.filter({ project_id: projectId });
      if (result.length === 0) {
        return await portalApi.entities.ClientWorkflowSettings.create({
          project_id: projectId,
          client_email: clientEmail,
          custom_stages: [],
          workflow_triggers: []
        });
      }
      return result[0];
    },
    enabled: !!projectId && !!clientEmail
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      return await portalApi.entities.ClientWorkflowSettings.update(settings.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-workflow-settings'] });
    }
  });

  const addStage = () => {
    if (!newStage.stage_name) return;
    const stages = settings?.custom_stages || [];
    updateSettingsMutation.mutate({
      custom_stages: [...stages, { ...newStage, stage_order: stages.length }]
    });
    setNewStage({ stage_name: "", color: "#3b82f6", description: "" });
    setShowStageDialog(false);
  };

  const removeStage = (index) => {
    const stages = settings?.custom_stages || [];
    updateSettingsMutation.mutate({
      custom_stages: stages.filter((_, i) => i !== index)
    });
  };

  const addTrigger = () => {
    if (!newTrigger.trigger_name) return;
    const triggers = settings?.workflow_triggers || [];
    updateSettingsMutation.mutate({
      workflow_triggers: [...triggers, newTrigger]
    });
    setNewTrigger({ trigger_name: "", trigger_event: "stage_change", actions: [{ action_type: "send_notification", recipients: [], message_template: "", task_template: "" }], active: true, ai_generated: false });
    setShowTriggerDialog(false);
  };

  const handleAcceptAISuggestion = (trigger) => {
    const triggers = settings?.workflow_triggers || [];
    updateSettingsMutation.mutate({
      workflow_triggers: [...triggers, trigger],
      ai_suggestion_history: [
        ...(settings?.ai_suggestion_history || []),
        { suggestion: trigger.trigger_name, trigger_event: trigger.trigger_event, action_type: trigger.actions?.[0]?.action_type, accepted: true, suggested_at: new Date().toISOString() }
      ]
    });
  };

  const toggleTrigger = (index) => {
    const triggers = [...(settings?.workflow_triggers || [])];
    triggers[index] = { ...triggers[index], active: !triggers[index].active };
    updateSettingsMutation.mutate({ workflow_triggers: triggers });
  };

  const removeTrigger = (index) => {
    const triggers = settings?.workflow_triggers || [];
    updateSettingsMutation.mutate({
      workflow_triggers: triggers.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Custom Stages */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Custom Project Stages</h3>
            <p className="text-sm text-gray-600">Define your own project workflow stages</p>
          </div>
          <Button onClick={() => setShowStageDialog(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>

        <div className="space-y-2">
          {settings?.custom_stages?.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No custom stages defined</p>
          ) : (
            settings?.custom_stages?.map((stage, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: stage.color }} />
                  <div>
                    <p className="font-semibold text-gray-900">{stage.stage_name}</p>
                    {stage.description && <p className="text-xs text-gray-600">{stage.description}</p>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeStage(idx)} className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Workflow Triggers */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Workflow Triggers</h3>
            <p className="text-sm text-gray-600">Automate actions based on project events</p>
          </div>
          <Button onClick={() => setShowTriggerDialog(true)} className="bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Trigger
          </Button>
        </div>

        <div className="space-y-2">
          {settings?.workflow_triggers?.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No workflow triggers defined</p>
          ) : (
            settings?.workflow_triggers?.map((trigger, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{trigger.trigger_name}</p>
                      <Badge className={trigger.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {trigger.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {trigger.ai_generated && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">AI</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-600">On: {trigger.trigger_event.replace(/_/g, ' ')}</p>
                      {trigger.actions?.[0]?.action_type && (
                        <p className="text-xs text-gray-500">→ {trigger.actions[0].action_type.replace(/_/g, ' ')}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleTrigger(idx)} className="text-gray-600">
                    {trigger.active ? "Pause" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeTrigger(idx)} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* AI Workflow Suggestions */}
      {projectId && settings && (
        <AIWorkflowSuggestions
          projectId={projectId}
          settings={settings}
          onAcceptSuggestion={handleAcceptAISuggestion}
          milestones={milestones}
          project={project}
        />
      )}

      {/* Stage Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stage Name</label>
              <Input
                value={newStage.stage_name}
                onChange={(e) => setNewStage({ ...newStage, stage_name: e.target.value })}
                placeholder="e.g., Initial Review"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Input
                value={newStage.description}
                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <input
                type="color"
                value={newStage.color}
                onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                className="w-full h-10 rounded border"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowStageDialog(false)}>Cancel</Button>
              <Button onClick={addStage} className="bg-blue-600">Add Stage</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Workflow Trigger</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Name</label>
              <Input
                value={newTrigger.trigger_name}
                onChange={(e) => setNewTrigger({ ...newTrigger, trigger_name: e.target.value })}
                placeholder="e.g., Notify on Stage Change"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Event</label>
              <Select
                value={newTrigger.trigger_event}
                onValueChange={(value) => setNewTrigger({ ...newTrigger, trigger_event: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stage_change">Stage Change</SelectItem>
                  <SelectItem value="milestone_complete">Milestone Complete</SelectItem>
                  <SelectItem value="document_upload">Document Upload</SelectItem>
                  <SelectItem value="approval_required">Approval Required</SelectItem>
                  <SelectItem value="task_completed">Task Completed</SelectItem>
                  <SelectItem value="task_overdue">Task Overdue</SelectItem>
                  <SelectItem value="budget_threshold">Budget Threshold</SelectItem>
                  <SelectItem value="message_received">Message Received</SelectItem>
                  <SelectItem value="change_order_created">Change Order Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <Select
                value={newTrigger.actions?.[0]?.action_type || "send_notification"}
                onValueChange={(value) => setNewTrigger({
                  ...newTrigger,
                  actions: [{ ...newTrigger.actions?.[0], action_type: value }]
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_notification">Send Notification</SelectItem>
                  <SelectItem value="create_task">Create Task</SelectItem>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="update_status">Update Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message / Task Description</label>
              <Textarea
                value={newTrigger.actions?.[0]?.message_template || ""}
                onChange={(e) => setNewTrigger({
                  ...newTrigger,
                  actions: [{ ...newTrigger.actions?.[0], message_template: e.target.value }]
                })}
                placeholder="Optional: describe the notification message or task to create"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>Cancel</Button>
              <Button onClick={addTrigger} className="bg-purple-600">Add Trigger</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}