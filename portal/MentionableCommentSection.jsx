import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User, Loader2, FileText, Upload, AtSign } from "lucide-react";
import { format } from "date-fns";

export default function MentionableCommentSection({ 
  entityType,
  entityId, 
  projectId, 
  user 
}) {
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const entityName = entityType === 'milestone' ? 'MilestoneComment' : 'DocumentComment';
  const idField = entityType === 'milestone' ? 'milestone_id' : 'document_id';

  const { data: allComments = [], isLoading } = useQuery({
    queryKey: [`${entityType}-comments`, entityId],
    queryFn: () => base44.entities[entityName].filter({ [idField]: entityId }),
    refetchInterval: 5000
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-for-mentions'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const comments = user.role === 'admin' 
    ? allComments 
    : allComments.filter(c => !c.is_internal);

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
      setShowMentions(true);
      setMentionSearch("");
    } else if (lastAtSymbol !== -1) {
      const searchText = textBeforeCursor.slice(lastAtSymbol + 1);
      if (!searchText.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(searchText);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (memberName) => {
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newComment.slice(cursorPos);
    
    const newText = newComment.slice(0, lastAtSymbol) + `@${memberName} ` + textAfterCursor;
    setNewComment(newText);
    setShowMentions(false);
    textareaRef.current.focus();
  };

  const filteredMembers = showMentions 
    ? teamMembers.filter(m => 
        m.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const addCommentMutation = useMutation({
    mutationFn: async (data) => {
      const comment = await base44.entities[entityName].create(data);
      
      const project = await base44.entities.Project.filter({ id: projectId });
      if (project[0]) {
        const isClientComment = user.role !== 'admin';
        
        if (isClientComment) {
          const adminUsers = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of adminUsers) {
            await base44.entities.Notification.create({
              recipient_email: admin.email,
              type: 'new_message',
              title: `New ${entityType} comment`,
              message: `${user.full_name} commented on ${entityType}`,
              link: `/ProjectDetail?id=${projectId}`,
              priority: 'normal'
            });
          }
        } else {
          await base44.entities.Notification.create({
            recipient_email: project[0].client_email,
            type: 'new_message',
            title: `New ${entityType} comment`,
            message: `Team member commented on ${entityType}`,
            link: `/ProjectDetail?id=${projectId}`,
            priority: 'normal'
          });
        }
      }
      
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`${entityType}-comments`]);
      setNewComment("");
      setAttachments([]);
      setShowMentions(false);
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setAttachments([...attachments, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    const mentions = extractMentions(newComment);
    const mentionedEmails = mentions.map(name => {
      const member = teamMembers.find(m => m.full_name === name);
      return member?.email;
    }).filter(Boolean);

    addCommentMutation.mutate({
      [idField]: entityId,
      project_id: projectId,
      comment: newComment,
      author_email: user.email,
      author_name: user.full_name,
      is_internal: false,
      attachments,
      mentions: mentionedEmails
    });

    mentionedEmails.forEach(email => {
      base44.entities.Notification.create({
        recipient_email: email,
        type: 'mention',
        title: `${user.full_name} mentioned you`,
        message: `in a comment: "${newComment.slice(0, 100)}..."`,
        priority: 'medium',
        related_id: entityId
      }).catch(() => {});
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Comments ({comments.length})</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : comments.length === 0 ? (
        <Card className="p-6 text-center">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{comment.author_name}</span>
                    {comment.is_internal && (
                      <Badge variant="outline" className="text-xs">Internal</Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_date), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.comment.split(/(@\w+(?:\s+\w+)*)/).map((part, i) => 
                      part.startsWith('@') ? (
                        <Badge key={i} variant="outline" className="mx-1">
                          {part}
                        </Badge>
                      ) : part
                    )}
                  </p>
                  {comment.mentions && comment.mentions.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <AtSign className="w-3 h-3" />
                      <span>{comment.mentions.length} mentioned</span>
                    </div>
                  )}
                  {comment.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comment.attachments.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <FileText className="w-4 h-4" />
                          Attachment {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextChange}
            placeholder="Add a comment... (Type @ to mention someone)"
            className="mb-3 min-h-[80px]"
          />
          {showMentions && filteredMembers.length > 0 && (
            <Card className="absolute bottom-full mb-2 w-full max-h-40 overflow-y-auto z-10 p-2">
              {filteredMembers.map(member => (
                <button
                  key={member.email}
                  onClick={() => insertMention(member.full_name)}
                  className="w-full text-left p-2 hover:bg-blue-50 rounded flex items-center gap-2"
                >
                  <AtSign className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{member.full_name}</span>
                  <span className="text-xs text-gray-500">{member.email}</span>
                </button>
              ))}
            </Card>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Attach</span>
              </div>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {isUploading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            {attachments.length > 0 && (
              <span className="text-sm text-gray-600">{attachments.length} file(s)</span>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}