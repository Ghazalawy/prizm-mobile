import React, { createContext, useContext, useMemo } from "react";
import { usePermissionsQuery, type PermissionsPayload } from "./queries/permissions";

type PermissionHelpers = {
  isAdmin: boolean;
  isLoaded: boolean;
  isFailed: boolean;
  canView: (feature: string) => boolean;
  canViewOwn: (feature: string) => boolean;
  canCreate: (feature: string) => boolean;
  canEdit: (feature: string) => boolean;
  canDelete: (feature: string) => boolean;
  hasPermission: (feature: string, capability: string) => boolean;
  hasAnyPermission: (feature: string) => boolean;
  retry: () => void;
};

const PermissionContext = createContext<PermissionHelpers>({
  isAdmin: false,
  isLoaded: false,
  isFailed: false,
  canView: () => false,
  canViewOwn: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canDelete: () => false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  retry: () => undefined,
});

type Props = {
  children: React.ReactNode;
  isAuthenticated: boolean;
};

export function PermissionProvider({ children, isAuthenticated }: Props) {
  const query = usePermissionsQuery(isAuthenticated);
  const data: PermissionsPayload | undefined = query.data;
  const isFailed = query.isError;

  const helpers = useMemo<PermissionHelpers>(() => {
    const isAdmin = data?.is_admin ?? false;
    const isLoaded = !!data;
    const perms = data?.permissions ?? {};

    function hasPermission(feature: string, capability: string): boolean {
      if (!isLoaded || isFailed) return false;
      if (isAdmin) return true;
      return !!perms[feature]?.[capability];
    }

    function hasAnyPermission(feature: string): boolean {
      if (!isLoaded || isFailed) return false;
      if (isAdmin) return true;
      const featurePerms = perms[feature];
      if (!featurePerms) return false;
      return Object.values(featurePerms).some(Boolean);
    }

    return {
      isAdmin,
      isLoaded,
      isFailed,
      canView: (feature) => hasPermission(feature, "view"),
      canViewOwn: (feature) => hasPermission(feature, "view_own"),
      canCreate: (feature) => hasPermission(feature, "create"),
      canEdit: (feature) => hasPermission(feature, "edit"),
      canDelete: (feature) => hasPermission(feature, "delete"),
      hasPermission,
      hasAnyPermission,
      retry: () => { void query.refetch(); },
    };
  }, [data, isFailed, query.refetch]);

  return (
    <PermissionContext.Provider value={helpers}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionHelpers {
  return useContext(PermissionContext);
}
