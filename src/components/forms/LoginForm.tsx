"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, CircularProgress, Collapse, TextField, InputAdornment, IconButton } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAppDispatch } from "@/redux/hooks";
import { loginSuccess, setLoading } from "@/redux/slices/authSlice";
import { supabase } from "@/lib/supabase";
import type { SubgerenciaType } from "@/lib/constants";
import type { User } from "@/types/auth";

interface LoginFormProps {
  subgerencia: SubgerenciaType;
}

export default function LoginForm({ subgerencia }: LoginFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Ingresa tu usuario y contraseña");
      return;
    }

    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        setErrorMsg("Usuario o contraseña incorrectos");
        return;
      }

      const session = data.session;
      const supaUser = data.user;

      const user: User = {
        id: supaUser.id,
        username: supaUser.email ?? "",
        email: supaUser.email ?? "",
        firstName: supaUser.user_metadata?.nombre ?? supaUser.email?.split("@")[0] ?? "Usuario",
        lastName: supaUser.user_metadata?.apellido ?? "",
        fullName: supaUser.user_metadata?.nombre_completo ?? supaUser.email?.split("@")[0] ?? "Usuario",
        permissions: ["all"],
        subgerencia,
        cargo: supaUser.user_metadata?.cargo ?? "Operador",
      };

      dispatch(loginSuccess({ token: session.access_token, user }));

      if (typeof document !== "undefined") {
        document.cookie = `auth_token=${session.access_token}; path=/; max-age=86400; SameSite=Strict`;
      }

      router.push(`/${subgerencia}/donaciones`);
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <div
        className="bg-white rounded-3xl p-10"
        style={{ boxShadow: "0 20px 60px rgba(13, 27, 62, 0.12)" }}
      >
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span
            className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border"
            style={{ color: "#0d1b3e", borderColor: "#93c5fd", background: "#eff6ff" }}
          >
            Data Management Platform
          </span>
        </div>

        {/* Título */}
        <h1 className="text-center font-black leading-none mb-2" style={{ fontSize: "2rem", color: "#0d1b3e" }}>
          Campaign
        </h1>
        <h1 className="text-center font-black leading-none mb-8" style={{ fontSize: "2.4rem", color: "#1565c0" }}>
          Data Repository
        </h1>

        <Collapse in={!!errorMsg}>
          <Alert
            severity="error"
            onClose={() => setErrorMsg(null)}
            sx={{ mb: 2, borderRadius: "12px" }}
          >
            {errorMsg}
          </Alert>
        </Collapse>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email / Usuario */}
          <TextField
            fullWidth
            label="Correo / Usuario"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="username"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <div style={{ marginTop: "8px" }} />

          {/* Contraseña */}
          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword
                        ? <VisibilityOffIcon sx={{ fontSize: 20, color: "#94a3b8" }} />
                        : <VisibilityIcon sx={{ fontSize: 20, color: "#94a3b8" }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          {/* Botón */}
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{
              mt: 1,
              background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
              "&:hover": { background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)" },
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: "bold",
              py: 1.8,
              borderRadius: "50px",
              boxShadow: "0 8px 24px rgba(21, 101, 192, 0.35)",
              letterSpacing: "0.05em",
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : "INGRESAR →"}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs mt-6" style={{ color: "#94a3b8" }}>
        San Juan de Lurigancho · Gerencia de Desarrollo Humano
      </p>
    </div>
  );
}
