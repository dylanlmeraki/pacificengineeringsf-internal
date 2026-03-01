import React, { useState, useRef, useEffect } from "react";
import { portalApi } from "@/components/services/portalApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Send, ChevronRight, FileText, Upload, MessageSquare,
  BarChart3, Shield, CheckCircle2, Loader2, ArrowRight, X,
  HelpCircle, Zap, Users, FolderKanban, Bell
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const QUICK_ACTIONS = [
  { label: "How do I upload documents?", icon: Upload },
  { label: "Where can I approve milestones?", icon: CheckCircle2 },
  { label: "How do I track project progress?", icon: BarChart3 },
  { label: "How do I communicate with the team?", icon: MessageSquare },
  { label: "What are document approvals?", icon: FileText },
  { label: "How do notifications work?", icon: Bell },
];

const WALKTHROUGH_STEPS = {
  dashboard: {
    title: "Dashboard Overview",
    description: "Your dashboard shows key metrics at a glance — active projects, outstanding balances, upcoming tasks, and overdue items. Below that you'll find invoice status, upcoming deadlines, and AI-powered service recommendations.",
    tab: "dashboard",
    icon: BarChart3,
  },
  projects: {
    title: "Projects Hub",
    description: "The Projects tab is your command center. You can generate AI project briefs, view project details, manage tasks on a Kanban board, see Gantt timeline charts, track dependencies, and assess risks. You can also use live chat for real-time collaboration.",
    tab: "projects",
    icon: FolderKanban,
  },
  communications: {
    title: "Communications",
    description: "Stay connected with your project team through threaded messaging, file sharing, and real-time notifications. You can communicate per-project and track read receipts.",
    tab: "communications",
    icon: MessageSquare,
  },
  documents: {
    title: "Document Management",
    description: "Upload documents to specific projects, approve or request changes on documents under review, and securely view all your project files with version tracking.",
    tab: "projects",
    icon: FileText,
  },
  approvals: {
    title: "Approvals & Workflows",
    description: "Review and approve milestones, change orders, and proposals. Set up custom workflow triggers with AI-powered suggestions to automate notifications and task creation.",
    tab: "profile",
    icon: CheckCircle2,
  },
};

export default function AIOnboardingAssistant({ user, projects = [], industry, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeWalkthrough, setActiveWalkthrough] = useState(null);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      const industryLabel = industry || "your industry";
      setMessages([{
        role: "assistant",
        content: `Welcome to your client portal, ${user?.full_name || "there"}! 🎉\n\nI'm your onboarding guide. Based on ${industryLabel}, here are some things I can help with:\n\n• **Personalized walkthrough** of key portal features\n• **Document upload** guidance for your project type\n• **Approval workflows** — how to review milestones and change orders\n• **Project tracking** — timeline views, tasks, and dependencies\n• **Quick answers** to any questions\n\nWhat would you like to explore first?`,
        timestamp: new Date(),
      }]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg = { role: "user", content: messageText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const projectContext = projects.slice(0, 5).map(p =>
        `${p.project_name} (${p.project_type}, ${p.status})`
      ).join("; ");

      const response = await portalApi.integrations.Core.InvokeLLM({
        prompt: `You are an onboarding assistant for Pacific Engineering's client portal. Be helpful, friendly, and concise.

USER: ${user?.full_name} (${user?.email})
INDUSTRY: ${industry || "Not specified"}
PROJECTS: ${projectContext || "No projects yet"}

PORTAL FEATURES YOU CAN GUIDE THEM TO:
- Dashboard: Key metrics, invoice status, upcoming tasks, AI service recommendations
- Projects Hub: Project details, AI brief generator, task management (Kanban board), Gantt charts, dependency tracking, risk assessment, live chat, document approvals
- Communications: Threaded messaging per project, file sharing
- Reports: Advanced filtering by project type/tags/date, AI summaries, scheduled reports
- Invoices: View/pay invoices, track payment history
- Profile: Account settings, team management, role permissions, workflow automation with AI suggestions
- Document Upload: Upload documents to specific project folders
- Approvals: Milestone approvals, change order approvals, document reviews

CONVERSATION SO FAR:
${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n")}

USER QUESTION: ${messageText}

Respond concisely. If they ask how to do something, give step-by-step instructions referencing specific tabs. If they seem lost, suggest a guided walkthrough. Always be encouraging.`,
        add_context_from_internet: false,
      });

      const content = typeof response === "string" ? response : response.content || response.text || "I'm here to help! Could you rephrase that?";
      setMessages((prev) => [...prev, { role: "assistant", content, timestamp: new Date() }]);
    } catch (err) {
      console.error("Onboarding assistant error:", err);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having a moment — please try again shortly!",
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startWalkthrough = (key) => {
    setActiveWalkthrough(key);
    setWalkthroughStep(0);
    const step = WALKTHROUGH_STEPS[key];
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: `## ${step.title}\n\n${step.description}\n\nWould you like me to take you to this section? Just say "go" or ask me about another feature.`,
      timestamp: new Date(),
    }]);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-2xl"
        >
          <HelpCircle className="w-6 h-6 text-white" />
        </Button>
        <div className="absolute -top-2 -right-2">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[420px] max-w-[calc(100vw-3rem)]">
      <Card className="border-0 shadow-2xl overflow-hidden flex flex-col h-[640px] max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Onboarding Guide</h3>
              <p className="text-xs text-purple-100">Personalized portal walkthrough</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Walkthrough Buttons */}
        <div className="px-3 py-2 bg-purple-50 border-b flex gap-1.5 overflow-x-auto">
          {Object.entries(WALKTHROUGH_STEPS).map(([key, step]) => {
            const Icon = step.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={activeWalkthrough === key ? "default" : "outline"}
                onClick={() => startWalkthrough(key)}
                className={`text-[10px] h-7 px-2 flex-shrink-0 ${
                  activeWalkthrough === key ? "bg-purple-600" : ""
                }`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {step.title}
              </Button>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-gray-50 to-purple-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : msg.isError
                  ? "bg-red-50 border border-red-200 text-red-800"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-3 py-2 bg-white border-t">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  size="sm"
                  variant="outline"
                  onClick={() => handleSend(action.label)}
                  disabled={isLoading}
                  className="text-[10px] h-6 px-2 flex-shrink-0"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask me anything about the portal..."
              className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}