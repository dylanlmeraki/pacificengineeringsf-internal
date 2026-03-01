import React, { useState, useEffect, useRef } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, Send, Loader2, Pin, Reply, Paperclip, Users, Circle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ProjectLiveChat({ projectId, user, projectName }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const scrollRef = useRef(null);

  // Fetch discussions
  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ["project-discussions", projectId],
    queryFn: () => portalApi.entities.ProjectDiscussion.filter({ project_id: projectId }, "created_date", 100),
    enabled: !!projectId,
    refetchInterval: 5000, // poll every 5s for near-realtime
  });

  // Fetch presence
  const { data: presenceList = [] } = useQuery({
    queryKey: ["user-presence", projectId],
    queryFn: () => portalApi.entities.UserPresence.filter({ conversation_id: projectId }),
    enabled: !!projectId,
    refetchInterval: 10000,
  });

  // Update own presence
  useEffect(() => {
    if (!user || !projectId) return;

    const updatePresence = async () => {
      const existing = await portalApi.entities.UserPresence.filter({
        user_email: user.email,
        conversation_id: projectId,
      });

      if (existing.length > 0) {
        await portalApi.entities.UserPresence.update(existing[0].id, {
          status: "online",
          last_seen: new Date().toISOString(),
        });
      } else {
        await portalApi.entities.UserPresence.create({
          user_email: user.email,
          status: "online",
          last_seen: new Date().toISOString(),
          conversation_id: projectId,
        });
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    return () => {
      clearInterval(interval);
      // Set offline on unmount
      portalApi.entities.UserPresence.filter({
        user_email: user.email,
        conversation_id: projectId,
      }).then((existing) => {
        if (existing.length > 0) {
          portalApi.entities.UserPresence.update(existing[0].id, {
            status: "offline",
            last_seen: new Date().toISOString(),
          });
        }
      });
    };
  }, [user, projectId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [discussions.length]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: (msgData) => portalApi.entities.ProjectDiscussion.create(msgData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-discussions", projectId] });
      setMessage("");
      setReplyTo(null);
    },
  });

  // Pin message
  const pinMutation = useMutation({
    mutationFn: ({ id, is_pinned }) => portalApi.entities.ProjectDiscussion.update(id, { is_pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-discussions", projectId] }),
  });

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;

    sendMutation.mutate({
      project_id: projectId,
      sender_email: user.email,
      sender_name: user.full_name,
      sender_role: user.role || "client",
      message: text,
      reply_to_id: replyTo?.id || null,
      mentions: extractMentions(text),
      is_pinned: false,
    });
  };

  const extractMentions = (text) => {
    const matches = text.match(/@[\w.+-]+@[\w-]+\.[\w.]+/g);
    return matches ? matches.map((m) => m.substring(1)) : [];
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onlineUsers = presenceList.filter((p) => {
    if (p.status !== "online") return false;
    const lastSeen = new Date(p.last_seen);
    return Date.now() - lastSeen.getTime() < 60000; // within 60s
  });

  const pinnedMessages = discussions.filter((d) => d.is_pinned);
  const replyTarget = replyTo ? discussions.find((d) => d.id === replyTo.id) : null;

  const getInitials = (name) => {
    return (name || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role) => {
    const colors = { admin: "bg-red-500", client: "bg-blue-500", user: "bg-green-500" };
    return colors[role] || "bg-gray-500";
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-bold">Project Discussion</h3>
              <p className="text-xs text-blue-100">{projectName || "Live Chat"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                <span className="text-xs">{onlineUsers.length} online</span>
              </div>
            )}
          </div>
        </div>

        {/* Presence Indicators */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {onlineUsers.map((p) => (
              <Badge key={p.id} className="bg-white/20 text-white text-xs border-0 flex items-center gap-1">
                <Circle className="w-1.5 h-1.5 fill-green-400 text-green-400" />
                {p.user_email.split("@")[0]}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1 mb-1">
            <Pin className="w-3 h-3" /> Pinned ({pinnedMessages.length})
          </p>
          {pinnedMessages.slice(0, 2).map((pm) => (
            <p key={pm.id} className="text-xs text-yellow-700 truncate">
              <span className="font-semibold">{pm.sender_name}:</span> {pm.message}
            </p>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discussions.map((msg) => {
              const isOwn = msg.sender_email === user?.email;
              const parentMsg = msg.reply_to_id ? discussions.find((d) => d.id === msg.reply_to_id) : null;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${isOwn ? "items-end" : "items-start"}`}>
                    {/* Reply reference */}
                    {parentMsg && (
                      <div className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 mb-1 border-l-2 border-blue-400">
                        <span className="font-semibold">{parentMsg.sender_name}:</span>{" "}
                        {parentMsg.message.substring(0, 60)}...
                      </div>
                    )}
                    <div className={`rounded-xl px-4 py-2.5 ${isOwn ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-5 h-5 rounded-full ${getRoleColor(msg.sender_role)} text-white flex items-center justify-center text-[9px] font-bold`}>
                            {getInitials(msg.sender_name)}
                          </div>
                          <span className="text-xs font-semibold">{msg.sender_name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{msg.sender_role}</Badge>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${isOwn ? "text-blue-200" : "text-gray-400"}`}>
                          {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className={`flex gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                        onClick={() => setReplyTo(msg)}
                      >
                        <Reply className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-yellow-600"
                        onClick={() => pinMutation.mutate({ id: msg.id, is_pinned: !msg.is_pinned })}
                      >
                        <Pin className={`w-3 h-3 ${msg.is_pinned ? "fill-yellow-500 text-yellow-500" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Reply Banner */}
      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 border-t flex items-center justify-between">
          <div className="text-xs text-blue-700">
            <span className="font-semibold">Replying to {replyTo.sender_name}:</span>{" "}
            {replyTo.message.substring(0, 50)}...
          </div>
          <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)} className="text-xs h-6">
            Cancel
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            className="flex-1"
            disabled={sendMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}