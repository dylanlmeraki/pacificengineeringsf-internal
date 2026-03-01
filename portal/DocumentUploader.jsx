import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, X, Loader2, FileText, CheckCircle2 } from "lucide-react";

export default function DocumentUploader({ projectId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [formData, setFormData] = useState({
    document_name: "",
    document_type: "Other",
    description: "",
    version: "1.0"
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.document_name) {
        setFormData({ ...formData, document_name: file.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !projectId) return;

    setUploading(true);
    setUploadSuccess(false);

    try {
      const user = await base44.auth.me();
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Create document record
      const document = await base44.entities.ProjectDocument.create({
        project_id: projectId,
        document_name: formData.document_name,
        document_type: formData.document_type,
        description: formData.description,
        version: formData.version,
        file_url: file_url,
        file_size: selectedFile.size,
        uploaded_by: user.email,
        uploaded_by_name: user.full_name,
        status: "Draft"
      });

      // Get project details and notify team
      const projects = await base44.entities.Project.filter({ id: projectId });
      if (projects.length > 0) {
        const project = projects[0];
        
        // Notify assigned team members
        if (project.assigned_team_members && project.assigned_team_members.length > 0) {
          for (const teamMemberEmail of project.assigned_team_members) {
            await base44.entities.Notification.create({
              recipient_email: teamMemberEmail,
              type: 'document_upload',
              title: 'New Document Uploaded',
              message: `${user.full_name} uploaded ${formData.document_name} to ${project.project_name}`,
              link: `/ProjectDetail?id=${projectId}`,
              priority: 'normal',
              read: false,
              metadata: { 
                document_id: document.id,
                project_id: projectId,
                document_type: formData.document_type 
              }
            });
          }
        }
      }
      
      // Also notify admins
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      for (const admin of adminUsers) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          type: 'document_upload',
          title: 'New Document Uploaded',
          message: `${user.full_name} uploaded ${formData.document_name} (${formData.document_type})`,
          link: `/ProjectDetail?id=${projectId}`,
          priority: 'normal',
          read: false,
          metadata: { 
            document_id: document.id,
            project_id: projectId,
            document_type: formData.document_type 
          }
        });
      }

      setUploadSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setSelectedFile(null);
        setFormData({
          document_name: "",
          document_type: "Other",
          description: "",
          version: "1.0"
        });
        setUploadSuccess(false);
        if (onUploadComplete) onUploadComplete();
      }, 2000);
      
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload document. Please try again.");
    }

    setUploading(false);
  };

  if (uploadSuccess) {
    return (
      <Card className="p-8 text-center border-2 border-green-200 bg-green-50">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Document Uploaded!</h3>
        <p className="text-sm text-gray-600">Your file has been successfully uploaded.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 shadow-lg bg-white">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Document</h3>
      
      <div className="space-y-4">
        {/* File Selector */}
        <div>
          <Label htmlFor="file-upload" className="block mb-2">Select File *</Label>
          <div className="relative">
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
          {selectedFile && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-gray-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              <button onClick={() => setSelectedFile(null)} className="ml-auto text-red-600 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Document Name */}
        <div>
          <Label htmlFor="doc-name">Document Name *</Label>
          <Input
            id="doc-name"
            value={formData.document_name}
            onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
            placeholder="Enter document name"
          />
        </div>

        {/* Document Type */}
        <div>
          <Label>Document Type *</Label>
          <Select value={formData.document_type} onValueChange={(value) => setFormData({ ...formData, document_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SWPPP Plan">SWPPP Plan</SelectItem>
              <SelectItem value="Inspection Report">Inspection Report</SelectItem>
              <SelectItem value="Test Results">Test Results</SelectItem>
              <SelectItem value="Engineering Drawing">Engineering Drawing</SelectItem>
              <SelectItem value="Photo">Photo</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Invoice">Invoice</SelectItem>
              <SelectItem value="Permit">Permit</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Version */}
        <div>
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="e.g., 1.0"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes or description..."
            rows={3}
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !formData.document_name || uploading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          {uploading ? (
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
      </div>
    </Card>
  );
}