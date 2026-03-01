import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Loader2, FileText, Edit, CheckCircle, RefreshCw, Send, Wand2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const SECTIONS = [
  { key: "goals", label: "Project Goals", placeholder: "What are you trying to achieve?" },
  { key: "scope", label: "Scope of Work", placeholder: "What specific work or services are needed?" },
  { key: "deliverables", label: "Key Deliverables", placeholder: "What should be delivered at the end?" },
  { key: "timeline", label: "Estimated Timeline", placeholder: "When does it need to be completed?" },
  { key: "constraints", label: "Constraints & Requirements", placeholder: "Budget limits, regulatory requirements, etc." },
];

export default function AIProjectBriefGenerator({ user, onSubmitBrief }) {
  const [step, setStep] = useState("input"); // input | generating | review | editing
  const [inputs, setInputs] = useState({
    project_title: "",
    project_type: "",
    location: "",
    goals: "",
    scope: "",
    deliverables: "",
    timeline: "",
    constraints: "",
  });
  const [generatedBrief, setGeneratedBrief] = useState(null);
  const [editingSections, setEditingSections] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const generateBrief = async () => {
    if (!inputs.project_title || !inputs.project_type) {
      toast.error("Please provide at least a project title and type");
      return;
    }

    setStep("generating");
    setLoading(true);

    try {
      const prompt = `You are a professional engineering project consultant. Generate a comprehensive project brief based on the following client inputs.

CLIENT INPUT:
- Project Title: ${inputs.project_title}
- Project Type: ${inputs.project_type}
- Location: ${inputs.location || "Not specified"}
- Goals: ${inputs.goals || "Not specified"}
- Scope: ${inputs.scope || "Not specified"}
- Deliverables: ${inputs.deliverables || "Not specified"}
- Timeline: ${inputs.timeline || "Not specified"}
- Constraints: ${inputs.constraints || "Not specified"}

Generate a detailed, professional project brief with these sections:
1. Executive Summary (2-3 sentences overview)
2. Project Goals & Objectives (detailed, SMART goals based on client input)
3. Scope of Work (comprehensive scope with clear boundaries)
4. Key Deliverables (specific, measurable deliverables with descriptions)
5. Estimated Timeline & Milestones (realistic phases with timeframes)
6. Budget Considerations (based on project type and scope)
7. Risk Factors & Mitigation (common risks for this project type)
8. Regulatory & Compliance Notes (relevant regulations for ${inputs.project_type})
9. Recommended Next Steps

Return as JSON with these exact keys: executive_summary, goals, scope, deliverables, timeline, budget_considerations, risks, compliance, next_steps. Each value should be a well-formatted markdown string.`;

      const result = await portalApi.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            goals: { type: "string" },
            scope: { type: "string" },
            deliverables: { type: "string" },
            timeline: { type: "string" },
            budget_considerations: { type: "string" },
            risks: { type: "string" },
            compliance: { type: "string" },
            next_steps: { type: "string" },
          },
        },
      });

      setGeneratedBrief(result);
      setStep("review");
    } catch (err) {
      console.error("Brief generation error:", err);
      toast.error("Failed to generate brief");
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = (key) => {
    setEditingSections((prev) => ({
      ...prev,
      [key]: generatedBrief[key],
    }));
  };

  const handleSaveSection = (key) => {
    setGeneratedBrief((prev) => ({
      ...prev,
      [key]: editingSections[key],
    }));
    setEditingSections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.success("Section updated");
  };

  const handleSubmit = () => {
    const fullBrief = Object.entries(generatedBrief)
      .map(([key, val]) => `## ${key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}\n\n${val}`)
      .join("\n\n---\n\n");

    if (onSubmitBrief) {
      onSubmitBrief({
        title: inputs.project_title,
        type: inputs.project_type,
        location: inputs.location,
        brief: fullBrief,
        sections: generatedBrief,
        inputs,
      });
    }
    toast.success("Project brief submitted for review");
  };

  const briefSections = generatedBrief
    ? [
        { key: "executive_summary", label: "Executive Summary" },
        { key: "goals", label: "Goals & Objectives" },
        { key: "scope", label: "Scope of Work" },
        { key: "deliverables", label: "Key Deliverables" },
        { key: "timeline", label: "Timeline & Milestones" },
        { key: "budget_considerations", label: "Budget Considerations" },
        { key: "risks", label: "Risks & Mitigation" },
        { key: "compliance", label: "Regulatory & Compliance" },
        { key: "next_steps", label: "Recommended Next Steps" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Project Brief Generator</h2>
              <p className="text-indigo-100">Provide basic details and AI will create a comprehensive project brief</p>
            </div>
          </div>
          {step === "review" && (
            <Badge className="bg-white/20 text-white border-0 text-sm">Review & Edit</Badge>
          )}
        </div>
      </Card>

      {/* Step: Input */}
      {step === "input" && (
        <Card className="p-6 border-0 shadow-lg">
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Project Title *</Label>
                <Input
                  value={inputs.project_title}
                  onChange={(e) => handleInputChange("project_title", e.target.value)}
                  placeholder="e.g., SWPPP for Downtown Office Complex"
                />
              </div>
              <div>
                <Label className="mb-2 block">Project Type *</Label>
                <Select
                  value={inputs.project_type}
                  onValueChange={(v) => handleInputChange("project_type", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SWPPP">SWPPP</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Inspections">Inspections</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Special Inspections">Special Inspections</SelectItem>
                    <SelectItem value="Multiple Services">Multiple Services</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Location</Label>
              <Input
                value={inputs.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="City, State"
              />
            </div>

            {SECTIONS.map((section) => (
              <div key={section.key}>
                <Label className="mb-2 block">{section.label}</Label>
                <Textarea
                  value={inputs[section.key]}
                  onChange={(e) => handleInputChange(section.key, e.target.value)}
                  placeholder={section.placeholder}
                  rows={2}
                  className="resize-none"
                />
              </div>
            ))}

            <p className="text-xs text-gray-500">
              Tip: The more details you provide, the better the AI-generated brief will be. You can always edit the result.
            </p>

            <Button
              onClick={generateBrief}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Project Brief
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Generating */}
      {step === "generating" && (
        <Card className="p-12 border-0 shadow-lg text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Generating Your Project Brief</h3>
          <p className="text-gray-600">AI is analyzing your inputs and creating a comprehensive brief...</p>
        </Card>
      )}

      {/* Step: Review */}
      {step === "review" && generatedBrief && (
        <div className="space-y-4">
          {briefSections.map(({ key, label }) => {
            const isEditing = key in editingSections;
            const content = generatedBrief[key];
            if (!content) return null;

            return (
              <Card key={key} className="p-5 border-0 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    {label}
                  </h4>
                  {!isEditing ? (
                    <Button size="sm" variant="ghost" onClick={() => handleEditSection(key)} className="text-xs">
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleSaveSection(key)} className="text-xs bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" /> Save
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editingSections[key]}
                    onChange={(e) =>
                      setEditingSections((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    rows={6}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Actions */}
          <Card className="p-5 border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900">Ready to submit?</h4>
                <p className="text-sm text-gray-600">Review your brief above, edit any sections, then submit as a project request.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("input")}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Start Over
                </Button>
                <Button onClick={generateBrief} variant="outline" disabled={loading}>
                  <Sparkles className="w-4 h-4 mr-2" /> Regenerate
                </Button>
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" /> Submit Brief
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}