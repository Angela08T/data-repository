/**
 * Constantes del Sistema SGDH
 * Sistema de Gerencia de Desarrollo Humano
 * San Juan de Lurigancho
 */

export const APP_NAME = "SGDH - Sistema de Gerencia de Desarrollo Humano";
export const MUNICIPALITY = "San Juan de Lurigancho";

// ============================================
// TIPOS DE SUBGERENCIAS
// ============================================
export enum SubgerenciaType {
  PROGRAMAS_SOCIALES = "programas-sociales",
  SERVICIOS_SOCIALES = "servicios-sociales",
}

// ============================================
// ROLES DEL SISTEMA
// ============================================
export enum RoleType {
  ADMIN = "admin",
  SUBGERENTE_PS = "subgerente_programas_sociales",
  SUBGERENTE_SS = "subgerente_servicios_sociales",
  // Roles de áreas - Programas Sociales
  USUARIO_PVL = "usuario_pvl",
  USUARIO_PANTBC = "usuario_pantbc",
  USUARIO_COMEDORES = "usuario_comedores",
  USUARIO_OLLAS = "usuario_ollas",
  USUARIO_ULE = "usuario_ule",
  USUARIO_OMAPED = "usuario_omaped",
  USUARIO_CIAM = "usuario_ciam",
  // Roles de áreas - Servicios Sociales
  USUARIO_PARTICIPACION = "usuario_participacion",
  USUARIO_DEPORTES = "usuario_deportes",
  USUARIO_SALUD = "usuario_salud",
}

// Configuración de Roles
export const ROLES = {
  [RoleType.ADMIN]: {
    nombre: "Administrador",
    descripcion: "Acceso total al sistema",
    permisos: ["all"],
  },
  [RoleType.SUBGERENTE_PS]: {
    nombre: "Subgerente de Programas Sociales",
    descripcion: "Acceso a todas las áreas de Programas Sociales",
    permisos: ["all_programas_sociales", "mapa_programas_sociales"],
  },
  [RoleType.SUBGERENTE_SS]: {
    nombre: "Subgerente de Servicios Sociales",
    descripcion: "Acceso a todas las áreas de Servicios Sociales",
    permisos: ["all_servicios_sociales", "mapa_servicios_sociales"],
  },
  [RoleType.USUARIO_PVL]: {
    nombre: "Usuario PVL",
    descripcion: "Acceso al área de Vaso de Leche",
    permisos: ["pvl", "mapa_pvl"],
  },
  [RoleType.USUARIO_PANTBC]: {
    nombre: "Usuario PANTBC",
    descripcion: "Acceso al área de PANTBC",
    permisos: ["pantbc", "mapa_pantbc"],
  },
  [RoleType.USUARIO_COMEDORES]: {
    nombre: "Usuario Comedores",
    descripcion: "Acceso al área de Comedores Populares",
    permisos: ["comedores_populares", "mapa_comedores"],
  },
  [RoleType.USUARIO_OLLAS]: {
    nombre: "Usuario Ollas Comunes",
    descripcion: "Acceso al área de Ollas Comunes",
    permisos: ["ollas_comunes", "mapa_ollas"],
  },
  [RoleType.USUARIO_ULE]: {
    nombre: "Usuario ULE",
    descripcion: "Acceso al área de ULE",
    permisos: ["ule", "mapa_ule"],
  },
  [RoleType.USUARIO_OMAPED]: {
    nombre: "Usuario OMAPED",
    descripcion: "Acceso al área de OMAPED",
    permisos: ["omaped", "mapa_omaped"],
  },
  [RoleType.USUARIO_CIAM]: {
    nombre: "Usuario CIAM",
    descripcion: "Acceso al área de CIAM",
    permisos: ["ciam", "mapa_ciam"],
  },
  [RoleType.USUARIO_PARTICIPACION]: {
    nombre: "Usuario Participación Vecinal",
    descripcion: "Acceso al área de Participación Vecinal",
    permisos: ["participacion_ciudadana", "mapa_participacion"],
  },
  [RoleType.USUARIO_DEPORTES]: {
    nombre: "Usuario Deportes",
    descripcion: "Acceso al área de Deportes",
    permisos: ["servicios_deporte", "mapa_deportes"],
  },
  [RoleType.USUARIO_SALUD]: {
    nombre: "Usuario Salud",
    descripcion: "Acceso al área de Salud",
    permisos: ["salud", "mapa_salud"],
  },
};

// ============================================
// CONFIGURACIÓN DE SUBGERENCIAS
// ============================================
export const SUBGERENCIAS = {
  [SubgerenciaType.PROGRAMAS_SOCIALES]: {
    id: SubgerenciaType.PROGRAMAS_SOCIALES,
    nombre: "Subgerencia de Programas Sociales",
    color: "#1565c0",
    colorHover: "#0d47a1",
    descripcion: "Gestión de programas sociales y asistencia alimentaria",
  },
  [SubgerenciaType.SERVICIOS_SOCIALES]: {
    id: SubgerenciaType.SERVICIOS_SOCIALES,
    nombre: "Subgerencia de Servicios Sociales",
    color: "#0d47a1",
    colorHover: "#0a3880",
    descripcion: "Gestión de servicios sociales y actividades comunitarias",
  },
};

// ============================================
// ESTRUCTURA DE MENÚ
// ============================================
export interface MenuItem {
  id: string;
  nombre: string;
  ruta?: string;
  icono?: string;
  descripcion?: string;
  permisos?: string[];
  subgerencia?: SubgerenciaType;
  children?: MenuItem[];
}

// ============================================
// MÓDULOS DE CAMPAIGN DATA REPOSITORY
// ============================================
export const MODULOS_PROGRAMAS_SOCIALES: MenuItem[] = [
  {
    id: "donaciones",
    nombre: "Donaciones",
    ruta: "/programas-sociales/donaciones",
    icono: "VolunteerActivism",
    descripcion: "Registro y seguimiento de donaciones",
    permisos: ["all_programas_sociales", "all"],
  },
  {
    id: "personeros",
    nombre: "Personeros",
    ruta: "/programas-sociales/personeros",
    icono: "Badge",
    descripcion: "Gestión de personeros de campaña",
    permisos: ["all_programas_sociales", "all"],
  },
  {
    id: "simpatizantes",
    nombre: "Simpatizantes",
    ruta: "/programas-sociales/simpatizantes",
    icono: "Groups",
    descripcion: "Registro de simpatizantes",
    permisos: ["all_programas_sociales", "all"],
  },
  {
    id: "encuestas",
    nombre: "Resultados de Encuestas",
    ruta: "/programas-sociales/encuestas",
    icono: "Poll",
    descripcion: "Visualización de resultados de encuestas",
    permisos: ["all_programas_sociales", "all"],
  },
];

// Mantenido vacío — Servicios Sociales fue removido del sistema
export const MODULOS_SERVICIOS_SOCIALES: MenuItem[] = [];

// ============================================
// MÓDULOS DE ADMINISTRACIÓN (solo ADMIN)
// ============================================
export const MODULOS_ADMIN: MenuItem[] = [
  {
    id: "admin-usuarios",
    nombre: "Gestión de Usuarios",
    ruta: "/admin/usuarios",
    icono: "ManageAccounts",
    descripcion: "Crear, editar y eliminar usuarios del sistema",
    permisos: ["all"],
  },
  {
    id: "admin-roles",
    nombre: "Gestión de Roles",
    ruta: "/admin/roles",
    icono: "AdminPanelSettings",
    descripcion: "Crear y gestionar roles del sistema",
    permisos: ["all"],
  },
  {
    id: "admin-modulos",
    nombre: "Gestión de Módulos",
    ruta: "/admin/modulos",
    icono: "Extension",
    descripcion: "Crear y gestionar módulos del sistema",
    permisos: ["all"],
  },
  {
    id: "admin-auditoria",
    nombre: "Auditoría",
    ruta: "/admin/auditoria",
    icono: "History",
    descripcion: "Registro de acciones del sistema",
    permisos: ["all"],
  },
];

// ============================================
// MENÚ COMPLETO
// ============================================
export const MENU_ITEMS: MenuItem[] = [
  {
    id: "admin",
    nombre: "Administración",
    permisos: ["all"],
    children: MODULOS_ADMIN,
  },
  {
    id: "programas-sociales",
    nombre: "Programas Sociales",
    subgerencia: SubgerenciaType.PROGRAMAS_SOCIALES,
    children: MODULOS_PROGRAMAS_SOCIALES.map((modulo) => ({
      ...modulo,
      subgerencia: SubgerenciaType.PROGRAMAS_SOCIALES,
    })),
  },
];

// ============================================
// CONFIGURACIÓN DEL MAPA
// ============================================
export const MAP_CONFIG = {
  center: [-11.9699, -76.998] as [number, number], // Centro de San Juan de Lurigancho
  zoom: 13,
  minZoom: 11,
  maxZoom: 18,
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

// Capas del mapa por área
export const MAP_LAYERS = {
  jurisdicciones: {
    id: "jurisdicciones",
    nombre: "Jurisdicciones",
    descripcion: "Límites de las jurisdicciones de San Juan de Lurigancho",
    visible: true,
    color: "#34b429",
  },
  pvl: {
    id: "pvl",
    nombre: "Puntos PVL",
    descripcion: "Ubicación de beneficiarios del Vaso de Leche",
    visible: false,
    color: "#d81b7e",
    permisos: ["pvl", "all_programas_sociales", "all"],
  },
  comedores: {
    id: "comedores",
    nombre: "Comedores Populares",
    descripcion: "Ubicación de Comedores Populares",
    visible: false,
    color: "#ff9800",
    permisos: ["comedores_populares", "all_programas_sociales", "all"],
  },
  ollas: {
    id: "ollas",
    nombre: "Ollas Comunes",
    descripcion: "Ubicación de Ollas Comunes",
    visible: false,
    color: "#4caf50",
    permisos: ["ollas_comunes", "all_programas_sociales", "all"],
  },
  ciam: {
    id: "ciam",
    nombre: "Centros CIAM",
    descripcion: "Ubicación de Centros del Adulto Mayor",
    visible: false,
    color: "#9c27b0",
    permisos: ["ciam", "all_programas_sociales", "all"],
  },
  omaped: {
    id: "omaped",
    nombre: "Puntos OMAPED",
    descripcion: "Ubicación de servicios OMAPED",
    visible: false,
    color: "#2196f3",
    permisos: ["omaped", "all_programas_sociales", "all"],
  },
};

// ============================================
// RUTAS Y CONFIGURACIÓN
// ============================================
export const PUBLIC_ROUTES = ["/", "/login/programas-sociales"];

export enum CRUDOperation {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
};

export const DATE_FORMATS = {
  DISPLAY: "DD/MM/YYYY",
  DISPLAY_WITH_TIME: "DD/MM/YYYY HH:mm",
  API: "YYYY-MM-DD",
  API_WITH_TIME: "YYYY-MM-DD HH:mm:ss",
};

export const SWAL_CONFIG = {
  confirmButtonColor: "#1565c0",
  cancelButtonColor: "#64748b",
  confirmButtonText: "Confirmar",
  cancelButtonText: "Cancelar",
};
