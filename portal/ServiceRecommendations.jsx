import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ArrowRight, Lightbulb, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ServiceRecommendations({ user, projects = [] }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const projectSummary = projects.slice(0, 10).map((p) =>
        `${p.project_name} (${p.project_type}, ${p.status}, ${p.progress_percentage || 0}%)`
      ).join("; ");

      const result = await portalApi.integrations.Core.InvokeLLM({
        prompt: `You are a business development advisor for Pacific Engineering, an engineering and construction services firm in San Francisco. Based on the client's current projects, recommend additional services they may benefit from.

Client: ${user?.full_name || "Client"}
Current Projects (${projects.length} total): ${projectSummary || "No active projects"}

Services we offer: SWPPP Plans, Construction Management, Building Inspections, Special Inspections, Structural Engineering, Environmental Compliance, Quality Assurance/QC, Geotechnical Services, Civil Engineering, Permit Consulting.

Provide 3-4 personalized service recommendations. For each:
1. Service name
2. Why it's relevant to their current projects (1-2 sentences)
3. Estimated value add (brief)
4. Priority level (high/medium/low)

Return JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  service: { type: "string" },
                  reason: { type: "string" },
                  value_add: { type: "string" },
                  priority: { type: "string" },
                },
              },
            },
          },
        },
      });

      setRecommendations(result.recommendations || []);
      setHasGenerated(true);
    } catch (err) {
      console.error("Recommendations error:", err);
      toast.error("Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  if (!hasGenerated) {
    return (
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Personalized Service Recommendations</h3>
              <p className="text-sm text-gray-600">AI-driven suggestions based on your project portfolio</p>
            </div>
          </div>
          <Button onClick={generateRecommendations} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Get Recommendations
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Recommended Services for You
        </h3>
        <Button size="sm" variant="outline" onClick={generateRecommendations} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {recommendations.map((rec, idx) => (
          <Card key={idx} className="p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{rec.service}</h4>
              <Badge className={priorityColors[rec.priority] || priorityColors.medium}>
                {rec.priority}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
              <CheckCircle2 className="w-3 h-3" />
              {rec.value_add}
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}