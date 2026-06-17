import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/redux/providers";
import MuiThemeProvider from "@/theme/MuiThemeProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SGDH - Sistema de Gerencia de Desarrollo Humano",
  description: "Sistema de Gestión de Desarrollo Humano - San Juan de Lurigancho",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${poppins.className} antialiased`}>
        <ReduxProvider>
          <MuiThemeProvider>{children}</MuiThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
