"use client";

import { useState } from "react";
import Header from "@/components/navigation/Header";
import Sidebar from "@/components/navigation/Sidebar";
import { SUBGERENCIAS, SubgerenciaType, MODULOS_PROGRAMAS_SOCIALES } from "@/lib/constants";
import { usePermissions } from "@/lib/hooks/usePermissions";

const subgerencia = SUBGERENCIAS[SubgerenciaType.PROGRAMAS_SOCIALES];

export default function ProgramasSocialesLayout({ children }: { children: React.ReactNode }) {
  const [toggled, setToggled] = useState(false);
  const { filterMenuItems } = usePermissions();

  const allMenuItems = MODULOS_PROGRAMAS_SOCIALES.map((modulo) => ({
    ...modulo,
    subgerencia: SubgerenciaType.PROGRAMAS_SOCIALES,
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
        <main className="bg-programas-sociales-light flex-1 overflow-auto">
          <div className="page-enter p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
