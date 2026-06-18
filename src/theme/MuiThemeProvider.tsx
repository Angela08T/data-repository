"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";
import EmotionRegistry from "./EmotionRegistry";

const theme = createTheme({
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
      styleOverrides: { body: { fontFamily: "'Poppins', sans-serif" } },
    },
    // ── DatePicker popup ──────────────────────────────────────────────────────
    MuiPickersPopper: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(13,27,62,0.18)",
          border: "1px solid rgba(21,101,192,0.12)",
          overflow: "hidden",
        },
      },
    },
    MuiPickersCalendarHeader: {
      styleOverrides: {
        root: { paddingTop: 16, paddingBottom: 8 },
        labelContainer: { fontWeight: 700, fontSize: "0.9rem", color: "#0d1b3e" },
        switchViewButton: { color: "#1565c0" },
      },
    },
    MuiPickersArrowSwitcher: {
      styleOverrides: {
        button: { color: "#1565c0" },
      },
    },
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: { color: "#94a3b8", fontWeight: 600, fontSize: "0.72rem" },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 500,
          borderRadius: 10,
          fontSize: "0.82rem",
          "&:hover": { background: "#dbeafe", color: "#1565c0" },
          "&.Mui-selected": {
            background: "linear-gradient(135deg, #1565c0, #1976d2) !important",
            color: "#fff",
            fontWeight: 700,
            boxShadow: "0 4px 14px rgba(21,101,192,0.4)",
          },
          "&.MuiPickersDay-today:not(.Mui-selected)": {
            border: "2px solid #1565c0",
            color: "#1565c0",
            fontWeight: 700,
          },
        },
      },
    },
    MuiPickersYear: {
      styleOverrides: {
        yearButton: {
          borderRadius: 10,
          fontWeight: 600,
          "&.Mui-selected": {
            background: "linear-gradient(135deg, #1565c0, #1976d2) !important",
            color: "#fff",
          },
        },
      },
    },
  },
});

export default function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </EmotionRegistry>
  );
}
