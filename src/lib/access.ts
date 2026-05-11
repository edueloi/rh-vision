export type AccessPermissionKey =
  | "dashboard"
  | "aurora_ai"
  | "jobs"
  | "candidates"
  | "imports"
  | "tools"
  | "administration"
  | "super_admin";

export type AccessProfile =
  | "admin-mestre"
  | "rh-operacao"
  | "executivo-leitura"
  | "custom";

export type AccessPermissions = Record<AccessPermissionKey, boolean>;

export const ACCESS_PERMISSION_KEYS: AccessPermissionKey[] = [
  "dashboard",
  "aurora_ai",
  "jobs",
  "candidates",
  "imports",
  "tools",
  "administration",
  "super_admin",
];

export const ACCESS_PERMISSION_LABELS: Record<AccessPermissionKey, string> = {
  dashboard: "Dashboard",
  aurora_ai: "Aurora AI",
  jobs: "Vagas",
  candidates: "Candidatos",
  imports: "Importação",
  tools: "Ferramentas RH",
  administration: "Administração",
  super_admin: "Super Admin",
};

export const ACCESS_PROFILE_LABELS: Record<AccessProfile, string> = {
  "admin-mestre": "Admin Mestre",
  "rh-operacao": "RH Operação",
  "executivo-leitura": "Executivo Leitura",
  custom: "Customizado",
};

const makePermissions = (enabled: AccessPermissionKey[]): AccessPermissions => {
  return ACCESS_PERMISSION_KEYS.reduce<AccessPermissions>((acc, key) => {
    acc[key] = enabled.includes(key);
    return acc;
  }, {} as AccessPermissions);
};

export const ACCESS_PROFILE_PRESETS: Record<AccessProfile, AccessPermissions> = {
  "admin-mestre": makePermissions([
    "dashboard",
    "aurora_ai",
    "jobs",
    "candidates",
    "imports",
    "tools",
    "administration",
  ]),
  "rh-operacao": makePermissions([
    "dashboard",
    "aurora_ai",
    "jobs",
    "candidates",
    "imports",
    "tools",
  ]),
  "executivo-leitura": makePermissions(["dashboard", "aurora_ai", "jobs", "candidates"]),
  custom: makePermissions([]),
};

export const ROOT_ACCESS_PERMISSIONS: AccessPermissions = makePermissions([
  "dashboard",
  "aurora_ai",
  "jobs",
  "candidates",
  "imports",
  "tools",
  "administration",
  "super_admin",
]);

export function getDefaultAccessProfile(role?: string): AccessProfile {
  if (role === "admin") {
    return "admin-mestre";
  }

  return "rh-operacao";
}

export function getPermissionPreset(profile?: string): AccessPermissions {
  if (profile && profile in ACCESS_PROFILE_PRESETS) {
    return { ...ACCESS_PROFILE_PRESETS[profile as AccessProfile] };
  }

  return { ...ACCESS_PROFILE_PRESETS["rh-operacao"] };
}

export function normalizeAccessPermissions(
  value: unknown,
  fallbackProfile?: string
): AccessPermissions {
  const fallback = getPermissionPreset(fallbackProfile);

  if (!value) {
    return fallback;
  }

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }

  const result = { ...fallback };

  for (const key of ACCESS_PERMISSION_KEYS) {
    if (key in (parsed as Record<string, unknown>)) {
      result[key] = Boolean((parsed as Record<string, unknown>)[key]);
    }
  }

  return result;
}

export function getPermissionsForUser(
  user?: {
    id?: string;
    role?: string;
    permissions_json?: unknown;
    access_profile?: string;
  } | null
): AccessPermissions {
  if (user?.id === "admin-root") {
    return { ...ROOT_ACCESS_PERMISSIONS };
  }

  let perms: AccessPermissions;

  if (user?.permissions_json) {
    perms = normalizeAccessPermissions(user.permissions_json, user.access_profile);
  } else if (user?.role === "admin") {
    perms = getPermissionPreset("admin-mestre");
  } else {
    perms = getPermissionPreset(user?.access_profile || "rh-operacao");
  }

  // Usuários de tenant nunca têm super_admin, independente do que vier do banco
  perms.super_admin = false;
  return perms;
}

export function stringifyAccessPermissions(
  permissions: AccessPermissions | Record<string, boolean>,
  fallbackProfile?: string
) {
  return JSON.stringify(normalizeAccessPermissions(permissions, fallbackProfile));
}
