import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

const ANNOTATION_TYPES = [
  { value: "comment", label: "Comment" },
  { value: "highlight", label: "Highlight" },
  { value: "approval_request", label: "Approval Request" },
];

export default function RealtimeDocumentAnnotator({
  documentId,
  projectId,
  user,
  isReadOnly = false,
}) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef(null);
  const [annotations, setAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState({
    annotation_type: "comment",
    content: "",
    position: { page: 1, x: 0, y: 0 },
  });
  const [showForm, setShowForm] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);

  // Fetch existing annotations
  const { data: initialAnnotations = [] } = useQuery({
    queryKey: ["document-annotations", documentId],
    queryFn: () =>
      base44.entities.DocumentAnnotation.filter({
        document_id: documentId,
        project_id: projectId,
      }),
  });

  // Set up real-time subscriptions
  useEffect(() => {
    setAnnotations(initialAnnotations);

    // Subscribe to annotation changes
    unsubscribeRef.current = base44.entities.DocumentAnnotation.subscribe((event) => {
      if (event.data?.document_id !== documentId) return;

      setAnnotations((prev) => {
        if (event.type === "create") {
          return [...prev, event.data];
        } else if (event.type === "update") {
          return prev.map((a) => (a.id === event.id ? event.data : a));
        } else if (event.type === "delete") {
          return prev.filter((a) => a.id !== event.id);
        }
        return prev;
      });
    });

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [documentId, initialAnnotations]);

  // Create annotation mutation
  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.DocumentAnnotation.create({
        ...data,
        document_id: documentId,
        project_id: projectId,
        author_email: user?.email,
        author_name: user?.full_name,
        status: "pending",
      }),
    onSuccess: () => {
      setNewAnnotation({
        annotation_type: "comment",
        content: "",
        position: { page: 1, x: 0, y: 0 },
      });
      setShowForm(false);
      toast.success("Annotation added");
    },
    onError: () => toast.error("Failed to add annotation"),
  });

  // Resolve annotation mutation
  const resolveMutation = useMutation({
    mutationFn: (annotationId) =>
      base44.entities.DocumentAnnotation.update(annotationId, {
        status: "resolved",
        resolved_by: user?.email,
        resolved_date: new Date().toISOString(),
      }),
    onSuccess: () => toast.success("Annotation resolved"),
  });

  // Delete annotation mutation
  const deleteMutation = useMutation({
    mutationFn: (annotationId) =>
      base44.entities.DocumentAnnotation.delete(annotationId),
    onSuccess: () => toast.success("Annotation deleted"),
  });

  const handleAddAnnotation = () => {
    if (!newAnnotation.content.trim()) {
      toast.error("Please enter annotation content");
      return;
    }
    createMutation.mutate(newAnnotation);
  };

  // Group annotations by status
  const pendingAnnotations = annotations.filter((a) => a.status === "pending");
  const resolvedAnnotations = annotations.filter((a) => a.status === "resolved");

  return (
    <div className="space-y-6">
      {/* Header with active users */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Document Annotations
          </h3>
          <p className="text-sm text-gray-600 mt-1">Real-time collaborative review</p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Annotation
          </Button>
        )}
      </div>

      {/* New annotation form */}
      {showForm && !isReadOnly && (
        <Card className="p-6 bg-blue-50 border-0 shadow-md">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Type
              </label>
              <Select
                value={newAnnotation.annotation_type}
                onValueChange={(value) =>
                  setNewAnnotation({ ...newAnnotation, annotation_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOTATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Annotation
              </label>
              <Textarea
                value={newAnnotation.content}
                onChange={(e) =>
                  setNewAnnotation({ ...newAnnotation, content: e.target.value })
                }
                placeholder="Enter your annotation or feedback..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddAnnotation}
                disabled={createMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Annotation"
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pending Annotations */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Pending ({pendingAnnotations.length})
        </h4>

        {pendingAnnotations.length === 0 ? (
          <Card className="p-6 text-center border-0 shadow-sm">
            <p className="text-gray-600">No pending annotations</p>
          </Card>
        ) : (
          pendingAnnotations.map((annotation) => (
            <Card
              key={annotation.id}
              className="p-4 border-0 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {annotation.annotation_type}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        by {annotation.author_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{annotation.content}</p>
                  </div>

                  {!isReadOnly && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resolveMutation.mutate(annotation.id)}
                        disabled={resolveMutation.isPending}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(annotation.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  {new Date(annotation.created_date).toLocaleString()}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Resolved Annotations */}
      {resolvedAnnotations.length > 0 && (
        <div className="space-y-3 pt-6 border-t">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            Resolved ({resolvedAnnotations.length})
          </h4>

          <div className="space-y-2">
            {resolvedAnnotations.map((annotation) => (
              <Card key={annotation.id} className="p-3 bg-green-50 border-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 line-through">
                      {annotation.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Resolved by {annotation.resolved_by} on{" "}
                      {new Date(annotation.resolved_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}