import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, TrendingUp } from "lucide-react";

export default function RiskMatrix({ risks = [] }) {
  const probabilityMap = { low: 1, medium: 2, high: 3 };
  const impactMap = { low: 1, medium: 2, high: 3, critical: 4 };

  const getRiskScore = (risk) => {
    return probabilityMap[risk.probability] * impactMap[risk.impact];
  };

  const getRiskColor = (score) => {
    if (score >= 9) return 'bg-red-500 text-white';
    if (score >= 6) return 'bg-orange-500 text-white';
    if (score >= 3) return 'bg-yellow-500 text-gray-900';
    return 'bg-green-500 text-white';
  };

  const sortedRisks = [...risks].sort((a, b) => getRiskScore(b) - getRiskScore(a));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          Risk Assessment Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRisks.map(risk => {
            const score = getRiskScore(risk);
            return (
              <div key={risk.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{risk.risk_title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{risk.category}</Badge>
                      <Badge className="bg-blue-100 text-blue-700">{risk.status}</Badge>
                    </div>
                  </div>
                  <div className={`px-3 py-2 rounded font-bold ${getRiskColor(score)}`}>
                    {score}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">Probability</p>
                    <p className="font-medium capitalize">{risk.probability}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">Impact</p>
                    <p className="font-medium capitalize">{risk.impact}</p>
                  </div>
                  {risk.mitigation_strategy && (
                    <div className="md:col-span-2 p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600 mb-1">Mitigation Strategy</p>
                      <p className="text-sm">{risk.mitigation_strategy}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}