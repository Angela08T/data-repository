"use client";

import { Box, Container, Typography, Paper, Divider } from "@mui/material";

export default function PoliticaPrivacidadPage() {
  const fechaActualizacion = "30 de enero de 2026";
  const nombreEntidad = "Municipalidad Distrital de San Juan de Lurigancho";
  const nombreSistema = "SGDH - Sistema de Gerencia de Desarrollo Humano";
  const emailContacto = "desarrollohumano@munisjl.gob.pe";
  const direccion = "Av. Próceres de la Independencia 1632, San Juan de Lurigancho, Lima, Perú";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={700}
              color="#1e293b"
              gutterBottom
            >
              Política de Privacidad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Última actualización: {fechaActualizacion}
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Contenido */}
          <Box sx={{ "& > section": { mb: 4 } }}>
            {/* Introducción */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                Introducción
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                La <strong>{nombreEntidad}</strong>, a través de su sistema{" "}
                <strong>{nombreSistema}</strong>, se compromete a proteger la privacidad de los
                datos personales de los usuarios de nuestros servicios de mensajería y programas
                sociales.
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y
                protegemos su información personal, en cumplimiento de la Ley N° 29733, Ley de
                Protección de Datos Personales del Perú, y su Reglamento.
              </Typography>
            </section>

            {/* Responsable del Tratamiento */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                1. Responsable del Tratamiento de Datos
              </Typography>
              <Box
                sx={{
                  backgroundColor: "#f1f5f9",
                  p: 2,
                  borderRadius: "8px",
                }}
              >
                <Typography variant="body1" fontWeight={500}>
                  {nombreEntidad}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Subgerencia de Programas Sociales
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Dirección: {direccion}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Correo electrónico: {emailContacto}
                </Typography>
              </Box>
            </section>

            {/* Datos que Recopilamos */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                2. Datos Personales que Recopilamos
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Recopilamos los siguientes tipos de datos personales:
              </Typography>

              <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{ mt: 2 }}>
                Datos de identificación:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li><Typography variant="body1">Nombres y apellidos</Typography></li>
                <li><Typography variant="body1">Documento Nacional de Identidad (DNI)</Typography></li>
                <li><Typography variant="body1">Fecha de nacimiento</Typography></li>
              </Box>

              <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{ mt: 2 }}>
                Datos de contacto:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li><Typography variant="body1">Número de teléfono celular</Typography></li>
                <li><Typography variant="body1">Dirección de domicilio (cuando aplica)</Typography></li>
              </Box>

              <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{ mt: 2 }}>
                Datos del programa social:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li><Typography variant="body1">Programa al que pertenece (PVL, Ollas Comunes, Comedores Populares)</Typography></li>
                <li><Typography variant="body1">Rol dentro del programa (Coordinador, Presidente)</Typography></li>
                <li><Typography variant="body1">Nombre de la organización o comité</Typography></li>
              </Box>
            </section>

            {/* Finalidad */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                3. Finalidad del Tratamiento
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Sus datos personales son tratados para las siguientes finalidades:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Gestión de programas sociales:</strong> Administrar y coordinar los
                    programas de asistencia alimentaria del distrito.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Comunicación institucional:</strong> Enviar información relevante sobre
                    los programas sociales, actividades y comunicados oficiales.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Mensajería de WhatsApp:</strong> Enviar saludos de cumpleaños y
                    comunicaciones a través de la plataforma WhatsApp Business.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Estadísticas:</strong> Elaborar reportes estadísticos anónimos sobre
                    los programas sociales.
                  </Typography>
                </li>
              </Box>
            </section>

            {/* Base Legal */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                4. Base Legal del Tratamiento
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                El tratamiento de sus datos personales se fundamenta en:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">
                    Su consentimiento expreso al registrarse en los programas sociales
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    El cumplimiento de obligaciones legales de la municipalidad
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    El interés público en la gestión de programas de asistencia social
                  </Typography>
                </li>
              </Box>
            </section>

            {/* Compartición de Datos */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                5. Compartición de Datos
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Sus datos personales pueden ser compartidos con:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Meta/WhatsApp:</strong> Para el envío de mensajes a través de WhatsApp
                    Business API. Meta procesa estos datos según su propia política de privacidad.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Autoridades competentes:</strong> Cuando sea requerido por ley o por
                    orden judicial.
                  </Typography>
                </li>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph>
                No vendemos, alquilamos ni compartimos sus datos personales con terceros para fines
                comerciales.
              </Typography>
            </section>

            {/* Retención de Datos */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                6. Período de Retención
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Conservamos sus datos personales mientras:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">
                    Sea beneficiario o representante de un programa social
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Sea necesario para cumplir con obligaciones legales
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    No solicite la eliminación de sus datos
                  </Typography>
                </li>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
                Los datos de mensajería (historial de mensajes enviados) se conservan por un período
                de 2 años para fines de auditoría.
              </Typography>
            </section>

            {/* Derechos ARCO */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                7. Sus Derechos (Derechos ARCO)
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Usted tiene los siguientes derechos sobre sus datos personales:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Acceso:</strong> Conocer qué datos personales tenemos sobre usted y cómo
                    los tratamos.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Rectificación:</strong> Solicitar la corrección de datos inexactos o
                    incompletos.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Cancelación:</strong> Solicitar la eliminación de sus datos cuando ya no
                    sean necesarios para los fines para los que fueron recopilados.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    <strong>Oposición:</strong> Oponerse al tratamiento de sus datos para fines
                    específicos, como el envío de mensajes por WhatsApp.
                  </Typography>
                </li>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph>
                Para ejercer estos derechos, envíe una solicitud a:{" "}
                <strong>{emailContacto}</strong>
              </Typography>
            </section>

            {/* Seguridad */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                8. Medidas de Seguridad
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Implementamos medidas técnicas y organizativas para proteger sus datos:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li><Typography variant="body1">Cifrado de datos en tránsito (HTTPS/TLS)</Typography></li>
                <li><Typography variant="body1">Cifrado de datos almacenados</Typography></li>
                <li><Typography variant="body1">Control de acceso basado en roles</Typography></li>
                <li><Typography variant="body1">Autenticación segura de usuarios</Typography></li>
                <li><Typography variant="body1">Monitoreo y auditoría de accesos</Typography></li>
                <li><Typography variant="body1">Copias de seguridad periódicas</Typography></li>
              </Box>
            </section>

            {/* Cookies */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                9. Uso de Cookies
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Nuestro sistema utiliza cookies técnicas necesarias para:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li><Typography variant="body1">Mantener su sesión activa</Typography></li>
                <li><Typography variant="body1">Recordar sus preferencias de usuario</Typography></li>
                <li><Typography variant="body1">Garantizar la seguridad del sistema</Typography></li>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
                No utilizamos cookies de terceros para fines publicitarios o de seguimiento.
              </Typography>
            </section>

            {/* Menores de Edad */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                10. Menores de Edad
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Nuestros servicios de mensajería están dirigidos a adultos mayores de 18 años que
                son coordinadores o presidentes de programas sociales. No recopilamos
                intencionalmente datos de menores de edad a través del servicio de WhatsApp.
              </Typography>
            </section>

            {/* Cambios */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                11. Cambios en esta Política
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Podemos actualizar esta Política de Privacidad periódicamente. Cualquier cambio
                será publicado en esta página con la fecha de actualización. Le recomendamos
                revisar esta política regularmente.
              </Typography>
            </section>

            {/* Contacto */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                12. Contacto
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Si tiene preguntas sobre esta Política de Privacidad o sobre el tratamiento de sus
                datos personales, puede contactarnos:
              </Typography>
              <Box
                sx={{
                  backgroundColor: "#f1f5f9",
                  p: 2,
                  borderRadius: "8px",
                  mt: 2,
                }}
              >
                <Typography variant="body1" fontWeight={500}>
                  {nombreEntidad}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Subgerencia de Programas Sociales
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Dirección: {direccion}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Correo electrónico: {emailContacto}
                </Typography>
              </Box>
            </section>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Footer */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} {nombreEntidad}. Todos los derechos reservados.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {nombreSistema}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
