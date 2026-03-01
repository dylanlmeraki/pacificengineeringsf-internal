import React, { useState, useEffect } from "react";
import { portalApi } from "@/components/services/portalApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageSquare,
  Upload,
  BarChart3,
  Zap,
  Users,
  Shield,
  Loader2,
  HelpCircle,
  Building,
  FolderKanban,
  Mail,
  Check,
  Circle,
} from "lucide-react";
import EnhancedTemplateSelector from "../projects/EnhancedTemplateSelector";

const INDUSTRIES = [
  { value: "construction", label: "Construction", icon: Building },
  { value: "engineering", label: "Engineering", icon: Zap },
  { value: "environmental", label: "Environmental Services", icon: Shield },
  { value: "inspections", label: "Inspections & Testing", icon: CheckCircle2 },
  { value: "other", label: "Other", icon: Building },
];

const INDUSTRY_CHECKLISTS = {
  construction: [
    { id: "review_swppp", label: "Review SWPPP documentation requirements", info: "Storm Water Pollution Prevention Plans are required for construction projects" },
    { id: "upload_permits", label: "Upload construction permits", info: "Upload any permits you've already obtained for faster processing" },
    { id: "setup_site_contacts", label: "Set up on-site contact information", info: "We'll need contact info for site managers and supervisors" },
    { id: "review_safety", label: "Review safety protocols", info: "Understand our safety requirements for all construction sites" },
  ],
  engineering: [
    { id: "review_plans", label: "Upload project plans for review", info: "Share your engineering drawings and specifications" },
    { id: "setup_cad", label: "Set up CAD file sharing", info: "Configure secure sharing for technical drawings" },
    { id: "review_calcs", label: "Review calculation requirements", info: "Understand our standards for engineering calculations" },
    { id: "schedule_kickoff", label: "Schedule engineering kickoff meeting", info: "Meet with our technical team to discuss project details" },
  ],
  environmental: [
    { id: "review_compliance", label: "Review environmental compliance checklist", info: "Ensure all regulatory requirements are understood" },
    { id: "setup_monitoring", label: "Set up monitoring protocols", info: "Configure environmental monitoring and reporting" },
    { id: "upload_studies", label: "Upload existing environmental studies", info: "Share any prior assessments or reports" },
  ],
  inspections: [
    { id: "schedule_inspections", label: "Schedule initial inspections", info: "Book your first round of inspections" },
    { id: "review_codes", label: "Review code requirements", info: "Understand applicable building codes and standards" },
    { id: "setup_access", label: "Set up site access procedures", info: "Arrange access for our inspection team" },
    { id: "review_reports", label: "Learn about inspection reports", info: "Understand how to read and respond to inspection findings" },
  ],
  other: [
    { id: "define_scope", label: "Define project scope", info: "Clearly outline what you need help with" },
    { id: "share_docs", label: "Share relevant documentation", info: "Upload any files that help us understand your needs" },
    { id: "setup_contact", label: "Set up communication preferences", info: "Let us know how you prefer to stay in touch" },
  ],
};

const FEATURES = [
  {
    icon: FileText,
    title: "Project Management",
    description: "Track your active projects and view status updates in real-time",
    tooltip: "Access all your projects in one place with real-time updates on progress, milestones, and deadlines",
  },
  {
    icon: Upload,
    title: "Secure Document Exchange",
    description: "Upload and download project documents with full security",
    tooltip: "All documents are encrypted and access-controlled. You can upload plans, permits, and reports securely",
  },
  {
    icon: MessageSquare,
    title: "Team Communication",
    description: "Collaborate with our team through integrated messaging",
    tooltip: "Direct messaging with your project team, file sharing, and threaded conversations",
  },
  {
    icon: BarChart3,
    title: "Project Analytics",
    description: "View detailed metrics and progress reports for your projects",
    tooltip: "Interactive dashboards showing budget tracking, timeline progress, and key performance indicators",
  },
];

export default function EnhancedClientOnboarding({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [checklistItems, setChecklistItems] = useState({});
  const [formData, setFormData] = useState({
    company_name: user?.company_name || "",
    phone: user?.phone || "",
    preferred_contact_method: user?.preferred_contact_method || "email",
    industry: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const ONBOARDING_STEPS = [
    {
      id: "welcome",
      title: "Welcome to Your Portal",
      description: "Let's get you set up and ready to go",
      icon: Shield,
    },
    {
      id: "industry",
      title: "Select Your Industry",
      description: "Help us customize your experience",
      icon: Building,
    },
    {
      id: "features",
      title: "Key Features",
      description: "Discover what you can do in your client portal",
      icon: Zap,
    },
    {
      id: "template",
      title: "Customize Your Project Setup",
      description: "Choose and preview a template that matches your project needs",
      icon: FolderKanban,
    },
    {
      id: "checklist",
      title: "Getting Started Checklist",
      description: "Complete these items to get the most out of your portal",
      icon: CheckCircle2,
    },
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Help us serve you better",
      icon: Users,
    },
    {
      id: "next-steps",
      title: "You're All Set!",
      description: "Here's what to do next",
      icon: CheckCircle2,
    },
  ];

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isProfileStep = step.id === "profile";

  useEffect(() => {
    if (selectedIndustry) {
      const items = INDUSTRY_CHECKLISTS[selectedIndustry] || [];
      const initialChecklist = {};
      items.forEach(item => {
        initialChecklist[item.id] = false;
      });
      setChecklistItems(initialChecklist);
    }
  }, [selectedIndustry]);

  const handleNext = async () => {
    if (isProfileStep) {
      await handleSaveProfile();
    } else if (step.id === "industry" && selectedIndustry) {
      setFormData({ ...formData, industry: selectedIndustry });
      setCurrentStep((prev) => prev + 1);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      await portalApi.auth.updateMe({
        ...formData,
        onboarding_complete: true,
        onboarding_checklist: checklistItems,
        selected_template_id: selectedTemplate?.id,
      });

      setCurrentStep((prev) => prev + 1);
    } catch (err) {
      setError(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      if (!user?.onboarding_complete) {
        await portalApi.auth.updateMe({ 
          onboarding_complete: true,
          onboarding_checklist: checklistItems,
        });
      }
      onComplete?.();
    } catch (err) {
      setError(err?.message || "Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklistItem = (itemId) => {
    setChecklistItems({ ...checklistItems, [itemId]: !checklistItems[itemId] });
  };

  const completedCount = Object.values(checklistItems).filter(Boolean).length;
  const totalCount = Object.keys(checklistItems).length;
  const checklistProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const renderStepContent = () => {
    switch (step.id) {
      case "welcome":
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-3">
              <Shield className="w-16 h-16 text-blue-600 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome, {user?.full_name}!
              </h2>
              <p className="text-gray-600">
                Your secure client portal is ready. Let's take a quick tour to
                help you get the most out of it.
              </p>
            </div>

            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">What is this?</h3>
              <p className="text-gray-700">
                The client portal is your dedicated space to manage projects,
                access documents, communicate with our team, and track progress
                in real-time.
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
              <p className="text-sm text-gray-600">
                ✓ Secure access to all your project information
                <br />✓ Real-time status updates and notifications
                <br />✓ Easy document management and sharing
                <br />✓ Direct communication with your project team
              </p>
            </Card>
          </div>
        );

      case "industry":
        return (
          <div className="space-y-6 py-6">
            <p className="text-gray-600 text-center">
              Select your industry to customize your portal experience
            </p>
            <div className="grid grid-cols-2 gap-4">
              {INDUSTRIES.map((industry) => {
                const Icon = industry.icon;
                return (
                  <button
                    key={industry.value}
                    onClick={() => setSelectedIndustry(industry.value)}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      selectedIndustry === industry.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-3 ${
                      selectedIndustry === industry.value ? "text-blue-600" : "text-gray-400"
                    }`} />
                    <p className="font-semibold text-gray-900">{industry.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "features":
        return (
          <TooltipProvider>
            <div className="space-y-4 py-6">
              <p className="text-gray-600 text-center mb-6">
                Here are the key features available to you:
              </p>
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="p-4 border-0 shadow-md">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600 mt-1" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {feature.title}
                          </h3>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{feature.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TooltipProvider>
        );

      case "template":
        return (
          <div className="py-6">
            <EnhancedTemplateSelector
              selectedIndustry={selectedIndustry}
              onSelect={(template) => {
                setSelectedTemplate(template);
                setCurrentStep((prev) => prev + 1);
              }}
              onSkip={() => setCurrentStep((prev) => prev + 1)}
            />
          </div>
        );

      case "checklist":
        const items = INDUSTRY_CHECKLISTS[selectedIndustry] || INDUSTRY_CHECKLISTS.other;
        return (
          <TooltipProvider>
            <div className="space-y-6 py-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Checklist Progress
                  </p>
                  <p className="text-sm text-gray-600">
                    {completedCount} of {totalCount} completed
                  </p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 border-2 transition-all cursor-pointer ${
                      checklistItems[item.id]
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {checklistItems[item.id] ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${
                            checklistItems[item.id] ? "text-green-900 line-through" : "text-gray-900"
                          }`}>
                            {item.label}
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{item.info}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                  💡 Tip: You can complete these items later from your dashboard. 
                  Click each item to mark it as done.
                </p>
              </Card>
            </div>
          </TooltipProvider>
        );

      case "profile":
        return (
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Company Name
                </label>
                <Input
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Your company name"
                  className="h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Phone Number
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  type="tel"
                  className="h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Preferred Contact Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["email", "phone", "teams"].map((method) => (
                    <button
                      key={method}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          preferred_contact_method: method,
                        })
                      }
                      className={`p-3 rounded-lg border-2 text-center capitalize font-medium transition-all ${
                        formData.preferred_contact_method === method
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <Card className="p-4 bg-red-50 border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </Card>
            )}
          </div>
        );

      case "next-steps":
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">All Set!</h2>
              <p className="text-gray-600">
                Your profile is complete and you're ready to go.
              </p>
            </div>

            <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <FolderKanban className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Explore your Projects:</strong> View all active
                    projects and their status
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Upload className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Upload Documents:</strong> Share files for your
                    projects securely
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Invite Your Team:</strong> Add team members to
                    collaborate
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Stay Connected:</strong> Use messaging to
                    communicate with our team
                  </span>
                </li>
              </ul>
            </Card>

            {completedCount < totalCount && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-900">
                  ⚠️ You have {totalCount - completedCount} checklist items remaining. 
                  Complete them to get the most out of your portal!
                </p>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step.id === "industry") return selectedIndustry;
    return true;
  };

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex gap-2 my-4">
          {ONBOARDING_STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-colors ${
                idx <= currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex gap-3 justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() =>
              setCurrentStep((prev) => Math.max(prev - 1, 0))
            }
            disabled={currentStep === 0 || saving}
          >
            Back
          </Button>

          <Button
            onClick={isLastStep ? handleFinish : handleNext}
            disabled={saving || !canProceed()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isProfileStep ? "Saving..." : "Loading..."}
              </>
            ) : (
              <>
                {isLastStep ? "Start Exploring" : "Next"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Step Counter */}
        <div className="text-center text-xs text-gray-500 mt-4">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}