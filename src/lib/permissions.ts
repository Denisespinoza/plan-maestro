export type AppRole = 'admin' | 'empleado' | 'pendiente';

export interface AppPermissions {
  canViewOrders: boolean;
  canCreateOrders: boolean;
  canEditOrders: boolean;
  canDeleteOrders: boolean;
  canViewCustomers: boolean;
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canViewInventory: boolean;
  canCreateInventory: boolean;
  canEditInventory: boolean;
  canDeleteInventory: boolean;
  canViewCatalog: boolean;
  canCreateCatalog: boolean;
  canEditCatalog: boolean;
  canDeleteCatalog: boolean;
  canViewLibrary: boolean;
  canCreateLibrary: boolean;
  canEditLibrary: boolean;
  canDeleteLibrary: boolean;
  canViewFinances: boolean;
  canViewEmployees: boolean;
  canManageEmployees: boolean;
  canManageUsers: boolean;
}

const ADMIN_ROLES = new Set(['admin', 'administrator', 'administrador']);
const EMPLOYEE_ROLES = new Set(['empleado', 'employee', 'staff']);
const PENDING_ROLES = new Set(['pendiente', 'pending']);

const allPermissions: AppPermissions = {
  canViewOrders: true,
  canCreateOrders: true,
  canEditOrders: true,
  canDeleteOrders: true,
  canViewCustomers: true,
  canCreateCustomers: true,
  canEditCustomers: true,
  canDeleteCustomers: true,
  canViewInventory: true,
  canCreateInventory: true,
  canEditInventory: true,
  canDeleteInventory: true,
  canViewCatalog: true,
  canCreateCatalog: true,
  canEditCatalog: true,
  canDeleteCatalog: true,
  canViewLibrary: true,
  canCreateLibrary: true,
  canEditLibrary: true,
  canDeleteLibrary: true,
  canViewFinances: true,
  canViewEmployees: true,
  canManageEmployees: true,
  canManageUsers: true,
};

const employeePermissions: AppPermissions = {
  canViewOrders: true,
  canCreateOrders: true,
  canEditOrders: false,
  canDeleteOrders: false,
  canViewCustomers: true,
  canCreateCustomers: true,
  canEditCustomers: false,
  canDeleteCustomers: false,
  canViewInventory: true,
  canCreateInventory: true,
  canEditInventory: false,
  canDeleteInventory: false,
  canViewCatalog: true,
  canCreateCatalog: true,
  canEditCatalog: false,
  canDeleteCatalog: false,
  canViewLibrary: true,
  canCreateLibrary: true,
  canEditLibrary: false,
  canDeleteLibrary: false,
  canViewFinances: false,
  canViewEmployees: false,
  canManageEmployees: false,
  canManageUsers: false,
};

const pendingPermissions: AppPermissions = {
  canViewOrders: false,
  canCreateOrders: false,
  canEditOrders: false,
  canDeleteOrders: false,
  canViewCustomers: false,
  canCreateCustomers: false,
  canEditCustomers: false,
  canDeleteCustomers: false,
  canViewInventory: false,
  canCreateInventory: false,
  canEditInventory: false,
  canDeleteInventory: false,
  canViewCatalog: false,
  canCreateCatalog: false,
  canEditCatalog: false,
  canDeleteCatalog: false,
  canViewLibrary: false,
  canCreateLibrary: false,
  canEditLibrary: false,
  canDeleteLibrary: false,
  canViewFinances: false,
  canViewEmployees: false,
  canManageEmployees: false,
  canManageUsers: false,
};

export function normalizeRole(role: unknown): string {
  return String(role ?? '').trim().toLowerCase();
}

export function resolveRole(role: unknown): AppRole {
  const normalized = normalizeRole(role);
  if (ADMIN_ROLES.has(normalized)) return 'admin';
  if (EMPLOYEE_ROLES.has(normalized)) return 'empleado';
  if (PENDING_ROLES.has(normalized)) return 'pendiente';
  return 'pendiente';
}

export function getPermissionsForRole(role: unknown): AppPermissions {
  const resolved = resolveRole(role);
  if (resolved === 'admin') return allPermissions;
  if (resolved === 'empleado') return employeePermissions;
  return pendingPermissions;
}

export function can(role: unknown, permission: keyof AppPermissions): boolean {
  return getPermissionsForRole(role)[permission];
}

export function assertPermission(role: unknown, permission: keyof AppPermissions, message?: string): void {
  if (!can(role, permission)) {
    throw new Error(message || 'No tenés permisos para realizar esta acción.');
  }
}
