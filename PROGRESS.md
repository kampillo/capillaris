# Capillaris — Progreso del Proyecto

**Última actualización:** 2026-03-12
**Estado general:** Backend 100% completo, Frontend ~90% completo, Migración de datos completa

---

## Resumen Ejecutivo

Capillaris es un CRM médico para una clínica de trasplante capilar. El proyecto migra el sistema legacy (Laravel 5.8 + MySQL) a una arquitectura moderna: NestJS + Next.js + PostgreSQL.

| Componente | Estado | Notas |
|---|---|---|
| API (NestJS) | **100%** | 16 módulos, Swagger, JWT auth, Prisma |
| Migración de datos | **100%** | 4,449 pacientes, 22 usuarios, validación al 100% |
| Frontend (Next.js) | **~90%** | Todas las páginas CRUD implementadas, faltan imágenes y polish |
| Deploy | **Pendiente** | Vercel (web) + DigitalOcean (API/DB) |

---

## 1. Arquitectura

```
capillaris/                        # Turborepo monorepo
├── apps/
│   ├── api/                       # NestJS 10 — Puerto 3001, prefijo /api/v1
│   │   ├── prisma/schema.prisma   # 34 modelos, PostgreSQL
│   │   └── src/modules/           # 16 módulos
│   └── web/                       # Next.js 14 — Puerto 3000
│       ├── src/app/               # App Router pages
│       ├── src/components/        # shadcn/ui + layout
│       ├── src/hooks/             # TanStack Query hooks
│       ├── src/store/             # Zustand (auth)
│       └── src/lib/               # API client, utils
├── packages/
│   └── shared/                    # Tipos, enums, DTOs compartidos
└── scripts/
    └── migration/                 # Sistema de migración MySQL → PG
```

### Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10, Prisma ORM, PostgreSQL, JWT, Swagger |
| Frontend | Next.js 14 (App Router), TailwindCSS, shadcn/ui, TanStack Query, Zustand |
| Shared | TypeScript, enums y DTOs compartidos |
| Storage | Cloudflare R2 (S3-compatible) para imágenes |
| Deploy (planeado) | Vercel (web) + DigitalOcean (API + PostgreSQL) |

---

## 2. API Backend — Módulos (100%)

Todos los módulos están completamente implementados con CRUD, validación DTO, guards JWT y documentación Swagger.

| Módulo | Endpoint Base | Funcionalidad |
|---|---|---|
| Auth | `/auth` | Login, registro, JWT tokens |
| Users | `/users` | CRUD usuarios, soft delete, roles |
| Patients | `/patients` | CRUD, búsqueda, paginación, soft delete, `legacyId` |
| Appointments | `/appointments` | CRUD, paginación, estados (scheduled→completed) |
| Prescriptions | `/prescriptions` | CRUD con items anidados, estados (draft→active→completed) |
| Clinical Histories | `/clinical-histories` | CRUD con 4 sub-tablas (heredofamiliares, no patológicos, tratamientos previos, exploración física) |
| Medical Consultations | `/medical-consultations` | CRUD con pivots donor_zones y variants |
| Procedures | `/procedures` | CRUD, folículos, anestesia, herramientas (flatten de 4 tablas legacy) |
| Micropigmentations | `/micropigmentations` | CRUD por paciente |
| Hairmedicines | `/hairmedicines` | CRUD por paciente |
| Products | `/products` | CRUD, categorías, SKU, soft delete (isActive) |
| Inventory | `/inventory` | Stock balances, movimientos (entrada/salida/ajuste), alertas stock bajo |
| Images | `/images` | CRUD, upload S3/R2, presigned URLs |
| Reports | `/reports` | Reportes de pacientes, procedimientos, ventas |
| Reminders | `/reminders` | CRUD, pendientes, cancelación, templates |
| Notifications | `/notifications` | Controller existe, servicio es stub |
| Catalog | `/catalog` | Doctors, donor-zones, variants, hair-types |

### Autenticación

- JWT Bearer tokens
- Guards por ruta (`JwtAuthGuard`, `RolesGuard`)
- Roles: admin, doctor, receptionist, inventory_manager
- Password hashing con bcrypt (compatible PHP↔Node)

---

## 3. Frontend — Páginas Implementadas

### Autenticación y Navegación

| Página | Ruta | Estado |
|---|---|---|
| Login | `/login` | **Completo** — formulario real con API call, Zustand store |
| Dashboard Layout | `/dashboard/*` | **Completo** — sidebar, header con user dropdown, auth guard |
| Sidebar | — | **Completo** — 8 secciones de navegación |
| Header | — | **Completo** — título dinámico, notificaciones, menú usuario (perfil, logout) |
| Perfil de Usuario | `/dashboard/profile` | **Completo** — editar nombre/email, cambiar contraseña |

### Pacientes

| Página | Ruta | Estado |
|---|---|---|
| Lista de pacientes | `/dashboard/patients` | **Completo** — búsqueda, filtros por tipo, paginación |
| Detalle de paciente | `/dashboard/patients/[id]` | **Completo** — info personal, acciones rápidas, actividad reciente |
| Nuevo paciente | `/dashboard/patients/new` | **Completo** — formulario completo con validación Zod |
| Editar paciente | `/dashboard/patients/[id]/edit` | **Completo** — formulario pre-poblado |
| Historia clínica | `/dashboard/patients/[id]/history` | **Completo** — heredofamiliares, no patológicos, tratamientos, exploración física |
| Consultas | `/dashboard/patients/[id]/consultations` | **Completo** — lista + crear consulta |
| Procedimientos | `/dashboard/patients/[id]/procedures` | **Completo** — lista + crear procedimiento |
| Prescripciones | `/dashboard/patients/[id]/prescriptions` | **Completo** — lista filtrada por paciente |
| Imágenes | `/dashboard/patients/[id]/images` | **Pendiente** — galería + upload S3 |

### Citas

| Página | Ruta | Estado |
|---|---|---|
| Lista de citas | `/dashboard/appointments` | **Completo** — tabla, filtro por estado, cambio de estado inline, paginación, eliminar |
| Nueva cita | `/dashboard/appointments/new` | **Completo** — búsqueda de paciente, selección de doctor, fecha/hora, título/descripción |

### Prescripciones

| Página | Ruta | Estado |
|---|---|---|
| Lista | `/dashboard/prescriptions` | **Completo** — tabla, filtro por estado, paginación, eliminar |
| Nueva prescripción | `/dashboard/prescriptions/new` | **Completo** — búsqueda paciente, doctor, medicamentos dinámicos (agregar/eliminar), dosis, frecuencia, duración |

### Inventario

| Página | Ruta | Estado |
|---|---|---|
| Lista de productos | `/dashboard/inventory` | **Completo** — tabla con stock, alertas stock bajo, desactivar producto |
| Nuevo producto | `/dashboard/inventory/products/new` | **Completo** — nombre, SKU, precio, unidad, medicamento, alerta mínimo |
| Movimientos de stock | `/dashboard/inventory/movements` | **Completo** — tabla de balances, crear movimiento (entrada/salida/ajuste) |

### Recordatorios

| Página | Ruta | Estado |
|---|---|---|
| Lista | `/dashboard/reminders` | **Completo** — tabla, filtro estado, crear con búsqueda de paciente, cancelar |

### Reportes

| Página | Ruta | Estado |
|---|---|---|
| Dashboard de reportes | `/dashboard/reports` | **Completo** — reporte pacientes (total, nuevos, por tipo) + procedimientos (total, promedio/total folículos) con filtro de fechas |

### Dashboard

| Página | Ruta | Estado |
|---|---|---|
| KPIs | `/dashboard` | **Completo** — 4 tarjetas con datos reales: total pacientes, citas hoy, prescripciones, procedimientos del mes |

### Configuración

| Página | Ruta | Estado |
|---|---|---|
| Hub de configuración | `/dashboard/settings` | **Completo** — enlaces a secciones |
| Gestión de usuarios | `/dashboard/settings/users` | **Completo** — tabla con roles, crear usuario, desactivar |

### Hooks de TanStack Query Implementados

| Hook File | Funciones |
|---|---|
| `use-patients.ts` | usePatients, usePatient, useCreatePatient, useUpdatePatient, useDeletePatient |
| `use-appointments.ts` | useAppointments, useAppointment, useCreateAppointment, useUpdateAppointment, useDeleteAppointment |
| `use-prescriptions.ts` | usePrescriptions, usePrescription, useCreatePrescription, useUpdatePrescription, useDeletePrescription |
| `use-clinical.ts` | useClinicalHistories, useConsultations, useProcedures, useDoctors, useDonorZones, useVariants, useHairTypes + create mutations |
| `use-inventory.ts` | useProducts, useProduct, useCreateProduct, useUpdateProduct, useDeleteProduct, useInventoryBalances, useLowStock, useStockMovements, useCreateStockMovement |
| `use-reminders.ts` | useReminders, usePendingReminders, useCreateReminder, useUpdateReminder, useCancelReminder |
| `use-users.ts` | useUsers, useCreateUser, useUpdateUser, useDeleteUser |
| `use-dashboard.ts` | usePatientsReport, useProceduresReport |

### Auth Store (Zustand)

- `store/auth.ts` — estado global de autenticación
- `login(token, user)` — guarda en localStorage + Zustand
- `logout()` — limpia localStorage + Zustand, redirige a /login
- `hydrate()` — rehidrata estado desde localStorage al cargar
- Dashboard layout verifica autenticación y redirige si no hay sesión
- API client auto-redirige a /login en respuestas 401

---

## 4. Migración de Datos (100%)

Documentación detallada en `MIGRATION-SESSION.md`.

### Resumen

| Dato | Valor |
|---|---|
| Dump fuente | `cap290126.sql` (5.1MB) |
| Pacientes migrados | 4,449 |
| Usuarios migrados | 22 |
| Historias clínicas | 4,786 |
| Consultas médicas | 1,956 |
| Procedimientos | 1,878 |
| Imágenes | 1,074 |
| Micropigmentaciones | 253 |
| Hairmedicines | 2,165 |
| Citas | 30 |
| Prescripciones | 6 |
| Tiempo de ejecución | ~9.5 segundos |
| Validación FK | 15/15 checks pasados |
| Sample audit | 5 pacientes random, 100% coinciden |

### Transformaciones principales

- **IDs:** MySQL INT → UUID v5 determinístico
- **Edad → Fecha nacimiento:** `edad=35` → `1991-01-01`, `edadApproximada=true`
- **Teléfonos:** Normalización a formato `+52XXXXXXXXXX`
- **Passwords:** bcrypt hashes copiados directamente (compatibles PHP↔Node)
- **Procedimientos:** 4 tablas MySQL flattened → 1 tabla PG
- **Imágenes:** URL S3 → extracción de s3Key + bucket + fileName

### Nota para migración final (go-live)

El sistema legacy sigue en uso. Al momento del cutover:
1. Bloquear acceso al sistema Laravel (viernes PM)
2. Obtener dump fresco
3. Ejecutar `npm run migrate` (idempotente, ~10s)
4. Validar con `npm run validate`
5. Arrancar sistema nuevo (lunes AM)

---

## 5. Credenciales de Desarrollo

| Servicio | Dato |
|---|---|
| API | `http://localhost:3001/api/v1` |
| Web | `http://localhost:3000` |
| PostgreSQL | `localhost:5432`, user `kampiyo`, db `capillaris` |
| MySQL (migración) | `localhost:3306`, user `root`, sin password |
| Test user | `test@capillaris.com` / `Test1234` |

---

## 6. Pendientes

### Prioridad Alta

| Item | Descripción | Esfuerzo |
|---|---|---|
| Imágenes de paciente | Galería + upload S3/R2 en `/dashboard/patients/[id]/images` | Medio |
| Deploy | Configurar Vercel + DigitalOcean + variables de entorno | Medio |
| Migración final | Ejecutar con dump fresco cuando el sistema nuevo esté listo | Bajo |

### Prioridad Baja

| Item | Descripción | Esfuerzo |
|---|---|---|
| Perfil con avatar | Upload de foto de perfil para usuarios | Bajo |
| Audit log viewer | Página para ver el log de auditoría | Bajo |
| Export CSV/PDF | Exportar reportes en formatos descargables | Medio |
| PWA | Service worker para uso offline básico | Medio |
| Tests E2E | Cypress o Playwright para flujos críticos | Alto |

### Completados (Polish)

| Item | Estado |
|---|---|
| Vista calendario en citas | **Completado** — toggle Lista/Calendario, vista mensual con colores por estado |
| Gráficas en reportes | **Completado** — PieChart (pacientes por tipo) + BarChart (procedimientos) con recharts |
| Sidebar responsive | **Completado** — hamburger menu en móviles, overlay sidebar con animación, cierre al navegar |
| Servicio de notificaciones | **Completado** — Nodemailer SMTP configurable, template HTML, processReminders con template variables |

---

## 7. Cómo Levantar el Proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Generar Prisma client
cd apps/api && npx prisma generate && cd ../..

# 3. Levantar API
cd apps/api && npm run start:dev

# 4. Levantar Web (en otra terminal)
cd apps/web && npm run dev

# 5. Acceder
# Web: http://localhost:3000
# API: http://localhost:3001/api/v1
# Swagger: http://localhost:3001/api/v1/docs
# Login: test@capillaris.com / Test1234
```

---

## 8. Estructura de Archivos Clave

```
apps/web/src/
├── app/
│   ├── (auth)/login/page.tsx          # Login
│   └── dashboard/
│       ├── layout.tsx                  # Auth guard + sidebar + header
│       ├── page.tsx                    # Dashboard KPIs
│       ├── profile/page.tsx            # User profile
│       ├── patients/                   # 9 páginas
│       ├── appointments/               # 2 páginas (list + new)
│       ├── prescriptions/              # 2 páginas (list + new)
│       ├── inventory/                  # 3 páginas (list + new product + movements)
│       ├── reminders/page.tsx          # List + create + cancel
│       ├── reports/page.tsx            # Reportes con filtro de fechas
│       └── settings/                   # 2 páginas (hub + users)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                 # Navegación principal
│   │   └── header.tsx                  # Título + user dropdown + logout
│   ├── patients/
│   │   └── patient-form.tsx            # Formulario reutilizable
│   └── ui/                             # shadcn/ui components
├── hooks/                              # 8 archivos de hooks TanStack Query
├── store/
│   └── auth.ts                         # Zustand auth store
└── lib/
    ├── api.ts                          # Fetch wrapper con JWT + 401 redirect
    ├── query-client.ts                 # TanStack Query config
    └── utils.ts                        # cn() utility
```
