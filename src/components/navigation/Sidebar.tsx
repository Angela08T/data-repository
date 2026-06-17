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

const themes = {
  light: {
    sidebar: {
      backgroundColor: "#ffffff",
      color: "#607489",
    },
    menu: {
      icon: "#0098e5",
      hover: {
        backgroundColor: "#c5e4ff",
        color: "#44596e",
      },
    },
  },
};

export default function Sidebar({ toggled, setToggled, menuItems, color }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handlePopoverClose();
    const result = await showConfirm("¿Cerrar sesión?", "¿Estás seguro de que deseas cerrar sesión?");

    if (result.isConfirmed) {
      if (typeof document !== "undefined") {
        document.cookie = "auth_token=; path=/; max-age=0";
      }
      dispatch(logout());
      router.push("/");
    }
  };

  const open = Boolean(anchorEl);

  const menuItemStyles = {
    root: {
      fontSize: "13px",
      fontWeight: 400,
    },
    icon: {
      color: color,
    },
    SubMenuExpandIcon: {
      color: "#b6b7b9",
    },
    subMenuContent: {
      backgroundColor: "transparent",
    },
    button: {
      "&:hover": {
        backgroundColor: `${color}20`,
        color: themes.light.menu.hover.color,
      },
    },
    label: {
      fontWeight: 600,
    },
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

    const style = active
      ? { backgroundColor: `${color}20`, borderLeft: `4px solid ${color}` }
      : { backgroundColor: "transparent", borderLeft: "4px solid transparent" };

    return (
      <MenuItem
        key={item.id}
        component={<Link href={item.ruta || "#"} />}
        icon={item.icono ? <DynamicIcon iconName={item.icono} /> : undefined}
        style={style}
      >
        <span style={{
          color: active ? color : "inherit",
          fontWeight: active ? "bold" : "normal"
        }}>
          {item.nombre}
        </span>
      </MenuItem>
    );
  };

  if (!mounted) {
    return <div className="relative h-full w-max z-[1200]" style={{ width: 250 }} />;
  }

  return (
    <div className="relative h-full w-max z-[1200]">
      <ProSidebar
        backgroundColor="#ffffff"
        className="shadow h-full"
        breakPoint="md"
        collapsed={collapsed}
        toggled={toggled}
        onBackdropClick={() => setToggled(false)}
        rootStyles={{
          color: themes.light.sidebar.color,
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link
            href="/"
            className="flex justify-center items-center h-[90px]"
            style={{ marginBottom: "24px", marginTop: "16px", textDecoration: "none" }}
          >
            {collapsed ? (
              <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#1565c0" }}>C</span>
            ) : (
              <div className="text-center px-4">
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#0d1b3e", letterSpacing: "0.15em", textTransform: "uppercase" }}>Campaign</div>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1565c0", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.2 }}>Data Repository</div>
              </div>
            )}
          </Link>

          {/* Menú */}
          <div className="flex-1 overflow-hidden overflow-y-auto">
            <Menu menuItemStyles={menuItemStyles}>
              {menuItems.map((item) => renderMenuItem(item))}
            </Menu>
          </div>

          {/* Perfil de usuario */}
          <div>
            <div
              className="flex items-center justify-start p-4 border-t border-gray-200 w-full cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={handlePopoverOpen}
            >
              <div className="min-w-12 min-h-12 flex items-center justify-center">
                <Avatar
                  alt={user?.fullName || "Usuario"}
                  sx={{
                    width: collapsed ? 40 : 50,
                    height: collapsed ? 40 : 50,
                    transition: "width 0.5s, height 0.5s",
                    bgcolor: color,
                  }}
                >
                  {user?.fullName?.charAt(0) || "U"}
                </Avatar>
              </div>
              {!collapsed && (
                <div className="flex flex-col ml-4 overflow-hidden">
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {user?.fullName || "Usuario"}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" noWrap>
                    {user?.email || "usuario@sjl.gob.pe"}
                  </Typography>
                </div>
              )}
            </div>

            {/* Popover de usuario */}
            <Popover
              open={open}
              anchorEl={anchorEl}
              onClose={handlePopoverClose}
              anchorOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
            >
              <Box p={2} display="flex" flexDirection="column" alignItems="center" minWidth={200}>
                <Avatar
                  alt={user?.fullName || "Usuario"}
                  sx={{ width: 60, height: 60, mb: 1, bgcolor: color }}
                >
                  {user?.fullName?.charAt(0) || "U"}
                </Avatar>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                  {user?.fullName || "Usuario"}
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 2 }}>
                  {user?.email || "usuario@sjl.gob.pe"}
                </Typography>
                <Button
                  variant="contained"
                  sx={{
                    fontSize: 12,
                    fontWeight: "bold",
                    textTransform: "capitalize",
                    padding: "8px 16px",
                    backgroundColor: color,
                    "&:hover": {
                      backgroundColor: color,
                      filter: "brightness(0.9)",
                    },
                  }}
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                >
                  Cerrar Sesión
                </Button>
              </Box>
            </Popover>
          </div>
        </div>
      </ProSidebar>

      {/* Botón de colapsar (solo desktop) */}
      <div
        className="justify-center items-center absolute cursor-pointer top-[100px] right-[-10px] rounded-full h-6 w-6 text-white z-10 hidden md:flex"
        style={{ backgroundColor: color }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronRightRoundedIcon
          className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
          sx={{ fontSize: 18 }}
        />
      </div>
    </div>
  );
}
