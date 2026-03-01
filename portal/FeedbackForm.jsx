import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FeedbackForm({ projectId, proposalId, type = 'project' }) {
  const [feedback, setFeedback] = useState({
    rating: "",
    category: "",
    comments: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.rating || !feedback.comments.trim()) {
      toast.error("Please provide a rating and comments");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await portalApi.auth.me();
      
      // Create feedback record
      await portalApi.entities.ClientFeedback.create({
        project_id: projectId,
        proposal_id: proposalId,
        client_email: user.email,
        client_name: user.full_name,
        feedback_type: type,
        rating: feedback.rating,
        category: feedback.category,
        comments: feedback.comments,
      });
      
      // Create notification for admins
      const adminUsers = await portalApi.entities.User.filter({ role: 'admin' });
      
      const feedbackMessage = `${user.full_name} submitted feedback (${feedback.rating}): ${feedback.comments}`;
      
      for (const admin of adminUsers) {
        await portalApi.entities.Notification.create({
          recipient_email: admin.email,
          type: type === 'proposal' ? 'proposal' : 'project_update',
          title: `Client Feedback Received`,
          message: feedbackMessage,
          link: type === 'proposal' ? `/ProposalDashboard?id=${proposalId}` : `/ProjectDetail?id=${projectId}`,
          priority: 'medium',
          metadata: {
            feedback_type: type,
            rating: feedback.rating,
            category: feedback.category,
            project_id: projectId,
            proposal_id: proposalId
          }
        });
      }

      // Send email to admins
      await portalApi.integrations.Core.SendEmail({
        to: 'dylanl.peci@gmail.com',
        from_name: 'Pacific Engineering Portal',
        subject: `Client Feedback: ${feedback.rating}`,
        body: `
          <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0B67A6;">New Client Feedback</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From:</strong> ${user.full_name} (${user.email})</p>
              <p><strong>Type:</strong> ${type === 'proposal' ? 'Proposal' : 'Project'}</p>
              <p><strong>Rating:</strong> ${feedback.rating}</p>
              ${feedback.category ? `<p><strong>Category:</strong> ${feedback.category}</p>` : ''}
              <p><strong>Comments:</strong></p>
              <p>${feedback.comments}</p>
            </div>
          </body>
          </html>
        `
      });

      setIsSubmitted(true);
      toast.success("Thank you for your feedback!");
      
      setTimeout(() => {
        setFeedback({ rating: "", category: "", comments: "" });
        setIsSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="p-8 text-center border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Feedback Submitted!</h3>
        <p className="text-gray-600">Thank you for sharing your thoughts with us.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Share Your Feedback</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="mb-2">How would you rate your experience?</Label>
          <Select value={feedback.rating} onValueChange={(value) => setFeedback({ ...feedback, rating: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Excellent">⭐⭐⭐⭐⭐ Excellent</SelectItem>
              <SelectItem value="Good">⭐⭐⭐⭐ Good</SelectItem>
              <SelectItem value="Average">⭐⭐⭐ Average</SelectItem>
              <SelectItem value="Below Average">⭐⭐ Below Average</SelectItem>
              <SelectItem value="Poor">⭐ Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2">Feedback Category (Optional)</Label>
          <Select value={feedback.category} onValueChange={(value) => setFeedback({ ...feedback, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Communication">Communication</SelectItem>
              <SelectItem value="Quality">Quality of Work</SelectItem>
              <SelectItem value="Timeliness">Timeliness</SelectItem>
              <SelectItem value="Professionalism">Professionalism</SelectItem>
              <SelectItem value="Value">Value for Money</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2">Your Comments *</Label>
          <Textarea
            value={feedback.comments}
            onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
            placeholder="Please share your thoughts, suggestions, or concerns..."
            className="min-h-[120px]"
            required
          />
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}