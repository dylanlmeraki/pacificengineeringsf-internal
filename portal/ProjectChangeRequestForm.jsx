import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GitPullRequest, Send, Loader2 } from "lucide-react";

export default function ProjectChangeRequestForm({ projectId, user, onSuccess }) {
  const [formData, setFormData] = useState({
    request_type: "feature",
    title: "",
    description: "",
    priority: "medium",
    estimated_impact: ""
  });
  const queryClient = useQueryClient();

  const submitRequestMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const request = await base44.entities.ProjectRequest.create({
          project_id: projectId,
          client_email: user.email,
          client_name: user.full_name,
          ...data,
          status: "pending",
          submitted_date: new Date().toISOString()
        });

        try {
          await base44.functions.invoke('createNotification', {
            user_email: 'admin@example.com',
            notification_type: 'project_update',
            title: 'New Change Request',
            message: `${user.full_name} submitted: ${data.title}`,
            link: `/projects`,
            priority: data.priority === 'critical' ? 'high' : 'medium',
            related_id: request.id
          });
        } catch (notifError) {
          console.warn('Failed to send notification, but request created successfully', notifError);
        }

        return request;
      } catch (error) {
        console.error('Failed to submit request:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-requests'] });
      setFormData({
        request_type: "feature",
        title: "",
        description: "",
        priority: "medium",
        estimated_impact: ""
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Request submission error:', error);
      alert('Failed to submit request. Please try again.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitRequestMutation.mutate(formData);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-blue-600" />
          Request Project Change
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
            <Select value={formData.request_type} onValueChange={(v) => setFormData({ ...formData, request_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">New Feature</SelectItem>
                <SelectItem value="modification">Modification</SelectItem>
                <SelectItem value="bug_fix">Bug Fix</SelectItem>
                <SelectItem value="enhancement">Enhancement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the change"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about the requested change..."
              className="h-32"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Impact</label>
            <Textarea
              value={formData.estimated_impact}
              onChange={(e) => setFormData({ ...formData, estimated_impact: e.target.value })}
              placeholder="How will this change impact the project? (timeline, budget, scope)"
              className="h-24"
            />
          </div>

          <Button
            type="submit"
            disabled={submitRequestMutation.isPending}
            className="w-full bg-blue-600"
          >
            {submitRequestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}