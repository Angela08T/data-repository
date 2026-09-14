"use client";

import LoginForm from "@/components/forms/LoginForm";
import { SubgerenciaType } from "@/lib/constants";

export default function ProgramasSocialesLoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 80% -10%, rgba(59,130,246,0.25) 0%, transparent 60%)," +
          "radial-gradient(ellipse 55% 45% at -5% 100%, rgba(37,99,235,0.16) 0%, transparent 55%)," +
          "linear-gradient(160deg, #060a16 0%, #0a1122 50%, #0b1428 100%)",
      }}
    >
      <LoginForm subgerencia={SubgerenciaType.PROGRAMAS_SOCIALES} />
    </div>
  );
}
