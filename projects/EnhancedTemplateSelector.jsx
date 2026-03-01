import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TemplatePreviewPanel from "./TemplatePreviewPanel";
import CreateTemplateFromProject from "./CreateTemplateFromProject";
import TemplateProjectPopulator from "./TemplateProjectPopulator";
import {
  Building,
  Wrench,
  FileText,
  CheckCircle2,
  Target,
  Loader2,
  Lightbulb,
  FolderPlus,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";

const TEMPLATE_ICONS = {
  "SWPPP": FileText,
  "Construction": Building,
  "Inspections": CheckCircle2,
  "Engineering": Wrench,
  "Special Inspections": Target,
  "Multiple Services": Building,
};

const INDUSTRY_KEYWORDS = {
  "SWPPP": ["swppp", "stormwater", "water", "environmental", "pollution"],
  "Construction": ["construction", "build", "contractor", "residential", "commercial"],
  "Engineering": ["engineering", "structural", "civil", "design", "consulting"],
  "Inspections": ["inspection", "test", "testing", "compliance", "audit"],
  "Special Inspections": ["special", "inspection", "structural", "seismic"],
  "Multiple Services": ["multiple", "services", "full-service", "integrated"],
};

export default function EnhancedTemplateSelector({ selectedIndustry, onSelect, onSkip, projects = [], user }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPopulateDialog, setShowPopulateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["project-templates"],
    queryFn: () => base44.entities.ProjectTemplate.filter({ is_active: true }),
    initialData: [],
  });

  // Calculate relevance score based on industry selection
  const suggestedTemplates = useMemo(() => {
    if (!selectedIndustry) return [];

    const scored = templates
      .filter((t) => !t.project_type || t.project_type === selectedIndustry)
      .map((template) => {
        const keywords = INDUSTRY_KEYWORDS[template.project_type] || [];
        const industryLower = selectedIndustry.toLowerCase();
        
        // Exact match = highest score
        if (template.project_type === selectedIndustry) {
          return { template, score: 100 };
        }

        // Keyword match = medium score
        const keywordMatch = keywords.some((k) => industryLower.includes(k));
        return { template, score: keywordMatch ? 50 : 10 };
      })
      .sort((a, b) => b.score - a.score);

    return scored;
  }, [templates, selectedIndustry]);

  const handleSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    } else {
      toast.error("Please select a template");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="flex items-center justify-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <p className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
            {suggestedTemplates.length > 0
              ? `We found ${suggestedTemplates.length} template(s) matching "${selectedIndustry}"`
              : "Select an industry above to see matching templates"}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Template List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 sticky top-0 bg-white py-2">
            Available Templates
          </h3>
          
          {suggestedTemplates.length === 0 ? (
            <Card className="p-6 text-center border-0 shadow-sm">
              <p className="text-gray-600">
                No templates match your industry selection. Please choose another.
              </p>
            </Card>
          ) : (
            suggestedTemplates.map(({ template, score }) => {
              const Icon = TEMPLATE_ICONS[template.project_type] || Building;
              const isSelected = selectedTemplate?.id === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                        <p className="font-semibold text-gray-900 text-sm">
                          {template.template_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600">
                        {template.default_milestones?.length || 0} milestones •{" "}
                        {template.default_tasks?.length || 0} tasks
                      </p>
                    </div>
                    
                    {score === 100 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">Best Match</Badge>
                    )}
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Preview Panel */}
        <div className="sticky top-0 h-fit">
          <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
          <TemplatePreviewPanel
            template={selectedTemplate}
            onSelect={handleSelect}
            isSelected={selectedTemplate !== null}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip for Now
          </Button>
          {projects.length > 0 && user && (
            <Button variant="outline" onClick={() => setShowCreateDialog(true)} className="border-green-300 text-green-700 hover:bg-green-50">
              <FolderPlus className="w-4 h-4 mr-2" />
              Create from Project
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {selectedTemplate && (
            <Button
              onClick={() => setShowPopulateDialog(true)}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Create Project from Template
            </Button>
          )}
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Apply Template
          </Button>
        </div>
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateFromProject
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projects={projects}
        user={user}
      />

      {/* Populate Project Dialog */}
      {selectedTemplate && (
        <TemplateProjectPopulator
          open={showPopulateDialog}
          onOpenChange={setShowPopulateDialog}
          template={selectedTemplate}
          user={user}
          onProjectCreated={() => queryClient.invalidateQueries({ queryKey: ['client-projects'] })}
        />
      )}
    </div>
  );
}