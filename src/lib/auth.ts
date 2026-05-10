export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  tenant_id?: string;
  unit_id?: string | null;
  unit_name?: string;
  status?: string;
  access_profile?: string;
  permissions_json?: unknown;
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("auth_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getTenantId(fallback = "develoi") {
  const authUser = getAuthUser();
  if (authUser?.tenant_id) {
    return authUser.tenant_id;
  }

  if (typeof window !== "undefined") {
    const tenantId = new URLSearchParams(window.location.search).get("tenantId");
    if (tenantId) {
      return tenantId;
    }
  }

  return fallback;
}

export function isRootAdmin(user?: Pick<AuthUser, "id"> | null) {
  return user?.id === "admin-root";
}

export function getWelcomeStorageKey(userId: string) {
  return `has_seen_welcome:${userId}`;
}

export function getSelectedUnitStorageKey(tenantId: string) {
  return `selected_unit:${tenantId}`;
}
