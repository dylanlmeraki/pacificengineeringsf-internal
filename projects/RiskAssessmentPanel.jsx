import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Shield, Plus, AlertTriangle, Loader2, Sparkles, TrendingUp, TrendingDown
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["technical", "financial", "schedule", "safety", "regulatory", "resource"];
const PROBABILITIES = ["low", "medium", "high"];
const IMPACTS = ["low", "medium", "high", "critical"];
const STATUSES = ["identified", "mitigating", "resolved", "occurred"];

const PROB_COLORS = { low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", high: "bg-red-100 text-red-700" };
const IMPACT_COLORS = { low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
const STATUS_COLORS = { identified: "bg-blue-100 text-blue-700", mitigating: "bg-yellow-100 text-yellow-700", resolved: "bg-green-100 text-green-700", occurred: "bg-red-100 text-red-700" };

export default function RiskAssessmentPanel({ projectId, project }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    risk_title: "",
    description: "",
    category: "technical",
    probability: "medium",
    impact: "medium",
    mitigation_strategy: "",
    contingency_plan: "",
    status: "identified",
    owner: "",
  });

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["risk-assessments", projectId],
    queryFn: () => base44.entities.RiskAssessment.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const createRiskMutation = useMutation({
    mutationFn: (data) => base44.entities.RiskAssessment.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments", projectId] });
      setShowDialog(false);
      setFormData({
        risk_title: "", description: "", category: "technical", probability: "medium",
        impact: "medium", mitigation_strategy: "", contingency_plan: "", status: "identified", owner: "",
      });
      toast.success("Risk added");
    },
  });

  const updateRiskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiskAssessment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-assessments", projectId] });
      toast.success("Risk updated");
    },
  });

  const generateAIRisks = async () => {
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a risk assessment expert for construction and engineering projects. Analyze this project and suggest 3-5 relevant risks.

Project: ${project?.project_name || "Unknown"}
Type: ${project?.project_type || "Unknown"}
Status: ${project?.status || "Unknown"}
Location: ${project?.location || "Not specified"}

For each risk, provide: risk_title, description, category (one of: technical, financial, schedule, safety, regulatory, resource), probability (low/medium/high), impact (low/medium/high/critical), mitigation_strategy, and contingency_plan.

Return JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  probability: { type: "string" },
                  impact: { type: "string" },
                  mitigation_strategy: { type: "string" },
                  contingency_plan: { type: "string" },
                },
              },
            },
          },
        },
      });

      for (const risk of result.risks || []) {
        await base44.entities.RiskAssessment.create({
          ...risk,
          project_id: projectId,
          status: "identified",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["risk-assessments", projectId] });
      toast.success(`${(result.risks || []).length} AI-generated risks added`);
    } catch (err) {
      console.error("AI risk generation error:", err);
      toast.error("Failed to generate risks");
    } finally {
      setAiLoading(false);
    }
  };

  // Risk metrics
  const metrics = useMemo(() => {
    const probMap = { low: 1, medium: 2, high: 3 };
    const impMap = { low: 1, medium: 2, high: 3, critical: 4 };
    const scores = risks.map((r) => (probMap[r.probability] || 1) * (impMap[r.impact] || 1));
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highRisks = risks.filter((r) => {
      const score = (probMap[r.probability] || 1) * (impMap[r.impact] || 1);
      return score >= 6;
    });
    const activeRisks = risks.filter((r) => r.status !== "resolved");
    return { total: risks.length, highRisks: highRisks.length, active: activeRisks.length, avgScore };
  }, [risks]);

  // Risk matrix grid
  const matrixGrid = useMemo(() => {
    const grid = {};
    PROBABILITIES.forEach((p) => {
      IMPACTS.forEach((i) => {
        grid[`${p}-${i}`] = risks.filter((r) => r.probability === p && r.impact === i);
      });
    });
    return grid;
  }, [risks]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Shield className="w-6 h-6" /> Risk Assessment
            </h2>
            <p className="text-orange-100">Identify, assess, and mitigate project risks</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateAIRisks}
              disabled={aiLoading}
              variant="outline"
              className="border-white/40 text-black hover:bg-white/20"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              AI Suggest
            </Button>
            <Button onClick={() => setShowDialog(true)} className="bg-white text-red-600 hover:bg-red-50">
              <Plus className="w-4 h-4 mr-1" /> Add Risk
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 border-0 shadow-lg">
          <p className="text-sm text-gray-600">Total Risks</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
        </Card>
        <Card className="p-4 border-0 shadow-lg">
          <p className="text-sm text-gray-600">High Priority</p>
          <p className="text-2xl font-bold text-red-600">{metrics.highRisks}</p>
        </Card>
        <Card className="p-4 border-0 shadow-lg">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-orange-600">{metrics.active}</p>
        </Card>
        <Card className="p-4 border-0 shadow-lg">
          <p className="text-sm text-gray-600">Avg Score</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.avgScore.toFixed(1)}</p>
        </Card>
      </div>

      {/* Risk Matrix Heatmap */}
      <Card className="p-6 border-0 shadow-lg">
        <h3 className="font-bold text-gray-900 mb-4">Risk Heat Map</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left">Probability ↓ / Impact →</th>
                {IMPACTS.map((i) => (
                  <th key={i} className="p-2 text-center capitalize">{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...PROBABILITIES].reverse().map((p) => (
                <tr key={p}>
                  <td className="p-2 font-medium capitalize">{p}</td>
                  {IMPACTS.map((i) => {
                    const cellRisks = matrixGrid[`${p}-${i}`] || [];
                    const probVal = { low: 1, medium: 2, high: 3 }[p];
                    const impVal = { low: 1, medium: 2, high: 3, critical: 4 }[i];
                    const score = probVal * impVal;
                    const bg = score >= 9 ? "bg-red-200" : score >= 6 ? "bg-orange-200" : score >= 3 ? "bg-yellow-100" : "bg-green-100";
                    return (
                      <td key={i} className={`p-2 text-center ${bg} border border-white/50 rounded`}>
                        {cellRisks.length > 0 ? (
                          <Badge className="bg-white/80 text-gray-900">{cellRisks.length}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Risk List */}
      <div className="space-y-3">
        {risks.length === 0 ? (
          <Card className="p-12 text-center border-0 shadow-lg">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Risks Identified</h3>
            <p className="text-gray-600 mb-4">Add risks manually or use AI to auto-generate based on your project.</p>
          </Card>
        ) : (
          risks.sort((a, b) => {
            const probMap = { low: 1, medium: 2, high: 3 };
            const impMap = { low: 1, medium: 2, high: 3, critical: 4 };
            return (probMap[b.probability] * impMap[b.impact]) - (probMap[a.probability] * impMap[a.impact]);
          }).map((risk) => (
            <Card key={risk.id} className="p-5 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">{risk.risk_title}</h4>
                  <p className="text-sm text-gray-600">{risk.description}</p>
                </div>
                <Select
                  value={risk.status}
                  onValueChange={(val) => updateRiskMutation.mutate({ id: risk.id, data: { status: val } })}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                <Badge className={`text-xs capitalize ${PROB_COLORS[risk.probability]}`}>P: {risk.probability}</Badge>
                <Badge className={`text-xs capitalize ${IMPACT_COLORS[risk.impact]}`}>I: {risk.impact}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{risk.category}</Badge>
                <Badge className={`text-xs capitalize ${STATUS_COLORS[risk.status]}`}>{risk.status}</Badge>
              </div>
              {risk.mitigation_strategy && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm mb-2">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Mitigation Strategy</p>
                  <p className="text-gray-700">{risk.mitigation_strategy}</p>
                </div>
              )}
              {risk.contingency_plan && (
                <div className="p-3 bg-orange-50 rounded-lg text-sm">
                  <p className="text-xs font-semibold text-orange-700 mb-1">Contingency Plan</p>
                  <p className="text-gray-700">{risk.contingency_plan}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Add Risk Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Risk Title *</Label>
              <Input value={formData.risk_title} onChange={(e) => setFormData({ ...formData, risk_title: e.target.value })} placeholder="e.g., Permit delays" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Probability</Label>
                <Select value={formData.probability} onValueChange={(v) => setFormData({ ...formData, probability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROBABILITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact</Label>
                <Select value={formData.impact} onValueChange={(v) => setFormData({ ...formData, impact: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPACTS.map((i) => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mitigation Strategy</Label>
              <Textarea value={formData.mitigation_strategy} onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Contingency Plan</Label>
              <Textarea value={formData.contingency_plan} onChange={(e) => setFormData({ ...formData, contingency_plan: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={() => createRiskMutation.mutate(formData)}
                disabled={!formData.risk_title || createRiskMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                Add Risk
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}