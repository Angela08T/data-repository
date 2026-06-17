"use client";

import { useState } from "react";
import Header from "@/components/navigation/Header";
import Sidebar from "@/components/navigation/Sidebar";
import { SUBGERENCIAS, SubgerenciaType, MODULOS_SERVICIOS_SOCIALES } from "@/lib/constants";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.SERVICIOS_SOCIALES];

export default function ServiciosSocialesLayout({ children }: { children: React.ReactNode }) {
  const [toggled, setToggled] = useState(false);
  const { filterMenuItems } = usePermissions();

  const allMenuItems = MODULOS_SERVICIOS_SOCIALES.map((modulo) => ({
    ...modulo,
    subgerencia: SubgerenciaType.SERVICIOS_SOCIALES,
  }));

  // Filtrar módulos según permisos del usuario
  const menuItems = filterMenuItems(allMenuItems);

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
        <main className="bg-gray-100 flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
