"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar as ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Avatar, Box, Button, Popover, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logout } from "@/redux/slices/authSlice";
import { showConfirm } from "@/lib/utils/swalConfig";
import DynamicIcon from "./DynamicIcon";
import type { MenuItem as MenuItemType } from "@/lib/constants";

interface SidebarProps {
  toggled: boolean;
  setToggled: (value: boolean) => void;
  menuItems: MenuItemType[];
  color: string;
}

const NAVY   = "#0d1b3e";
const BLUE   = "#1565c0";
const BLUE_L = "#3b82f6";

export default function Sidebar({ toggled, setToggled, menuItems, color }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl]   = useState<null | HTMLElement>(null);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handlePopoverOpen  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handlePopoverClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handlePopoverClose();
    const result = await showConfirm("¿Cerrar sesión?", "¿Estás seguro de que deseas cerrar sesión?");
    if (result.isConfirmed) {
      if (typeof document !== "undefined") {
        document.cookie = "auth_token=; path=/; max-age=0";
      }
      dispatch(logout());
      window.location.replace("/");
    }
  };

  const open = Boolean(anchorEl);

  const menuItemStyles = {
    root: { fontSize: "13px", fontWeight: 400 },
    icon: { color: "#93c5fd" },
    SubMenuExpandIcon: { color: "#4b6cb7" },
    subMenuContent: { backgroundColor: "rgba(0,0,0,0.15)" },
    button: {
      color: "#cbd5e1",
      transition: "all 0.18s ease",
      "&:hover": {
        backgroundColor: "rgba(59,130,246,0.18)",
        color: "#ffffff",
        paddingLeft: "22px",
      },
    },
    label: { fontWeight: 600 },
  };

  const renderMenuItem = (item: MenuItemType) => {
    const active = pathname === item.ruta;

    if (item.children && item.children.length > 0) {
      return (
        <SubMenu
          key={item.id}
          label={item.nombre}
          icon={item.icono ? <DynamicIcon iconName={item.icono} /> : undefined}
        >
          {item.children.map((child) => renderMenuItem(child))}
        </SubMenu>
      );
    }

    return (
      <MenuItem
        key={item.id}
        component={<Link href={item.ruta || "#"} />}
        icon={item.icono ? <DynamicIcon iconName={item.icono} /> : undefined}
        style={{
          backgroundColor: active ? "rgba(59,130,246,0.22)" : "transparent",
          borderLeft:       active ? `3px solid ${BLUE_L}` : "3px solid transparent",
          transition:       "all 0.18s ease",
        }}
      >
        <span style={{ color: active ? "#ffffff" : "#cbd5e1", fontWeight: active ? 700 : 500 }}>
          {item.nombre}
        </span>
      </MenuItem>
    );
  };

  if (!mounted) {
    return <div className="relative h-full z-[1200]" style={{ width: 250, background: NAVY }} />;
  }

  return (
    <div className="relative h-full z-[1200]">
      <ProSidebar
        backgroundColor={NAVY}
        className="h-full"
        breakPoint="md"
        collapsed={collapsed}
        toggled={toggled}
        onBackdropClick={() => setToggled(false)}
        rootStyles={{
          color: "#cbd5e1",
          borderRight: "none",
          boxShadow: "4px 0 24px rgba(13,27,62,0.35)",
        }}
      >
        <div className="flex flex-col h-full">

          {/* Logo */}
          <Link
            href="/"
            className="flex justify-center items-center"
            style={{ height: 90, marginBottom: 8, marginTop: 16, textDecoration: "none" }}
          >
            {collapsed ? (
              <div
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "linear-gradient(135deg, #1565c0, #1976d2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(21,101,192,0.5)",
                }}
              >
                <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>C</span>
              </div>
            ) : (
              <div className="text-center px-6">
                <div style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "rgba(21,101,192,0.15)",
                  border: "1px solid rgba(59,130,246,0.25)",
                }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#93c5fd", letterSpacing: "0.2em", textTransform: "uppercase" }}>Campaign</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.2 }}>Data Repository</div>
                </div>
              </div>
            )}
          </Link>

          {/* Divisor */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 8 }} />

          {/* Menú */}
          <div className="flex-1 overflow-hidden overflow-y-auto" style={{ paddingTop: 4 }}>
            <Menu menuItemStyles={menuItemStyles}>
              {menuItems.map((item) => renderMenuItem(item))}
            </Menu>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* Perfil */}
          <div
            className="flex items-center p-4 cursor-pointer w-full"
            style={{ transition: "background 0.18s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            onClick={handlePopoverOpen}
          >
            <Avatar
              alt={user?.fullName || "Usuario"}
              sx={{
                width: collapsed ? 36 : 42,
                height: collapsed ? 36 : 42,
                transition: "all 0.3s ease",
                bgcolor: BLUE,
                fontSize: "1rem",
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(21,101,192,0.4)",
              }}
            >
              {user?.fullName?.charAt(0) || "U"}
            </Avatar>

            {!collapsed && (
              <div className="flex flex-col ml-3 overflow-hidden" style={{ animation: "fadeIn 0.2s ease" }}>
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.fullName || "Usuario"}
                </span>
                <span style={{ color: "#64748b", fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.email || "usuario@campaña.pe"}
                </span>
              </div>
            )}
          </div>
        </div>
      </ProSidebar>

      {/* Botón colapsar (desktop) */}
      <div
        className="justify-center items-center absolute cursor-pointer top-[100px] right-[-12px] rounded-full h-6 w-6 z-10 hidden md:flex"
        style={{
          background: "linear-gradient(135deg, #1565c0, #1976d2)",
          boxShadow: "0 2px 10px rgba(21,101,192,0.45)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronRightRoundedIcon
          className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
          sx={{ fontSize: 18, color: "#fff" }}
        />
      </div>

      {/* Popover de usuario */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 20px 60px rgba(13,27,62,0.2)",
            border: "1px solid rgba(21,101,192,0.1)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header del popover */}
        <div style={{ background: "linear-gradient(135deg, #0d1b3e, #1565c0)", padding: "20px 24px", textAlign: "center" }}>
          <Avatar
            alt={user?.fullName || "Usuario"}
            sx={{ width: 56, height: 56, bgcolor: "rgba(255,255,255,0.2)", margin: "0 auto 10px", fontSize: "1.3rem", fontWeight: 700, border: "2px solid rgba(255,255,255,0.4)" }}
          >
            {user?.fullName?.charAt(0) || "U"}
          </Avatar>
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
            {user?.fullName || "Usuario"}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", mt: 0.3 }}>
            {user?.email || "usuario@campaña.pe"}
          </Typography>
        </div>

        <Box p={2}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              "&:hover": { background: "linear-gradient(135deg, #b91c1c, #991b1b)" },
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.85rem",
              py: 1.2,
              borderRadius: "10px",
              boxShadow: "0 4px 14px rgba(220,38,38,0.3)",
            }}
          >
            Cerrar Sesión
          </Button>
        </Box>
      </Popover>
    </div>
  );
}
