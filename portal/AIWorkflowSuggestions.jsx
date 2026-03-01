import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, Check, X, Bell, ListTodo } from "lucide-react";
import { toast } from "sonner";

export default function AIWorkflowSuggestions({ projectId, settings, onAcceptSuggestion, milestones = [], project }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const existingTriggers = settings?.workflow_triggers || [];
      const existingStages = settings?.custom_stages || [];

      const milestoneContext = milestones.length > 0
        ? `\nProject Milestones:\n${milestones.map(m => `- ${m.milestone_name} (Status: ${m.status}, Due: ${m.due_date || 'N/A'})`).join("\n")}`
        : "";
      const projectContext = project
        ? `\nProject: ${project.project_name} (Type: ${project.project_type}, Status: ${project.status})`
        : "";

      const prompt = `You are an AI assistant for a project management portal used by engineering and construction clients.

Current project workflow setup:
- Custom Stages: ${existingStages.map(s => s.stage_name).join(", ") || "None"}
- Existing Triggers: ${existingTriggers.map(t => `${t.trigger_name} (on: ${t.trigger_event})`).join("; ") || "None"}
${projectContext}${milestoneContext}

Based on the project context, milestones, and common patterns in engineering/construction project management, suggest 3-5 NEW context-specific workflow automation rules. Tailor suggestions to actual milestone names when available (e.g., if there's a 'Permitting' milestone, suggest actions like 'Notify team when Permitting approved' or 'Create follow-up task for regulatory review'). For each suggestion, provide:
1. A clear trigger name
2. The trigger event (one of: stage_change, milestone_complete, document_upload, approval_required, task_completed, task_overdue, budget_threshold, message_received, change_order_created)
3. The action type (one of: send_notification, create_task, send_email, update_status)
4. A brief explanation of why this automation is valuable
5. Who should be notified or what task should be created

Return as JSON with this schema:
{
  "suggestions": [
    {
      "trigger_name": "string",
      "trigger_event": "string",
      "action_type": "string",
      "explanation": "string",
      "recipients_description": "string",
      "message_template": "string"
    }
  ]
}`;

      const result = await portalApi.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trigger_name: { type: "string" },
                  trigger_event: { type: "string" },
                  action_type: { type: "string" },
                  explanation: { type: "string" },
                  recipients_description: { type: "string" },
                  message_template: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
      setHasGenerated(true);
    } catch (err) {
      console.error("AI suggestion error:", err);
      toast.error("Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const actionIcons = {
    send_notification: Bell,
    create_task: ListTodo,
    send_email: Bell,
    update_status: Zap,
  };

  return (
    <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-violet-50 to-purple-50 border-l-4 border-purple-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Workflow Suggestions</h3>
            <p className="text-sm text-gray-600">Get smart automation recommendations based on your project</p>
          </div>
        </div>
        <Button onClick={generateSuggestions} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {hasGenerated ? "Refresh" : "Generate"}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3 mt-4">
          {suggestions.map((s, idx) => {
            const ActionIcon = actionIcons[s.action_type] || Zap;
            return (
              <Card key={idx} className="p-4 bg-white border border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ActionIcon className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-gray-900">{s.trigger_name}</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{s.explanation}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">On: {s.trigger_event.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-xs">Action: {s.action_type.replace(/_/g, " ")}</Badge>
                      <Badge className="bg-purple-100 text-purple-700 text-xs">AI Suggested</Badge>
                    </div>
                    {s.recipients_description && (
                      <p className="text-xs text-gray-500 mt-2">Recipients: {s.recipients_description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        onAcceptSuggestion({
                          trigger_name: s.trigger_name,
                          trigger_event: s.trigger_event,
                          actions: [{
                            action_type: s.action_type,
                            recipients: [],
                            message_template: s.message_template || "",
                            task_template: s.action_type === "create_task" ? s.trigger_name : "",
                          }],
                          active: true,
                          ai_generated: true,
                        });
                        setSuggestions(prev => prev.filter((_, i) => i !== idx));
                        toast.success(`"${s.trigger_name}" added to your workflows`);
                      }}
                      className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSuggestions(prev => prev.filter((_, i) => i !== idx))}
                      className="h-8 w-8 p-0 text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {hasGenerated && suggestions.length === 0 && !loading && (
        <p className="text-center text-sm text-gray-500 mt-4 py-4">All suggestions applied or dismissed. Click Refresh for more.</p>
      )}
    </Card>
  );
}