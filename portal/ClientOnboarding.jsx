import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
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
} from "lucide-react";

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Your Portal",
    description: "Let's get you set up and ready to go",
    icon: Shield,
  },
  {
    id: "features",
    title: "Key Features",
    description: "Discover what you can do in your client portal",
    icon: Zap,
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

const FEATURES = [
  {
    icon: FileText,
    title: "Project Management",
    description: "Track your active projects and view status updates in real-time",
  },
  {
    icon: Upload,
    title: "Secure Document Exchange",
    description: "Upload and download project documents with full security",
  },
  {
    icon: MessageSquare,
    title: "Team Communication",
    description: "Collaborate with our team through integrated messaging",
  },
  {
    icon: BarChart3,
    title: "Project Analytics",
    description: "View detailed metrics and progress reports for your projects",
  },
];

export default function ClientOnboarding({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    company_name: user?.company_name || "",
    phone: user?.phone || "",
    preferred_contact_method: user?.preferred_contact_method || "email",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isProfileStep = step.id === "profile";

  const handleNext = async () => {
    if (isProfileStep) {
      await handleSaveProfile();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      // Update user profile
      await base44.auth.updateMe({
        company_name: formData.company_name,
        phone: formData.phone,
        preferred_contact_method: formData.preferred_contact_method,
        onboarding_complete: true,
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
      // Mark onboarding as complete if not already done
      if (!user?.onboarding_complete) {
        await base44.auth.updateMe({ onboarding_complete: true });
      }
      onComplete?.();
    } catch (err) {
      setError(err?.message || "Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

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
              </p>
            </Card>
          </div>
        );

      case "features":
        return (
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
                      <h3 className="font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
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
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Explore your Projects:</strong> View all active
                    projects and their status
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Upload Documents:</strong> Share files for your
                    projects
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Review Proposals:</strong> Check and approve
                    proposals and change orders
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Stay Connected:</strong> Use messaging to
                    communicate with our team
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl">
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
            disabled={saving}
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