import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  FileText, 
  MessageSquare, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";

export default function ActivityTimeline({ activities = [] }) {
  const getActivityIcon = (type) => {
    const icons = {
      milestone: CheckCircle,
      document: FileText,
      message: MessageSquare,
      proposal: FileText,
      invoice: DollarSign,
      project_update: TrendingUp,
      approval: CheckCircle
    };
    return icons[type] || Clock;
  };

  const getActivityColor = (type) => {
    const colors = {
      milestone: { bg: "bg-green-100", icon: "text-green-600", border: "border-green-200" },
      document: { bg: "bg-blue-100", icon: "text-blue-600", border: "border-blue-200" },
      message: { bg: "bg-purple-100", icon: "text-purple-600", border: "border-purple-200" },
      proposal: { bg: "bg-orange-100", icon: "text-orange-600", border: "border-orange-200" },
      invoice: { bg: "bg-yellow-100", icon: "text-yellow-600", border: "border-yellow-200" },
      project_update: { bg: "bg-cyan-100", icon: "text-cyan-600", border: "border-cyan-200" },
      approval: { bg: "bg-emerald-100", icon: "text-emerald-600", border: "border-emerald-200" }
    };
    return colors[type] || { bg: "bg-gray-100", icon: "text-gray-600", border: "border-gray-200" };
  };

  if (activities.length === 0) {
    return (
      <Card className="p-12 text-center border-0 shadow-lg">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No recent activity</p>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Recent Activity
      </h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-transparent" />

        <div className="space-y-6">
          {activities.map((activity, idx) => {
            const Icon = getActivityIcon(activity.type);
            const colors = getActivityColor(activity.type);

            return (
              <div key={idx} className="relative flex gap-4">
                {/* Timeline Node */}
                <div className={`w-12 h-12 rounded-full ${colors.bg} border-4 border-white shadow-md flex items-center justify-center flex-shrink-0 z-10`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>

                {/* Activity Content */}
                <div className="flex-1 pt-1">
                  <div className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg} bg-opacity-30 hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{activity.title}</h4>
                        <p className="text-sm text-gray-700">{activity.description}</p>
                      </div>
                      {activity.badge && (
                        <Badge className={colors.bg}>
                          {activity.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {activity.user && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{activity.user}</span>
                        </div>
                      )}
                      {activity.project && (
                        <span className="text-gray-600 font-medium">{activity.project}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}