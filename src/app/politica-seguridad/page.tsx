"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  Tabs,
  Tab,
  Fade,
  Chip,
} from "@mui/material";
import {
  Close,
  Security,
  Gavel,
  Shield,
  Lock,
  VerifiedUser,
  Policy,
  ArrowBack,
  Email,
  LocationOn,
  Business,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`policy-tabpanel-${index}`}
      aria-labelledby={`policy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PoliticaSeguridadPage() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(true);

  const fechaActualizacion = "31 de enero de 2026";
  const nombreEntidad = "Municipalidad Distrital de San Juan de Lurigancho";
  const nombreSistema = "SGDH - Sistema de Gerencia de Desarrollo Humano";
  const emailContacto = "desarrollohumano@munisjl.gob.pe";
  const direccion = "Av. Próceres de la Independencia 1632, San Juan de Lurigancho, Lima, Perú";

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleClose = () => {
    setOpenDialog(false);
    router.back();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Dialog
        open={openDialog}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        transitionDuration={300}
        PaperProps={{
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            maxHeight: "90vh",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: "white",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <DialogTitle sx={{ pb: 0, pt: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: "12px",
                    bgcolor: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield sx={{ fontSize: 28, color: "#475569" }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ color: "#1e293b" }}>
                    Políticas y Términos
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748b" }}>
                    {nombreSistema}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={handleClose}
                sx={{
                  color: "#64748b",
                  bgcolor: "#f1f5f9",
                  "&:hover": { bgcolor: "#e2e8f0" },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>

          {/* Tabs */}
          <Box sx={{ px: 3, pb: 0, pt: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                "& .MuiTabs-indicator": {
                  backgroundColor: "#475569",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
                "& .MuiTab-root": {
                  color: "#94a3b8",
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  minHeight: 48,
                  "&.Mui-selected": {
                    color: "#1e293b",
                  },
                },
              }}
            >
              <Tab
                icon={<Security sx={{ fontSize: 20, color: "inherit" }} />}
                iconPosition="start"
                label="Política de Seguridad"
              />
              <Tab
                icon={<Gavel sx={{ fontSize: 20, color: "inherit" }} />}
                iconPosition="start"
                label="Términos y Condiciones"
              />
            </Tabs>
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: "#f8fafc" }}>
          {/* Tab Panel: Política de Seguridad */}
          <TabPanel value={tabValue} index={0}>
            <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
              <Box display="flex" justifyContent="center" mb={3}>
                <Chip
                  icon={<VerifiedUser sx={{ fontSize: 16, color: "#64748b" }} />}
                  label={`Última actualización: ${fechaActualizacion}`}
                  sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 500 }}
                />
              </Box>

              {/* Introducción */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Policy sx={{ color: "#475569" }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    Introducción
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  La <strong>{nombreEntidad}</strong>, a través de su sistema{" "}
                  <strong>{nombreSistema}</strong>, establece la presente Política de Seguridad
                  de la Información con el objetivo de proteger los activos de información,
                  garantizar la continuidad de los servicios y minimizar los riesgos de seguridad.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Esta política se alinea con las mejores prácticas de seguridad de la información
                  y cumple con la normativa vigente en el Perú, incluyendo la Ley N° 29733 de
                  Protección de Datos Personales y la normativa de gobierno digital.
                </Typography>
              </Paper>

              {/* Alcance */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  1. Alcance
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Esta política aplica a:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Todos los usuarios del sistema SGDH</li>
                  <li>Personal administrativo y técnico de la municipalidad</li>
                  <li>Coordinadores y presidentes de programas sociales</li>
                  <li>Sistemas, aplicaciones y datos gestionados por el SGDH</li>
                  <li>Infraestructura tecnológica asociada</li>
                </Box>
              </Paper>

              {/* Objetivos de Seguridad */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Lock sx={{ color: "#475569" }} />
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    2. Objetivos de Seguridad
                  </Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
                  <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">
                      Confidencialidad
                    </Typography>
                    <Typography variant="body2" color="#64748b">
                      Garantizar que la información sea accesible únicamente por personal autorizado.
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">
                      Integridad
                    </Typography>
                    <Typography variant="body2" color="#64748b">
                      Asegurar que la información sea exacta, completa y no haya sido modificada sin autorización.
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">
                      Disponibilidad
                    </Typography>
                    <Typography variant="body2" color="#64748b">
                      Garantizar el acceso oportuno a la información y sistemas cuando sea requerido.
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Control de Acceso */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  3. Control de Acceso
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  El acceso al sistema está controlado mediante:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Autenticación mediante usuario y contraseña segura</li>
                  <li>Control de acceso basado en roles (RBAC)</li>
                  <li>Sesiones con tiempo de expiración automático</li>
                  <li>Bloqueo de cuenta tras intentos fallidos de acceso</li>
                  <li>Registro de auditoría de accesos y actividades</li>
                </Box>
              </Paper>

              {/* Seguridad de Contraseñas */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  4. Seguridad de Contraseñas
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Las contraseñas deben cumplir con los siguientes requisitos:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Longitud mínima de 8 caracteres</li>
                  <li>Combinación de mayúsculas, minúsculas, números y caracteres especiales</li>
                  <li>No utilizar información personal fácilmente identificable</li>
                  <li>Cambio periódico de contraseña recomendado cada 90 días</li>
                  <li>Las contraseñas se almacenan cifradas mediante algoritmos seguros</li>
                </Box>
              </Paper>

              {/* Protección de Datos */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  5. Protección de Datos
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: "12px" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155" gutterBottom>
                      Cifrado de datos:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0, color: "text.secondary", fontSize: "0.875rem" }}>
                      <li>Comunicaciones cifradas con TLS 1.3</li>
                      <li>Datos sensibles cifrados en reposo (AES-256)</li>
                      <li>Certificados SSL/TLS válidos y actualizados</li>
                    </Box>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: "12px" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155" gutterBottom>
                      Respaldo de información:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0, color: "text.secondary", fontSize: "0.875rem" }}>
                      <li>Copias de seguridad automáticas diarias</li>
                      <li>Almacenamiento redundante en ubicaciones separadas</li>
                      <li>Pruebas periódicas de restauración</li>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* Seguridad de la Infraestructura */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  6. Seguridad de la Infraestructura
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  La infraestructura del sistema cuenta con:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Firewalls y sistemas de detección de intrusos</li>
                  <li>Protección contra malware y amenazas</li>
                  <li>Actualizaciones de seguridad periódicas</li>
                  <li>Monitoreo continuo de la infraestructura</li>
                  <li>Segmentación de redes</li>
                </Box>
              </Paper>

              {/* Gestión de Incidentes */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  7. Gestión de Incidentes de Seguridad
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Contamos con un proceso de gestión de incidentes que incluye:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Detección y registro de incidentes de seguridad</li>
                  <li>Clasificación según severidad e impacto</li>
                  <li>Respuesta y contención inmediata</li>
                  <li>Investigación y análisis de causa raíz</li>
                  <li>Notificación a usuarios afectados cuando corresponda</li>
                  <li>Implementación de medidas correctivas</li>
                </Box>
              </Paper>

              {/* Responsabilidades del Usuario */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  8. Responsabilidades del Usuario
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Los usuarios del sistema deben:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                  <li>No compartir sus contraseñas con terceros</li>
                  <li>Reportar inmediatamente cualquier actividad sospechosa</li>
                  <li>Cerrar sesión al terminar de usar el sistema</li>
                  <li>No acceder al sistema desde dispositivos públicos o no confiables</li>
                  <li>Cumplir con las políticas de uso aceptable</li>
                </Box>
              </Paper>

              {/* Cumplimiento Normativo */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  9. Cumplimiento Normativo
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Esta política cumple con:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Ley N° 29733 - Ley de Protección de Datos Personales</li>
                  <li>D.S. N° 003-2013-JUS - Reglamento de la Ley N° 29733</li>
                  <li>Normativa de Gobierno Digital del Perú</li>
                  <li>Lineamientos de seguridad de la ONGEI/PCM</li>
                </Box>
              </Paper>

              {/* Contacto */}
              <Paper sx={{ p: 3, borderRadius: "16px", bgcolor: "#334155", color: "white" }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  10. Contacto
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  Para reportar incidentes de seguridad o consultas relacionadas:
                </Typography>
                <Box sx={{ bgcolor: "rgba(255,255,255,0.1)", p: 2, borderRadius: "12px" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Business sx={{ fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={500}>{nombreEntidad}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LocationOn sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{direccion}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Email sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{emailContacto}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Container>
          </TabPanel>

          {/* Tab Panel: Términos y Condiciones */}
          <TabPanel value={tabValue} index={1}>
            <Container maxWidth="md" sx={{ px: { xs: 2, md: 4 } }}>
              <Box display="flex" justifyContent="center" mb={3}>
                <Chip
                  icon={<Gavel sx={{ fontSize: 16, color: "#64748b" }} />}
                  label={`Última actualización: ${fechaActualizacion}`}
                  sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 500 }}
                />
              </Box>

              {/* Información General */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  1. Información General
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  El presente documento establece los Términos y Condiciones de uso del servicio de
                  mensajería de WhatsApp proporcionado por la <strong>{nombreEntidad}</strong> a
                  través del sistema <strong>{nombreSistema}</strong>.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Al utilizar nuestros servicios de mensajería, usted acepta estos términos en su
                  totalidad. Si no está de acuerdo con estos términos, le rogamos que no utilice
                  nuestros servicios.
                </Typography>
              </Paper>

              {/* Descripción del Servicio */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  2. Descripción del Servicio
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  El servicio de mensajería de WhatsApp se utiliza exclusivamente para:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Enviar saludos de cumpleaños a los coordinadores y presidentes de los programas sociales (PVL - Vaso de Leche, Ollas Comunes, Comedores Populares).</li>
                  <li>Comunicar información relevante sobre los programas sociales administrados por la Subgerencia de Programas Sociales.</li>
                  <li>Mantener comunicación institucional con los beneficiarios y representantes de los programas sociales del distrito.</li>
                </Box>
              </Paper>

              {/* Recopilación y Uso de Datos */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  3. Recopilación y Uso de Datos Personales
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Para el funcionamiento del servicio, recopilamos y procesamos los siguientes datos:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0, mb: 2 }}>
                  <li>Nombre completo</li>
                  <li>Número de teléfono celular</li>
                  <li>Fecha de nacimiento</li>
                  <li>Información del programa social al que pertenece</li>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Estos datos son utilizados únicamente para los fines descritos y son tratados
                  conforme a la Ley N° 29733, Ley de Protección de Datos Personales del Perú.
                </Typography>
              </Paper>

              {/* Consentimiento */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  4. Consentimiento
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Al registrarse en cualquiera de los programas sociales administrados por la
                  {nombreEntidad}, los usuarios otorgan su consentimiento para recibir comunicaciones
                  a través de WhatsApp relacionadas con:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Saludos institucionales (cumpleaños, festividades)</li>
                  <li>Información sobre los programas sociales</li>
                  <li>Comunicados oficiales de la municipalidad</li>
                </Box>
              </Paper>

              {/* Derechos del Usuario */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  5. Derechos del Usuario (ARCO)
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  De acuerdo con la legislación vigente, usted tiene derecho a:
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">Acceso</Typography>
                    <Typography variant="body2" color="#64748b">
                      Solicitar información sobre los datos personales que tenemos sobre usted.
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">Rectificación</Typography>
                    <Typography variant="body2" color="#64748b">
                      Solicitar la corrección de datos inexactos.
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">Cancelación</Typography>
                    <Typography variant="body2" color="#64748b">
                      Solicitar la eliminación de sus datos cuando ya no sean necesarios.
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#334155">Oposición</Typography>
                    <Typography variant="body2" color="#64748b">
                      Oponerse al tratamiento de sus datos para fines específicos.
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  Para ejercer estos derechos, puede comunicarse con nosotros a través del correo
                  electrónico: <strong>{emailContacto}</strong>
                </Typography>
              </Paper>

              {/* Seguridad */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  6. Seguridad de la Información
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos
                  personales:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Cifrado de datos en tránsito y en reposo</li>
                  <li>Control de acceso basado en roles</li>
                  <li>Auditoría de accesos y operaciones</li>
                  <li>Copias de seguridad periódicas</li>
                </Box>
              </Paper>

              {/* Uso de WhatsApp */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  7. Uso de la Plataforma WhatsApp
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  El servicio de mensajería se proporciona a través de la plataforma WhatsApp Business
                  API de Meta. Al utilizar este servicio, usted también está sujeto a los términos de
                  servicio de WhatsApp y la política de privacidad de Meta.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  La {nombreEntidad} no se hace responsable de las políticas o prácticas de Meta/WhatsApp,
                  y le recomendamos revisar sus términos de servicio.
                </Typography>
              </Paper>

              {/* Limitación de Responsabilidad */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  8. Limitación de Responsabilidad
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  La {nombreEntidad} no será responsable por:
                </Typography>
                <Box component="ul" sx={{ pl: 3, color: "text.secondary", m: 0 }}>
                  <li>Interrupciones del servicio de WhatsApp por causas ajenas a nuestra voluntad</li>
                  <li>Demoras en la entrega de mensajes debido a problemas de conectividad</li>
                  <li>Uso indebido del servicio por parte de terceros</li>
                </Box>
              </Paper>

              {/* Modificaciones */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  9. Modificaciones a los Términos
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier
                  momento. Las modificaciones entrarán en vigor desde su publicación en esta página.
                  Le recomendamos revisar periódicamente estos términos.
                </Typography>
              </Paper>

              {/* Ley Aplicable */}
              <Paper sx={{ p: 3, borderRadius: "16px", mb: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                  10. Ley Aplicable y Jurisdicción
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Estos Términos y Condiciones se rigen por las leyes de la República del Perú.
                  Cualquier controversia derivada del uso del servicio será sometida a la jurisdicción
                  de los tribunales competentes de Lima, Perú.
                </Typography>
              </Paper>

              {/* Contacto */}
              <Paper sx={{ p: 3, borderRadius: "16px", bgcolor: "#334155", color: "white" }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  11. Información de Contacto
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  Para cualquier consulta relacionada con estos Términos y Condiciones:
                </Typography>
                <Box sx={{ bgcolor: "rgba(255,255,255,0.1)", p: 2, borderRadius: "12px" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Business sx={{ fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={500}>{nombreEntidad}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, ml: 3.5, mb: 1 }}>
                    Subgerencia de Programas Sociales
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LocationOn sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{direccion}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Email sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{emailContacto}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Container>
          </TabPanel>
        </DialogContent>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            bgcolor: "white",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {nombreEntidad}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={handleClose}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#475569",
              "&:hover": { bgcolor: "#334155" },
            }}
          >
            Volver
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
