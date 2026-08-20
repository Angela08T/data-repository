"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/navigation/Header";
import Sidebar from "@/components/navigation/Sidebar";
import { SUBGERENCIAS, SubgerenciaType, MODULOS_PROGRAMAS_SOCIALES, primeraRutaAccesible, type MenuItem } from "@/lib/constants";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

// Aplana el menú (incluyendo hijos) a pares ruta/permisos, para poder resolver
// a qué módulo pertenece la URL actual y qué permisos exige.
function flattenRutas(items: MenuItem[]): { ruta: string; permisos?: string[] }[] {
  return items.flatMap((item) => [
    ...(item.ruta ? [{ ruta: item.ruta, permisos: item.permisos }] : []),
    ...(item.children ? flattenRutas(item.children) : []),
  ]);
}

export default function ProgramasSocialesLayout({ children }: { children: React.ReactNode }) {
  const [toggled, setToggled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { filterMenuItems, hasPermission, isAdmin, user } = usePermissions();

  const allMenuItems = MODULOS_PROGRAMAS_SOCIALES.map((modulo) => ({
    ...modulo,
    subgerencia: SubgerenciaType.PROGRAMAS_SOCIALES,
  }));

  // Filtrar módulos según permisos del usuario
  const menuItems = filterMenuItems(allMenuItems);

  const rutasConPermiso = useMemo(() => flattenRutas(allMenuItems), [allMenuItems]);

  // El dashboard raíz ("/programas-sociales") es un placeholder sin datos
  // sensibles, así que no requiere permiso de ningún módulo específico.
  const esRaiz = pathname === "/programas-sociales" || pathname === "/programas-sociales/";

  const accesoPermitido = useMemo(() => {
    if (!user || isAdmin() || esRaiz) return true;
    const match = rutasConPermiso
      .filter((r) => pathname === r.ruta || pathname?.startsWith(`${r.ruta}/`))
      .sort((a, b) => b.ruta.length - a.ruta.length)[0];
    return !!match && hasPermission(match.permisos ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user, esRaiz]);

  useEffect(() => {
    if (!accesoPermitido) {
      router.replace(primeraRutaAccesible(menuItems) ?? "/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesoPermitido]);

  if (!accesoPermitido) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        toggled={toggled}
        setToggled={setToggled}
        menuItems={menuItems}
        color={subgerencia.color}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header toggled={toggled} setToggled={setToggled} />
        <main className="bg-programas-sociales-light flex-1 overflow-auto">
          <div className="page-enter p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
