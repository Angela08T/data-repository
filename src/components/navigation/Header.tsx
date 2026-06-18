"use client";

import { AppBar, IconButton, Toolbar } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

interface HeaderProps {
  toggled: boolean;
  setToggled: (value: boolean) => void;
}

export default function Header({ toggled, setToggled }: HeaderProps) {
  return (
    <AppBar
      position="sticky"
      className="top-0 md:!hidden"
      sx={{
        background: "linear-gradient(135deg, #0d1b3e 0%, #1565c0 100%)",
        boxShadow: "0 2px 16px rgba(13,27,62,0.3)",
      }}
    >
      <Toolbar className="flex justify-between" sx={{ minHeight: "56px !important" }}>
        {/* Branding mobile */}
        <div>
          <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Campaign
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1 }}>
            Data Repository
          </div>
        </div>

        <IconButton
          size="medium"
          edge="end"
          aria-label="menu"
          onClick={() => setToggled(!toggled)}
          sx={{
            color: "#fff",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "10px",
            "&:hover": { background: "rgba(255,255,255,0.22)" },
            transition: "background 0.2s ease",
          }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
