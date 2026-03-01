import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Calendar, 
  Users, 
  AlertCircle,
  Briefcase,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { safeParseISO } from "@/components/utils/dataHelpers";
import { PROJECT_TYPE_ICONS, STATUS_COLORS, PRIORITY_COLORS } from "@/components/utils/constants";

export default function ProjectDetailsCard({ project }) {
  if (!project) {
    return (
      <Card className="p-6 border-0 shadow-lg">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No project details available</p>
        </div>
      </Card>
    );
  }

  const ProjectTypeIcon = PROJECT_TYPE_ICONS[project.project_type] || Briefcase;
  const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.default;
  const priorityColor = PRIORITY_COLORS[project.priority] || PRIORITY_COLORS.medium;

  const startDate = safeParseISO(project.start_date);
  const estimatedCompletion = safeParseISO(project.estimated_completion);

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ProjectTypeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">{project.project_name}</h2>
              <p className="text-sm text-blue-100">
                {project.project_number || 'No project number'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Badge className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
            {project.status}
          </Badge>
          {project.priority && (
            <Badge className={`${priorityColor.text} ${priorityColor.bg}`}>
              {project.priority} Priority
            </Badge>
          )}
          {project.project_type && (
            <Badge variant="outline" className="bg-white/20 text-white border-white/40">
              {project.project_type}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Location */}
        {project.location && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-gray-700">Location</div>
              <div className="text-gray-900">{project.location}</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="grid md:grid-cols-2 gap-4">
          {startDate && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-gray-700">Start Date</div>
                <div className="text-gray-900">{format(startDate, 'MMM d, yyyy')}</div>
              </div>
            </div>
          )}
          
          {estimatedCompletion && (
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-gray-700">Target Completion</div>
                <div className="text-gray-900">{format(estimatedCompletion, 'MMM d, yyyy')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Description</div>
            <p className="text-gray-700 text-sm leading-relaxed">{project.description}</p>
          </div>
        )}

        {/* Assigned Team Members */}
        {project.assigned_team_members && project.assigned_team_members.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-purple-600" />
              <div className="text-sm font-semibold text-gray-700">
                Assigned Team ({project.assigned_team_members.length})
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.assigned_team_members.map((email, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {email.split('@')[0]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {typeof project.progress_percentage === 'number' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-sm font-bold text-blue-600">{project.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${project.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Budget */}
        {project.budget && (
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <span className="text-sm font-semibold text-gray-700">Budget</span>
            <span className="text-lg font-bold text-green-600">
              ${project.budget.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}