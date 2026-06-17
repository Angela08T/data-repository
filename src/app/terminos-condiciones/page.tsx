"use client";

import { Box, Container, Typography, Paper, Divider } from "@mui/material";

export default function TerminosCondicionesPage() {
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
              Términos y Condiciones de Uso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Última actualización: {fechaActualizacion}
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Contenido */}
          <Box sx={{ "& > section": { mb: 4 } }}>
            {/* 1. Información General */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                1. Información General
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                El presente documento establece los Términos y Condiciones de uso del servicio de
                mensajería de WhatsApp proporcionado por la <strong>{nombreEntidad}</strong> a
                través del sistema <strong>{nombreSistema}</strong>.
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Al utilizar nuestros servicios de mensajería, usted acepta estos términos en su
                totalidad. Si no está de acuerdo con estos términos, le rogamos que no utilice
                nuestros servicios.
              </Typography>
            </section>

            {/* 2. Descripción del Servicio */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                2. Descripción del Servicio
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                El servicio de mensajería de WhatsApp se utiliza exclusivamente para:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1" paragraph>
                    Enviar saludos de cumpleaños a los coordinadores y presidentes de los programas
                    sociales (PVL - Vaso de Leche, Ollas Comunes, Comedores Populares).
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    Comunicar información relevante sobre los programas sociales administrados por
                    la Subgerencia de Programas Sociales.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1" paragraph>
                    Mantener comunicación institucional con los beneficiarios y representantes de
                    los programas sociales del distrito.
                  </Typography>
                </li>
              </Box>
            </section>

            {/* 3. Recopilación y Uso de Datos */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                3. Recopilación y Uso de Datos Personales
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Para el funcionamiento del servicio, recopilamos y procesamos los siguientes datos:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">Nombre completo</Typography>
                </li>
                <li>
                  <Typography variant="body1">Número de teléfono celular</Typography>
                </li>
                <li>
                  <Typography variant="body1">Fecha de nacimiento</Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Información del programa social al que pertenece
                  </Typography>
                </li>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
                Estos datos son utilizados únicamente para los fines descritos en la sección 2 y
                son tratados conforme a la Ley N° 29733, Ley de Protección de Datos Personales del
                Perú.
              </Typography>
            </section>

            {/* 4. Consentimiento */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                4. Consentimiento
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Al registrarse en cualquiera de los programas sociales administrados por la
                {nombreEntidad}, los usuarios otorgan su consentimiento para recibir comunicaciones
                a través de WhatsApp relacionadas con:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">Saludos institucionales (cumpleaños, festividades)</Typography>
                </li>
                <li>
                  <Typography variant="body1">Información sobre los programas sociales</Typography>
                </li>
                <li>
                  <Typography variant="body1">Comunicados oficiales de la municipalidad</Typography>
                </li>
              </Box>
            </section>

            {/* 5. Derechos del Usuario */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                5. Derechos del Usuario
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                De acuerdo con la legislación vigente, usted tiene derecho a:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">
                    <strong>Acceso:</strong> Solicitar información sobre los datos personales que
                    tenemos sobre usted.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    <strong>Rectificación:</strong> Solicitar la corrección de datos inexactos.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    <strong>Cancelación:</strong> Solicitar la eliminación de sus datos cuando ya no
                    sean necesarios.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    <strong>Oposición:</strong> Oponerse al tratamiento de sus datos para fines
                    específicos.
                  </Typography>
                </li>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
                Para ejercer estos derechos, puede comunicarse con nosotros a través del correo
                electrónico: <strong>{emailContacto}</strong>
              </Typography>
            </section>

            {/* 6. Seguridad */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                6. Seguridad de la Información
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos
                personales contra acceso no autorizado, alteración, divulgación o destrucción. Esto
                incluye:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">Cifrado de datos en tránsito y en reposo</Typography>
                </li>
                <li>
                  <Typography variant="body1">Control de acceso basado en roles</Typography>
                </li>
                <li>
                  <Typography variant="body1">Auditoría de accesos y operaciones</Typography>
                </li>
                <li>
                  <Typography variant="body1">Copias de seguridad periódicas</Typography>
                </li>
              </Box>
            </section>

            {/* 7. Uso de WhatsApp */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                7. Uso de la Plataforma WhatsApp
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                El servicio de mensajería se proporciona a través de la plataforma WhatsApp Business
                API de Meta. Al utilizar este servicio, usted también está sujeto a los términos de
                servicio de WhatsApp y la política de privacidad de Meta.
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                La {nombreEntidad} no se hace responsable de las políticas o prácticas de Meta/WhatsApp,
                y le recomendamos revisar sus términos de servicio.
              </Typography>
            </section>

            {/* 8. Limitación de Responsabilidad */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                8. Limitación de Responsabilidad
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                La {nombreEntidad} no será responsable por:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: "text.secondary" }}>
                <li>
                  <Typography variant="body1">
                    Interrupciones del servicio de WhatsApp por causas ajenas a nuestra voluntad
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Demoras en la entrega de mensajes debido a problemas de conectividad
                  </Typography>
                </li>
                <li>
                  <Typography variant="body1">
                    Uso indebido del servicio por parte de terceros
                  </Typography>
                </li>
              </Box>
            </section>

            {/* 9. Modificaciones */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                9. Modificaciones a los Términos
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier
                momento. Las modificaciones entrarán en vigor desde su publicación en esta página.
                Le recomendamos revisar periódicamente estos términos.
              </Typography>
            </section>

            {/* 10. Contacto */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                10. Información de Contacto
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Para cualquier consulta relacionada con estos Términos y Condiciones o con el
                tratamiento de sus datos personales, puede contactarnos a través de:
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

            {/* 11. Ley Aplicable */}
            <section>
              <Typography variant="h6" fontWeight={600} color="#1e293b" gutterBottom>
                11. Ley Aplicable y Jurisdicción
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Estos Términos y Condiciones se rigen por las leyes de la República del Perú.
                Cualquier controversia derivada del uso del servicio será sometida a la jurisdicción
                de los tribunales competentes de Lima, Perú.
              </Typography>
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
