import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, Copy, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function AIReportSummary({ metrics, filteredData, allMilestones, allExpenses, allMessages }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customReport, setCustomReport] = useState("");
  const [customLoading, setCustomLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const prompt = `You are an executive report writer for an engineering and construction project management firm.

Generate a professional executive summary based on this project data:

METRICS:
- Total Projects: ${metrics.totalProjects}
- Active Projects: ${metrics.activeProjects}
- Completed Projects: ${metrics.completedProjects}
- Average Progress: ${metrics.avgProgress.toFixed(1)}%
- Total Budget: $${metrics.totalBudget.toLocaleString()}
- Total Spent: $${metrics.totalSpent.toLocaleString()}
- Budget Utilization: ${metrics.budgetUtilization.toFixed(1)}%
- Milestone Completion: ${metrics.completedMilestones}/${metrics.totalMilestones} (${metrics.milestoneCompletion.toFixed(1)}%)

PROJECTS:
${filteredData.slice(0, 10).map(p => `- ${p.project_name} (${p.status}, ${p.progress_percentage || 0}% complete, ${p.project_type})`).join("\n")}

Write a concise 3-4 paragraph executive summary suitable for client presentation. Include:
1. Overall portfolio health assessment
2. Key achievements and progress highlights
3. Budget analysis and financial outlook
4. Recommendations and areas requiring attention

Use professional tone. Format with markdown headers and bullet points where appropriate.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setSummary(result);
    } catch (err) {
      console.error("AI summary error:", err);
      toast.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const generateCustomReport = async () => {
    if (!customPrompt.trim()) {
      toast.error("Please describe what report you need");
      return;
    }

    setCustomLoading(true);
    try {
      const prompt = `You are an executive report writer for an engineering/construction firm.

CLIENT REQUEST: "${customPrompt}"

AVAILABLE DATA:
- ${metrics.totalProjects} projects (${metrics.activeProjects} active, ${metrics.completedProjects} completed)
- Average progress: ${metrics.avgProgress.toFixed(1)}%
- Budget: $${metrics.totalBudget.toLocaleString()} total, $${metrics.totalSpent.toLocaleString()} spent
- ${metrics.totalMilestones} milestones (${metrics.completedMilestones} completed)
- ${allMessages.length} communications logged

PROJECT LIST:
${filteredData.slice(0, 10).map(p => `- ${p.project_name}: ${p.status}, ${p.progress_percentage || 0}%, Type: ${p.project_type}, Budget: $${(p.budget || 0).toLocaleString()}`).join("\n")}

Generate a detailed, professional report addressing the client's specific request. Use markdown formatting with headers, bullet points, and tables where appropriate. Be specific with numbers and data.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setCustomReport(result);
    } catch (err) {
      console.error("Custom report error:", err);
      toast.error("Failed to generate custom report");
    } finally {
      setCustomLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Generator */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 border-l-4 border-indigo-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">AI Executive Summary</h3>
              <p className="text-sm text-gray-600">Auto-generate a professional summary from your report data</p>
            </div>
          </div>
          <Button onClick={generateSummary} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {summary ? "Regenerate" : "Generate Summary"}
          </Button>
        </div>

        {summary && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-indigo-100 text-indigo-700">AI Generated</Badge>
              <Button size="sm" variant="outline" onClick={() => handleCopy(summary)}>
                {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Card className="p-6 bg-white border border-indigo-200">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Custom Report Request */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Custom AI Report</h3>
              <p className="text-sm text-gray-600">Ask AI to generate a specific report based on your data</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowCustom(!showCustom)}>
            {showCustom ? "Hide" : "Request Report"}
          </Button>
        </div>

        {showCustom && (
          <div className="space-y-4 mt-4">
            <Textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Describe the report you need, e.g.: 'Give me a budget variance analysis for all active projects with recommendations for cost savings' or 'Create a timeline risk assessment for projects behind schedule'"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              {[
                "Budget variance analysis",
                "Timeline risk assessment",
                "Resource utilization summary",
                "Milestone achievement report",
                "Project health scorecard"
              ].map(suggestion => (
                <Button
                  key={suggestion}
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomPrompt(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
            <Button onClick={generateCustomReport} disabled={customLoading || !customPrompt.trim()} className="bg-cyan-600 hover:bg-cyan-700">
              {customLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Generate Report
            </Button>

            {customReport && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-cyan-100 text-cyan-700">Custom AI Report</Badge>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(customReport)}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </div>
                <Card className="p-6 bg-white border border-cyan-200">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{customReport}</ReactMarkdown>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}