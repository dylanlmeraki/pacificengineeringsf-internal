import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const WIZARD_STEPS = [
  { number: 1, title: "Company Info", icon: "building" },
  { number: 2, title: "Project Details", icon: "folder" },
  { number: 3, title: "Team Members", icon: "users" },
  { number: 4, title: "Documents", icon: "file" },
  { number: 5, title: "Review & Complete", icon: "check" },
];

export default function ClientOnboardingWizard({ user, onComplete }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [formData, setFormData] = useState({
    client_info: {
      company_name: "",
      industry: "",
      phone: "",
      address: "",
      website: "",
    },
    project_info: {
      project_name: "",
      project_type: "Construction",
      budget: "",
      start_date: "",
      end_date: "",
      description: "",
      team_size: "",
    },
    team_members: [],
    preferences: {},
  });

  const [newTeamMember, setNewTeamMember] = useState({
    email: "",
    name: "",
    role: "coordinator",
  });

  // Create or fetch onboarding session
  const { data: session } = useQuery({
    queryKey: ["onboarding-session", user?.email],
    queryFn: async () => {
      const sessions = await base44.entities.OnboardingSession.filter({
        client_email: user.email,
      });
      if (sessions.length > 0) {
        setSessionId(sessions[0].id);
        return sessions[0];
      }
      return null;
    },
    enabled: !!user?.email,
  });

  // Save session progress
  const saveSessionMutation = useMutation({
    mutationFn: async (data) => {
      if (sessionId) {
        return await base44.entities.OnboardingSession.update(sessionId, data);
      }
      const newSession = await base44.entities.OnboardingSession.create({
        client_email: user.email,
        client_name: user.full_name,
        ...data,
      });
      setSessionId(newSession.id);
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-session"] });
      toast.success("Progress saved");
    },
  });

  const handleNext = async () => {
    if (currentStep < WIZARD_STEPS.length) {
      await saveSessionMutation.mutateAsync({
        current_step: currentStep + 1,
        client_info: formData.client_info,
        project_info: formData.project_info,
        team_members: formData.team_members,
        session_status: "in_progress",
      });
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddTeamMember = () => {
    if (!newTeamMember.email.trim() || !newTeamMember.name.trim()) {
      toast.error("Email and name are required");
      return;
    }
    setFormData({
      ...formData,
      team_members: [...formData.team_members, newTeamMember],
    });
    setNewTeamMember({ email: "", name: "", role: "coordinator" });
  };

  const handleRemoveTeamMember = (index) => {
    setFormData({
      ...formData,
      team_members: formData.team_members.filter((_, i) => i !== index),
    });
  };

  const handleComplete = async () => {
    if (!formData.client_info.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!formData.project_info.project_name.trim()) {
      toast.error("Project name is required");
      return;
    }

    await saveSessionMutation.mutateAsync({
      current_step: 5,
      session_status: "completed",
      client_info: formData.client_info,
      project_info: formData.project_info,
      team_members: formData.team_members,
      completed_at: new Date().toISOString(),
    });

    toast.success("Onboarding completed! Your project is being set up.");
    onComplete?.();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {WIZARD_STEPS.map((step, idx) => (
            <React.Fragment key={step.number}>
              <button
                onClick={() => step.number <= currentStep && setCurrentStep(step.number)}
                className={`flex flex-col items-center ${
                  step.number <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 ${
                    step.number < currentStep
                      ? "bg-green-600 text-white"
                      : step.number === currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.number < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center max-w-16">
                  {step.title}
                </span>
              </button>
              {idx < WIZARD_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step.number < currentStep ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-8 border-0 shadow-lg">
        {/* Step 1: Company Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Information</h3>
              <p className="text-gray-600">Tell us about your organization</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Company Name *
                </label>
                <Input
                  value={formData.client_info.company_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      client_info: { ...formData.client_info, company_name: e.target.value },
                    })
                  }
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Industry
                </label>
                <Select
                  value={formData.client_info.industry}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      client_info: { ...formData.client_info, industry: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Construction", "Engineering", "Real Estate", "Environmental", "Other"].map(
                      (ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                <Input
                  value={formData.client_info.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      client_info: { ...formData.client_info, phone: e.target.value },
                    })
                  }
                  placeholder="(123) 456-7890"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Website</label>
                <Input
                  value={formData.client_info.website}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      client_info: { ...formData.client_info, website: e.target.value },
                    })
                  }
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Address</label>
              <Textarea
                value={formData.client_info.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    client_info: { ...formData.client_info, address: e.target.value },
                  })
                }
                placeholder="Street address"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 2: Project Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Project Details</h3>
              <p className="text-gray-600">Tell us about your first project</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Project Name *
                </label>
                <Input
                  value={formData.project_info.project_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_info: { ...formData.project_info, project_name: e.target.value },
                    })
                  }
                  placeholder="Project name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Project Type
                </label>
                <Select
                  value={formData.project_info.project_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      project_info: { ...formData.project_info, project_type: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["SWPPP", "Construction", "Inspections", "Engineering"].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Budget
                </label>
                <Input
                  type="number"
                  value={formData.project_info.budget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_info: { ...formData.project_info, budget: e.target.value },
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Team Size
                </label>
                <Input
                  type="number"
                  value={formData.project_info.team_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_info: { ...formData.project_info, team_size: e.target.value },
                    })
                  }
                  placeholder="Number of team members"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
                <Input
                  type="date"
                  value={formData.project_info.start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_info: { ...formData.project_info, start_date: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                <Input
                  type="date"
                  value={formData.project_info.end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_info: { ...formData.project_info, end_date: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <Textarea
                value={formData.project_info.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    project_info: { ...formData.project_info, description: e.target.value },
                  })
                }
                placeholder="Describe your project"
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 3: Team Members */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Team Members
              </h3>
              <p className="text-gray-600">Add team members to invite</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-gray-900">Add Team Member</p>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Email"
                  type="email"
                  value={newTeamMember.email}
                  onChange={(e) =>
                    setNewTeamMember({ ...newTeamMember, email: e.target.value })
                  }
                />
                <Input
                  placeholder="Full Name"
                  value={newTeamMember.name}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                />
                <Select
                  value={newTeamMember.role}
                  onValueChange={(value) =>
                    setNewTeamMember({ ...newTeamMember, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["coordinator", "engineer", "manager", "inspector"].map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddTeamMember}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Add Member
              </Button>
            </div>

            <div className="space-y-2">
              {formData.team_members.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-600">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveTeamMember(idx)}
                      className="text-red-600"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Documents & Agreements
              </h3>
              <p className="text-gray-600">Review and sign required documents</p>
            </div>

            <div className="space-y-3">
              {["Service Agreement", "NDA", "Privacy Policy"].map((doc) => (
                <Card key={doc} className="p-4 border border-gray-200 hover:border-blue-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{doc}</p>
                      <p className="text-xs text-gray-600">Required for project setup</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-900">
                <p className="font-semibold">By continuing, you agree to our terms and conditions</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Complete */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Your Information</h3>
              <p className="text-gray-600">Please verify all details before completing</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3">Company Info</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Company:</span>{" "}
                    <span className="font-semibold">{formData.client_info.company_name}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Industry:</span>{" "}
                    <span className="font-semibold">{formData.client_info.industry}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Phone:</span>{" "}
                    <span className="font-semibold">{formData.client_info.phone}</span>
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3">Project Info</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Project:</span>{" "}
                    <span className="font-semibold">{formData.project_info.project_name}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Type:</span>{" "}
                    <span className="font-semibold">{formData.project_info.project_type}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Budget:</span>{" "}
                    <span className="font-semibold">${formData.project_info.budget}</span>
                  </p>
                </div>
              </Card>
            </div>

            {formData.team_members.length > 0 && (
              <Card className="p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Team Members ({formData.team_members.length})
                </h4>
                <div className="space-y-2">
                  {formData.team_members.map((member) => (
                    <p key={member.email} className="text-sm">
                      <span className="font-semibold">{member.name}</span>{" "}
                      <span className="text-gray-600">({member.role})</span>
                    </p>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <Button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-3">
          {currentStep < WIZARD_STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={saveSessionMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              {saveSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={saveSessionMutation.isPending}
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              {saveSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Onboarding
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}