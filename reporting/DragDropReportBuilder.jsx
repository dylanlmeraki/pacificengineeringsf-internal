import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, Settings, Eye, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const BLOCK_TYPES = [
  { id: "title", name: "Title Section", icon: "H" },
  { id: "summary", name: "Summary Stats", icon: "📊" },
  { id: "chart", name: "Chart", icon: "📈" },
  { id: "table", name: "Data Table", icon: "📋" },
  { id: "metric", name: "Key Metric", icon: "🎯" },
  { id: "timeline", name: "Timeline", icon: "📅" },
  { id: "text", name: "Text Block", icon: "📝" },
];

export default function DragDropReportBuilder({ templateId, onSave }) {
  const queryClient = useQueryClient();
  const [templateName, setTemplateName] = useState("Untitled Report");
  const [blocks, setBlocks] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        template_name: templateName,
        layout_config: blocks,
      };

      if (templateId) {
        return base44.entities.ReportTemplate.update(templateId, payload);
      } else {
        return base44.entities.ReportTemplate.create({
          ...payload,
          report_category: "custom",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Template saved successfully");
      onSave?.();
    },
    onError: () => toast.error("Failed to save template"),
  });

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Adding from sidebar
    if (source.droppableId === "sidebar" && destination.droppableId === "canvas") {
      const blockType = BLOCK_TYPES.find(b => b.id === draggableId);
      const newBlock = {
        id: `${blockType.id}-${Date.now()}`,
        type: blockType.id,
        position: destination.index,
        config: {},
      };
      const newBlocks = Array.from(blocks);
      newBlocks.splice(destination.index, 0, newBlock);
      setBlocks(newBlocks);
    }
    // Reordering on canvas
    else if (source.droppableId === "canvas" && destination.droppableId === "canvas") {
      const newBlocks = Array.from(blocks);
      const [removed] = newBlocks.splice(source.index, 1);
      newBlocks.splice(destination.index, 0, removed);
      setBlocks(newBlocks);
    }
  };

  const removeBlock = (blockId) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
    setSelectedBlock(null);
  };

  const updateBlockConfig = (blockId, config) => {
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, config } : b
    ));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-screen bg-gray-50 p-6">
      {/* Sidebar - Block Types */}
      <div className="lg:col-span-1">
        <Card className="p-4 border-0 shadow-lg sticky top-6">
          <h3 className="font-bold text-gray-900 mb-4">Report Blocks</h3>
          <Droppable droppableId="sidebar" isDropDisabled={true}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {BLOCK_TYPES.map((blockType, index) => (
                  <Draggable key={blockType.id} draggableId={blockType.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-all ${
                          snapshot.isDragging ? "shadow-lg" : ""
                        }`}
                      >
                        <div className="text-2xl mb-1">{blockType.icon}</div>
                        <p className="text-xs font-medium text-gray-700">{blockType.name}</p>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </Card>
      </div>

      {/* Canvas - Drag Drop Area */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          <Card className="p-6 border-0 shadow-lg bg-white">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Template Name
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Weekly Status Report"
              />
            </div>

            <Droppable droppableId="canvas">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-96 p-6 border-2 border-dashed rounded-lg transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  {blocks.length === 0 ? (
                    <div className="flex items-center justify-center h-96 text-center">
                      <div>
                        <Plus className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          Drag blocks here to build your report
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedBlock(block.id)}
                              className={`p-4 bg-white border rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                                selectedBlock === block.id
                                  ? "border-blue-500 shadow-md"
                                  : "border-gray-200 hover:shadow"
                              } ${snapshot.isDragging ? "shadow-lg" : ""}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">
                                    {BLOCK_TYPES.find(b => b.type === block.type)?.icon}
                                  </span>
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">
                                      {BLOCK_TYPES.find(b => b.id === block.type)?.name}
                                    </p>
                                    <p className="text-xs text-gray-500">ID: {block.id}</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeBlock(block.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || blocks.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Config Panel */}
      <div className="lg:col-span-1">
        <Card className="p-4 border-0 shadow-lg sticky top-6">
          <h3 className="font-bold text-gray-900 mb-4">Configuration</h3>
          {selectedBlock ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Block Type
                </label>
                <p className="text-sm text-gray-600">
                  {BLOCK_TYPES.find(b => b.id === blocks.find(bl => bl.id === selectedBlock)?.type)?.name}
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <Input
                  placeholder="Block title"
                  value={blocks.find(b => b.id === selectedBlock)?.config?.title || ""}
                  onChange={(e) =>
                    updateBlockConfig(selectedBlock, {
                      ...blocks.find(b => b.id === selectedBlock)?.config,
                      title: e.target.value,
                    })
                  }
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Data Source
                </label>
                <Input
                  placeholder="e.g., tasks, milestones, invoices"
                  value={blocks.find(b => b.id === selectedBlock)?.config?.dataSource || ""}
                  onChange={(e) =>
                    updateBlockConfig(selectedBlock, {
                      ...blocks.find(b => b.id === selectedBlock)?.config,
                      dataSource: e.target.value,
                    })
                  }
                  className="text-sm"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Select a block to configure
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}