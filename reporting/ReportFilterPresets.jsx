import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Filter, Save, Trash2, BookmarkCheck, Tag, Plus, Loader2
} from "lucide-react";
import { toast } from "sonner";

const PROJECT_TYPES = ["SWPPP", "Construction", "Inspections", "Engineering", "Special Inspections", "Multiple Services"];
const PROJECT_STATUSES = ["Planning", "In Progress", "On Hold", "Under Review", "Completed", "Closed"];

export default function ReportFilterPresets({
  filters,
  onFiltersChange,
  projects = [],
  user,
}) {
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Fetch saved presets from DashboardPreference entity
  const { data: savedPresets = [] } = useQuery({
    queryKey: ["report-filter-presets", user?.email],
    queryFn: () =>
      base44.entities.DashboardPreference.filter({
        user_email: user?.email,
      }),
    enabled: !!user,
  });

  const savePresetMutation = useMutation({
    mutationFn: (data) => base44.entities.DashboardPreference.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-filter-presets"] });
      setShowSaveDialog(false);
      setPresetName("");
      toast.success("Filter preset saved");
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id) => base44.entities.DashboardPreference.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-filter-presets"] });
      toast.success("Preset deleted");
    },
  });

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    savePresetMutation.mutate({
      user_email: user?.email,
      preference_type: "report_filter",
      preference_data: {
        name: presetName,
        filters: { ...filters },
        saved_at: new Date().toISOString(),
      },
    });
  };

  const handleLoadPreset = (preset) => {
    const savedFilters = preset.preference_data?.filters;
    if (savedFilters) {
      onFiltersChange(savedFilters);
      toast.success(`Loaded preset: ${preset.preference_data?.name}`);
    }
  };

  const handleProjectTypeToggle = (type) => {
    const current = filters.projectTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, projectTypes: updated });
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const current = filters.tags || [];
    if (!current.includes(newTag.trim())) {
      onFiltersChange({ ...filters, tags: [...current, newTag.trim()] });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag) => {
    const current = filters.tags || [];
    onFiltersChange({ ...filters, tags: current.filter((t) => t !== tag) });
  };

  return (
    <Card className="p-5 border-0 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Saved Presets Dropdown */}
          {savedPresets.length > 0 && (
            <Select onValueChange={(id) => {
              const preset = savedPresets.find(p => p.id === id);
              if (preset) handleLoadPreset(preset);
            }}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <BookmarkCheck className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Load Preset" />
              </SelectTrigger>
              <SelectContent>
                {savedPresets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.preference_data?.name || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            className="text-xs h-8"
          >
            <Save className="w-3 h-3 mr-1" />
            Save Preset
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Type Filter */}
        <div>
          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Project Type</Label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {PROJECT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={(filters.projectTypes || []).includes(type)}
                  onCheckedChange={() => handleProjectTypeToggle(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
          <Select
            value={filters.selectedStatus || "all"}
            onValueChange={(v) => onFiltersChange({ ...filters, selectedStatus: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metric-Specific Date Ranges */}
        <div>
          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Budget Period</Label>
          <div className="space-y-2">
            <Input
              type="date"
              value={filters.budgetStart || ""}
              onChange={(e) => onFiltersChange({ ...filters, budgetStart: e.target.value })}
              className="h-8 text-xs"
              placeholder="Start"
            />
            <Input
              type="date"
              value={filters.budgetEnd || ""}
              onChange={(e) => onFiltersChange({ ...filters, budgetEnd: e.target.value })}
              className="h-8 text-xs"
              placeholder="End"
            />
          </div>
        </div>

        {/* Milestone Date Range */}
        <div>
          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Milestone Period</Label>
          <div className="space-y-2">
            <Input
              type="date"
              value={filters.milestoneStart || ""}
              onChange={(e) => onFiltersChange({ ...filters, milestoneStart: e.target.value })}
              className="h-8 text-xs"
              placeholder="Start"
            />
            <Input
              type="date"
              value={filters.milestoneEnd || ""}
              onChange={(e) => onFiltersChange({ ...filters, milestoneEnd: e.target.value })}
              className="h-8 text-xs"
              placeholder="End"
            />
          </div>
        </div>
      </div>

      {/* Client Tags */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-gray-600" />
          <Label className="text-xs font-semibold text-gray-700">Custom Tags</Label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTagInput(!showTagInput)}
            className="h-6 w-6 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(filters.tags || []).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs flex items-center gap-1 pr-1">
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          ))}
          {showTagInput && (
            <div className="flex items-center gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag..."
                className="h-6 w-28 text-xs"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleAddTag} className="h-6 w-6 p-0">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {((filters.projectTypes || []).length > 0 || (filters.tags || []).length > 0 || filters.budgetStart || filters.milestoneStart) && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-semibold">Active:</span>
            {(filters.projectTypes || []).length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                {filters.projectTypes.length} type(s)
              </Badge>
            )}
            {(filters.tags || []).length > 0 && (
              <Badge className="bg-green-100 text-green-700 text-[10px]">
                {filters.tags.length} tag(s)
              </Badge>
            )}
            {filters.budgetStart && (
              <Badge className="bg-purple-100 text-purple-700 text-[10px]">Budget range</Badge>
            )}
            {filters.milestoneStart && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px]">Milestone range</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onFiltersChange({
              projectTypes: [],
              tags: [],
              selectedStatus: "all",
              budgetStart: "",
              budgetEnd: "",
              milestoneStart: "",
              milestoneEnd: "",
            })}
            className="text-xs h-7 text-red-600"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Saved Presets List */}
      {savedPresets.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-semibold text-gray-700 mb-2">Saved Presets</p>
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadPreset(p)}
                  className="text-xs h-7"
                >
                  <BookmarkCheck className="w-3 h-3 mr-1" />
                  {p.preference_data?.name}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePresetMutation.mutate(p.id)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name (e.g., Active SWPPP Projects)"
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSavePreset}
                disabled={!presetName.trim() || savePresetMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savePresetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}