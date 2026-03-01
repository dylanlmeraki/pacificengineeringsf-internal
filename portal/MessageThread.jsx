import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Send, Loader2, Paperclip, User } from "lucide-react";
import { format } from "date-fns";
import { notifyProjectTeam } from "@/components/utils/notificationHelpers";
import { toast } from "sonner";

export default function MessageThread({ projectId }) {
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['project-messages', projectId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const filterConditions = { project_id: projectId };
      
      // Clients should not see internal messages
      if (user.role !== 'admin') {
        filterConditions.is_internal = false;
      }
      
      const msgs = await base44.entities.ProjectMessage.filter(
        filterConditions,
        '-created_date',
        100
      );
      return msgs.reverse();
    },
    enabled: !!projectId,
    refetchInterval: 5000 // Poll every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const message = await base44.entities.ProjectMessage.create(messageData);
      
      // Use centralized notification helper
      await notifyProjectTeam({
        projectId,
        type: 'new_message',
        title: 'New Project Message',
        message: `${messageData.sender_name} sent a message`,
        link: `/ProjectDetail?id=${projectId}`,
        priority: 'medium',
        excludeEmails: [messageData.sender_email]
      });
      
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-messages', projectId]);
      setNewMessage("");
      toast.success('Message sent');
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    sendMessageMutation.mutate({
      project_id: projectId,
      message: newMessage.trim(),
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      is_internal: false
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 rounded-t-xl">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = currentUser && message.sender_email === currentUser.email;
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                  isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
                }`}>
                  {message.sender_name ? message.sender_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
                
                <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {message.sender_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(message.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  
                  <div className={`rounded-2xl px-4 py-3 ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <Card className="p-4 border-0 border-t rounded-t-none rounded-b-xl shadow-lg">
        <div className="flex gap-3">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message... (Press Enter to send)"
            className="flex-1 min-h-[60px] resize-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 self-end"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}