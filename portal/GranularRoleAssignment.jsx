import React, { useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Users, UserCheck, Loader2, Eye, Edit, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";


const PRESET_ROLES = [
  {
    name: "Project Viewer",
    description: "Can view project status, documents, and milestones. No edit or approval access.",
    permissions: [
      { resource: "projects", permission_type: "view", access_level: "read_only" },
      { resource: "documents", permission_type: "view", access_level: "read_only" },
      { resource: "milestones", permission_type: "view", access_level: "read_only" },
      { resource: "messages", permission_type: "view", access_level: "read_only" },
      { resource: "reports", permission_type: "view", access_level: "read_only" },
    ],
  },
  {
    name: "Approver",
    description: "Can approve milestones, change orders, and proposals in addition to viewing.",
    permissions: [
      { resource: "projects", permission_type: "view", access_level: "read_only" },
      { resource: "documents", permission_type: "view", access_level: "read_only" },
      { resource: "milestones", permission_type: "approve", access_level: "read_write" },
      { resource: "approvals", permission_type: "approve", access_level: "read_write" },
      { resource: "change_orders", permission_type: "approve", access_level: "read_write" },
      { resource: "messages", permission_type: "create", access_level: "read_write" },
    ],
  },
  {
    name: "Team Member",
    description: "Can view, comment, upload documents, and communicate. Cannot approve or delete.",
    permissions: [
      { resource: "projects", permission_type: "view", access_level: "read_only" },
      { resource: "documents", permission_type: "create", access_level: "read_write" },
      { resource: "milestones", permission_type: "comment", access_level: "read_only" },
      { resource: "messages", permission_type: "create", access_level: "read_write" },
      { resource: "tasks", permission_type: "edit", access_level: "read_write" },
      { resource: "reports", permission_type: "view", access_level: "read_only" },
    ],
  },
  {
    name: "Financial Reviewer",
    description: "Access to invoices, budgets, and financial reports. Can view projects.",
    permissions: [
      { resource: "projects", permission_type: "view", access_level: "read_only" },
      { resource: "invoices", permission_type: "view", access_level: "read_only" },
      { resource: "reports", permission_type: "view", access_level: "read_write" },
      { resource: "milestones", permission_type: "view", access_level: "read_only" },
    ],
  },
];

export default function GranularRoleAssignment({ user, projects = [] }) {
  const queryClient = useQueryClient();
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const projectId = projects[0]?.id;

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["client-roles", projectId],
    queryFn: () => portalApi.entities.ClientRole.filter({ project_id: projectId || null }),
    enabled: !!projectId,
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["client-team-members", user?.email],
    queryFn: () => portalApi.entities.ClientTeamMember.filter({ company_email: user?.email }, "-created_date"),
    enabled: !!user,
  });

  // Create preset role
  const createPresetMutation = useMutation({
    mutationFn: async (preset) => {
      const role = await portalApi.entities.ClientRole.create({
        role_name: preset.name,
        description: preset.description,
        role_type: "project_level",
        project_id: projectId,
        is_custom: false,
        created_by: user?.email,
      });
      // Create permissions for the role
      await Promise.all(
        preset.permissions.map((perm) =>
          portalApi.entities.ClientRolePermission.create({
            role_id: role.id,
            ...perm,
          })
        )
      );
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-roles"] });
      toast.success("Role created with permissions");
    },
  });

  // Assign role to member
  const assignRoleMutation = useMutation({
    mutationFn: async ({ roleId, member }) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return;
      const existingMembers = role.assigned_members || [];
      const alreadyAssigned = existingMembers.some((m) => m.user_email === member.invited_email);
      if (alreadyAssigned) {
        toast.info("Already assigned to this role");
        return;
      }
      return portalApi.entities.ClientRole.update(roleId, {
        assigned_members: [
          ...existingMembers,
          {
            user_email: member.invited_email,
            user_name: member.invited_name,
            assigned_date: new Date().toISOString(),
          },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-roles"] });
      setShowAssignDialog(false);
      setSelectedMember(null);
      setSelectedRoleId("");
      toast.success("Role assigned");
    },
  });

  const getPermissionIcon = (permType) => {
    const icons = { view: Eye, create: Edit, edit: Edit, approve: CheckCircle2, comment: FileText };
    const Icon = icons[permType] || Eye;
    return <Icon className="w-3 h-3" />;
  };

  const presetExists = (presetName) => roles.some((r) => r.role_name === presetName);

  const getMemberRoles = (memberEmail) => {
    return roles.filter((r) => r.assigned_members?.some((m) => m.user_email === memberEmail));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Role-Based Access Control
          </h3>
          <p className="text-sm text-gray-600 mt-1">Define roles with granular permissions for your team</p>
        </div>
        <Button variant="outline" onClick={() => setShowRoleManager(true)}>
          Advanced Manager
        </Button>
      </div>

      {/* Preset Roles */}
      <Card className="p-6 border-0 shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Quick Setup — Preset Roles</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {PRESET_ROLES.map((preset) => (
            <div key={preset.name} className="p-4 border rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{preset.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{preset.description}</p>
                </div>
                {presetExists(preset.name) ? (
                  <Badge className="bg-green-100 text-green-700 text-xs">Created</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => createPresetMutation.mutate(preset)}
                    disabled={createPresetMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                  >
                    Create
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {preset.permissions.map((p, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                    {getPermissionIcon(p.permission_type)}
                    {p.resource}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Team Members with Roles */}
      <Card className="p-6 border-0 shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Team Members & Assigned Roles
        </h4>

        {teamMembers.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">
            No team members yet. Invite members from the Team Management tab.
          </p>
        ) : (
          <div className="space-y-3">
            {teamMembers
              .filter((m) => m.status === "accepted")
              .map((member) => {
                const memberRoles = getMemberRoles(member.invited_email);
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div>
                      <p className="font-semibold text-gray-900">{member.invited_name}</p>
                      <p className="text-sm text-gray-600">{member.invited_email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {memberRoles.length === 0 ? (
                          <Badge variant="outline" className="text-xs text-gray-500">No roles assigned</Badge>
                        ) : (
                          memberRoles.map((r) => (
                            <Badge key={r.id} className="bg-blue-100 text-blue-700 text-xs">
                              {r.role_name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowAssignDialog(true);
                      }}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Assign Role
                    </Button>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Active Roles Summary */}
      {roles.length > 0 && (
        <Card className="p-6 border-0 shadow-lg">
          <h4 className="font-semibold text-gray-900 mb-4">Active Roles ({roles.length})</h4>
          <div className="grid md:grid-cols-3 gap-3">
            {roles.map((role) => (
              <div key={role.id} className="p-3 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <p className="font-semibold text-sm text-gray-900">{role.role_name}</p>
                <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {role.assigned_members?.length || 0} member(s)
                  </Badge>
                  <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                    {role.role_type === "project_level" ? "Project" : "Org"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {selectedMember?.invited_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {roles.length === 0 ? (
              <p className="text-sm text-gray-600">No roles created yet. Create a preset role first.</p>
            ) : (
              <>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
                  <Button
                    onClick={() => assignRoleMutation.mutate({ roleId: selectedRoleId, member: selectedMember })}
                    disabled={!selectedRoleId || assignRoleMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {assignRoleMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Assign Role
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Role Manager Dialog */}
      <Dialog open={showRoleManager} onOpenChange={setShowRoleManager}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced Role & Permission Manager</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-gray-500 text-center py-8">Advanced role management will be available in the Internal Portal.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}