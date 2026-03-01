import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, DollarSign, Clock, AlertCircle, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { createNotification, notifyAdmins } from "@/components/utils/notificationHelpers";
import { generateChangeOrderApprovalEmail } from "@/components/utils/emailTemplates";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/components/utils/constants";
import { toast } from "sonner";

const statusColors = STATUS_COLORS;
const priorityColors = PRIORITY_COLORS;

export default function ChangeOrderApproval({ changeOrder, onUpdate }) {
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);
  const [comments, setComments] = useState("");
  const queryClient = useQueryClient();

  const updateChangeOrderMutation = useMutation({
    mutationFn: async ({ changeOrderId, updates }) => {
      const user = await portalApi.auth.me();
      const result = await portalApi.entities.ChangeOrder.update(changeOrderId, updates);
      
      // Create notification for admins
      const adminUsers = await portalApi.entities.User.filter({ role: 'admin' });
      const notificationType = updates.status === 'Approved' ? 'change_order_approval' : 'change_order_rejected';
      
      for (const admin of adminUsers) {
        await portalApi.entities.Notification.create({
          recipient_email: admin.email,
          type: notificationType,
          title: updates.status === 'Approved' ? 'Change Order Approved' : 'Change Order Rejected',
          message: `${user.full_name} ${updates.status === 'Approved' ? 'approved' : 'rejected'} change order: ${changeOrder.title}`,
          link: `/ProjectDetail?id=${changeOrder.project_id}`,
          priority: 'high',
          read: false,
          metadata: { 
            change_order_id: changeOrderId,
            project_id: changeOrder.project_id,
            cost_impact: changeOrder.cost_impact,
            client_comments: updates.client_comments 
          }
        });
      }

      // Send rich HTML email notification
      const emailHtml = generateChangeOrderApprovalEmail({
        changeOrderTitle: changeOrder.title,
        clientName: user.full_name,
        clientEmail: user.email,
        status: updates.status,
        comments: updates.client_comments || '',
        costImpact: changeOrder.cost_impact || 0,
        scheduleImpact: changeOrder.schedule_impact_days || 0
      });
      
      await portalApi.integrations.Core.SendEmail({
        to: 'dylanl.peci@gmail.com',
        from_name: 'Pacific Engineering Portal',
        subject: `Change Order ${updates.status}: ${changeOrder.title}`,
        body: emailHtml
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-change-orders']);
      queryClient.invalidateQueries(['project-detail']);
      queryClient.invalidateQueries(['client-change-orders']);
      setShowApprovalForm(false);
      setComments("");
      toast.success('Change order approval submitted successfully');
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      console.error('Failed to update change order:', error);
      toast.error('Failed to submit approval');
    }
  });

  const handleApproval = (action) => {
    setApprovalAction(action);
    setShowApprovalForm(true);
  };

  const handleSubmitApproval = () => {
    const updates = {
      status: approvalAction === 'approve' ? 'Approved' : 'Rejected',
      client_approval_date: new Date().toISOString(),
      client_comments: comments
    };

    updateChangeOrderMutation.mutate({
      changeOrderId: changeOrder.id,
      updates
    });
  };

  const isPendingApproval = changeOrder.status === "Pending Client Approval";

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className={`h-1 ${
        changeOrder.status === 'Approved' ? 'bg-green-500' : 
        changeOrder.status === 'Rejected' ? 'bg-red-500' : 
        'bg-yellow-500'
      }`} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900">
                {changeOrder.title}
              </h3>
              {changeOrder.priority && (
                <Badge variant="outline" className={`text-xs ${priorityColors[changeOrder.priority]}`}>
                  {changeOrder.priority}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                CO #{changeOrder.change_order_number}
              </span>
              <Badge className={`${statusColors[changeOrder.status]} border`}>
                {changeOrder.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3 mb-5">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Description</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {changeOrder.description}
            </p>
          </div>

          {changeOrder.reason && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Reason</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {changeOrder.reason}
              </p>
            </div>
          )}
        </div>

        {/* Impact Summary */}
        <div className="grid md:grid-cols-2 gap-4 mb-5 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              changeOrder.cost_impact > 0 ? 'bg-red-100' : changeOrder.cost_impact < 0 ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <DollarSign className={`w-5 h-5 ${
                changeOrder.cost_impact > 0 ? 'text-red-600' : changeOrder.cost_impact < 0 ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="text-xs text-gray-600">Cost Impact</div>
              <div className={`text-lg font-bold ${
                changeOrder.cost_impact > 0 ? 'text-red-600' : changeOrder.cost_impact < 0 ? 'text-green-600' : 'text-gray-900'
              }`}>
                {changeOrder.cost_impact > 0 ? '+' : ''}${Math.abs(changeOrder.cost_impact || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              changeOrder.schedule_impact_days > 0 ? 'bg-orange-100' : changeOrder.schedule_impact_days < 0 ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Clock className={`w-5 h-5 ${
                changeOrder.schedule_impact_days > 0 ? 'text-orange-600' : changeOrder.schedule_impact_days < 0 ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="text-xs text-gray-600">Schedule Impact</div>
              <div className={`text-lg font-bold ${
                changeOrder.schedule_impact_days > 0 ? 'text-orange-600' : changeOrder.schedule_impact_days < 0 ? 'text-green-600' : 'text-gray-900'
              }`}>
                {changeOrder.schedule_impact_days > 0 ? '+' : ''}{changeOrder.schedule_impact_days || 0} days
              </div>
            </div>
          </div>
        </div>

        {/* Proposed By */}
        {changeOrder.proposed_by_name && (
          <div className="text-sm text-gray-600 mb-5">
            Proposed by {changeOrder.proposed_by_name}
          </div>
        )}

        {/* Approval Actions */}
        {isPendingApproval && !showApprovalForm && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={() => handleApproval('approve')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Change Order
            </Button>
            <Button
              onClick={() => handleApproval('reject')}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {/* Approval Form */}
        {showApprovalForm && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Comments (optional)
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={`Add comments about ${approvalAction === 'approve' ? 'approving' : 'rejecting'} this change order...`}
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleSubmitApproval}
                disabled={updateChangeOrderMutation.isPending}
                className={`flex-1 ${
                  approvalAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {updateChangeOrderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `Confirm ${approvalAction === 'approve' ? 'Approval' : 'Rejection'}`
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowApprovalForm(false);
                  setComments("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Previous Approval Info */}
        {!isPendingApproval && changeOrder.client_approval_date && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">
                  {changeOrder.status === 'Approved' ? 'Approved' : 'Rejected'} on{' '}
                  {format(new Date(changeOrder.client_approval_date), 'MMM d, yyyy h:mm a')}
                </p>
                {changeOrder.client_comments && (
                  <p className="text-gray-600 mt-1">{changeOrder.client_comments}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}