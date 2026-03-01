import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientDocumentUploader({ projectId, user }) {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [linkedEntity, setLinkedEntity] = useState({ type: "", id: "" });
  const [uploadStatus, setUploadStatus] = useState({ status: "", message: "" });

  const queryClient = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => await portalApi.entities.ProjectMilestone.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => await portalApi.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      try {
        setUploadStatus({ status: "uploading", message: "Uploading file..." });

        const { file_url } = await portalApi.integrations.Core.UploadFile({ file: formData.file });

        setUploadStatus({ status: "uploading", message: "Creating document record..." });

        const document = await portalApi.entities.ProjectDocument.create({
          project_id: projectId,
          document_name: formData.documentName,
          document_type: formData.documentType,
          description: formData.description,
          file_url,
          file_size: formData.file.size,
          uploaded_by: user.email,
          uploaded_by_name: user.full_name,
          status: "Under Review",
          linked_entity_type: formData.linkedEntity.type || null,
          linked_entity_id: formData.linkedEntity.id || null
        });

        try {
          await portalApi.functions.invoke('createNotification', {
            user_email: 'admin@example.com',
            notification_type: 'document',
            title: 'New Client Document',
            message: `${user.full_name} uploaded: ${formData.documentName}`,
            link: `/projects`,
            priority: 'medium',
            related_id: document.id
          });
        } catch (notifError) {
          console.warn('Failed to send notification, but document uploaded successfully', notifError);
        }

        return document;
      } catch (error) {
        throw new Error(error.message || "Upload failed");
      }
    },
    onSuccess: () => {
      setUploadStatus({ status: "success", message: "Document uploaded successfully!" });
      queryClient.invalidateQueries({ queryKey: ['project-documents'] });
      
      setTimeout(() => {
        setFile(null);
        setDocumentName("");
        setDescription("");
        setDocumentType("");
        setLinkedEntity({ type: "", id: "" });
        setUploadStatus({ status: "", message: "" });
      }, 2000);
    },
    onError: (error) => {
      setUploadStatus({ status: "error", message: error.message });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || !documentName || !documentType) {
      setUploadStatus({ status: "error", message: "Please fill in all required fields" });
      return;
    }

    uploadMutation.mutate({
      file,
      documentName,
      documentType,
      description,
      linkedEntity
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload Project Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document File *
            </label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              required
              disabled={uploadMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Name *
            </label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
              required
              disabled={uploadMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={uploadMutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Invoice">Invoice</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Plan">Plan</SelectItem>
                <SelectItem value="Permit">Permit</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Task/Milestone (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={linkedEntity.type} 
                onValueChange={(v) => setLinkedEntity({ type: v, id: "" })}
                disabled={uploadMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
              
              {linkedEntity.type && (
                <Select 
                  value={linkedEntity.id} 
                  onValueChange={(v) => setLinkedEntity({ ...linkedEntity, id: v })}
                  disabled={uploadMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedEntity.type === 'task' && tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>{task.task_name}</SelectItem>
                    ))}
                    {linkedEntity.type === 'milestone' && milestones.map(milestone => (
                      <SelectItem key={milestone.id} value={milestone.id}>{milestone.milestone_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this document"
              disabled={uploadMutation.isPending}
            />
          </div>

          {uploadStatus.status && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              uploadStatus.status === 'success' ? 'bg-green-50 text-green-700' :
              uploadStatus.status === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {uploadStatus.status === 'success' && <CheckCircle className="w-5 h-5" />}
              {uploadStatus.status === 'error' && <AlertCircle className="w-5 h-5" />}
              {uploadStatus.status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin" />}
              <span className="text-sm font-medium">{uploadStatus.message}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={uploadMutation.isPending}
            className="w-full bg-blue-600"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}