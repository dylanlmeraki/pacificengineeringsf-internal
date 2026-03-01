import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Loader2,
  MessageCircle,
  Plus,
  Circle as StatusCircle,
  Users
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ThreadedMessageView from "../communications/ThreadedMessageView";
import FileUploadManager from "../communications/FileUploadManager";
import ReadReceiptModal from "../communications/ReadReceiptModal";

export default function EnhancedCommunicationsHub({ projectId, user }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [urgency, setUrgency] = useState("normal");
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch conversations for this project
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', projectId],
    queryFn: async () => {
      return await base44.entities.Conversation.filter({ project_id: projectId }, '-last_message_at');
    },
    enabled: !!projectId
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['conversation-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      return await base44.entities.ConversationMessage.filter(
        { conversation_id: selectedConversation.id },
        'created_date'
      );
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000
  });

  // User presence tracking
  const { data: presenceData = [] } = useQuery({
    queryKey: ['user-presence', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.participants) return [];
      const allPresence = await base44.entities.UserPresence.filter({});
      return allPresence.filter(p => selectedConversation.participants.includes(p.user_email));
    },
    enabled: !!selectedConversation,
    refetchInterval: 10000
  });

  // Update own presence
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const updatePresence = async () => {
      const existing = await base44.entities.UserPresence.filter({ user_email: user.email });
      if (existing.length > 0) {
        await base44.entities.UserPresence.update(existing[0].id, {
          status: 'online',
          last_seen: new Date().toISOString(),
          conversation_id: selectedConversation.id
        });
      } else {
        await base44.entities.UserPresence.create({
          user_email: user.email,
          status: 'online',
          last_seen: new Date().toISOString(),
          conversation_id: selectedConversation.id
        });
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);
    return () => clearInterval(interval);
  }, [selectedConversation, user]);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title) => {
      const project = await base44.entities.Project.filter({ id: projectId });
      if (!project.length) throw new Error('Project not found');

      return await base44.entities.Conversation.create({
        project_id: projectId,
        title: title,
        client_email: project[0].client_email,
        assigned_pm_email: project[0].assigned_team_members?.[0] || user.email,
        participants: [project[0].client_email, project[0].assigned_team_members?.[0] || user.email],
        status: 'active',
        last_message_at: new Date().toISOString(),
        unread_count: {}
      });
    },
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(newConv);
      setShowNewConversation(false);
      setNewConvTitle("");
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachments, urgency, replyTo }) => {
      const messageData = {
        conversation_id: selectedConversation.id,
        project_id: projectId,
        sender_email: user.email,
        sender_name: user.full_name,
        sender_role: user.role === 'admin' ? 'admin' : 'client',
        message: message,
        attachments: attachments,
        annotations: [],
        read_by: [{ email: user.email, read_at: new Date().toISOString() }],
        is_internal: false,
        urgency: urgency,
        parent_message_id: replyTo?.id || null,
        thread_depth: replyTo ? (replyTo.thread_depth || 0) + 1 : 0
      };

      const newMessage = await base44.entities.ConversationMessage.create(messageData);

      // Update conversation last_message_at
      await base44.entities.Conversation.update(selectedConversation.id, {
        last_message_at: new Date().toISOString()
      });

      // Trigger notification
      await base44.functions.invoke('sendConversationNotification', {
        messageId: newMessage.id,
        conversationId: selectedConversation.id
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage("");
      setAttachments([]);
      setReplyTo(null);
      setUrgency("normal");
    }
  });

  // Mark message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const readBy = message.read_by || [];
      const alreadyRead = readBy.some(r => r.email === user.email);
      
      if (!alreadyRead) {
        await base44.entities.ConversationMessage.update(messageId, {
          read_by: [...readBy, { email: user.email, read_at: new Date().toISOString() }]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
    }
  });

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { data } = await base44.integrations.Core.UploadFile({ file });
          return {
            file_name: file.name,
            file_url: data.file_url,
            file_size: file.size,
            file_type: file.type,
            uploaded_at: new Date().toISOString()
          };
        })
      );

      setAttachments([...attachments, ...uploadedFiles]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations]);

  const handleSend = () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({ message: newMessage, attachments, urgency, replyTo });
  };

  const handleShowReadReceipts = (message) => {
    setSelectedMessage(message);
    setShowReadReceipts(true);
  };

  const getUserStatus = (email) => {
    const presence = presenceData.find(p => p.user_email === email);
    if (!presence) return 'offline';
    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / 1000 / 60;
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'away';
    return 'offline';
  };

  const topLevelMessages = messages.filter(m => !m.parent_message_id);

  // Mark unread messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && selectedConversation) {
      messages.forEach(msg => {
        const readBy = msg.read_by || [];
        const isRead = readBy.some(r => r.email === user.email);
        if (!isRead && msg.sender_email !== user.email) {
          markAsReadMutation.mutate(msg.id);
        }
      });
    }
  }, [messages, selectedConversation]);

  // Get unread count for conversation
  const getUnreadCount = (convId) => {
    if (!convId || convId !== selectedConversation?.id) return 0;
    return messages.filter(msg => {
      const readBy = msg.read_by || [];
      return msg.sender_email !== user.email && !readBy.some(r => r.email === user.email);
    }).length;
  };

  return (
    <div className="grid lg:grid-cols-4 gap-4 h-[700px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 border-0 shadow-lg flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900">Conversations</h3>
            <Button
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="bg-blue-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => {
                const unreadCount = getUnreadCount(conv.id);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-blue-100 border-blue-300 border-2'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 line-clamp-1 flex-1">
                        {conv.title}
                      </h4>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center rounded-full p-0">
                            {unreadCount}
                          </Badge>
                        )}
                        {conv.status === 'active' && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {conv.last_message_at && format(new Date(conv.last_message_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Messages Area */}
      <Card className="lg:col-span-3 border-0 shadow-lg flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedConversation.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedConversation.participants?.length || 0} participants
                  </p>
                  {presenceData.length > 0 && (
                    <div className="flex items-center gap-1">
                      {presenceData.filter(p => getUserStatus(p.user_email) === 'online').map((p, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs text-green-600">
                          <StatusCircle className="w-2 h-2 fill-green-600" />
                          {idx === 0 && <span>{p.user_email.split('@')[0]}</span>}
                        </div>
                      ))}
                      {presenceData.filter(p => getUserStatus(p.user_email) === 'online').length > 1 && (
                        <span className="text-xs text-green-600">
                          +{presenceData.filter(p => getUserStatus(p.user_email) === 'online').length - 1} online
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                topLevelMessages.map((msg) => (
                  <ThreadedMessageView
                    key={msg.id}
                    message={msg}
                    replies={messages}
                    currentUser={user}
                    onReply={setReplyTo}
                    allMessages={messages}
                    onShowReadReceipts={handleShowReadReceipts}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-gray-50 space-y-3">
              {replyTo && (
                <div className="p-2 bg-blue-50 border-l-4 border-blue-500 rounded flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-blue-700 font-medium">
                      Replying to {replyTo.sender_name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{replyTo.message}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)} className="h-6 w-6 p-0">
                    <span className="sr-only">Cancel</span>×
                  </Button>
                </div>
              )}

              <FileUploadManager onFilesUploaded={setAttachments} maxFiles={10} />

              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[60px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue placeholder="Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sendMessageMutation.isPending || (!newMessage.trim() && attachments.length === 0)}
                  className="bg-blue-600 h-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </Card>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conversation Title</label>
              <Input
                value={newConvTitle}
                onChange={(e) => setNewConvTitle(e.target.value)}
                placeholder="e.g., Project Timeline Discussion"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createConversationMutation.mutate(newConvTitle)}
                disabled={!newConvTitle.trim()}
                className="bg-blue-600"
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Read Receipt Modal */}
      <ReadReceiptModal
        message={selectedMessage}
        open={showReadReceipts}
        onClose={() => setShowReadReceipts(false)}
        participants={selectedConversation?.participants || []}
      />
    </div>
  );
}