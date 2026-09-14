"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import EmotionRegistry from "./EmotionRegistry";

// Tema oscuro "azul neón": fondo profundo con acentos de azul brillante y glow,
// coherente con el navy/azul de marca que ya usaba el sidebar. Al ser el tema de
// MUI, se aplica automáticamente a todos los componentes (inputs, selects,
// diálogos, popovers, checkboxes, date pickers, etc.) sin tocar cada página.
const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0a0f1e",
      paper: "#121a30",
    },
    primary: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    text: {
      primary: "#eef2ff",
      secondary: "#94a3b8",
    },
    divider: "rgba(148, 163, 184, 0.14)",
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "'Poppins', sans-serif",
          backgroundColor: "#0a0f1e",
        },
      },
    },
    // MUI le pone a Paper un overlay claro cuando "elevation" > 0; en modo oscuro
    // eso se ve como manchas grises. Se desactiva y se le da un borde sutil azulado.
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(148, 163, 184, 0.12)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148, 163, 184, 0.25)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(96, 165, 250, 0.5)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "rgba(148, 163, 184, 0.12)" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: "#1e293b", fontSize: "0.7rem" },
      },
    },
  },
});

export default function MuiThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EmotionRegistry>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </EmotionRegistry>
  );
}
