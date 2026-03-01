import React, { useState, useEffect } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Upload,
  Loader2,
  MessageSquare,
  File,
  X,
  Clock,
  User,
  AlertCircle,
  Reply,
  CornerDownRight,
} from "lucide-react";
import { format } from "date-fns";

export default function ClientCommunicationsHub({ user, projects }) {
  const [selectedProject, setSelectedProject] = useState(
    projects.length > 0 ? projects[0].id : null
  );
  const [messageText, setMessageText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const queryClient = useQueryClient();

  // Fetch project messages
  const { data: messages = [], isLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["project-messages", selectedProject, user?.email],
    queryFn: async () => {
      if (!selectedProject) return [];
      const msgs = await portalApi.entities.ProjectMessage.filter({
        project_id: selectedProject,
      }, "-created_date", 100);
      return msgs;
    },
    enabled: !!selectedProject,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedProject) return;

    const unsubscribe = portalApi.entities.ProjectMessage.subscribe?.((event) => {
      if (event.type === 'create' && event.data.project_id === selectedProject) {
        queryClient.invalidateQueries({ queryKey: ["project-messages"] });
      }
    });

    return unsubscribe;
  }, [selectedProject, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const files = [];
      
      // Upload attached files if any
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const uploaded = await portalApi.integrations.Core.UploadFile({
            file,
          });
          files.push({
            name: file.name,
            url: uploaded.file_url,
            size: file.size,
          });
        }
      }

      // Create project message
      const message = await portalApi.entities.ProjectMessage.create({
        project_id: selectedProject,
        message: messageText,
        sender_email: user.email,
        sender_name: user.full_name,
        sender_role: user.role,
        is_internal: false,
        attachments: files.map((f) => f.url),
        parent_message_id: replyingTo?.id || null,
      });

      return message;
    },
    onSuccess: () => {
      setMessageText("");
      setAttachedFiles([]);
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["project-messages"] });
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachedFiles.length === 0) return;
    
    setSending(true);
    try {
      await sendMessageMutation.mutateAsync();
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const currentProject = projects.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <Card className="p-6 border-0 shadow-lg bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Select Project
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedProject === project.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="font-semibold text-gray-900">{project.project_name}</p>
              <p className="text-xs text-gray-600">#{project.project_number}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Communications Hub */}
      {currentProject && (
        <Card className="p-6 border-0 shadow-lg bg-white">
          <div className="mb-6 pb-6 border-b">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Project Communication
            </h3>
            <p className="text-gray-600 mt-2">
              Chat with your project manager about {currentProject.project_name}
            </p>
          </div>

          {/* Message Thread */}
          <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No messages yet. Start a conversation!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isClient = msg.sender_email === user.email;
                const isReply = !!msg.parent_message_id;
                const parentMsg = isReply ? messages.find(m => m.id === msg.parent_message_id) : null;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isClient ? "justify-end" : "justify-start"} ${isReply ? "ml-8" : ""}`}
                  >
                    <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                      {isReply && parentMsg && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 ml-2">
                          <CornerDownRight className="w-3 h-3" />
                          Replying to {parentMsg.sender_name}
                        </div>
                      )}
                      <div
                        className={`px-4 py-3 rounded-lg ${
                          isClient
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {msg.sender_name}
                        </p>
                        <p className="text-sm mb-2">{msg.message}</p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2 mt-2 pt-2 border-t border-current border-opacity-20">
                            {msg.attachments.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-xs underline ${
                                  isClient ? "text-blue-100" : "text-blue-600"
                                }`}
                              >
                                <File className="w-3 h-3" />
                                Attachment {idx + 1}
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p
                            className={`text-xs ${
                              isClient ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            {format(new Date(msg.created_date), "MMM d, h:mm a")}
                          </p>
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className={`text-xs flex items-center gap-1 ${
                              isClient ? "text-blue-100 hover:text-white" : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            <Reply className="w-3 h-3" />
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Composer */}
          <div className="space-y-4">
            {/* Replying To Indicator */}
            {replyingTo && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Replying to</p>
                      <p className="text-sm font-medium text-gray-900">{replyingTo.sender_name}</p>
                      <p className="text-xs text-gray-600 truncate max-w-md">{replyingTo.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Attached Files ({attachedFiles.length})
                </p>
                <div className="space-y-2">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white p-2 rounded border border-blue-100"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)}KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-red-600 hover:text-red-700 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="flex-1 h-12"
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                />
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-12 p-0"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </label>
              <Button
                onClick={handleSendMessage}
                disabled={
                  (!messageText.trim() && attachedFiles.length === 0) ||
                  sending
                }
                className="bg-blue-600 hover:bg-blue-700 h-12 w-12 p-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              📧 Your project manager will be notified of new messages automatically
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}