import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, AlertCircle, Loader2, FileSignature, X } from "lucide-react";
import { notifyAdmins, createNotification } from "@/components/utils/notificationHelpers";
import { toast } from "sonner";

export default function DocumentAnnotator({ document, project, user }) {
  const [showNewAnnotation, setShowNewAnnotation] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({ type: "comment", content: "" });
  const queryClient = useQueryClient();

  const { data: annotations = [], isLoading } = useQuery({
    queryKey: ['document-annotations', document.id],
    queryFn: async () => {
      try {
        return await base44.entities.DocumentAnnotation.filter({ document_id: document.id }, '-created_date');
      } catch (error) {
        console.error('Failed to fetch annotations:', error);
        return [];
      }
    },
    enabled: !!document.id
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ['document-approvals', document.id],
    queryFn: async () => {
      try {
        return await base44.entities.DocumentApproval.filter({ document_id: document.id }, '-created_date');
      } catch (error) {
        console.error('Failed to fetch approvals:', error);
        return [];
      }
    },
    enabled: !!document.id
  });

  const addAnnotationMutation = useMutation({
    mutationFn: async (data) => {
      const annotation = await base44.entities.DocumentAnnotation.create(data);
      
      if (user.role !== 'admin') {
        await notifyAdmins({
          type: 'document_annotation',
          title: 'New Document Annotation',
          message: `${user.full_name} added a ${data.annotation_type} to ${document.document_name}`,
          link: `/ProjectDetail?id=${project.id}`,
          priority: data.annotation_type === 'approval_request' ? 'high' : 'medium',
          metadata: { document_id: document.id, project_id: project.id }
        });
      }
      
      return annotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-annotations'] });
      setShowNewAnnotation(false);
      setNewAnnotation({ type: "comment", content: "" });
      toast.success('Annotation added successfully');
    },
    onError: (error) => {
      console.error('Failed to add annotation:', error);
      toast.error('Failed to add annotation');
    }
  });

  const resolveAnnotationMutation = useMutation({
    mutationFn: async (annotationId) => {
      return await base44.entities.DocumentAnnotation.update(annotationId, {
        status: 'resolved',
        resolved_by: user.email,
        resolved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-annotations'] });
      toast.success('Annotation resolved');
    }
  });

  const requestApprovalMutation = useMutation({
    mutationFn: async (data) => {
      const approval = await base44.entities.DocumentApproval.create(data);
      
      await createNotification({
        recipientEmail: data.requested_from,
        type: 'document_approval',
        title: 'Document Approval Requested',
        message: `${user.full_name} requests your approval on ${document.document_name}`,
        link: `/ProjectDetail?id=${project.id}`,
        priority: 'high',
        metadata: { document_id: document.id, project_id: project.id, approval_id: approval.id }
      });
      
      return approval;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
      toast.success('Approval request sent');
    },
    onError: () => {
      toast.error('Failed to request approval');
    }
  });

  const handleAddAnnotation = () => {
    if (!newAnnotation.content.trim()) {
      toast.error('Please enter annotation content');
      return;
    }
    
    addAnnotationMutation.mutate({
      document_id: document.id,
      project_id: project.id,
      author_email: user.email,
      author_name: user.full_name,
      annotation_type: newAnnotation.type,
      content: newAnnotation.content,
      status: 'pending'
    });
  };

  const pendingAnnotations = annotations.filter(a => a.status === 'pending');
  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setShowNewAnnotation(!showNewAnnotation)}
          size="sm"
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Add Comment
        </Button>
        
        {user.role !== 'admin' && (
          <Button
            onClick={() => {
              requestApprovalMutation.mutate({
                document_id: document.id,
                project_id: project.id,
                requested_by: user.email,
                requested_from: 'dylanl.peci@gmail.com',
                approval_type: 'document_review',
                status: 'pending'
              });
            }}
            size="sm"
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
            disabled={requestApprovalMutation.isPending}
          >
            <FileSignature className="w-4 h-4 mr-2" />
            Request Approval
          </Button>
        )}
      </div>

      {showNewAnnotation && (
        <Card className="p-4 border-2 border-blue-300 bg-blue-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Annotation Type</label>
              <div className="flex gap-2">
                {['comment', 'highlight', 'approval_request'].map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={newAnnotation.type === type ? 'default' : 'outline'}
                    onClick={() => setNewAnnotation({ ...newAnnotation, type })}
                  >
                    {type.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Comment</label>
              <Textarea
                value={newAnnotation.content}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, content: e.target.value })}
                placeholder="Add your comment or note here..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAddAnnotation}
                disabled={!newAnnotation.content.trim() || addAnnotationMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addAnnotationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Add Annotation
              </Button>
              <Button
                onClick={() => {
                  setShowNewAnnotation(false);
                  setNewAnnotation({ type: 'comment', content: '' });
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {(pendingAnnotations.length > 0 || pendingApprovals.length > 0) && (
        <Card className="p-4 border-2 border-orange-300 bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-orange-900">
              {pendingAnnotations.length + pendingApprovals.length} Pending Item(s)
            </h4>
          </div>
          <p className="text-sm text-orange-800">
            {pendingAnnotations.length} annotation(s) and {pendingApprovals.length} approval request(s) need attention
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : annotations.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-lg">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No annotations yet</p>
          </Card>
        ) : (
          annotations.map((annotation) => (
            <Card key={annotation.id} className={`p-4 border ${
              annotation.status === 'pending' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={
                    annotation.annotation_type === 'approval_request' ? 'bg-red-100 text-red-700' :
                    annotation.annotation_type === 'highlight' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {annotation.annotation_type.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">{annotation.status}</Badge>
                </div>
                {annotation.status === 'pending' && user.role === 'admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolveAnnotationMutation.mutate(annotation.id)}
                    disabled={resolveAnnotationMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                    Resolve
                  </Button>
                )}
              </div>
              
              <p className="text-sm text-gray-700 mb-2">{annotation.content}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{annotation.author_name} • {new Date(annotation.created_date).toLocaleString()}</span>
                {annotation.resolved_by && (
                  <span className="text-green-600">
                    Resolved by {annotation.resolved_by.split('@')[0]}
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {approvals.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Approval Requests</h4>
          {approvals.map((approval) => (
            <Card key={approval.id} className={`p-4 border ${
              approval.status === 'pending' ? 'border-green-300 bg-green-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Badge className={
                  approval.status === 'approved' ? 'bg-green-600 text-white' :
                  approval.status === 'rejected' ? 'bg-red-600 text-white' :
                  'bg-yellow-100 text-yellow-700'
                }>
                  {approval.status}
                </Badge>
                <span className="text-xs text-gray-500">{approval.approval_type}</span>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">
                Requested by {approval.requested_by.split('@')[0]} • For {approval.requested_from.split('@')[0]}
              </p>
              
              {approval.comments && (
                <p className="text-sm text-gray-600 italic">"{approval.comments}"</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}