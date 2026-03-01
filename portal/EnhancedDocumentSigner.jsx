import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, Loader2, PenTool, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function EnhancedDocumentSigner({ document, projectId, onSignComplete }) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState("drawn");
  const [typedName, setTypedName] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSigning, setIsSigning] = useState(false);

  const signMutation = useMutation({
    mutationFn: async (signatureData) => {
      const user = await base44.auth.me();

      // Create signature record
      const signature = await base44.entities.DocumentSignature.create({
        document_id: document.id,
        project_id: projectId,
        signer_email: user.email,
        signer_name: user.full_name,
        signature_data: signatureData,
        signature_type: signatureType,
        signed_date: new Date().toISOString(),
        verification_code: `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      // Update document status
      await base44.entities.ProjectDocument.update(document.id, {
        status: "signed",
        signed_by: user.email,
        signed_date: new Date().toISOString(),
      });

      // Notify admins
      const admins = await base44.entities.User.filter({ role: "admin" });
      for (const admin of admins) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          type: "document",
          title: "Document Signed",
          message: `${user.full_name} signed ${document.document_name}`,
          link: `/ProjectDetail?id=${projectId}`,
          priority: "medium",
        });
      }

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-documents"] });
      toast.success("Document signed successfully");
      onSignComplete?.();
    },
    onError: () => toast.error("Failed to sign document"),
  });

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSign = async () => {
    setIsSigning(true);
    let signatureData;

    try {
      if (signatureType === "drawn") {
        const canvas = canvasRef.current;
        signatureData = canvas.toDataURL();
      } else if (signatureType === "typed") {
        if (!typedName.trim()) {
          toast.error("Please enter your name");
          setIsSigning(false);
          return;
        }
        // Create canvas with typed name
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 400;
        tempCanvas.height = 100;
        const ctx = tempCanvas.getContext("2d");
        ctx.font = "italic 32px Brush Script MT, cursive";
        ctx.fillText(typedName, 20, 60);
        signatureData = tempCanvas.toDataURL();
      } else if (signatureType === "uploaded") {
        if (!uploadedImage) {
          toast.error("Please upload a signature image");
          setIsSigning(false);
          return;
        }
        signatureData = uploadedImage;
      }

      await signMutation.mutateAsync(signatureData);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Card className="p-6 border-0 shadow-lg space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sign Document</h3>
          <p className="text-sm text-gray-600">{document.document_name}</p>
        </div>
      </div>

      <Tabs
        value={signatureType}
        onValueChange={setSignatureType}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drawn">
            <PenTool className="w-4 h-4 mr-2" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="typed">
            <Type className="w-4 h-4 mr-2" />
            Type
          </TabsTrigger>
          <TabsTrigger value="uploaded">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drawn" className="space-y-4">
          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full cursor-crosshair"
            />
          </div>
          <Button variant="outline" onClick={clearCanvas} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </TabsContent>

        <TabsContent value="typed" className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Type Your Full Name
            </label>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="John Smith"
              className="text-lg"
            />
          </div>
          {typedName && (
            <div className="p-6 border-2 border-gray-300 rounded-lg bg-white text-center">
              <p style={{ fontFamily: "Brush Script MT, cursive", fontSize: "32px" }}>
                {typedName}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploaded" className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Upload Signature Image
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>
          {uploadedImage && (
            <div className="p-4 border-2 border-gray-300 rounded-lg bg-white text-center">
              <img
                src={uploadedImage}
                alt="Signature"
                className="max-h-32 mx-auto"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-xs text-gray-700">
          By signing this document, you acknowledge that you have reviewed it and agree to
          its terms. Your signature will be encrypted and securely stored.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onSignComplete}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSign}
          disabled={isSigning || signMutation.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isSigning || signMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Sign Document
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}