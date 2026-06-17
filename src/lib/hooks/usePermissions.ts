import { useAppSelector } from "@/redux/hooks";
import type { User } from "@/types/auth";
import type { MenuItem } from "@/lib/constants";

/**
 * Hook para verificar permisos del usuario
 * Soporta jerarquía de permisos:
 * - "all" = acceso total al sistema
 * - "all_programas_sociales" = acceso a todas las áreas de Programas Sociales
 * - "all_servicios_sociales" = acceso a todas las áreas de Servicios Sociales
 * - "pvl", "ciam", etc. = acceso a área específica
 */
export const usePermissions = () => {
  const { user } = useAppSelector((state) => state.auth);

  /**
   * Verifica si el usuario tiene al menos uno de los permisos requeridos
   */
  const hasPermission = (requiredPermissions: string | string[]): boolean => {
    if (!user || !user.permissions) {
      return false;
    }

    // Si tiene permiso "all", tiene acceso a todo
    if (user.permissions.includes("all")) {
      return true;
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return permissions.some((perm) => user.permissions.includes(perm));
  };

  /**
   * Verifica si el usuario es administrador
   */
  const isAdmin = (): boolean => {
    return user?.permissions?.includes("all") || false;
  };

  /**
   * Verifica si el usuario puede editar/eliminar registros
   * Los usuarios con permiso "readonly" no pueden editar ni eliminar
   */
  const canEdit = (): boolean => {
    if (!user) return false;
    return !user.permissions.includes("readonly");
  };

  const canCreate = (moduleName: string): boolean => {
    if (!user) return false;
    if (user.is_super || user.permissions.includes("all")) return true;
    return user.moduleAbilities?.[moduleName]?.includes("CREATE") ?? false;
  };

  const canRead = (moduleName: string): boolean => {
    if (!user) return false;
    if (user.is_super || user.permissions.includes("all")) return true;
    return user.moduleAbilities?.[moduleName]?.includes("READ") ?? false;
  };

  const canUpdate = (moduleName: string): boolean => {
    if (!user) return false;
    if (user.is_super || user.permissions.includes("all")) return true;
    return user.moduleAbilities?.[moduleName]?.includes("UPDATE") ?? false;
  };

  const canDelete = (moduleName: string): boolean => {
    if (!user) return false;
    if (user.is_super || user.permissions.includes("all")) return true;
    return user.moduleAbilities?.[moduleName]?.includes("DELETE") ?? false;
  };

  /**
   * Verifica si el usuario puede ver la columna de Observación
   * Los usuarios con permiso "readonly" no ven esta columna
   */
  const canShowObservacion = (): boolean => {
    if (!user) return false;
    return !user.permissions.includes("readonly");
  };

  /**
   * Verifica si el usuario es subgerente de Programas Sociales
   */
  const isSubgerentePS = (): boolean => {
    return user?.permissions?.includes("all_programas_sociales") || isAdmin();
  };

  /**
   * Verifica si el usuario es subgerente de Servicios Sociales
   */
  const isSubgerenteSS = (): boolean => {
    return user?.permissions?.includes("all_servicios_sociales") || isAdmin();
  };

  /**
   * Filtra los items del menú según los permisos del usuario
   */
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    if (!user || !user.permissions) {
      return [];
    }

    // Si es admin, mostrar todo
    if (isAdmin()) {
      return items;
    }

    return items.reduce<MenuItem[]>((acc, item) => {
      // Verificar si el usuario tiene permiso para este item
      const hasAccess = !item.permisos || item.permisos.length === 0 || hasPermission(item.permisos);

      if (hasAccess) {
        // Si tiene hijos, filtrarlos recursivamente
        if (item.children && item.children.length > 0) {
          const filteredChildren = filterMenuItems(item.children);
          // Solo agregar si tiene al menos un hijo visible
          if (filteredChildren.length > 0) {
            acc.push({
              ...item,
              children: filteredChildren,
            });
          }
        } else {
          // Si no tiene hijos, agregar directamente
          acc.push(item);
        }
      }

      return acc;
    }, []);
  };

  /**
   * Verifica si el usuario tiene acceso a un módulo específico
   */
  const hasModuleAccess = (moduleName: string): boolean => {
    if (isAdmin()) return true;

    // Mapear módulos a permisos
    const modulePermissions: Record<string, string[]> = {
      pvl: ["pvl", "all_programas_sociales"],
      pantbc: ["pantbc", "all_programas_sociales"],
      comedores: ["comedores_populares", "all_programas_sociales"],
      ollas: ["ollas_comunes", "all_programas_sociales"],
      ule: ["ule", "all_programas_sociales"],
      omaped: ["omaped", "all_programas_sociales"],
      ciam: ["ciam", "all_programas_sociales"],
      participacion: ["participacion_ciudadana", "all_servicios_sociales"],
      deportes: ["servicios_deporte", "all_servicios_sociales"],
      salud: ["salud", "all_servicios_sociales"],
    };

    const permissions = modulePermissions[moduleName] || [moduleName];
    return hasPermission(permissions);
  };

  /**
   * Obtiene las capas del mapa que el usuario puede ver
   */
  const getVisibleMapLayers = (): string[] => {
    if (isAdmin() || isSubgerentePS()) {
      return ["jurisdicciones", "pvl", "pantbc", "comedores", "ollas", "ule", "omaped", "ciam"];
    }

    const layers = ["jurisdicciones"]; // Siempre visible

    if (hasPermission(["pvl", "mapa_pvl"])) layers.push("pvl");
    if (hasPermission(["pantbc", "mapa_pantbc"])) layers.push("pantbc");
    if (hasPermission(["comedores_populares", "mapa_comedores"])) layers.push("comedores");
    if (hasPermission(["ollas_comunes", "mapa_ollas"])) layers.push("ollas");
    if (hasPermission(["ule", "mapa_ule"])) layers.push("ule");
    if (hasPermission(["omaped", "mapa_omaped"])) layers.push("omaped");
    if (hasPermission(["ciam", "mapa_ciam"])) layers.push("ciam");

    return layers;
  };

  return {
    user,
    hasPermission,
    isAdmin,
    isSubgerentePS,
    isSubgerenteSS,
    filterMenuItems,
    hasModuleAccess,
    getVisibleMapLayers,
    canEdit,
    canShowObservacion,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
  };
};

/**
 * Función helper para verificar permisos (sin hook)
 * Útil para usar fuera de componentes
 */
export const hasPermissionFunction = (user: User | null, requiredPermissions: string | string[]): boolean => {
  if (!user || !user.permissions) {
    return false;
  }

  // Si tiene permiso "all", tiene acceso a todo
  if (user.permissions.includes("all")) {
    return true;
  }

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  return permissions.some((perm) => user.permissions.includes(perm));
};

/**
 * Función helper para filtrar menú items
 */
export const filterMenuItemsFunction = (user: User | null, items: MenuItem[]): MenuItem[] => {
  if (!user || !user.permissions) {
    return [];
  }

  // Si es admin, mostrar todo
  if (user.permissions.includes("all")) {
    return items;
  }

  return items.reduce<MenuItem[]>((acc, item) => {
    const hasAccess = !item.permisos || item.permisos.length === 0 || hasPermissionFunction(user, item.permisos);

    if (hasAccess) {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItemsFunction(user, item.children);
        if (filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren,
          });
        }
      } else {
        acc.push(item);
      }
    }

    return acc;
  }, []);
};
