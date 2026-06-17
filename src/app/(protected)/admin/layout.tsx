"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import Header from "@/components/navigation/Header";
import Sidebar from "@/components/navigation/Sidebar";
import { MODULOS_ADMIN } from "@/lib/constants";

const ADMIN_COLOR = "#1565c0";
const ADMIN_NAME = "Administración del Sistema";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLogin } = useAppSelector((state) => state.auth);
  const [toggled, setToggled] = useState(false);

  useEffect(() => {
    if (!isLogin || !user) {
      router.replace("/");
      return;
    }
    if (!user.permissions.includes("all")) {
      router.replace("/");
    }
  }, [isLogin, user, router]);

  if (!isLogin || !user || !user.permissions.includes("all")) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        toggled={toggled}
        setToggled={setToggled}
        menuItems={MODULOS_ADMIN}
        color={ADMIN_COLOR}
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
