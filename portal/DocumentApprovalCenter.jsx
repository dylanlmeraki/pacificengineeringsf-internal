import React from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, CheckCircle2, XCircle, Clock, Eye, Download,
  AlertCircle, Loader2, Filter
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function DocumentApprovalCenter({ user, projects = [] }) {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = React.useState(null);
  const [feedback, setFeedback] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Fetch documents needing approval
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["document-approvals", user?.email],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const projectIds = projects.map((p) => p.id);
      const docs = await Promise.all(
        projectIds.map((id) => portalApi.entities.ProjectDocument.filter({ project_id: id }))
      );
      return docs.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user && projects.length > 0,
  });

  // Fetch approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["doc-approval-records", user?.email],
    queryFn: async () => {
      const results = await Promise.all(
        documents.map((d) =>
          portalApi.entities.DocumentApproval.filter({ document_id: d.id })
        )
      );
      return results.flat();
    },
    enabled: documents.length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ docId, status, comment }) => {
      // Check if approval record exists
      const existing = approvals.find(
        (a) => a.document_id === docId && a.approver_email === user.email
      );
      if (existing) {
        return portalApi.entities.DocumentApproval.update(existing.id, {
          status,
          comment,
          reviewed_at: new Date().toISOString(),
        });
      }
      return portalApi.entities.DocumentApproval.create({
        document_id: docId,
        approver_email: user.email,
        approver_name: user.full_name,
        status,
        comment,
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["doc-approval-records"] });
      setSelectedDoc(null);
      setFeedback("");
      toast.success(status === "approved" ? "Document approved" : "Feedback sent");
    },
  });

  const getDocApproval = (docId) => {
    return approvals.find(
      (a) => a.document_id === docId && a.approver_email === user?.email
    );
  };

  const getStatusBadge = (doc) => {
    const approval = getDocApproval(doc.id);
    if (!approval) {
      if (doc.status === "Under Review") {
        return (
          <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Review
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-gray-500">
          {doc.status}
        </Badge>
      );
    }
    if (approval.status === "approved") {
      return (
        <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </Badge>
      );
    }
    if (approval.status === "rejected") {
      return (
        <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rejected
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-700">{approval.status}</Badge>
    );
  };

  const filteredDocs = documents.filter((doc) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") {
      return doc.status === "Under Review" && !getDocApproval(doc.id);
    }
    if (statusFilter === "approved") {
      return getDocApproval(doc.id)?.status === "approved";
    }
    if (statusFilter === "rejected") {
      return getDocApproval(doc.id)?.status === "rejected";
    }
    return true;
  });

  const pendingCount = documents.filter(
    (d) => d.status === "Under Review" && !getDocApproval(d.id)
  ).length;

  const getProjectName = (projectId) => {
    return projects.find((p) => p.id === projectId)?.project_name || "Unknown";
  };

  const getDocTypeColor = (type) => {
    const map = {
      "SWPPP Plan": "bg-blue-100 text-blue-700",
      "Inspection Report": "bg-green-100 text-green-700",
      "Test Results": "bg-purple-100 text-purple-700",
      "Engineering Drawing": "bg-indigo-100 text-indigo-700",
      Contract: "bg-orange-100 text-orange-700",
      Invoice: "bg-red-100 text-red-700",
      Permit: "bg-cyan-100 text-cyan-700",
    };
    return map[type] || "bg-gray-100 text-gray-700";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Document Approvals</h2>
            <p className="text-amber-100">Review, approve, or provide feedback on project documents</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-white text-orange-700 text-lg px-4 py-2 font-bold">
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        {["all", "pending", "approved", "rejected"].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? "default" : "outline"}
            onClick={() => setStatusFilter(f)}
            className={statusFilter === f ? "bg-blue-600" : ""}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Documents */}
      {filteredDocs.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-lg">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {statusFilter === "pending" ? "No Documents Pending Review" : "No Documents Found"}
          </h3>
          <p className="text-gray-600">
            {statusFilter === "pending"
              ? "All documents have been reviewed."
              : "No documents match the current filter."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            return (
              <Card
                key={doc.id}
                className={`p-5 border-0 shadow-lg transition-all cursor-pointer hover:shadow-xl ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedDoc(isSelected ? null : doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <h4 className="font-bold text-gray-900">{doc.document_name}</h4>
                      {getStatusBadge(doc)}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <Badge className={getDocTypeColor(doc.document_type)}>
                        {doc.document_type || "Other"}
                      </Badge>
                      <span>Project: {getProjectName(doc.project_id)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(doc.created_date), { addSuffix: true })}</span>
                      {doc.uploaded_by_name && <span>• By {doc.uploaded_by_name}</span>}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mt-2">{doc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {doc.file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(doc.file_url, "_blank");
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Review Section */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add your feedback or comments (optional)..."
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          approveMutation.mutate({
                            docId: doc.id,
                            status: "approved",
                            comment: feedback,
                          })
                        }
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button
                        onClick={() =>
                          approveMutation.mutate({
                            docId: doc.id,
                            status: "rejected",
                            comment: feedback,
                          })
                        }
                        disabled={approveMutation.isPending}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Request Changes
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}