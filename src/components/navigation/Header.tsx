"use client";

import { AppBar, IconButton, Toolbar } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";
import logoSjlImg from "@/assets/logos/logo_sjl.png";

interface HeaderProps {
  toggled: boolean;
  setToggled: (value: boolean) => void;
}

export default function Header({ toggled, setToggled }: HeaderProps) {
  return (
    <AppBar
      sx={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}
      className="top-0 shadow-sm md:!hidden"
      position="sticky"
      color="inherit"
    >
      <Toolbar className="flex justify-between">
        <Image
          src={logoSjlImg}
          alt="Logo San Juan de Lurigancho"
          width={150}
          height={40}
          className="h-10 w-auto object-contain"
        />
        <IconButton
          size="large"
          edge="end"
          color="inherit"
          aria-label="menu"
          onClick={() => setToggled(!toggled)}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
