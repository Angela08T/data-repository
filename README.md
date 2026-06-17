# SGDH - Sistema de Gerencia de Desarrollo Humano

Sistema de Gestión de Desarrollo Humano para la Municipalidad de San Juan de Lurigancho.

## Descripción

Este es un sistema web desarrollado con Next.js 15, TypeScript y Material-UI que gestiona dos subgerencias:

### Subgerencia de Programas Sociales
- **PVL** - Programa de Vaso de Leche
- **PANTBC** - Programa de Alimentación y Nutrición para pacientes con TBC
- **Comedores Populares**
- **Ollas Comunes**
- **ULE** - Unidad Local de Empadronamiento
- **OMAPED** - Oficina Municipal de Atención a Personas con Discapacidad
- **CIAM** - Centro Integral de Atención al Adulto Mayor

### Subgerencia de Servicios Sociales
- **Participación Vecinal**
- **Servicios de Deporte**
- **Salud** (Compromiso 1 y Veterinaria)

## Tecnologías

- **Next.js 15** con App Router
- **TypeScript** para type safety
- **Redux Toolkit** para gestión de estado global
- **Material-UI (MUI)** para componentes de UI
- **Tailwind CSS** para estilos utility-first
- **Formik + Yup** para formularios y validación
- **Axios** para peticiones HTTP
- **CryptoJS** para encriptación de localStorage
- **SweetAlert2** para notificaciones
- **Day.js** para manejo de fechas
- **XLSX** para exportación de reportes

## Estructura del Proyecto

```
sgdh-frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   │   └── login/
│   │   │       ├── programas-sociales/
│   │   │       └── servicios-sociales/
│   │   ├── (protected)/              # Grupo de rutas protegidas
│   │   │   ├── programas-sociales/   # Módulos de Programas Sociales
│   │   │   │   ├── pvl/
│   │   │   │   ├── pantbc/
│   │   │   │   ├── comedores-populares/
│   │   │   │   ├── ollas-comunes/
│   │   │   │   ├── ule/
│   │   │   │   ├── omaped/
│   │   │   │   ├── ciam/
│   │   │   │   └── layout.tsx
│   │   │   └── servicios-sociales/   # Módulos de Servicios Sociales
│   │   │       ├── participacion-ciudadana/
│   │   │       ├── servicios-deporte/
│   │   │       ├── salud/
│   │   │       └── layout.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Página de selección de subgerencia
│   ├── components/                   # Componentes reutilizables
│   │   ├── forms/                    # Componentes de formularios
│   │   ├── modals/                   # Componentes de modales
│   │   ├── navigation/               # Header y Sidebar
│   │   ├── tables/                   # CRUDTable
│   │   └── ui/                       # Componentes básicos
│   ├── lib/                          # Utilidades y configuración
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useFetch.ts
│   │   │   └── usePermissions.ts
│   │   ├── utils/                    # Funciones utilitarias
│   │   │   ├── localStorageUtils.ts
│   │   │   └── swalConfig.ts
│   │   └── constants.ts              # Constantes del sistema
│   ├── redux/                        # Redux Toolkit
│   │   ├── slices/
│   │   │   └── authSlice.ts
│   │   ├── hooks.ts
│   │   ├── providers.tsx
│   │   └── store.ts
│   ├── types/                        # TypeScript types
│   │   └── auth.ts
│   └── middleware.ts                 # Next.js middleware
├── public/                           # Archivos estáticos
│   └── images/
├── .env.local                        # Variables de entorno
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Instalación

1. Clonar el repositorio:
```bash
cd sgdh-frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Editar el archivo `.env.local` con tus configuraciones:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SECRET_KEY=TU_CLAVE_SECRETA
```

4. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```

5. Abrir [http://localhost:3000](http://localhost:3000) en tu navegador.

## Scripts Disponibles

- `npm run dev` - Ejecuta el servidor de desarrollo
- `npm run build` - Crea la versión de producción
- `npm run start` - Ejecuta el servidor de producción
- `npm run lint` - Ejecuta el linter

## Características Principales

### Autenticación
- Login por subgerencia
- Almacenamiento encriptado con CryptoJS
- Protección de rutas con middleware
- Gestión de sesión con Redux

### Sistema de Permisos
- Permisos por módulo
- Permisos CRUD (Create, Read, Update, Delete)
- Validación en frontend y backend
- UI adaptada según permisos del usuario

### Componentes Reutilizables

#### CRUDTable
Tabla genérica con:
- Búsqueda
- Paginación
- Ordenamiento
- Acciones (Ver, Editar, Eliminar)
- Responsive

Ejemplo de uso:
```tsx
import CRUDTable, { Column } from "@/components/tables/CRUDTable";

const columns: Column[] = [
  { id: "id", label: "ID", minWidth: 50 },
  { id: "nombre", label: "Nombre", minWidth: 150 },
  { id: "email", label: "Email", minWidth: 150 },
];

<CRUDTable
  columns={columns}
  data={beneficiarios}
  onEdit={handleEdit}
  onDelete={handleDelete}
  loading={loading}
/>
```

### Custom Hooks

#### useFetch
Hook para peticiones HTTP:
```tsx
const { getData, postData, putData, deleteData, loading } = useFetch();

// GET
const beneficiarios = await getData("/beneficiarios");

// POST
await postData("/beneficiarios", { nombre: "Juan" });

// PUT
await putData("/beneficiarios/1", { nombre: "Juan Actualizado" });

// DELETE
await deleteData("/beneficiarios/1");
```

#### usePermissions
Hook para validar permisos:
```tsx
const { canCreate, canEdit, canDelete, hasPermission } = usePermissions("pvl");

{canCreate() && <Button>Crear Nuevo</Button>}
{canEdit() && <Button>Editar</Button>}
{canDelete() && <Button>Eliminar</Button>}
```

## Flujo de Autenticación

1. Usuario selecciona la subgerencia en la página principal
2. Es redirigido al login de esa subgerencia
3. Ingresa credenciales
4. El sistema valida y obtiene el token + información del usuario
5. Se guarda en Redux y localStorage (encriptado)
6. El middleware valida el token en cada navegación
7. El usuario accede al dashboard de su subgerencia

## Próximos Pasos

1. **Crear módulos CRUD** para cada programa/servicio
2. **Implementar gráficos** con MUI X Charts o Recharts
3. **Agregar exportación de reportes** en Excel/PDF
4. **Implementar sistema de archivos** para documentos
5. **Agregar validaciones** más específicas por módulo
6. **Crear tests** unitarios e integración

## Colores del Sistema

- **Programas Sociales:** `#d81b7e` (Magenta)
- **Servicios Sociales:** `#00a3a8` (Turquesa)

## Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.

## Licencia

Municipalidad de San Juan de Lurigancho - Todos los derechos reservados
