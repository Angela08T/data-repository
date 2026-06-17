"use client";

import LoginForm from "@/components/forms/LoginForm";
import { SubgerenciaType } from "@/lib/constants";

export default function ProgramasSocialesLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffffff 0%, #e8f0fe 50%, #dbeafe 100%)" }}>
      <LoginForm subgerencia={SubgerenciaType.PROGRAMAS_SOCIALES} />
    </div>
  );
}
