import React, { useState, useEffect, useRef } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { 
  Send, Search, Paperclip, Hash, AtSign, Filter, MoreVertical,
  MessageSquare, Reply, Pin, Check, CheckCheck, Loader2, X, Tag
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function EnhancedCommunicationHub({ user, projects = [] }) {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [taggedProjects, setTaggedProjects] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      return await portalApi.entities.ConversationMessage.filter(
        { project_id: selectedProject.id },
        '-created_date',
        100
      );
    },
    enabled: !!selectedProject
  });

  // Fetch team members for tagging
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const assignments = await portalApi.entities.TeamAssignment.filter({ 
        project_id: selectedProject.id 
      });
      return assignments;
    },
    enabled: !!selectedProject
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const message = await portalApi.entities.ConversationMessage.create(messageData);
      
      // Send notifications to tagged users
      if (taggedUsers.length > 0) {
        await Promise.all(taggedUsers.map(email => 
          portalApi.entities.Notification.create({
            recipient_email: email,
            type: "new_message",
            title: "You were mentioned in a message",
            message: `${user.full_name} mentioned you in ${selectedProject.project_name}`,
            link: `/portal?tab=communications&project=${selectedProject.id}`,
            priority: "medium",
          })
        ));
      }

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageText("");
      setReplyingTo(null);
      setAttachments([]);
      setTaggedUsers([]);
      setTaggedProjects([]);
      toast.success("Message sent");
    },
    onError: () => {
      toast.error("Failed to send message");
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = conversations.find(m => m.id === messageId);
      if (!message) return;
      
      const readBy = message.read_by || [];
      if (!readBy.some(r => r.email === user.email)) {
        readBy.push({ email: user.email, read_at: new Date().toISOString() });
        await portalApi.entities.ConversationMessage.update(messageId, { read_by: readBy });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const uploadPromises = files.map(async (file) => {
      const { file_url } = await portalApi.integrations.Core.UploadFile({ file });
      return {
        file_name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        uploaded_at: new Date().toISOString(),
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    setAttachments([...attachments, ...uploadedFiles]);
    toast.success(`${files.length} file(s) uploaded`);
  };

  // Handle message send
  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return;
    if (!selectedProject) return;

    const messageData = {
      conversation_id: selectedProject.id,
      project_id: selectedProject.id,
      sender_email: user.email,
      sender_name: user.full_name,
      sender_role: user.role === 'admin' ? 'admin' : 'client',
      message: messageText,
      attachments,
      parent_message_id: replyingTo?.id,
      mentions: taggedUsers,
      thread_depth: replyingTo ? (replyingTo.thread_depth || 0) + 1 : 0,
    };

    sendMessageMutation.mutate(messageData);
  };

  // Handle @mention detection
  const handleMessageChange = (e) => {
    const text = e.target.value;
    setMessageText(text);

    // Detect @mentions
    const atMatch = text.match(/@(\w+)$/);
    if (atMatch) {
      setShowTagMenu(true);
    } else {
      setShowTagMenu(false);
    }
  };

  // Add tagged user
  const addTaggedUser = (email, name) => {
    if (!taggedUsers.includes(email)) {
      setTaggedUsers([...taggedUsers, email]);
      setMessageText(messageText.replace(/@\w*$/, `@${name} `));
    }
    setShowTagMenu(false);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      return conv.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
             conv.sender_name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Group conversations by thread
  const threadedConversations = filteredConversations.reduce((acc, conv) => {
    if (!conv.parent_message_id) {
      acc.push({ ...conv, replies: [] });
    } else {
      const parent = acc.find(c => c.id === conv.parent_message_id);
      if (parent) {
        parent.replies.push(conv);
      }
    }
    return acc;
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  // Mark messages as read
  useEffect(() => {
    conversations.forEach(conv => {
      const isRead = conv.read_by?.some(r => r.email === user.email);
      if (!isRead && conv.sender_email !== user.email) {
        markAsReadMutation.mutate(conv.id);
      }
    });
  }, [conversations, user.email]);

  const MessageItem = ({ message, isReply = false }) => {
    const isOwnMessage = message.sender_email === user.email;
    const isRead = message.read_by?.length > 0;
    const hasBeenRead = message.read_by?.some(r => r.email !== user.email && r.email !== message.sender_email);

    if (!message?.sender_name) return null;

    return (
      <div className={`flex gap-3 ${isReply ? 'ml-12 mt-2' : 'mt-4'}`}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <div className={`w-full h-full flex items-center justify-center text-white text-sm font-semibold ${
            isOwnMessage ? 'bg-blue-600' : 'bg-gray-600'
          }`}>
            {message.sender_name.charAt(0)}
          </div>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{message.sender_name}</span>
            <Badge variant="outline" className="text-xs">
              {message.sender_role}
            </Badge>
            <span className="text-xs text-gray-500">
              {format(new Date(message.created_date), 'MMM d, h:mm a')}
            </span>
            {message.urgency === 'urgent' && (
              <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>
            )}
          </div>

          <Card className={`p-3 ${isOwnMessage ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.message}</p>

            {message.attachments?.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Paperclip className="w-3 h-3" />
                    {file.file_name}
                  </a>
                ))}
              </div>
            )}

            {message.mentions?.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {message.mentions.map((email, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <AtSign className="w-3 h-3 mr-1" />
                    {email}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          <div className="flex items-center gap-3 mt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-gray-600"
              onClick={() => setReplyingTo(message)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
            {isOwnMessage && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                {hasBeenRead ? (
                  <>
                    <CheckCheck className="w-3 h-3 text-blue-600" />
                    Read
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    Sent
                  </>
                )}
              </div>
            )}
          </div>

          {message.replies?.map(reply => (
            <MessageItem key={reply.id} message={reply} isReply />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid md:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
      {/* Project List */}
      <Card className="md:col-span-1 p-4 border-0 shadow-lg overflow-y-auto">
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Projects
          </h3>
        </div>
        
        <div className="space-y-2">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                selectedProject?.id === project.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}
            >
              <p className="font-medium text-sm truncate">{project.project_name}</p>
              <Badge 
                variant="outline" 
                className={`text-xs mt-1 ${
                  selectedProject?.id === project.id ? 'border-white text-white' : ''
                }`}
              >
                {project.status}
              </Badge>
            </button>
          ))}
        </div>
      </Card>

      {/* Messages Area */}
      <Card className="md:col-span-3 flex flex-col border-0 shadow-lg">
        {selectedProject ? (
          <>
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedProject.project_name}</h3>
                  <p className="text-sm text-gray-600">
                    {conversations.length} messages
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {conversationsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : threadedConversations.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No messages yet</p>
                    <p className="text-sm text-gray-500">Start the conversation below</p>
                  </div>
                </div>
              ) : (
                <div>
                  {threadedConversations.map(message => (
                    <MessageItem key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t bg-gray-50">
              {replyingTo && (
                <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Reply className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">Replying to {replyingTo.sender_name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                  {attachments.map((file, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Paperclip className="w-3 h-3 mr-1" />
                      {file.file_name}
                      <button
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {taggedUsers.length > 0 && (
                <div className="mb-2 flex gap-1 flex-wrap">
                  {taggedUsers.map((email, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-700 text-xs">
                      <AtSign className="w-3 h-3 mr-1" />
                      {email}
                      <button
                        onClick={() => setTaggedUsers(taggedUsers.filter(e => e !== email))}
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <div className="relative flex-1">
                  <Input
                    placeholder="Type a message... Use @ to mention someone"
                    value={messageText}
                    onChange={handleMessageChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="pr-12"
                  />

                  {showTagMenu && (
                    <Card className="absolute bottom-full mb-2 w-64 p-2 shadow-lg z-10">
                      <p className="text-xs text-gray-600 mb-2">Mention someone:</p>
                      <div className="space-y-1">
                        {teamMembers.map(member => (
                          <button
                            key={member.user_email}
                            onClick={() => addTaggedUser(member.user_email, member.user_name)}
                            className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm"
                          >
                            {member.user_name}
                          </button>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() && attachments.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Select a project to view messages</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}