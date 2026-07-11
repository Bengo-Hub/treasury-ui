import type { Permission, UserProfile, UserRole } from "./types";

type Operator = "and" | "or";

export function userHasRole(
  user: UserProfile | null,
  roles?: UserRole[] | null,
  operator: Operator = "or",
): boolean {
  if (!roles?.length) return true;
  if (!user) return false;
  // Superuser (tenant-scoped) OR platform owner (global) bypasses all role checks. isSuperUser is
  // derived from the SSO /me tenant roles, so a platform owner whose treasury-tenant roles lack
  // "superuser" must still bypass — hence isPlatformOwner is checked explicitly.
  if (user.isSuperUser || user.isPlatformOwner || user.roles.includes("superuser")) return true;
  const matches = roles.map((role) => user.roles.includes(role));
  return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
}

export function userHasPermission(
  user: UserProfile | null,
  permissions?: Permission[] | null,
  operator: Operator = "or",
): boolean {
  if (!permissions?.length) return true;
  if (!user) return false;
  // Superuser (tenant-scoped) OR platform owner (global) bypasses all permission checks. See
  // userHasRole: a platform owner's tenant roles may not include "superuser", so check the flag.
  if (user.isSuperUser || user.isPlatformOwner || user.roles.includes("superuser")) return true;
  const matches = permissions.map((permission) => user.permissions.includes(permission));
  return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
}

export function userCanAccess(
  user: UserProfile | null,
  options: {
    roles?: UserRole[] | null;
    permissions?: Permission[] | null;
    roleOperator?: Operator;
    permissionOperator?: Operator;
  } = {},
): boolean {
  const { roles, permissions, roleOperator = "or", permissionOperator = "or" } = options;
  return (
    userHasRole(user, roles, roleOperator) &&
    userHasPermission(user, permissions, permissionOperator)
  );
}
