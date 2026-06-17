"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServiciosSocialesLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login/programas-sociales");
  }, [router]);

  return null;
}
