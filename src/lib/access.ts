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

// ─── Permissões de ação (o que cada perfil pode FAZER) ───────────────────────

export type ActionPermissions = {
  can_create_jobs: boolean;
  can_edit_jobs: boolean;
  can_delete_jobs: boolean;
  can_approve_jobs: boolean;
  can_create_candidates: boolean;
  can_edit_candidates: boolean;
  can_delete_candidates: boolean;
  can_manage_users: boolean;
  can_manage_units: boolean;
};

export type ActionPermissionKey = keyof ActionPermissions;

export const ACTION_PERMISSION_LABELS: Record<ActionPermissionKey, string> = {
  can_create_jobs:       "Criar vagas",
  can_edit_jobs:         "Editar vagas",
  can_delete_jobs:       "Excluir vagas",
  can_approve_jobs:      "Aprovar vagas",
  can_create_candidates: "Cadastrar candidatos",
  can_edit_candidates:   "Editar candidatos",
  can_delete_candidates: "Excluir candidatos",
  can_manage_users:      "Gerenciar usuários",
  can_manage_units:      "Gerenciar unidades",
};

export const ACTION_PERMISSION_KEYS: ActionPermissionKey[] = Object.keys(
  ACTION_PERMISSION_LABELS
) as ActionPermissionKey[];

// Perfis de ação pré-definidos
export const ACTION_PROFILE_PRESETS: Record<AccessProfile, ActionPermissions> = {
  "admin-mestre": {
    can_create_jobs: true,
    can_edit_jobs: true,
    can_delete_jobs: true,
    can_approve_jobs: true,
    can_create_candidates: true,
    can_edit_candidates: true,
    can_delete_candidates: true,
    can_manage_users: true,
    can_manage_units: true,
  },
  "rh-operacao": {
    can_create_jobs: true,
    can_edit_jobs: true,
    can_delete_jobs: false,
    can_approve_jobs: false,
    can_create_candidates: true,
    can_edit_candidates: true,
    can_delete_candidates: false,
    can_manage_users: false,
    can_manage_units: false,
  },
  "executivo-leitura": {
    can_create_jobs: false,
    can_edit_jobs: false,
    can_delete_jobs: false,
    can_approve_jobs: false,
    can_create_candidates: false,
    can_edit_candidates: false,
    can_delete_candidates: false,
    can_manage_users: false,
    can_manage_units: false,
  },
  "custom": {
    can_create_jobs: false,
    can_edit_jobs: false,
    can_delete_jobs: false,
    can_approve_jobs: false,
    can_create_candidates: false,
    can_edit_candidates: false,
    can_delete_candidates: false,
    can_manage_users: false,
    can_manage_units: false,
  },
};

export function getActionPermissions(user?: {
  role?: string;
  access_profile?: string;
  id?: string;
  action_permissions_json?: string | null;
} | null): ActionPermissions {
  if (user?.id === "admin-root") return { ...ACTION_PROFILE_PRESETS["admin-mestre"] };
  if (user?.role === "admin") return { ...ACTION_PROFILE_PRESETS["admin-mestre"] };

  // Custom profile with stored action permissions
  if (user?.action_permissions_json) {
    try {
      const parsed = JSON.parse(user.action_permissions_json);
      const base = { ...ACTION_PROFILE_PRESETS["custom"] };
      for (const key of ACTION_PERMISSION_KEYS) {
        if (key in parsed) base[key] = Boolean(parsed[key]);
      }
      return base;
    } catch { /* fall through */ }
  }

  const profile = (user?.access_profile as AccessProfile) || "rh-operacao";
  return { ...(ACTION_PROFILE_PRESETS[profile] ?? ACTION_PROFILE_PRESETS["rh-operacao"]) };
}

// ─── Permissões de módulo (acesso às páginas) ─────────────────────────────────

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

export const ACCESS_PROFILE_DESCRIPTIONS: Record<AccessProfile, string> = {
  "admin-mestre":      "Acesso total — cria, edita, exclui, aprova e administra usuários.",
  "rh-operacao":       "Cria e edita vagas e candidatos. Não exclui nem aprova. Sem administração.",
  "executivo-leitura": "Somente visualização — zero botões de ação. Ideal para diretores e gestores externos.",
  "custom":            "Permissões configuradas manualmente.",
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
  "executivo-leitura": makePermissions(["dashboard", "aurora_ai", "jobs", "candidates", "tools"]),
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
