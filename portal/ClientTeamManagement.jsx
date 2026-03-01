import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Mail,
  UserCheck,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

export default function ClientTeamManagement({ user }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  // Fetch team members
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["client-team-members", user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await portalApi.entities.ClientTeamMember.filter(
        { company_email: user.email },
        "-created_date"
      );
    },
    enabled: !!user,
  });

  // Invite team member mutation
  const inviteMutation = useMutation({
    mutationFn: async (memberData) => {
      const inviteToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      
      const member = await portalApi.entities.ClientTeamMember.create({
        ...memberData,
        invite_token: inviteToken,
        invited_at: new Date().toISOString(),
      });

      // Send invitation email
      await portalApi.functions.invoke('sendTeamInvite', {
        inviteToken,
        invitedEmail: memberData.invited_email,
        invitedName: memberData.invited_name,
        companyName: user.company_name || user.full_name,
        role: memberData.role
      });

      return member;
    },
    onSuccess: async () => {
      setInviteEmail("");
      setInviteRole("viewer");
      setSuccess("Team member invited successfully! They'll receive an email.");
      setTimeout(() => setSuccess(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["client-team-members"] });
    },
    onError: (err) => {
      setError(err?.message || "Failed to send invitation");
      setTimeout(() => setError(null), 3000);
    },
  });

  // Delete team member mutation
  const deleteMutation = useMutation({
    mutationFn: async (memberId) => {
      return await portalApi.entities.ClientTeamMember.delete(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-team-members"] });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (memberData) => {
      return await portalApi.entities.ClientTeamMember.update(memberData.id, {
        role: memberData.newRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-team-members"] });
    },
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      await inviteMutation.mutateAsync({
        company_email: user.email,
        invited_email: inviteEmail,
        invited_name: inviteEmail.split("@")[0],
        role: inviteRole,
        status: "pending",
      });
    } finally {
      setInviting(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: "bg-red-100 text-red-800",
      editor: "bg-blue-100 text-blue-800",
      viewer: "bg-gray-100 text-gray-800",
    };
    return colors[role] || colors.viewer;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const activeMembers = teamMembers.filter((m) => m.status === "accepted");
  const pendingMembers = teamMembers.filter((m) => m.status === "pending");

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Invite Team Member
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="team@example.com"
              className="h-10"
              disabled={inviting}
            />

            <Select value={inviteRole} onValueChange={setInviteRole} disabled={inviting}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">View Only</SelectItem>
                <SelectItem value="editor">Can Edit</SelectItem>
                <SelectItem value="admin">Full Access</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700 h-10"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-600">
            An invitation will be sent to their email. They'll need to accept to access the portal.
          </p>
        </form>
      </Card>

      {/* Active Team Members */}
      {activeMembers.length > 0 && (
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            Active Team Members ({activeMembers.length})
          </h3>

          <div className="space-y-3">
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{member.invited_name}</p>
                  <p className="text-sm text-gray-600">{member.invited_email}</p>
                  {member.last_activity && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last active:{" "}
                      {format(new Date(member.last_activity), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="space-y-2">
                    <Select
                      value={member.role}
                      onValueChange={(newRole) =>
                        updateRoleMutation.mutate({ id: member.id, newRole })
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">View Only</SelectItem>
                        <SelectItem value="editor">Can Edit</SelectItem>
                        <SelectItem value="admin">Full Access</SelectItem>
                      </SelectContent>
                    </Select>

                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(member.id)}
                    className="text-red-600 hover:text-red-700 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingMembers.length > 0 && (
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Invitations ({pendingMembers.length})
          </h3>

          <div className="space-y-3">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{member.invited_email}</p>
                  <p className="text-sm text-gray-600">
                    Invited {format(new Date(member.invited_at), "MMM d, yyyy")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                  <Badge className={getRoleColor(member.role)}>
                    {member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(member.id)}
                    className="text-red-600 hover:text-red-700 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {teamMembers.length === 0 && !isLoading && (
        <Card className="p-12 text-center border-0 shadow-lg">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Team Members Yet</h3>
          <p className="text-gray-600">Invite your team members to collaborate on projects.</p>
        </Card>
      )}
    </div>
  );
}