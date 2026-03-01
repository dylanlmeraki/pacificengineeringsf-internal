/**
 * Permission Helpers
 * Utility functions for client-side role-based access control
 * 
 * Node.js Migration Note: These will be moved to a shared lib/ folder
 * and used by both frontend and backend for consistent permission validation
 */

export type Permission = {
  id: string;
  role_id: string;
  resource: string;
  permission_type: "view" | "create" | "edit" | "delete" | "approve" | "comment";
  access_level: "none" | "read_only" | "read_write" | "admin";
};

export type ClientRole = {
  id: string;
  role_name: string;
  assigned_members: Array<{ user_email: string; user_name: string }>;
};

/**
 * Check if user can perform action on resource
 */
export function canUserPerformAction(
  userEmail: string,
  userRoles: ClientRole[],
  rolePermissions: Record<string, Permission[]>,
  resource: string,
  action: "view" | "create" | "edit" | "delete" | "approve" | "comment"
): boolean {
  // Super admin or owner always has access
  if (userEmail?.endsWith("@admin.internal")) return true;

  // Check if any of user's roles grant this permission
  return userRoles.some((role) => {
    const permissions = rolePermissions[role.id] || [];
    return permissions.some((perm) => {
      if (perm.resource !== resource || perm.permission_type !== action) return false;

      // Check access level
      if (perm.access_level === "none") return false;
      if (perm.access_level === "admin") return true;
      if (perm.access_level === "read_write" && (action === "edit" || action === "create")) return true;
      if (perm.access_level === "read_only" && action === "view") return true;

      return false;
    });
  });
}

/**
 * Get allowed actions for user on resource
 */
export function getAllowedActions(
  userEmail: string,
  userRoles: ClientRole[],
  rolePermissions: Record<string, Permission[]>,
  resource: string
): string[] {
  const actions: string[] = [];
  const actionTypes = ["view", "create", "edit", "delete", "approve", "comment"];

  actionTypes.forEach((action) => {
    if (
      canUserPerformAction(
        userEmail,
        userRoles,
        rolePermissions,
        resource,
        action as any
      )
    ) {
      actions.push(action);
    }
  });

  return actions;
}

/**
 * Check if resource is visible to user
 */
export function canUserViewResource(
  userEmail: string,
  userRoles: ClientRole[],
  rolePermissions: Record<string, Permission[]>,
  resource: string
): boolean {
  return canUserPerformAction(
    userEmail,
    userRoles,
    rolePermissions,
    resource,
    "view"
  );
}

/**
 * Check if user can edit resource
 */
export function canUserEditResource(
  userEmail: string,
  userRoles: ClientRole[],
  rolePermissions: Record<string, Permission[]>,
  resource: string
): boolean {
  return canUserPerformAction(
    userEmail,
    userRoles,
    rolePermissions,
    resource,
    "edit"
  );
}

/**
 * Get access level for user on resource
 */
export function getUserAccessLevel(
  userEmail: string,
  userRoles: ClientRole[],
  rolePermissions: Record<string, Permission[]>,
  resource: string
): "none" | "read_only" | "read_write" | "admin" {
  // Super admin
  if (userEmail?.endsWith("@admin.internal")) return "admin";

  // Check all permissions and return highest access level
  let maxAccessLevel = "none";
  const accessLevelRank = { none: 0, read_only: 1, read_write: 2, admin: 3 };

  userRoles.forEach((role) => {
    const permissions = rolePermissions[role.id] || [];
    permissions.forEach((perm) => {
      if (perm.resource === resource) {
        const currentRank = accessLevelRank[perm.access_level as keyof typeof accessLevelRank];
        const maxRank = accessLevelRank[maxAccessLevel as keyof typeof accessLevelRank];
        if (currentRank > maxRank) {
          maxAccessLevel = perm.access_level;
        }
      }
    });
  });

  return maxAccessLevel as "none" | "read_only" | "read_write" | "admin";
}