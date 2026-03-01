import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings, Save, Loader2 } from "lucide-react";

const NOTIFICATION_EVENTS = [
  {
    id: "milestone_reached",
    label: "Milestone Reached",
    description: "When a project milestone is completed",
  },
  {
    id: "document_upload",
    label: "Document Upload",
    description: "When your team uploads new documents",
  },
  {
    id: "proposal_available",
    label: "Proposal Available",
    description: "When a new proposal is ready for review",
  },
  {
    id: "change_order_available",
    label: "Change Order",
    description: "When a change order needs approval",
  },
  {
    id: "message_received",
    label: "New Message",
    description: "When you receive a message from your project manager",
  },
  {
    id: "project_update",
    label: "Project Update",
    description: "General project status updates",
  },
  {
    id: "approval_required",
    label: "Approval Required",
    description: "When action is needed from you",
  },
];

export default function NotificationPreferences({ user, open, onOpenChange }) {
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({});
  const queryClient = useQueryClient();

  // Fetch user's notification preferences
  const { data: userPrefs = [] } = useQuery({
    queryKey: ["notification-preferences", user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.NotificationPreference.filter(
        { user_email: user.email }
      );
    },
    enabled: !!user && open,
  });

  // Initialize preferences
  useEffect(() => {
    if (!open) return;
    
    const prefs = {};
    NOTIFICATION_EVENTS.forEach((event) => {
      const existing = userPrefs.find((p) => p.event_type === event.id);
      prefs[event.id] = existing || {
        event_type: event.id,
        email_enabled: true,
        sms_enabled: false,
        in_app_enabled: true,
      };
    });
    setPreferences(prefs);
  }, [open, userPrefs]);

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [];
      for (const [eventId, pref] of Object.entries(preferences)) {
        if (pref.id) {
          // Update existing
          updates.push(
            base44.entities.NotificationPreference.update(pref.id, {
              email_enabled: pref.email_enabled,
              sms_enabled: pref.sms_enabled,
              in_app_enabled: pref.in_app_enabled,
            })
          );
        } else {
          // Create new
          updates.push(
            base44.entities.NotificationPreference.create({
              user_email: user.email,
              event_type: eventId,
              email_enabled: pref.email_enabled,
              sms_enabled: pref.sms_enabled,
              in_app_enabled: pref.in_app_enabled,
            })
          );
        }
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      onOpenChange(false);
    },
  });

  const handleToggle = (eventId, channel) => {
    setPreferences((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [channel]: !prev[eventId][channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how and when you receive notifications for different events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {NOTIFICATION_EVENTS.map((event) => {
            const pref = preferences[event.id];
            if (!pref) return null;

            return (
              <Card key={event.id} className="p-4 border-0 shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{event.label}</h4>
                    <p className="text-sm text-gray-600">{event.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={pref.email_enabled}
                      onChange={() => handleToggle(event.id, "email_enabled")}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-xs text-gray-600">Sent to your inbox</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={pref.sms_enabled}
                      onChange={() => handleToggle(event.id, "sms_enabled")}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">SMS</p>
                      <p className="text-xs text-gray-600">Text message</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={pref.in_app_enabled}
                      onChange={() => handleToggle(event.id, "in_app_enabled")}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">In-App</p>
                      <p className="text-xs text-gray-600">Portal notification</p>
                    </div>
                  </label>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}