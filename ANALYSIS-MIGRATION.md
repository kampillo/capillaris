# ANÁLISIS ARQUITECTURAL Y PLAN DE MIGRACIÓN
## Sistema Médico Capillaris → NestJS/Next.js/Postgres

**Fecha:** 2026-01-15 | **Actualizado:** 2026-03-02
**Sistema Actual:** Laravel 5.8 (PHP 7.1)
**Sistema Destino:** NestJS + Next.js + PostgreSQL
**Dominio:** CRM/Sistema Médico para Clínica de Trasplante Capilar

---

## DECISIONES DE STAKEHOLDERS (2026-03-02)

### Alcance y Prioridades
| Decisión | Respuesta |
|----------|-----------|
| **Orden de prioridad** | Pacientes → Formularios clínicos (historia, procedimientos, micropigmentación, hairmedicine) → Citas → Recordatorios → Inventario → Reportes → Dashboard |
| **Timeline MVP** | **3 meses** |
| **Usuarios** | 1-5 personas (equipo pequeño: recepción + doctores) |
| **Horario clínica** | Lun-Vie 8am-6pm, downtime fuera de horario OK |

### Decisiones Arquitecturales
| Decisión | Respuesta |
|----------|-----------|
| **Inventario** | Gestión completa en el sistema nuevo (solo stock, sin ventas/facturación) |
| **Nomisor** | **DESCARTADO** - no se usará |
| **Brevo** | **DESCARTADO** - no lo usan actualmente |
| **WhatsApp Cloud API** | **DESCARTADO** - prefieren WhatsApp normal/manual |
| **WooCommerce** | Ya en desarrollo, integración para **Fase 2** (no MVP) |
| **Google Calendar** | Sí integrar (actualmente desactivado en Laravel) |
| **Hosting** | Vercel (frontend) + DigitalOcean (backend/DB) |
| **Imágenes** | Cloudflare R2 (recomendado: económico, compatible S3) |
| **Ventas/Facturación** | No - solo inventario (stock) |

### Datos y Migración
| Decisión | Respuesta |
|----------|-----------|
| **Edad → fecha_nacimiento** | Fecha aproximada (01/01/año) + flag `edad_approximada` |
| **Emails** | % desconocido - requiere auditoría |
| **Teléfonos** | México + algunos internacionales |
| **Duplicados** | Sí hay, cantidad desconocida - requiere auditoría |
| **Recetas actual** | Solo se registran en sistema, sin vínculo a inventario |
| **Ventas mostrador** | No se registran actualmente |
| **Consentimientos** | Parcial - tienen para datos y fotos pero no estandarizado |

### Reportes Prioritarios
1. Pacientes nuevos por periodo
2. Procedimientos por doctor
3. Ventas/ingresos por producto
4. Conversión lead → procedimiento

---

## A) SYSTEM OVERVIEW

### 1.1 ¿Qué es el sistema?

**Capillaris** es un CRM médico especializado para clínicas de trasplante capilar que gestiona el ciclo completo del paciente desde el primer contacto hasta el seguimiento post-procedimiento. El sistema fue desarrollado en Laravel 5.8 (~2018) y sigue en operación activa en una clínica.

### 1.2 Usuarios del Sistema

| Rol | Funcionalidad Principal | Acceso |
|-----|------------------------|---------|
| **Recepción** | Registro de pacientes, agenda de citas, atención inicial | Web |
| **Doctores/Médicos** | Consultas médicas, reportes de procedimientos, prescripciones | Web |
| **Administradores** | Gestión de usuarios, catálogo de productos, reportes | Web |
| **Personal de inventario** | Entradas/salidas de productos (actualmente en Excel) | Limitado |

**Nota:** El sistema usa roles/permisos de Spatie, pero algunas funcionalidades (prescripciones) usan autorización hardcodeada por user_id (1, 2, 5).

### 1.3 Flujos Principales

#### Flujo 1: Registro y Primera Valoración
```
1. Recepción registra paciente (nombre, apellido, edad, contacto, dirección)
2. Se crea expediente con tipo_paciente = "Registrado" (1)
3. Doctor realiza valoración general → Consulta Médica
   - Análisis capilar (grosor, textura, color, caspa, grasa)
   - Valoración zona donante (Escasa/Media/Suficiente/Amplia)
   - Diagnóstico
4. Si procede: cambio a tipo_paciente = "Valoración procedimiento" (3)
5. Se agenda cita para procedimiento
```

#### Flujo 2: Procedimiento de Trasplante Capilar (FUE/FUSS)
```
1. Doctor crea Reporte de Procedimiento:
   - Selección de herramientas (punch 0.85-1.0, implantador)
   - Registro de anestesia extracción (tiempos, medicación: lidocaína, adrenalina, bicarbonato, betametasona)
   - Registro de anestesia implantación
   - Conteo de folículos (cb1, cb2, cb3, cb4, total)
   - Tipos de cabello utilizados
   - Múltiples doctores pueden participar (relación many-to-many)
2. Se toman fotos (antes/después) → S3
3. Se marca is_recent para seguimiento
```

#### Flujo 3: Micropigmentación
```
1. Doctor registra sesión de micropigmentación
2. Captura: fecha, duración, dilución, tipos de cabello, descripción
3. Vincula con paciente
```

#### Flujo 4: Medicina Capilar (Hairmedicine)
```
1. Doctor registra tratamiento no quirúrgico (minoxidil, finasteride, dutasteride, bicalutamida)
2. Vincula con paciente
3. **GAP:** No hay recordatorios automáticos ni seguimiento
```

#### Flujo 5: Prescripciones
```
1. Doctor autorizado (IDs 1, 2, 5) crea prescripción
2. Selecciona medicinas de catálogo
3. Relación many-to-many con medicinas
4. **GAP:** No se vincula con inventario/ventas
```

#### Flujo 6: Gestión de Citas
```
1. Recepción/Doctor crea cita con paciente
2. Se integra con Google Calendar (spatie/laravel-google-calendar)
3. Dashboard agrupa citas por: hoy, esta semana, este mes
4. **GAP:** No hay recordatorios automáticos
```

#### Flujo 7: Gestión de Imágenes
```
1. Upload de fotos de paciente a AWS S3
2. Clasificación: is_favorite, is_recent
3. Visualización en perfil del paciente (antes/después)
```

### 1.4 Estado Actual del Sistema

**✅ Funcionalidades Operativas:**
- Gestión completa de pacientes (CRUD)
- Historia clínica (antecedentes patológicos, heredofamiliares, físicos)
- Consultas médicas con análisis capilar detallado
- Reportes de procedimientos (FUE/FUSS) con trazabilidad
- Micropigmentación y medicina capilar
- Prescripciones médicas
- Gestión de citas con Google Calendar
- Almacenamiento de imágenes en S3
- Roles y permisos (Spatie)

**⚠️ Funcionalidades Desactivadas/Comentadas:**
- Inventario de productos (routes comentadas en web.php líneas 122-128)
- Proveedores
- Entradas/salidas de stock
- Balance de inventario
- Exports/reportes avanzados

**❌ Problemas Críticos Identificados:**

1. **Tecnología Obsoleta:**
   - Laravel 5.8 (2019) - Sin soporte de seguridad desde 2020
   - PHP 7.1 - EOL diciembre 2019
   - Múltiples vulnerabilidades potenciales

2. **Data Quality:**
   - `edad` almacenada como integer, no se actualiza con el tiempo
   - No hay `fecha_nacimiento`
   - Datos incompletos (email nullable, direccion nullable)
   - No hay normalización de teléfonos (formato libre)

3. **Autorización:**
   - Prescripciones usan hardcoded user IDs (1, 2, 5) en lugar de roles
   - No hay audit trail

4. **Integraciones Faltantes:**
   - No hay integración con Brevo
   - No hay integración con WhatsApp
   - No hay integración con inventario externo (Nomisor)
   - No hay integración con WooCommerce

5. **Reportes:**
   - No hay exports automáticos
   - No hay filtros avanzados
   - Dashboard muy básico (solo lista últimos 500 pacientes)
   - paquete maatwebsite/excel instalado pero no usado

6. **Seguridad:**
   - Credenciales de Google Calendar en archivo JSON dentro del repo (línea 6 de google-calendar config)
   - No hay encriptación de datos médicos sensibles
   - No hay HIPAA/compliance tracking

---

## B) MODULE INVENTORY

| Módulo | Funcionalidades | Tablas Principales | Rutas Clave | Riesgos/Deuda Técnica |
|--------|----------------|-------------------|-------------|----------------------|
| **Autenticación** | Login, logout, password reset | users, password_resets | POST /login, GET /logout | - Credenciales Google Calendar en repo<br>- Sin 2FA<br>- Sin audit log de accesos |
| **Gestión de Usuarios** | CRUD usuarios, roles, permisos | users, roles, permissions, model_has_roles | /users (resource) | - Autorización mixta (Spatie + hardcoded IDs)<br>- Campo ced_prof agregado después (migración 2021) |
| **Gestión de Pacientes** | CRUD pacientes, búsqueda, tipos de paciente | patients | /patients (resource)<br>/search-patients<br>/guardarP, /actualizarP | - **CRÍTICO:** edad como integer<br>- Falta fecha_nacimiento<br>- Email no obligatorio<br>- Teléfonos sin formato<br>- No hay deduplicación |
| **Historia Clínica** | Antecedentes, exploración física, tratamientos previos | clinical_histories, inherit_relatives, non_pathological_personals, previous_treatments, physical_explorations | /clinicalHistories (resource) | - Estructura normalizada correctamente<br>- Campos booleanos para tratamientos previos |
| **Consultas Médicas** | Valoración capilar, diagnóstico, zonas donantes | medical_consultations, donor_zones, variants, donor_zone_medical_consultation, medical_consultation_variant | /consultations<br>/consultation/* | - Actualiza edad del paciente inline (línea 77-78 MedicalConsultationController)<br>- Integración Google Calendar comentada |
| **Procedimientos** | Reportes FUE/FUSS, anestesia, folículos, herramientas | procedure_reports, hair_follicles, tools, anesthesia_extractions, anesthesia_implantations, hair_types, procedure_report_user | /procedures<br>/procedure/* | - Relación user many-to-many agregada 2024<br>- user_id foreign key removida 2024<br>- Estructura compleja, datos críticos |
| **Micropigmentación** | Sesiones de micropigmentación, tipos de cabello | micropigmentations, hair_type_micropigmentation | /micropigmentations<br>/micropigmentation/* | - Campo dilucion agregado 2021<br>- Campo comments en hairmedicines agregado 2021 |
| **Medicina Capilar** | Tratamientos no quirúrgicos | hairmedicines | /hairmedicines<br>/hairmedicine/* | - **GAP:** No hay recordatorios<br>- No se vincula con prescripciones<br>- No se vincula con productos |
| **Prescripciones** | Recetas médicas, medicamentos | prescriptions, medicines, medicines_prescriptions | /prescriptions<br>/prescription/* | - **CRÍTICO:** Autorización hardcoded (IDs 1,2,5)<br>- **GAP:** No se vincula con inventario<br>- **GAP:** No genera recordatorios<br>- Campo name vacío en creación (línea 70) |
| **Citas** | Agenda, calendario, Google Calendar | appointments | /appointments<br>/calendar<br>/appointment/* | - event_id agregado 2021<br>- Integración Google Calendar activa<br>- **GAP:** No hay recordatorios automáticos |
| **Imágenes** | Upload S3, favoritos, antes/después | images_patient | /pictures (resource)<br>/images/* | - Usa AWS S3 correctamente<br>- Visibilidad pública por defecto<br>- No hay compresión/optimización |
| **Inventario** | Productos, entradas, salidas, balance | products, units, stock_input, stock_output, balances, stock_operation_types | **DESACTIVADO** (comentado en routes) | - **CRÍTICO:** Código existe pero routes desactivadas<br>- Controladores con >6000 líneas<br>- Personal usa Excel actualmente<br>- Datos desincronizados |
| **Dashboard** | Vista principal, totales | N/A | GET / | - Solo muestra últimos 500 pacientes<br>- No hay KPIs<br>- No hay charts<br>- No hay filtros |
| **Reportes** | Exports, analytics | N/A | /totalUsuarios<br>/totalRecetas<br>/total | - **GAP:** Solo endpoints de conteo básico<br>- maatwebsite/excel no usado<br>- No hay reportes por estado, edad, origen, etc. |

### Módulos Identificados en Vistas (Blade) pero Sin Uso

- `/admin/doctors/*` - Vistas de doctores (posiblemente duplicado de users con rol)
- `/admin/dates/index` - Alternativa a appointments
- `/admin/imagesFavorites/index` - Vista específica de imágenes favoritas

---

## C) ENDPOINT CATALOG

### Autenticación

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| POST | /login | Auth\LoginController@login | guest | Login usuario |
| GET | /logout | Auth\LoginController@logout | auth | Logout usuario |
| POST | /password/email | - | - | Request password reset |
| POST | /password/reset | - | - | Reset password |

### Dashboard & Totales

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | / | HomeController@index | auth | Dashboard principal (últimos 500 pacientes) |
| GET | /totalUsuarios | UserController@total | auth | **JSON:** Conteo total de usuarios |
| GET | /totalRecetas | PrescriptionController@total | auth | **JSON:** Conteo total de prescripciones |
| GET | /total | PatientController@total | auth | **JSON:** Conteo total de pacientes |

### Gestión de Usuarios

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /users | UserController@index | auth | Lista todos los usuarios |
| GET | /users/create | UserController@create | auth | Form crear usuario |
| POST | /users | UserController@store | auth | Guarda nuevo usuario (hash password, transaction) |
| GET | /users/{id}/edit | UserController@edit | auth | Form editar usuario |
| PUT | /users/{id} | UserController@update | auth | Actualiza usuario (cambio password opcional) |
| DELETE | /users/{id} | UserController@destroy | auth | **JSON:** Elimina usuario |

### Gestión de Pacientes

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /patients | PatientController@index | auth | Lista todos los pacientes |
| GET | /patients/create | PatientController@create | auth | Form crear paciente |
| POST | /patients | PatientController@store | auth | Guarda paciente (tipo_paciente=1, transaction) |
| GET | /patients/{id} | PatientController@show | auth | Vista detalle paciente (micro, procedures, images, hairmedicines) |
| GET | /patient/edit/{id} | PatientController@edit | auth | Form editar paciente |
| DELETE | /patients/{id} | PatientController@destroy | auth | **JSON:** Elimina paciente (transaction) |
| **POST** | **/guardarP** | PatientController@store2 | auth | **JSON:** Crear paciente (alternativo) |
| **PUT** | **/actualizarP/{id}** | PatientController@update | auth | **JSON:** Actualizar paciente |
| **GET** | **/obtenerP/{id}** | PatientController@show2 | auth | **JSON:** Obtener paciente |
| GET | /search-patients | PatientController@search | auth | **JSON:** Búsqueda por nombre/apellido (CONCAT) |

### Historia Clínica

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /clinicalHistories | ClinicalHistoryController@index | auth | Lista historias (tiene dd() debug) |
| GET | /clinicalHistory/create/{id} | ClinicalHistoryController@create | auth | Form crear historia para paciente |
| POST | /clinicalHistories | ClinicalHistoryController@store | auth | Guarda historia (crea 5 tablas relacionadas) |
| GET | /clinicalHistory/edit/{id} | ClinicalHistoryController@edit | auth | Form editar historia |
| POST | /patient/clinicalHistory/update | ClinicalHistoryController@update | auth | Actualiza historia |
| DELETE | /clinicalHistory/destroy/{id} | ClinicalHistoryController@destroy | auth | Elimina historia |

### Consultas Médicas

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /consultations | MedicalConsultationController@index | auth | Lista consultas |
| GET | /consultation/create/{id} | MedicalConsultationController@create | auth | Form crear consulta para paciente |
| POST | /consultations/store | MedicalConsultationController@store | auth | Guarda consulta (actualiza edad paciente, attach donor_zones y variants) |
| GET | /consultation/show/{id} | MedicalConsultationController@show | auth | Detalle consulta |
| GET | /consultation/edit/{id} | MedicalConsultationController@edit | auth | Form editar consulta |
| POST | /consultation/update | MedicalConsultationController@update | auth | Actualiza consulta |
| DELETE | /consultation/destroy/{id} | MedicalConsultationController@destroy | auth | Elimina consulta |

### Procedimientos (FUE/FUSS)

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /procedures | ProcedureReportController@index | auth | Lista procedimientos (tiene dd() debug) |
| GET | /procedure/create/{id} | ProcedureReportController@create | auth | Form crear procedimiento para paciente |
| POST | /procedure/store | ProcedureReportController@store | auth | Guarda procedimiento complejo (follicles, anesthesia extraction/implantation, tool, hair_types, multiple users) |
| GET | /procedure/show/{id} | ProcedureReportController@show | auth | Detalle procedimiento |
| GET | /procedure/edit/{id} | ProcedureReportController@edit | auth | Form editar procedimiento |
| POST | /procedure/update | ProcedureReportController@update | auth | Actualiza procedimiento |
| DELETE | /procedure/destroy/{id} | ProcedureReportController@destroy | auth | Elimina procedimiento |

### Micropigmentación

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /micropigmentations | MicropigmentationController@index | auth | Lista micropigmentaciones (tiene dd() debug) |
| GET | /micropigmentation/create/{id} | MicropigmentationController@create | auth | Form crear micropigmentación para paciente |
| POST | /micropigmentation/store | MicropigmentationController@store | auth | Guarda micropigmentación (attach hair_types) |
| GET | /micropigmentation/show/{id} | MicropigmentationController@show | auth | Detalle micropigmentación |
| GET | /micropigmentation/edit/{id} | MicropigmentationController@edit | auth | Form editar micropigmentación |
| POST | /micropigmentation/update | MicropigmentationController@update | auth | Actualiza micropigmentación |
| DELETE | /micropigmentation/destroy/{id} | MicropigmentationController@destroy | auth | Elimina micropigmentación |

### Medicina Capilar (Tratamientos No Quirúrgicos)

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /hairmedicines | HairmedicineController@index | auth | Lista tratamientos capilares |
| GET | /hairmedicine/create/{id} | HairmedicineController@create | auth | Form crear tratamiento para paciente |
| POST | /hairmedicine/store | HairmedicineController@store | auth | Guarda tratamiento |
| GET | /hairmedicine/show/{id} | HairmedicineController@show | auth | Detalle tratamiento |
| GET | /hairmedicine/edit/{id} | HairmedicineController@edit | auth | Form editar tratamiento |
| PUT | /hairmedicine/{id} | HairmedicineController@update | auth | Actualiza tratamiento |
| DELETE | /hairmedicine/destroy/{id} | HairmedicineController@destroy | auth | Elimina tratamiento |

### Prescripciones

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /prescriptions | PrescriptionController@index | auth | Lista prescripciones |
| GET | /prescription/create | PrescriptionController@create | **auth + authorizeAccess([1,2,5])** | Form crear prescripción |
| GET | /prescription/create/{id} | PrescriptionController@create2 | **auth + authorizeAccess([1,2,5])** | Form crear prescripción para paciente específico |
| POST | /prescription/store | PrescriptionController@store | **auth + authorizeAccess([1,2,5])** | Guarda prescripción (name='', attach medicines) |
| GET | /prescription/show/{id} | PrescriptionController@show | **auth + authorizeAccess([1,2,5])** | Detalle prescripción |
| GET | /prescription/edit/{id} | PrescriptionController@edit | **auth + authorizeAccess([1,2,5])** | Form editar prescripción |
| POST | /prescription/update | PrescriptionController@update | **auth + authorizeAccess([1,2,5])** | Actualiza prescripción |
| DELETE | /prescription/destroy/{id} | PrescriptionController@destroy | auth | Elimina prescripción |

**⚠️ CRÍTICO:** Autorización hardcodeada en lugar de usar roles de Spatie.

### Citas y Calendario

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /calendar | CalendarController@index | auth | Vista de calendario |
| GET | /appointments | AppointmentController@index | auth | Lista citas (agrupadas hoy/semana/mes + Google Calendar events) |
| GET | /appointments/list | AppointmentController@lists | auth | Vista alternativa de lista |
| GET | /appointment/create | AppointmentController@create | auth | Form crear cita |
| GET | /appointment/create/{id} | AppointmentController@createId | auth | Form crear cita para paciente específico |
| POST | /appointment/store | AppointmentController@store | auth | Guarda cita (integración Google Calendar comentada) |
| GET | /appointment/show/{id} | AppointmentController@show | auth | Detalle cita |
| GET | /appointment/edit/{id} | AppointmentController@edit | auth | Form editar cita |
| POST | /appointment/update | AppointmentController@update | auth | Actualiza cita |
| DELETE | /appointment/destroy/{id} | AppointmentController@destroy | auth | Elimina cita |

### Imágenes de Pacientes

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /pictures | ImageController@index | auth | Lista imágenes favoritas |
| GET | /images/patient/{id} | ImageController@index2 | auth | Lista imágenes de paciente específico |
| POST | /images/is_favorite/{id} | ImageController@is_favorite | auth | Marca/desmarca imagen como favorita |
| PUT | /patient/images/{id} | ImagePatientController@update | auth | **Upload a S3** (visibility public, intervention/image resize) |
| DELETE | /images/destroy/{id} | ImageController@destroy | auth | Elimina imagen (¿también de S3?) |

### API Endpoints

| Method | Path | Controller@Method | Middleware | Descripción |
|--------|------|------------------|------------|-------------|
| GET | /api/user | - | auth:api | Retorna usuario autenticado (token-based) |

**⚠️ NOTA:** Solo 1 endpoint API. Sistema principalmente web-based.

### Rutas Desactivadas/Comentadas

Las siguientes rutas están comentadas en `routes/web.php` (líneas 122-153):

- `/products` - Gestión de productos (inventario)
- `/providers` - Gestión de proveedores
- `/inputs` - Entradas de inventario
- `/outputs` - Salidas de inventario
- `/balances` - Balance de inventario
- Rutas alternativas de historia clínica y consultas

**Impacto:** Funcionalidad de inventario existe en código pero está desactivada. Personal usa Excel actualmente.

---

## D) DATA MODEL SUMMARY

### Entidades Core (Single Source of Truth)

#### 1. **Patient** (Pacientes) 🔴 CRÍTICO

**Tabla:** `patients`

**Campos:**
- `id` (PK)
- `nombre`, `apellido`
- `email` (unique, nullable) ⚠️
- `celular` (string, sin formato) ⚠️
- `direccion` (nullable)
- **`edad` (integer, NO SE ACTUALIZA)** 🔴 **PROBLEMA CRÍTICO**
- `genero` (enum: hombre|mujer|otro, stored as string pero model usa 1|2|3)
- `estado_civil` (enum: soltero|casado/a|union libre|divorciado/a|viudo/a|otro)
- `ocupacion` (enum: Profesionista|tecnico|estudiante|otro)
- `tipo_paciente` (int: 0=default, 1=Registrado, 2=Valoración general, 3=Valoración procedimiento)
- `clinical_history_id` (nullable) ⚠️
- `timestamps`

**Relaciones:**
- hasMany: ClinicalHistory, MedicalConsultation, ProcedureReport, ImagePatient, Appointment, Hairmedicine, Micropigmentation, Prescription

**PII/Riesgos:**
- 🔴 **Datos médicos sensibles (HIPAA/LGPD/GDPR)**
- 🔴 **edad no se actualiza automáticamente**
- ⚠️ Email no obligatorio → dificulta integración con Brevo
- ⚠️ Teléfono sin formato → dificulta integración WhatsApp
- ⚠️ No hay campo origen/canal (¿cómo llegó? FB/IG/WhatsApp/Web/Referido)
- ⚠️ No hay campos de segmentación (ciudad, estado, país)
- ⚠️ No hay deduplicación → posibles registros duplicados

**Estrategia Migración:**
```sql
-- Nueva estructura propuesta
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE, -- mantener nullable inicialmente
  celular VARCHAR(20), -- normalizar a E.164 format (+52...)
  celular_normalized VARCHAR(20), -- para búsquedas
  direccion TEXT,
  fecha_nacimiento DATE, -- ⭐ NUEVO
  edad_approximada BOOLEAN DEFAULT FALSE, -- flag para datos migrados
  genero VARCHAR(20),
  estado_civil VARCHAR(30),
  ocupacion VARCHAR(50),
  tipo_paciente VARCHAR(50), -- cambiar a enum: lead|registered|evaluation|active|inactive

  -- Nuevos campos
  origen_canal VARCHAR(50), -- facebook|instagram|whatsapp|web|referido|otro
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  pais VARCHAR(3) DEFAULT 'MEX',
  notas_migacion TEXT, -- para tracking de data cleaning

  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- soft delete
);

-- Migración de edad → fecha_nacimiento
-- Si solo tenemos edad (ej: 35), asumir fecha_nacimiento = 01/01/(año_actual - edad)
-- Marcar edad_approximada = true para correción posterior
```

#### 2. **User** (Usuarios/Doctores)

**Tabla:** `users`

**Campos:**
- `id` (PK, string custom - no auto-increment) ⚠️
- `nombre`, `apellido`
- `fecha_nacimiento`
- `email` (unique)
- `password` (hashed)
- `celular`
- `ced_prof` (cédula profesional, agregado 2021)
- `foto` (nullable)
- `isActive` (boolean, default true)
- `remember_token`
- `timestamps`
- `deleted_at` (soft delete)

**Relaciones:**
- belongsToMany: ProcedureReport (pivot: procedure_report_user)
- hasMany: MedicalConsultation, Appointment, Hairmedicine, Micropigmentation, Prescription

**Roles/Permisos:**
- Uses Spatie Laravel Permission
- Tables: roles, permissions, model_has_roles, model_has_permissions, role_has_permissions

**Riesgos:**
- ⚠️ PK no es auto-increment → puede causar problemas en migración
- ⚠️ Prescripciones usan hardcoded IDs (1, 2, 5) en lugar de roles
- ⚠️ No hay audit trail de acciones

**Estrategia Migración:**
- Migrar a UUID
- Mapear IDs hardcoded a roles (ej: ID 1,2,5 → role "prescriber")
- Implementar audit log (created_by, updated_by en todas las tablas)

#### 3. **Appointment** (Citas)

**Tabla:** `appointments`

**Campos:**
- `id` (bigIncrement)
- `title`, `description`
- `date` (datetime)
- `duration` (int, minutos)
- `event_id` (para Google Calendar, agregado 2021)
- `patient_id` (FK)
- `user_id` (FK)
- `timestamps`

**Relaciones:**
- belongsTo: Patient, User

**GAPs:**
- ❌ No hay recordatorios automáticos
- ❌ No hay estados (pendiente, confirmada, completada, cancelada, no-show)
- ❌ No hay tracking de confirmación
- ⚠️ Integración Google Calendar activa pero creación de eventos está comentada

**Estrategia Migración:**
- Agregar `status` (enum)
- Agregar `reminder_sent_at`, `confirmed_at`
- Integrar con WhatsApp API para recordatorios

#### 4. **Prescription** (Recetas/Prescripciones) 🔴 GAP CRÍTICO

**Tabla:** `prescriptions`

**Campos:**
- `id`
- `name` (⚠️ se guarda vacío '' en store, línea 70 PrescriptionController)
- `description`
- `prescription_date` (date)
- `user_id` (doctor, FK)
- `patient_id` (FK)
- `timestamps`

**Relaciones:**
- belongsTo: User (doctor), Patient
- belongsToMany: Medicine (pivot: medicines_prescriptions)

**GAPs CRÍTICOS:**
- 🔴 **No se vincula con productos de inventario**
- 🔴 **No se vincula con ventas (no sabemos si se despachó)**
- 🔴 **No genera recordatorios de recompra (ej: minoxidil cada mes)**
- ⚠️ Autorización hardcoded (IDs 1, 2, 5)
- ⚠️ Campo `name` no se usa correctamente

**Estrategia Migración:**
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  prescription_date DATE NOT NULL,
  notas TEXT,
  status VARCHAR(20), -- draft|active|completed|cancelled

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE prescription_items (
  id UUID PRIMARY KEY,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id), -- ⭐ vincula con inventario
  medicine_name VARCHAR(255), -- texto libre si no existe en catálogo
  dosage VARCHAR(100), -- ej: "5mg"
  frequency VARCHAR(100), -- ej: "cada 12 horas"
  duration_days INT, -- ej: 30 días
  quantity DECIMAL(10,2), -- cantidad prescrita
  instructions TEXT,

  -- Para recordatorios
  requires_refill BOOLEAN DEFAULT FALSE,
  refill_reminder_days INT, -- cuántos días antes recordar

  created_at TIMESTAMP
);
```

#### 5. **MedicalConsultation** (Consultas Médicas)

**Tabla:** `medical_consultations`

**Campos:**
- `id`
- `grosor` (enum: Fragil|Mediano|Grueso)
- `caspa` (boolean)
- `color` (enum: Negro|Castaño|Rubio|Blanco)
- `grasa` (boolean)
- `textura` (enum: Rizado|Liso)
- `valoracion_zona_donante` (enum: Escasa|Media|Suficiente|Amplia)
- `fecha_transplante` (datetime, nullable)
- `estrategia_quirurgica` (int, nullable)
- `diagnostico` (int, nullable) ⚠️ debería ser text
- `comentarios` (string, nullable)
- `patient_id` (FK)
- `user_id` (doctor, FK)
- `timestamps`

**Relaciones:**
- belongsTo: Patient, User
- belongsToMany: DonorZone (pivot: donor_zone_medical_consultation)
- belongsToMany: Variant (pivot: medical_consultation_variant)

**Comportamiento:**
- ⚠️ **Actualiza edad del paciente inline (líneas 77-78 MedicalConsultationController)** → confirma que edad no se mantiene actualizada

**Estrategia Migración:**
- Mantener estructura similar
- Cambiar `diagnostico` de int a text
- Remover lógica de actualización de edad

#### 6. **ProcedureReport** (Reportes de Procedimientos FUE/FUSS)

**Estructura compleja con múltiples tablas relacionadas:**

**Tabla principal:** `procedure_reports`
- `id`
- `fecha` (datetime, agregado 2021)
- `descripcion`
- `patient_id` (FK)
- ~~`user_id`~~ (removido 2024, ahora many-to-many)
- `hair_follicle_id` (FK)
- `tool_id` (FK)
- `anesthesia_extraction_id` (FK)
- `anesthesia_implantation_id` (FK)
- `timestamps`

**Tablas relacionadas:**

1. **`hair_follicles`** (Conteo de folículos extraídos/implantados)
   - `cb1`, `cb2`, `cb3`, `cb4` (int, nullable) - cabello by # de folículos
   - `total_foliculos` (int)

2. **`tools`** (Herramientas utilizadas)
   - `punch` (enum: 0.85|0.90|0.95|1)
   - `implantador` (string, nullable)

3. **`anesthesia_extractions`** (Anestesia en extracción)
   - `fecha_inicial_extraccion`, `fecha_final_extraccion` (time)
   - `lidocaina` (string), `adrenalina` (float), `bicarbonato_de_sodio` (float)
   - `solucion_fisiologica` (int)
   - `anestesia_infiltrada` (agregado 2021)
   - `betametasona` (agregado 2021)

4. **`anesthesia_implantations`** (Anestesia en implantación)
   - Misma estructura que extraction

5. **`hair_types`** (Tipos de cabello, many-to-many)
   - `nombre`
   - Pivot: `hair_type_procedure_report`

6. **`procedure_report_user`** (Doctores participantes, agregado 2024)
   - `procedure_report_id`, `user_id`

**Riesgos:**
- ⚠️ Datos médico-legales críticos
- ⚠️ Estructura compleja puede tener datos incompletos
- ⚠️ Cambio reciente de user_id a many-to-many (2024) puede tener inconsistencias

**Estrategia Migración:**
- Mantener estructura normalizada
- Validar integridad referencial
- Considerar JSON para campos que no requieren queries (anestesia details)

#### 7. **ClinicalHistory** (Historia Clínica)

**Estructura normalizada con 5 tablas:**

1. **`clinical_histories`** (Principal)
   - `id`
   - `personales_patologicos` (text)
   - `padecimiento_actual` (text)
   - `tratamiento` (text)
   - `patient_id` (FK)
   - `inherit_relative_id` (FK)
   - `non_pathological_personal_id` (FK)
   - `physical_exploration_id` (FK)
   - `previous_treatment_id` (FK)

2. **`inherit_relatives`** (Antecedentes heredofamiliares)
   - `negados`, `hta` (hipertensión), `dm` (diabetes), `ca` (cáncer), `respiratorios` (boolean)
   - `otros` (text)

3. **`non_pathological_personals`** (Antecedentes no patológicos)
   - `tabaquismo`, `alcoholismo`, `alergias`, `act_fisica` (boolean)
   - `otros` (text)

4. **`previous_treatments`** (Tratamientos previos)
   - `minoxidil`, `fue`, `finasteride`, `fuss`, `dutasteride`, `bicalutamida`, `negados` (boolean)
   - `otros` (text)

5. **`physical_explorations`** (Exploración física)
   - `fc` (frecuencia cardiaca), `ta` (tensión arterial), `fr` (frecuencia respiratoria)
   - `temperatura`, `peso`, `talla` (string)
   - `description` (text, agregado 2024)

**Riesgos:**
- 🔴 **Datos médicos altamente sensibles (HIPAA/LGPD)**
- ⚠️ Vital signs como string en lugar de numeric
- ⚠️ No hay unidades de medida explícitas

**Estrategia Migración:**
- Mantener estructura normalizada
- Convertir vital signs a numeric con unidades
- Encriptar campos sensibles (at rest)

#### 8. **Product** (Productos/Inventario) ⚠️ DESACTIVADO

**Tabla:** `products`

**Campos:**
- `id`
- `name`
- `description`
- `content` (float) - contenido
- `unit_price` (float)
- `image` (nullable)
- `unit_id` (FK a `units` table)
- `timestamps`

**Relaciones:**
- belongsTo: Unit
- hasMany: StockInput, StockOutput
- hasOne: Balance

**Estado:** 🔴 **Routes desactivadas, controlador existe, datos posiblemente desactualizados**

**Estrategia Migración:**
- Evaluar si migrar datos históricos o iniciar catálogo limpio
- Sincronizar con Nomisor (sistema de inventario actual)
- Vincular con prescripciones y ventas

#### 9. **Inventory Management** (Stock) ⚠️ DESACTIVADO

**Tablas:**
- `stock_input` (Entradas)
- `stock_output` (Salidas)
- `balances` (Saldo actual)
- `stock_operation_types` (Tipos de operación: compra, venta, ajuste, etc.)

**Estado:** 🔴 **Sistema desactivado, personal usa Excel**

**GAPs:**
- ❌ No hay integración con Nomisor
- ❌ No hay trazabilidad de ventas vs prescripciones
- ❌ No hay alertas de stock bajo
- ❌ No hay integración con WooCommerce

**Estrategia Migración:**
- Determinar si Nomisor será source of truth para inventario
- Definir qué datos necesita el sistema médico (solo productos y precios para facturación)
- Implementar sincronización unidireccional o bidireccional

#### 10. **Medicine** (Medicamentos - Catálogo)

**Tabla:** `medicines`

**Campos:**
- `id`
- `name`
- `timestamps`

**Uso:** Solo para prescripciones (many-to-many)

**GAPs:**
- ⚠️ Catálogo muy simple (solo nombre)
- ⚠️ No hay dosificación, presentación, vía de administración
- ⚠️ No se vincula con productos de inventario

**Estrategia Migración:**
- Enriquecer con: dosage, presentation, route, active_ingredient
- Vincular con products (si es producto vendible)

#### 11. **ImagePatient** (Imágenes de Pacientes)

**Tabla:** `images_patient`

**Campos:**
- `id`
- `foto` (S3 URL)
- `is_favorite` (boolean)
- `is_recent` (boolean) - para clasificar antes/después
- `patient_id` (FK)
- `timestamps`

**Storage:** AWS S3 con visibilidad pública

**Riesgos:**
- 🔴 **Imágenes médicas sensibles (HIPAA/LGPD)**
- ⚠️ No hay encriptación en reposo
- ⚠️ Acceso público a bucket S3
- ⚠️ No hay watermark o protección

**Estrategia Migración:**
- Mover a bucket privado
- Implementar signed URLs con expiración
- Agregar metadata (fecha_procedimiento, tipo_vista, categoría)
- Considerar compresión/optimización

#### 12. **Supporting Entities** (Catálogos)

- `donor_zones` - Zonas donantes (Occipital, Parietal, etc.)
- `variants` - Variantes de alopecia (Androgenética, Areata, etc.)
- `hair_types` - Tipos de cabello (Liso, Ondulado, Rizado, etc.)
- `units` - Unidades de medida (piezas, ml, gramos, etc.)
- `stock_operation_types` - Tipos de operación (compra, venta, ajuste, merma, etc.)

**Estrategia:** Migrar como seed data

### Relaciones y Cardinalidad

```
Patient (1) ──< (N) ClinicalHistory
Patient (1) ──< (N) MedicalConsultation
Patient (1) ──< (N) ProcedureReport
Patient (1) ──< (N) Appointment
Patient (1) ──< (N) Prescription
Patient (1) ──< (N) Hairmedicine
Patient (1) ──< (N) Micropigmentation
Patient (1) ──< (N) ImagePatient

User (N) ──< (N) ProcedureReport (through procedure_report_user)
User (1) ──< (N) MedicalConsultation
User (1) ──< (N) Appointment
User (1) ──< (N) Prescription
User (1) ──< (N) Hairmedicine
User (1) ──< (N) Micropigmentation

Prescription (N) ──< (N) Medicine (through medicines_prescriptions)

MedicalConsultation (N) ──< (N) DonorZone
MedicalConsultation (N) ──< (N) Variant

ProcedureReport (1) ──> (1) HairFollicle
ProcedureReport (1) ──> (1) Tool
ProcedureReport (1) ──> (1) AnesthesiaExtraction
ProcedureReport (1) ──> (1) AnesthesiaImplantation
ProcedureReport (N) ──< (N) HairType

Micropigmentation (N) ──< (N) HairType

ClinicalHistory (1) ──> (1) InheritRelative
ClinicalHistory (1) ──> (1) NonPathologicalPersonal
ClinicalHistory (1) ──> (1) PreviousTreatment
ClinicalHistory (1) ──> (1) PhysicalExploration

Product (1) ──< (N) StockInput
Product (1) ──< (N) StockOutput
Product (1) ──> (1) Balance
Product (N) ──> (1) Unit
```

### PII y Datos Sensibles (Compliance)

| Tabla | Datos Sensibles | Clasificación | Requerimientos |
|-------|-----------------|---------------|----------------|
| patients | Nombre, email, celular, dirección, edad/fecha_nacimiento, diagnóstico | **PII + PHI** | LGPD/GDPR/HIPAA - Encriptación, consentimiento, derecho al olvido |
| clinical_histories | Antecedentes médicos completos | **PHI Crítico** | Máxima protección, audit trail, acceso restringido |
| medical_consultations | Diagnósticos, valoraciones | **PHI** | Encriptación, audit trail |
| procedure_reports | Procedimientos quirúrgicos, anestesia | **PHI + Legal** | Trazabilidad completa, firma digital |
| prescriptions | Medicamentos prescritos | **PHI** | Trazabilidad, firma digital |
| images_patient | Fotos médicas | **PHI Sensible** | Bucket privado, signed URLs, watermark |
| users | Email, celular, cédula profesional | **PII** | Encriptación, 2FA |

**Recomendaciones:**
1. Implementar encriptación at-rest para campos sensibles
2. Implementar audit trail completo (quién accedió, cuándo, qué)
3. Implementar consentimiento explícito del paciente
4. Implementar derecho al olvido (GDPR Article 17)
5. Implementar portabilidad de datos (GDPR Article 20)
6. Revisar compliance con NOM-004-SSA3-2012 (expediente clínico en México)

---

## E) GAP ANALYSIS VS REUNIÓN

### Must Have (P0) - Bloqueadores para Operación

| # | Requerimiento | Gap Actual | Impacto Negocio | Esfuerzo Estimado |
|---|--------------|------------|-----------------|-------------------|
| **E1** | **Migración edad → fecha_nacimiento** | Edad almacenada como int, no se actualiza | Alto - reportes por edad incorrectos, data quality crítico | **Alto** - Requiere estrategia migración + limpieza manual |
| **E2** | **Prescripciones vinculadas a productos** | Prescripciones NO se vinculan con inventario/ventas | Alto - no se sabe si se despachó, no hay control de stock por receta | **Medio** - Requiere rediseño tabla prescription_items |
| **E3** | **Recordatorios automáticos (recetas/citas)** | No existen | Alto - pacientes no regresan, pérdida de revenue (minoxidil mensual) | **Alto** - Requiere scheduler + WhatsApp API + cola de jobs |
| **E4** | **Reportes con filtros avanzados** | Solo conteos básicos, no hay filtros por estado/ciudad/edad/origen | Alto - no pueden tomar decisiones de negocio, piden reportes al programador | **Medio** - Requiere query builder + exports |
| ~~**E5**~~ | ~~**Integración WhatsApp API unificada**~~ | ~~DESCARTADO: Se mantendrá WhatsApp manual/personal~~ | - | - |
| **E6** | **Datos de paciente normalizados** | Teléfonos sin formato, emails opcionales, sin ciudad/estado/origen | Medio-Alto - dificulta reportes geográficos | **Medio** - Limpieza data + validaciones |
| **E7** | **Catálogo de productos + inventario completo** | Catálogo desactualizado, inventario desactivado, sin registro de ventas en mostrador | Alto - no hay control de stock | **Medio** - Módulo inventario completo en sistema nuevo |
| **E8** | **Single source of truth para contactos y stock** | Datos repartidos: Sistema médico + Excel inventario | Alto - datos inconsistentes | **Medio** - Consolidar todo en sistema nuevo (Nomisor descartado) |

### Should Have (P1) - Importantes pero no bloqueadores

| # | Requerimiento | Gap Actual | Impacto Negocio | Esfuerzo Estimado |
|---|--------------|------------|-----------------|-------------------|
| ~~**E9**~~ | ~~**Integración con Brevo (segmentos/campañas)**~~ | ~~DESCARTADO: No usan Brevo~~ | - | - |
| ~~**E10**~~ | ~~**Integración inventario (Nomisor)**~~ | ~~DESCARTADO: Inventario será gestionado completamente en el sistema nuevo~~ | - | - |
| **E11** | **Audit trail completo** | Solo timestamps, no hay created_by/updated_by, no hay log de accesos | Medio - no hay trazabilidad médico-legal | **Medio** - Agregar campos + middleware |
| **E12** | **Dashboard con KPIs** | Dashboard solo muestra últimos 500 pacientes | Medio - no hay visibilidad de métricas clave | **Medio** - Charts + aggregations |
| **E13** | **Roles/permisos correctos** | Prescripciones usan hardcoded IDs (1,2,5) | Medio - difícil agregar doctores, no escalable | **Bajo** - Mapear IDs a roles |
| **E14** | **Estado de citas** | Citas no tienen estados (confirmada, completada, no-show) | Medio - no pueden trackear ausentismo | **Bajo** - Agregar enum + UI |
| **E15** | **Imágenes médicas seguras** | Bucket S3 público, sin encriptación, sin watermark | Medio - riesgo de privacidad, cumplimiento | **Medio** - Bucket privado + signed URLs |
| **E16** | **Deduplicación de pacientes** | No hay validación, posibles duplicados | Medio - data quality, reportes incorrectos | **Medio** - Algoritmo fuzzy matching |

### Could Have (P2) - Deseables pero no críticos ahora

| # | Requerimiento | Gap Actual | Impacto Negocio | Esfuerzo Estimado |
|---|--------------|------------|-----------------|-------------------|
| **E17** | **Integración WooCommerce** | WooCommerce ya en desarrollo | Bajo-Medio - futuro canal de ventas online | **Alto** - Para Fase 2 (post-MVP) |
| **E18** | **Portal de paciente (self-service)** | No existe | Bajo - pacientes llaman/escriben para consultas básicas | **Muy Alto** - Portal completo |
| **E19** | **Firma digital de prescripciones** | No existe | Bajo - cumplimiento NOM-004-SSA3-2012 | **Alto** - Integración FEA/FIEL |
| **E20** | **Telemedicina** | No existe | Bajo - no es core del negocio actual | **Muy Alto** - Video + expediente integrado |
| **E21** | **App móvil para doctores** | No existe | Bajo - doctores usan web en tablet/laptop | **Muy Alto** - Native app |
| **E22** | **BI/Analytics avanzado** | No existe | Bajo - reportes básicos son suficientes por ahora | **Alto** - DataWarehouse + Metabase/Looker |

### Matriz de Priorización (Actualizada)

**Nota:** E5 (WhatsApp API), E9 (Brevo), E10 (Nomisor) fueron DESCARTADOS por decisión de stakeholders.

```
                    │ Alto Impacto          │ Medio Impacto         │ Bajo Impacto
────────────────────┼──────────────────────┼──────────────────────┼─────────────────
Esfuerzo Bajo       │ E7                   │ E13, E14             │ -
                    │ (Quick wins)         │                      │
────────────────────┼──────────────────────┼──────────────────────┼─────────────────
Esfuerzo Medio      │ E2, E4, E6, E8       │ E11, E12, E15, E16   │ -
                    │ (Prioridad Alta)     │                      │
────────────────────┼──────────────────────┼──────────────────────┼─────────────────
Esfuerzo Alto       │ E1, E3               │ -                    │ E17, E19, E20,
                    │ (Crítico - fases)    │                      │ E21, E22
```

### Requerimientos Funcionales Derivados (FR)

**FR-1: Receta en Sistema (vinculada a inventario)**
- Prescripción debe crear ítems con productos del catálogo
- Cada ítem tiene: producto, dosificación, frecuencia, duración, cantidad
- Flag `requires_refill` para recordatorios
- Estado de dispensación (pendiente, parcial, completo)

**FR-2: Recordatorios Automáticos**
- Citas: 24h antes y 2h antes (notificación interna + email si tiene)
- Recetas refill: X días antes de que se acabe (ej: 25 días después si es mensual)
- Seguimiento post-procedimiento: 7, 30, 90, 180 días
- **Nota:** Sin WhatsApp API - recordatorios serán internos (dashboard) + email opcional

**FR-3: Reportes con Filtros**
- Filtros: rango de fechas, ciudad, estado, edad, género, tipo_paciente, origen_canal, doctor
- Exports: Excel, CSV, PDF
- Reportes predefinidos:
  - Pacientes nuevos por mes
  - Procedimientos por tipo y doctor
  - Ventas por producto
  - Ausentismo (no-shows)
  - Lifetime value por paciente
  - Conversión lead → procedimiento

**FR-4: Limpieza y Normalización de Datos**
- Migración edad → fecha_nacimiento con flag `edad_approximada`
- Normalización teléfonos a E.164 (+52...)
- Validación de emails con verificación
- Deduplicación con fuzzy matching (nombre + teléfono)
- Agregar campos: ciudad, estado, origen_canal

~~**FR-5: Integración Brevo** - DESCARTADO (no usan Brevo)~~

~~**FR-6: Integración WhatsApp API** - DESCARTADO (prefieren WhatsApp manual)~~

**FR-5: Módulo de Inventario Completo**
- CRUD de productos con categorías
- Registro de entradas de stock (compras, ajustes)
- Registro de salidas de stock (consumo por prescripción, procedimiento, ajustes)
- Balance actual por producto
- Alertas de stock bajo
- Historial de movimientos por producto
- **Nota:** Reemplaza Nomisor y Excel como fuente única

**FR-6: Integración Google Calendar**
- Sincronización bidireccional de citas
- Crear/actualizar/eliminar eventos en Google Calendar cuando se gestiona cita
- Importar eventos de Google Calendar al sistema
- Visualización de calendario dentro del sistema

**FR-7: Integración WooCommerce (Fase 2 - Post-MVP)**
- Sync productos: sistema médico → WooCommerce
- Sync clientes: paciente con flag `is_online_customer`
- Sync órdenes: actualizar stock cuando se vende en WooCommerce
- Vincular cliente WooCommerce con paciente (por email/teléfono)

### Requerimientos No Funcionales (NFR)

**NFR-1: Seguridad y Cumplimiento**
- Encriptación en reposo (AES-256) para campos sensibles
- Encriptación en tránsito (TLS 1.3)
- Audit trail completo (created_by, updated_by, accessed_by con timestamps)
- RBAC (Role-Based Access Control) granular
- 2FA obligatorio para usuarios médicos
- Cumplimiento LGPD (Brasil), GDPR (EU), HIPAA (US concept), NOM-004-SSA3-2012 (México)
- Derecho al olvido (soft delete + anonimización)
- Consentimiento informado del paciente (firmado digitalmente)
- Backup encriptado diario con retención 7 años (requisito médico-legal)

**NFR-2: Performance**
- API response time: p95 < 200ms, p99 < 500ms
- Dashboard load time: < 2s
- Reportes con >10k registros: paginación + async generation
- Imágenes: CDN con cache, optimización automática (WebP)
- DB queries: índices en foreign keys, campos de búsqueda

**NFR-3: Disponibilidad**
- Uptime: 99.5% (acceptable para clínica pequeña, ~3.6h downtime/mes)
- Horario crítico: 8am-8pm hora local (downtime fuera de horario)
- Backup automático cada 6 horas
- Recovery Time Objective (RTO): 2 horas
- Recovery Point Objective (RPO): 6 horas

**NFR-4: Escalabilidad**
- Diseñar para 5,000 pacientes (actualmente ~500-1000 estimado)
- 5-10 usuarios concurrentes (equipo de 1-5 personas)
- 1,000 citas/mes
- 100 procedimientos/mes
- Arquitectura simple, sin necesidad de multi-tenant por ahora

**NFR-5: Mantenibilidad**
- Código TypeScript estricto
- Cobertura de tests: >70% crítico, >50% general
- Documentación API (OpenAPI/Swagger)
- Logs estructurados (JSON) con correlación IDs
- Monitoreo: health checks, alertas (Sentry, New Relic, o similar)

**NFR-6: Estrategia de Migración (Sin Perder Datos)**
- Migración en paralelo (sistema viejo + nuevo coexisten temporalmente)
- Import de datos históricos con validación
- Reconciliación post-migración (checksums, conteos)
- Rollback plan si migración falla
- Datos no migrables: documentar y archivar
- Cutover en fin de semana largo

---

## F) TARGET ARCHITECTURE (NestJS + Next.js + PostgreSQL)

### 6.1 Stack Tecnológico

**Backend API:**
- **NestJS** (v10+) - Framework Node.js con arquitectura modular y TypeScript first
- **PostgreSQL** (v15+) - Database relacional con soporte JSON
- **TypeORM** o **Prisma** - ORM (Prisma recomendado por DX y migraciones)
- **BullMQ** - Queue para jobs asíncronos (recordatorios, reports, sync)
- **Redis** - Cache + queue backend
- **AWS S3** - Storage de imágenes (mantener)
- **JWT** - Autenticación stateless
- **Passport** - Estrategias de auth (local, Google, future 2FA)

**Frontend UI:**
- **Next.js** (v14+) - React framework con SSR/SSG
- **TypeScript** - Type safety
- **TailwindCSS** - Styling utility-first
- **shadcn/ui** o **Mantine** - Component library
- **TanStack Query** (React Query) - Server state management
- **Zustand** - Client state management (ligero)
- **React Hook Form** + **Zod** - Validación de formularios

**DevOps & Infraestructura:**
- **Docker** - Containerización
- **GitHub Actions** - CI/CD
- **Sentry** - Error tracking
- **Pino** - Logging estructurado
- **PostgreSQL** - DigitalOcean Managed Database
- **Vercel** - Hosting Next.js (frontend)
- **DigitalOcean** - Hosting NestJS (backend, App Platform o Droplet con Docker)
- **Cloudflare R2** - Storage de imágenes (compatible S3, sin costos de egreso)

### 6.2 Arquitectura de Módulos NestJS

```
src/
├── main.ts
├── app.module.ts
├── config/
│   ├── database.config.ts
│   ├── queue.config.ts
│   ├── storage.config.ts
│   └── integrations.config.ts
├── common/
│   ├── decorators/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── permissions.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── pipes/
│       └── validation.pipe.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   └── dto/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   ├── patients/
│   │   ├── patients.module.ts
│   │   ├── patients.service.ts
│   │   ├── patients.controller.ts
│   │   ├── entities/
│   │   │   ├── patient.entity.ts
│   │   │   └── patient-image.entity.ts
│   │   ├── dto/
│   │   │   ├── create-patient.dto.ts
│   │   │   ├── update-patient.dto.ts
│   │   │   └── search-patient.dto.ts
│   │   └── patients.repository.ts
│   ├── appointments/
│   │   ├── appointments.module.ts
│   │   ├── appointments.service.ts
│   │   ├── appointments.controller.ts
│   │   ├── entities/
│   │   │   └── appointment.entity.ts
│   │   └── dto/
│   ├── prescriptions/
│   │   ├── prescriptions.module.ts
│   │   ├── prescriptions.service.ts
│   │   ├── prescriptions.controller.ts
│   │   ├── entities/
│   │   │   ├── prescription.entity.ts
│   │   │   └── prescription-item.entity.ts
│   │   └── dto/
│   ├── medical-consultations/
│   │   ├── medical-consultations.module.ts
│   │   ├── medical-consultations.service.ts
│   │   ├── medical-consultations.controller.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── procedures/
│   │   ├── procedures.module.ts
│   │   ├── procedures.service.ts
│   │   ├── procedures.controller.ts
│   │   ├── entities/
│   │   │   ├── procedure-report.entity.ts
│   │   │   ├── hair-follicle.entity.ts
│   │   │   ├── anesthesia-extraction.entity.ts
│   │   │   └── anesthesia-implantation.entity.ts
│   │   └── dto/
│   ├── clinical-histories/
│   │   ├── clinical-histories.module.ts
│   │   ├── clinical-histories.service.ts
│   │   ├── clinical-histories.controller.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.service.ts
│   │   ├── products.controller.ts
│   │   ├── entities/
│   │   │   ├── product.entity.ts
│   │   │   └── product-category.entity.ts
│   │   └── dto/
│   ├── inventory/ (gestión completa - reemplaza Nomisor y Excel)
│   │   ├── inventory.module.ts
│   │   ├── inventory.service.ts
│   │   ├── inventory.controller.ts
│   │   ├── entities/
│   │   │   ├── stock-movement.entity.ts
│   │   │   └── stock-balance.entity.ts
│   │   └── dto/
│   ├── reports/
│   │   ├── reports.module.ts
│   │   ├── reports.service.ts
│   │   ├── reports.controller.ts
│   │   ├── builders/
│   │   │   ├── patients-report.builder.ts
│   │   │   ├── procedures-report.builder.ts
│   │   │   └── sales-report.builder.ts
│   │   └── dto/
│   ├── reminders/
│   │   ├── reminders.module.ts
│   │   ├── reminders.service.ts
│   │   ├── reminders.processor.ts (BullMQ consumer)
│   │   ├── entities/
│   │   │   └── reminder.entity.ts
│   │   └── dto/
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts
│   │   ├── channels/
│   │   │   └── email.channel.ts
│   │   └── dto/
│   └── integrations/
│       ├── integrations.module.ts
│       ├── google-calendar/
│       │   ├── google-calendar.service.ts
│       │   └── google-calendar.config.ts
│       └── woocommerce/ (Fase 2 - Post-MVP)
│           ├── woocommerce.service.ts
│           └── woocommerce.webhook.controller.ts
└── database/
    ├── migrations/
    ├── seeds/
    └── factories/
```

### 6.3 Estructura PostgreSQL (Esquema Conceptual)

**Core Tables:**

```sql
-- =====================================================
-- USERS & AUTH
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  celular VARCHAR(20),
  cedula_profesional VARCHAR(50),
  fecha_nacimiento DATE,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  legacy_id VARCHAR(50), -- para trazabilidad migración (Laravel user IDs son strings)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- admin, doctor, receptionist, inventory_manager
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL, -- patients:read, prescriptions:create, etc.
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- =====================================================
-- PATIENTS
-- =====================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  celular VARCHAR(20),
  celular_normalized VARCHAR(20), -- E.164 format for WhatsApp
  direccion TEXT,

  -- ⭐ NUEVO: fecha_nacimiento en lugar de edad
  fecha_nacimiento DATE,
  edad_approximada BOOLEAN DEFAULT FALSE, -- flag para datos migrados

  genero VARCHAR(20), -- hombre|mujer|otro|prefiero_no_decir
  estado_civil VARCHAR(30),
  ocupacion VARCHAR(50),

  -- ⭐ NUEVO: tipo_paciente como enum más claro
  tipo_paciente VARCHAR(50) NOT NULL DEFAULT 'lead', -- lead|registered|evaluation|active|inactive|archived

  -- ⭐ NUEVO: campos de segmentación
  origen_canal VARCHAR(50), -- facebook|instagram|whatsapp|web|referido|google|otro
  referido_por UUID REFERENCES patients(id), -- si vino por referido
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  pais VARCHAR(3) DEFAULT 'MEX',

  -- ⭐ NUEVO: consentimientos LGPD/GDPR
  consent_data_processing BOOLEAN DEFAULT FALSE,
  consent_marketing BOOLEAN DEFAULT FALSE,
  consent_whatsapp BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP,

  notas_internas TEXT, -- notas privadas del staff
  notas_migracion TEXT, -- para tracking de data cleaning
  legacy_id INT, -- para trazabilidad migración

  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- soft delete
);

CREATE INDEX idx_patients_celular_normalized ON patients(celular_normalized);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_nombre_apellido ON patients(nombre, apellido);
CREATE INDEX idx_patients_ciudad ON patients(ciudad);
CREATE INDEX idx_patients_tipo_paciente ON patients(tipo_paciente);
CREATE INDEX idx_patients_origen_canal ON patients(origen_canal);

-- =====================================================
-- APPOINTMENTS
-- =====================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id),

  title VARCHAR(255),
  description TEXT,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  duration_minutes INT,

  -- ⭐ NUEVO: estados
  status VARCHAR(30) DEFAULT 'scheduled', -- scheduled|confirmed|completed|cancelled|no_show|rescheduled
  cancellation_reason TEXT,

  -- ⭐ NUEVO: recordatorios
  reminder_24h_sent_at TIMESTAMP,
  reminder_2h_sent_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  confirmed_by VARCHAR(50), -- whatsapp|phone|in_person

  -- Google Calendar integration
  google_calendar_event_id VARCHAR(255),

  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_start_datetime ON appointments(start_datetime);
CREATE INDEX idx_appointments_status ON appointments(status);

-- =====================================================
-- PRESCRIPTIONS (REDISEÑADO)
-- =====================================================
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id),

  prescription_date DATE NOT NULL,
  notas TEXT,

  status VARCHAR(20) DEFAULT 'active', -- draft|active|completed|cancelled|expired
  expires_at DATE, -- fecha de expiración de la receta

  -- Firma digital (futuro)
  digital_signature TEXT,
  signed_at TIMESTAMP,

  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ⭐ NUEVO: Ítems de prescripción (vinculados a productos)
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,

  -- ⭐ Vincula con productos de inventario
  product_id UUID REFERENCES products(id),
  medicine_name VARCHAR(255) NOT NULL, -- texto libre si no existe en catálogo

  dosage VARCHAR(100), -- ej: "5mg", "10ml"
  frequency VARCHAR(100), -- ej: "cada 12 horas", "2 veces al día"
  duration_days INT, -- ej: 30 días
  quantity DECIMAL(10,2) NOT NULL, -- cantidad prescrita
  instructions TEXT,

  -- ⭐ Para recordatorios automáticos
  requires_refill BOOLEAN DEFAULT FALSE,
  refill_reminder_days INT, -- ej: 25 días (recordar 5 días antes de que se acabe)

  -- ⭐ Tracking de dispensación
  dispensed BOOLEAN DEFAULT FALSE,
  dispensed_at TIMESTAMP,
  dispensed_by UUID REFERENCES users(id),
  dispensed_quantity DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_product ON prescription_items(product_id);

-- =====================================================
-- PRODUCTS & INVENTORY
-- =====================================================
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES product_categories(id),

  -- Información del producto
  content DECIMAL(10,2), -- contenido (ej: 60ml, 30 tabletas)
  unit VARCHAR(20), -- ml|g|tabletas|piezas
  unit_price DECIMAL(10,2),

  -- Flags
  is_medicine BOOLEAN DEFAULT FALSE,
  requires_prescription BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Imágenes
  image_url TEXT,

  -- Stock
  min_stock_alert INT DEFAULT 0, -- alertar cuando stock baje de este nivel

  -- Sync con WooCommerce (Fase 2)
  woocommerce_id BIGINT,

  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INVENTORY (Gestión completa - reemplaza Nomisor y Excel)
-- =====================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  movement_type VARCHAR(20) NOT NULL, -- entrada|salida|ajuste
  reason VARCHAR(50) NOT NULL, -- compra|prescripcion|procedimiento|ajuste_manual|merma|devolucion
  quantity DECIMAL(10,2) NOT NULL, -- positivo para entradas, negativo para salidas

  -- Referencia opcional a la entidad que originó el movimiento
  related_entity_type VARCHAR(50), -- prescriptions|procedure_reports
  related_entity_id UUID,

  notes TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_balances_product ON stock_balances(product_id);

-- =====================================================
-- MEDICAL CONSULTATIONS
-- =====================================================
CREATE TABLE medical_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id),

  -- Análisis capilar
  grosor VARCHAR(20), -- fragil|mediano|grueso
  caspa BOOLEAN,
  color VARCHAR(20), -- negro|castaño|rubio|blanco|otro
  grasa BOOLEAN,
  textura VARCHAR(20), -- rizado|liso|ondulado
  valoracion_zona_donante VARCHAR(20), -- escasa|media|suficiente|amplia

  -- Diagnóstico y plan
  diagnostico TEXT,
  estrategia_quirurgica TEXT,
  fecha_sugerida_transplante DATE,
  comentarios TEXT,

  -- Metadata
  consultation_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Catálogos many-to-many
CREATE TABLE donor_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE medical_consultation_donor_zones (
  consultation_id UUID REFERENCES medical_consultations(id) ON DELETE CASCADE,
  donor_zone_id UUID REFERENCES donor_zones(id) ON DELETE CASCADE,
  PRIMARY KEY (consultation_id, donor_zone_id)
);

CREATE TABLE medical_consultation_variants (
  consultation_id UUID REFERENCES medical_consultations(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  PRIMARY KEY (consultation_id, variant_id)
);

-- =====================================================
-- PROCEDURE REPORTS (FUE/FUSS)
-- =====================================================
CREATE TABLE procedure_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  procedure_date DATE NOT NULL,
  descripcion TEXT,

  -- Herramienta
  punch_size DECIMAL(3,2), -- 0.85, 0.90, 0.95, 1.00
  implantador VARCHAR(100),

  -- Folículos
  cb1 INT, -- cabello by 1 folículo
  cb2 INT, -- cabello by 2 folículos
  cb3 INT,
  cb4 INT,
  total_foliculos INT,

  -- Anestesia Extracción (almacenar como JSON o normalizado)
  anesthesia_extraction JSONB,
  -- {
  --   fecha_inicial: "10:00",
  --   fecha_final: "11:30",
  --   lidocaina: "20ml",
  --   adrenalina: 0.5,
  --   bicarbonato_de_sodio: 2.0,
  --   solucion_fisiologica: 100,
  --   anestesia_infiltrada: "texto",
  --   betametasona: "texto"
  -- }

  -- Anestesia Implantación
  anesthesia_implantation JSONB,

  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Doctores participantes (many-to-many)
CREATE TABLE procedure_report_doctors (
  procedure_report_id UUID REFERENCES procedure_reports(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (procedure_report_id, doctor_id)
);

-- Tipos de cabello utilizados
CREATE TABLE hair_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE procedure_report_hair_types (
  procedure_report_id UUID REFERENCES procedure_reports(id) ON DELETE CASCADE,
  hair_type_id UUID REFERENCES hair_types(id) ON DELETE CASCADE,
  PRIMARY KEY (procedure_report_id, hair_type_id)
);

-- =====================================================
-- CLINICAL HISTORIES (Estructura completa)
-- =====================================================
CREATE TABLE clinical_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  personales_patologicos TEXT,
  padecimiento_actual TEXT,
  tratamiento TEXT,
  legacy_id INT, -- para trazabilidad migración

  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inherit_relatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_history_id UUID UNIQUE REFERENCES clinical_histories(id) ON DELETE CASCADE,
  negados BOOLEAN DEFAULT FALSE,
  hta BOOLEAN DEFAULT FALSE,
  dm BOOLEAN DEFAULT FALSE,
  ca BOOLEAN DEFAULT FALSE,
  respiratorios BOOLEAN DEFAULT FALSE,
  otros TEXT
);

CREATE TABLE non_pathological_personals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_history_id UUID UNIQUE REFERENCES clinical_histories(id) ON DELETE CASCADE,
  tabaquismo BOOLEAN DEFAULT FALSE,
  alcoholismo BOOLEAN DEFAULT FALSE,
  alergias BOOLEAN DEFAULT FALSE,
  act_fisica BOOLEAN DEFAULT FALSE,
  otros TEXT
);

CREATE TABLE previous_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_history_id UUID UNIQUE REFERENCES clinical_histories(id) ON DELETE CASCADE,
  minoxidil BOOLEAN DEFAULT FALSE,
  fue BOOLEAN DEFAULT FALSE,
  finasteride BOOLEAN DEFAULT FALSE,
  fuss BOOLEAN DEFAULT FALSE,
  dutasteride BOOLEAN DEFAULT FALSE,
  bicalutamida BOOLEAN DEFAULT FALSE,
  negados BOOLEAN DEFAULT FALSE,
  otros TEXT
);

CREATE TABLE physical_explorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_history_id UUID UNIQUE REFERENCES clinical_histories(id) ON DELETE CASCADE,
  fc DECIMAL(5,1), -- frecuencia cardiaca (bpm)
  ta VARCHAR(20), -- tensión arterial (ej: "120/80")
  fr DECIMAL(5,1), -- frecuencia respiratoria
  temperatura DECIMAL(4,1), -- °C
  peso DECIMAL(5,1), -- kg
  talla DECIMAL(5,1), -- cm
  description TEXT
);

-- =====================================================
-- MICROPIGMENTATION
-- =====================================================
CREATE TABLE micropigmentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id),

  fecha DATE NOT NULL,
  duracion INT, -- minutos
  dilucion VARCHAR(100),
  descripcion TEXT,
  comments TEXT,

  legacy_id INT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE micropigmentation_hair_types (
  micropigmentation_id UUID REFERENCES micropigmentations(id) ON DELETE CASCADE,
  hair_type_id UUID REFERENCES hair_types(id) ON DELETE CASCADE,
  PRIMARY KEY (micropigmentation_id, hair_type_id)
);

-- =====================================================
-- HAIRMEDICINE (Medicina Capilar - tratamientos no quirúrgicos)
-- =====================================================
CREATE TABLE hairmedicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id),

  fecha DATE NOT NULL,
  descripcion TEXT,
  comments TEXT,

  legacy_id INT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- IMAGES
-- =====================================================
CREATE TABLE patient_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,

  -- S3 storage
  s3_key VARCHAR(500) NOT NULL, -- path en S3
  s3_bucket VARCHAR(100),
  file_name VARCHAR(255),
  file_size_bytes INT,
  mime_type VARCHAR(100),

  -- Clasificación
  is_favorite BOOLEAN DEFAULT FALSE,
  is_before BOOLEAN DEFAULT FALSE, -- foto "antes"
  is_after BOOLEAN DEFAULT FALSE, -- foto "después"
  image_type VARCHAR(50), -- frontal|lateral_derecha|lateral_izquierda|posterior|zona_donante|otro

  -- Metadata
  taken_at TIMESTAMP, -- fecha en que se tomó la foto
  procedure_report_id UUID REFERENCES procedure_reports(id), -- vincular con procedimiento

  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REMINDERS
-- =====================================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,

  reminder_type VARCHAR(50) NOT NULL, -- appointment|prescription_refill|follow_up
  related_entity_type VARCHAR(50), -- appointments|prescriptions|procedure_reports
  related_entity_id UUID,

  scheduled_for TIMESTAMP NOT NULL,
  channel VARCHAR(20) NOT NULL, -- internal|email (WhatsApp descartado)

  status VARCHAR(20) DEFAULT 'pending', -- pending|sent|read|failed|cancelled
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,

  -- Contenido
  message_template VARCHAR(100), -- nombre del template
  message_variables JSONB, -- variables para el template

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reminders_scheduled_for ON reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminders_patient ON reminders(patient_id);

-- =====================================================
-- INTEGRATIONS SYNC
-- =====================================================
CREATE TABLE integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name VARCHAR(50) NOT NULL, -- google_calendar|woocommerce(fase2)
  sync_type VARCHAR(50) NOT NULL, -- full|incremental|webhook
  status VARCHAR(20) NOT NULL, -- running|completed|failed

  records_processed INT DEFAULT 0,
  records_success INT DEFAULT 0,
  records_failed INT DEFAULT 0,

  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_details JSONB,

  created_by UUID REFERENCES users(id)
);

-- =====================================================
-- AUDIT TRAIL
-- =====================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),

  action VARCHAR(50) NOT NULL, -- create|read|update|delete|login|logout
  resource_type VARCHAR(50) NOT NULL, -- patients|prescriptions|etc
  resource_id UUID,

  ip_address INET,
  user_agent TEXT,

  changes_before JSONB, -- estado antes (para updates/deletes)
  changes_after JSONB, -- estado después (para creates/updates)

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

### 6.4 Next.js - Estructura de Pantallas

**Fase MVP (Prioridad):**

```
/app
├── (auth)
│   ├── login
│   └── logout
├── (dashboard)
│   ├── layout.tsx (sidebar, header)
│   ├── page.tsx (dashboard home con KPIs)
│   ├── patients/
│   │   ├── page.tsx (lista con búsqueda y filtros)
│   │   ├── new/page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx (detalle paciente)
│   │   │   ├── edit/page.tsx
│   │   │   ├── history/page.tsx (historia clínica)
│   │   │   ├── consultations/page.tsx
│   │   │   ├── procedures/page.tsx
│   │   │   ├── prescriptions/page.tsx
│   │   │   ├── appointments/page.tsx
│   │   │   └── images/page.tsx
│   ├── appointments/
│   │   ├── page.tsx (lista + calendario)
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   ├── prescriptions/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── consultations/
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── procedures/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── reports/
│   │   ├── page.tsx (reportes predefinidos)
│   │   ├── patients/page.tsx
│   │   ├── procedures/page.tsx
│   │   └── sales/page.tsx
│   ├── inventory/
│   │   ├── page.tsx (lista productos con stock actual)
│   │   ├── products/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   └── movements/page.tsx (historial entradas/salidas)
│   ├── reminders/
│   │   └── page.tsx (gestión de recordatorios pendientes)
│   └── settings/
│       ├── profile/page.tsx
│       ├── users/page.tsx
│       └── catalog/page.tsx (medicinas, categorías)
```

**Fase 2 (Post-MVP):**

```
├── (dashboard)
│   ├── integrations/
│   │   └── woocommerce/page.tsx (sync con tienda online)
│   └── analytics/
│       └── page.tsx (reportes avanzados, gráficos)
```

**Nota:** Inventario y recordatorios se incluyen en el MVP por decisión de stakeholders.

---

## G) INTEGRATION DESIGN

### 7.1 Principios de Integración

**Enfoque:** "Single Source of Truth"

- **Sistema médico (NestJS/Postgres)** = Source of truth para: **TODO** (pacientes, citas, historia clínica, procedimientos, prescripciones, inventario)
- ~~**Nomisor**~~ = DESCARTADO
- ~~**Brevo**~~ = DESCARTADO (no lo usan)
- ~~**WhatsApp Cloud API**~~ = DESCARTADO (prefieren WhatsApp manual)
- **Google Calendar** = Sincronización bidireccional de citas
- **WooCommerce** = Fase 2 (post-MVP) - ventas online

**Integration Contract Base:**

```typescript
interface IntegrationContract {
  // Autenticación
  authentication: 'API_KEY' | 'OAUTH2' | 'JWT' | 'BASIC_AUTH';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    webhookSecret?: string;
  };

  // Versionado
  apiVersion: string;

  // Rate limiting
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };

  // Retry policy
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
    retryableStatusCodes: number[];
  };

  // Idempotencia
  idempotencyKey?: string; // header para evitar duplicados

  // Paginación
  pagination: {
    strategy: 'offset' | 'cursor' | 'page';
    maxPageSize: number;
  };

  // Logging
  requestLogging: boolean;
  sensitiveFields: string[]; // campos a redactar en logs
}
```

---

### ~~7.2 Integración Brevo (SendinBlue)~~ - DESCARTADO

> No usan Brevo actualmente. Se elimina del alcance.

---

### 7.2 Integración Google Calendar

**Objetivo:** Sincronización bidireccional de citas entre el sistema médico y Google Calendar.

**Estado actual:** La integración existía en Laravel (spatie/laravel-google-calendar) pero está desactivada/comentada. Se reactivará en el nuevo sistema.

**API Google Calendar:**
- API: Google Calendar API v3
- Auth: OAuth 2.0 (Service Account o cuenta de usuario)
- Docs: https://developers.google.com/calendar/api
- Docs: https://developers.brevo.com/

**Flujo:**

```
Sistema Médico → Google Calendar:
  - Crear evento cuando se crea cita
  - Actualizar evento cuando se modifica cita
  - Eliminar evento cuando se cancela cita

Google Calendar → Sistema Médico:
  - Importar citas creadas directamente en Google Calendar (opcional)
```

**Implementación NestJS:**

```typescript
// src/modules/integrations/google-calendar/google-calendar.service.ts
@Injectable()
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(private configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.configService.get('GOOGLE_CLIENT_EMAIL'),
        private_key: this.configService.get('GOOGLE_PRIVATE_KEY'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createEvent(appointment: Appointment): Promise<string> {
    const event = {
      summary: appointment.title,
      description: appointment.description,
      start: { dateTime: appointment.start_datetime.toISOString() },
      end: { dateTime: appointment.end_datetime.toISOString() },
    };

    const result = await this.calendar.events.insert({
      calendarId: this.configService.get('GOOGLE_CALENDAR_ID'),
      requestBody: event,
    });

    return result.data.id; // guardar como google_calendar_event_id
  }

  async updateEvent(eventId: string, appointment: Appointment): Promise<void> {
    await this.calendar.events.update({
      calendarId: this.configService.get('GOOGLE_CALENDAR_ID'),
      eventId,
      requestBody: {
        summary: appointment.title,
        description: appointment.description,
        start: { dateTime: appointment.start_datetime.toISOString() },
        end: { dateTime: appointment.end_datetime.toISOString() },
      },
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: this.configService.get('GOOGLE_CALENDAR_ID'),
      eventId,
    });
  }
}
```

**Configuración necesaria:**
- Service Account en Google Cloud Console
- Compartir Google Calendar con el service account
- Variables de entorno: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`
- **IMPORTANTE:** NO guardar credenciales en el repo (el sistema anterior las tenía en un JSON dentro del código)

---

### ~~7.3 Integración WhatsApp API~~ - DESCARTADO

> Se mantendrá WhatsApp manual/personal por decisión de stakeholders.
> Los recordatorios serán internos (dashboard del sistema) + email opcional.

**Implementación de Recordatorios (sin WhatsApp):**

```typescript
// src/modules/reminders/reminders.processor.ts
@Processor('reminders')
export class RemindersProcessor {
  @Process('send-appointment-reminder')
  async sendAppointmentReminder(job: Job<{ reminderId: string }>) {
    const reminder = await this.remindersService.findOne(job.data.reminderId);
    const appointment = await this.appointmentsService.findOne(reminder.related_entity_id);
    const patient = await this.patientsService.findOne(appointment.patient_id);

    // Canal interno: crear notificación en dashboard
    await this.notificationsService.create({
      title: `Recordatorio: Cita de ${patient.nombre} ${patient.apellido}`,
      message: `Cita programada para ${format(appointment.start_datetime, 'dd/MM/yyyy HH:mm')}`,
      type: 'appointment_reminder',
      related_entity_type: 'appointments',
      related_entity_id: appointment.id,
    });

    // Canal email: si el paciente tiene email
    if (patient.email) {
      await this.emailService.send({
        to: patient.email,
        template: 'appointment_reminder',
        variables: {
          nombre: patient.nombre,
          fecha: format(appointment.start_datetime, 'dd \'de\' MMMM', { locale: es }),
          hora: format(appointment.start_datetime, 'HH:mm'),
        },
      });
    }

    await this.remindersService.update(reminder.id, {
      status: 'sent',
      sent_at: new Date(),
    });
  }
}
```

**Scheduler (Cron):**

```typescript
// src/modules/reminders/reminders.service.ts
@Injectable()
export class RemindersService {
  @Cron('*/5 * * * *') // cada 5 minutos
  async processScheduledReminders() {
    const now = new Date();

    const pendingReminders = await this.remindersRepository.find({
      where: {
        status: 'pending',
        scheduled_for: LessThanOrEqual(now),
      },
      relations: ['patient'],
    });

    for (const reminder of pendingReminders) {
      await this.remindersQueue.add('send-appointment-reminder', {
        reminderId: reminder.id,
      });
    }
  }
}
```

---

### ~~7.4 Integración Inventario (Nomisor)~~ - DESCARTADO

> Nomisor no se usará. El inventario será gestionado completamente dentro del sistema médico nuevo.
> Ver módulo de inventario completo en sección F (stock_movements, stock_balances).

---

### 7.5 Integración WooCommerce (Fase 2 - Post-MVP)

**Objetivo:** Sincronizar productos, clientes y órdenes entre tienda online y sistema médico.

**API WooCommerce:**
- REST API v3
- Auth: Consumer Key + Consumer Secret (Basic Auth)
- Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/

**Flujo:**

```
WooCommerce → Sistema Médico:
  - Webhook: order.created → crear venta en sistema médico
  - Webhook: customer.created → buscar/crear paciente por email/teléfono

Sistema Médico → WooCommerce:
  - Sync productos (manual): productos del catálogo médico a WooCommerce
```

**Webhook Order Created:**

```typescript
// src/modules/integrations/woocommerce/woocommerce.webhook.controller.ts
@Controller('webhooks/woocommerce')
export class WooCommerceWebhookController {
  @Post('order-created')
  async handleOrderCreated(@Body() order: any) {
    // Validar signature
    const signature = this.request.headers['x-wc-webhook-signature'];
    this.validateSignature(order, signature);

    // Buscar o crear paciente
    let patient = await this.patientsService.findByEmail(order.billing.email);

    if (!patient) {
      patient = await this.patientsService.create({
        nombre: order.billing.first_name,
        apellido: order.billing.last_name,
        email: order.billing.email,
        celular: order.billing.phone,
        ciudad: order.billing.city,
        estado: order.billing.state,
        direccion: `${order.billing.address_1} ${order.billing.address_2}`,
        origen_canal: 'web',
        tipo_paciente: 'registered',
      });
    }

    // Crear venta (opcional, si se gestiona ventas internamente)
    await this.salesService.create({
      patient_id: patient.id,
      woocommerce_order_id: order.id,
      total: parseFloat(order.total),
      status: order.status,
      items: order.line_items.map(item => ({
        product_id: this.findProductByWooCommerceId(item.product_id),
        quantity: item.quantity,
        unit_price: parseFloat(item.price),
      })),
    });

    // Sync a Brevo (nuevo cliente online)
    await this.brevoService.syncContact(patient);

    return { success: true };
  }
}
```

---

### 7.6 Resumen de Integraciones

| Integración | Dirección | Frecuencia | Método | Fase |
|-------------|-----------|------------|--------|------|
| **Google Calendar** | Bidireccional | Real-time | Google Calendar API v3 | **MVP** |
| ~~**Brevo**~~ | ~~DESCARTADO~~ | - | - | - |
| ~~**WhatsApp Cloud API**~~ | ~~DESCARTADO~~ | - | - | - |
| ~~**Nomisor**~~ | ~~DESCARTADO~~ | - | - | - |
| **WooCommerce** | Bidireccional | Real-time (webhooks) | REST API + Webhooks | **Fase 2** |

---

## H) MIGRATION PLAN

### 8.1 Fases de Migración (Timeline: 3 meses)

**Nota:** Timeline comprimido a 3 meses por decisión de stakeholders. Se eliminaron integraciones descartadas (Brevo, WhatsApp API, Nomisor). WooCommerce queda para Fase 2 post-MVP.

```
Semana 1-2:   Fase 0 - Auditoría + Setup
Semana 3-6:   Fase 1 - Fundación (Auth + Users + Patients + Products/Inventario)
Semana 7-10:  Fase 2 - Módulos Clínicos (Historias + Consultas + Procedimientos + Prescripciones + Citas)
Semana 11-12: Fase 3 - Recordatorios + Reportes + Google Calendar + Cutover
```

---

#### **Fase 0: Auditoría y Setup** (Semana 1-2)

**Objetivos:**
- Auditar calidad de datos (emails, duplicados, teléfonos)
- Setup ambiente de desarrollo
- Setup CI/CD

**Tareas:**

1. **Auditoría de Datos (Semana 1)**
   - Export completo de BD Laravel actual
   - Análisis de data quality:
     ```sql
     -- Pacientes sin email
     SELECT COUNT(*) FROM patients WHERE email IS NULL OR email = '';

     -- Pacientes con edad pero sin contexto temporal
     SELECT COUNT(*) FROM patients WHERE edad IS NOT NULL;

     -- Teléfonos con formatos inconsistentes
     SELECT celular, COUNT(*) FROM patients GROUP BY celular HAVING COUNT(*) > 1;

     -- Prescripciones sin ítems (huérfanas)
     SELECT COUNT(*) FROM prescriptions p
     LEFT JOIN medicines_prescriptions mp ON p.id = mp.prescription_id
     WHERE mp.prescription_id IS NULL;

     -- Posibles pacientes duplicados por nombre
     SELECT nombre, apellido, COUNT(*) FROM patients
     GROUP BY nombre, apellido HAVING COUNT(*) > 1;

     -- Duplicados por teléfono
     SELECT celular, COUNT(*) FROM patients
     WHERE celular IS NOT NULL
     GROUP BY celular HAVING COUNT(*) > 1;
     ```

2. **Setup Ambiente (Semana 1-2)**
   - Repo GitHub (monorepo)
   - CI/CD pipeline (GitHub Actions)
   - DB PostgreSQL en DigitalOcean (staging)
   - Cloudflare R2 bucket (desarrollo)
   - Vercel proyecto (frontend)

**Entregables:**
- Data Quality Report
- Ambiente desarrollo listo
- Repos creados con CI/CD

---

#### **Fase 1: Fundación + Core Entities** (Semana 3-6)

**Objetivos:**
- Infraestructura base (Auth, DB, API)
- Entidades core (Users, Patients, Products, Inventario)
- Scripts de migración de datos

**Semana 3: Setup Proyecto**

```bash
# Backend NestJS
nest new capillaris-api
cd capillaris-api
npm install @nestjs/config @nestjs/typeorm pg
npm install class-validator class-transformer
npm install @nestjs/passport passport passport-jwt
npm install @nestjs/bull bull bullmq ioredis
npm install @aws-sdk/client-s3

# Frontend Next.js
npx create-next-app@latest capillaris-ui --typescript --tailwind --app
cd capillaris-ui
npm install @tanstack/react-query axios zod react-hook-form
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

**Semana 3-4: Auth + Users Module**

- Implementar AuthModule (JWT, login, logout, refresh token)
- Implementar UsersModule (CRUD, roles, permissions)
- **Nota sobre passwords:** Laravel usa bcrypt, NestJS con bcryptjs es compatible. Los hashes se copian directamente.
- Migrar usuarios de Laravel:
  ```typescript
  // migration-scripts/import-users.ts
  async function importUsers() {
    const laravelUsers = await queryLaravelDB('SELECT * FROM users WHERE deleted_at IS NULL');

    for (const user of laravelUsers) {
      await nestUsersService.create({
        legacy_id: user.id, // Laravel usa string IDs
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        password_hash: user.password, // bcrypt compatible
        celular: user.celular,
        cedula_profesional: user.ced_prof,
        fecha_nacimiento: user.fecha_nacimiento,
        is_active: user.isActive === 1,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });

      // Mapear roles: IDs hardcoded 1,2,5 → role "prescriber"
      const laravelRoles = await queryLaravelDB(
        'SELECT r.name FROM model_has_roles mr JOIN roles r ON mr.role_id = r.id WHERE mr.model_id = ?',
        [user.id]
      );
      for (const role of laravelRoles) {
        await nestUsersService.assignRole(newUser.id, role.name);
      }
    }
  }
  ```

**Semana 5: Patients Module + Data Cleaning**

- Implementar PatientsModule (CRUD, búsqueda, filtros)
- Script de limpieza y migración de datos:

  ```typescript
  async function cleanAndImportPatients() {
    const laravelPatients = await queryLaravelDB('SELECT * FROM patients');

    for (const patient of laravelPatients) {
      // 1. Normalizar teléfono (México + internacionales)
      let celular_normalized = null;
      if (patient.celular) {
        celular_normalized = normalizePhoneNumber(patient.celular, 'MX');
      }

      // 2. Convertir edad a fecha_nacimiento (aproximada)
      let fecha_nacimiento = null;
      let edad_approximada = false;
      if (patient.edad && patient.created_at) {
        const añoCreacion = new Date(patient.created_at).getFullYear();
        const añoNacimiento = añoCreacion - patient.edad;
        fecha_nacimiento = new Date(`${añoNacimiento}-01-01`);
        edad_approximada = true;
      }

      // 3. Deduplicación (exacto por phone/email, fuzzy por nombre)
      const existingPatient = await findDuplicatePatient(
        patient.nombre, patient.apellido, celular_normalized, patient.email
      );
      if (existingPatient) {
        duplicatesMap.set(patient.id, existingPatient.id);
        continue;
      }

      // 4. Crear paciente
      await nestPatientsService.create({
        legacy_id: patient.id,
        nombre: patient.nombre,
        apellido: patient.apellido,
        email: patient.email || null,
        celular: patient.celular,
        celular_normalized,
        direccion: patient.direccion,
        fecha_nacimiento,
        edad_approximada,
        genero: mapGender(patient.genero),
        estado_civil: patient.estado_civil,
        ocupacion: patient.ocupacion,
        tipo_paciente: mapTipoPaciente(patient.tipo_paciente),
        notas_migracion: `Edad original: ${patient.edad}`,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
      });
    }
  }
  ```

**Semana 6: Products + Inventory Module**

- Implementar ProductsModule (CRUD, categorías)
- Implementar InventoryModule completo (entradas, salidas, balance, alertas stock bajo)
- Migrar catálogo de productos existente (si hay datos útiles en la BD desactivada)
- UI: lista de productos, movimientos de stock

**Entregables Fase 1:**
- API funcional (Auth + Users + Patients + Products + Inventory)
- DB migrada con datos limpios
- Reporte de Data Quality
- Mapping legacy IDs → nuevos UUIDs
- UI básica: login, dashboard, CRUD pacientes, inventario

---

#### **Fase 2: Módulos Clínicos + Citas** (Semana 7-10)

**Objetivos:**
- Historia clínica, consultas, procedimientos, micropigmentación, hairmedicine
- Prescripciones vinculadas a productos
- Agenda de citas
- Imágenes de pacientes

**Semana 7: Clinical Histories + Medical Consultations**

- Migrar estructura normalizada (5 tablas relacionadas)
- Importar datos históricos
- UI: formulario de historia clínica, consultas médicas

**Semana 8: Procedures + Micropigmentation + Hairmedicine**

- Procedimientos FUE/FUSS (estructura compleja: follicles, anesthesia, tools)
- Micropigmentación
- Medicina capilar (hairmedicine)
- Vincular procedimientos con múltiples doctores (many-to-many)
- Migrar datos existentes

**Semana 9: Prescriptions (Rediseñado) + Images**

- Nueva estructura prescription_items vinculada a products
- Migración de prescripciones:
  ```typescript
  async function migratePrescriptions() {
    const laravelPrescriptions = await queryLaravelDB(`
      SELECT p.*, mp.medicine_id, m.name as medicine_name
      FROM prescriptions p
      LEFT JOIN medicines_prescriptions mp ON p.id = mp.prescription_id
      LEFT JOIN medicines m ON mp.medicine_id = m.id
    `);

    const grouped = groupBy(laravelPrescriptions, 'id');

    for (const [prescriptionId, items] of Object.entries(grouped)) {
      const first = items[0];
      const prescription = await nestPrescriptionsService.create({
        patient_id: mapLegacyId(first.patient_id, 'patients'),
        doctor_id: mapLegacyId(first.user_id, 'users'),
        prescription_date: first.prescription_date,
        notas: first.description,
        status: 'active',
      });

      for (const item of items) {
        const product = await findProductByMedicineName(item.medicine_name);
        await nestPrescriptionItemsService.create({
          prescription_id: prescription.id,
          product_id: product?.id || null,
          medicine_name: item.medicine_name,
          quantity: 1,
        });
      }
    }
  }
  ```
- Imágenes: migrar de S3 actual a Cloudflare R2 (o mantener S3 y cambiar config)
- UI: upload, favoritos, antes/después

**Semana 10: Appointments Module**

- Citas con estados (scheduled|confirmed|completed|cancelled|no_show)
- Integración Google Calendar bidireccional
- UI: calendario, lista de citas, crear/editar cita
- Migrar citas existentes

**Entregables Fase 2:**
- Todos los módulos clínicos completos con UI
- Prescripciones vinculadas a productos
- Citas con Google Calendar
- Imágenes migradas

---

#### **Fase 3: Recordatorios + Reportes + Cutover** (Semana 11-12)

**Objetivos:**
- Sistema de recordatorios (internos + email)
- Reportes con filtros
- Dashboard con KPIs
- Cutover a producción

**Semana 11: Reminders + Reports + Dashboard**

- RemindersModule con BullMQ:
  - Citas: 24h y 2h antes (notificación interna + email)
  - Recetas refill: según duration_days
  - Seguimiento post-procedimiento: 7, 30, 90, 180 días
- ReportsModule:
  - Pacientes nuevos por periodo
  - Procedimientos por doctor
  - Stock/productos (entradas, salidas, balance)
  - Conversión lead → procedimiento
  - Exports: Excel, CSV
- Dashboard con KPIs principales

**Semana 12: Testing + Training + Cutover**

- Testing completo (funcional, datos migrados)
- Capacitación equipo (1-2 sesiones con recepción y doctores)
- Validación de datos migrados:
  ```sql
  -- Conteos
  SELECT COUNT(*) FROM patients; -- comparar Laravel vs PostgreSQL
  SELECT COUNT(*) FROM appointments;
  SELECT COUNT(*) FROM prescriptions;

  -- Checksums muestrales
  SELECT MD5(CONCAT_WS(',', nombre, apellido, email)) as checksum
  FROM patients ORDER BY id LIMIT 100;
  ```
- **Cutover** (fin de semana):
  1. Exportar últimos cambios de Laravel
  2. Importar a PostgreSQL
  3. Validar conteos
  4. Activar sistema NestJS/Next.js en dominio principal
  5. Monitoreo intensivo primeras 72h

**Contingencia/Rollback:**
1. Reactivar sistema Laravel (< 1 hora)
2. Investigar problema
3. Planear nuevo cutover

**Entregables Fase 3:**
- Sistema nuevo en producción
- Usuarios capacitados
- Recordatorios activos
- Reportes funcionando
- Sistema Laravel deprecado

---

### 8.2 Estrategia de Migración de Datos

**Principios:**

1. **No Perder Datos** - Todo se migra, incluso datos incompletos
2. **Trazabilidad** - Mantener legacy_id para tracking
3. **Auditoría** - Logs detallados de cada paso
4. **Rollback** - Siempre posible volver atrás
5. **Validación** - Checksums, conteos, muestreos

**Campos Problemáticos:**

| Campo | Problema | Estrategia |
|-------|----------|------------|
| **edad** | Integer que no se actualiza | Convertir a fecha_nacimiento = 01/01/(año_creacion - edad), flag edad_approximada=true |
| **email** | Nullable | Mantener nullable, validar formato si existe |
| **celular** | Sin formato | Normalizar a E.164, guardar original + normalizado |
| **duplicados** | Registros duplicados | Fuzzy matching, merge manual con aprobación |
| **genero** | Stored as string pero model usa int | Normalizar a enum claro |
| **prescriptions.name** | Se guarda vacío | Ignorar campo, usar patient.nombre |
| **procedure_reports.user_id** | FK removida 2024 | Usar tabla pivot procedure_report_user |

**Script de Validación Post-Migración:**

```typescript
async function validateMigration() {
  const report = {
    patients: await validatePatients(),
    appointments: await validateAppointments(),
    prescriptions: await validatePrescriptions(),
    procedures: await validateProcedures(),
  };

  console.log(report);

  if (report.patients.errorRate > 0.01) {
    throw new Error('Migration validation failed: patients error rate > 1%');
  }
}

async function validatePatients() {
  const laravelCount = await queryLaravelDB('SELECT COUNT(*) FROM patients');
  const postgresCount = await queryPostgres('SELECT COUNT(*) FROM patients');

  const sampleSize = 100;
  const laravelSample = await queryLaravelDB(`SELECT * FROM patients ORDER BY RAND() LIMIT ${sampleSize}`);

  let errors = 0;
  for (const laravelPatient of laravelSample) {
    const postgresPatient = await queryPostgres('SELECT * FROM patients WHERE legacy_id = $1', [laravelPatient.id]);

    if (!postgresPatient) {
      errors++;
      console.error(`Patient ${laravelPatient.id} not migrated`);
      continue;
    }

    // Validar campos críticos
    if (postgresPatient.nombre !== laravelPatient.nombre) errors++;
    if (postgresPatient.email !== laravelPatient.email) errors++;
    // ...
  }

  return {
    laravelCount,
    postgresCount,
    diff: Math.abs(laravelCount - postgresCount),
    sampleSize,
    errors,
    errorRate: errors / sampleSize,
  };
}
```

---

### 8.3 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Pérdida de datos durante migración** | Media | Crítico | - Backups antes de cada paso<br>- Validación exhaustiva<br>- Parallel run |
| **Downtime prolongado en cutover** | Media | Alto | - Cutover en fin de semana<br>- Ensayo previo en staging<br>- Rollback plan |
| **Usuarios no adoptan sistema nuevo** | Baja | Alto | - Training exhaustivo<br>- UI/UX amigable<br>- Soporte dedicado primeras semanas |
| **Google Calendar falla** | Media | Bajo | - Calendario interno funciona sin Google<br>- Queue con retry<br>- Monitoreo y alertas |
| **Data quality peor de lo esperado** | Alta | Medio | - Limpieza manual iterativa<br>- Herramientas de deduplicación<br>- Validación por staff |
| **Performance issues (queries lentos)** | Media | Medio | - Índices en FK<br>- Paginación<br>- Cache (Redis)<br>- Load testing previo |
| **Bugs críticos post-cutover** | Media | Alto | - Testing exhaustivo<br>- Rollback inmediato si necesario<br>- On-call 24/7 primera semana |

---

## I) RESPUESTAS DE STAKEHOLDERS (2026-03-02)

### Alcance y Prioridades

**1. Priorización de Módulos**
- [x] Pacientes → Formularios clínicos (historia, procedimientos, etc.) → Citas → Recordatorios → Inventario → Reportes → Dashboard

**2. MVP Timeline**
- [x] **3 meses**

**3. Inventario**
- [x] **Gestión completa** (entradas, salidas, ajustes) - Nomisor NO se usará, todo dentro del sistema nuevo

---

### Datos y Data Quality

**4. Pacientes Duplicados**
- Respuesta: **Sí hay duplicados, cantidad desconocida. Requiere auditoría de datos.**

**5. Edad vs Fecha de Nacimiento**
- [x] **Asumir fecha de nacimiento aproximada** (01/01/año) y corregir cuando regresen. Flag `edad_approximada = true`.

**6. Pacientes sin Email**
- Respuesta: **No está seguro del %. Requiere auditoría de datos.**

**7. Normalización de Teléfonos**
- Respuesta: **México + algunos internacionales.** Normalizar a E.164 con soporte multi-país.

---

### Flujo de Trabajo Actual

**8. Recetas y Productos**
- [x] **Solo se registra en el sistema médico** (sin vincular a inventario). En el nuevo sistema se vincularán.

**9. Ventas en Mostrador**
- [x] **No se registran.** En el nuevo sistema solo habrá inventario (stock), sin punto de venta ni facturación.

**10. Comunicación WhatsApp Actual**
- Respuesta: **Probablemente 1 número.** Se investigará después. Se mantendrá WhatsApp manual.

---

### Integraciones

**11. Brevo - Uso Actual**
- [x] **No usan Brevo.** DESCARTADO del alcance.

**12. Brevo - Datos**
- N/A (descartado)

**13. WhatsApp API**
- [x] **No.** Prefieren seguir usando WhatsApp manual/personal. DESCARTADO del alcance.

**14. Nomisor API**
- [x] **No se usará.** El inventario será gestionado completamente en el sistema nuevo. DESCARTADO.

**15. WooCommerce**
- [x] **Ya está en desarrollo.** Integración para **Fase 2** (post-MVP).

---

### Reportes y Analytics

**16. Reportes Más Importantes**
1. Pacientes nuevos por periodo
2. Procedimientos por doctor
3. Ventas/ingresos por producto
4. Conversión lead → procedimiento

**17. Frecuencia de Reportes**
- Pendiente de definir (probablemente bajo demanda)

**18. Segmentación de Pacientes**
- Pendiente de definir en detalle

---

### Operación y Usuarios

**19. Usuarios del Sistema**
- **1-5 personas** (equipo pequeño: recepción + doctores)

**20. Horario de Disponibilidad**
- Días: **Lunes a Viernes**
- Horario: **8am - 6pm**
- [x] **Sí**, downtime de mantenimiento fuera de horario es aceptable

---

### Bonus: Compliance y Seguridad

**21. Consentimientos**
- [x] Parcial: tienen para datos personales y uso de imágenes, pero no estandarizado

**22. Backup y Retención**
- Pendiente de definir

---

**FIN DEL ANÁLISIS**

---

## PRÓXIMOS PASOS

**Preguntas respondidas:** Sección I completada (2026-03-02)
**Alcance definido:** MVP en 3 meses, sin Brevo/WhatsApp API/Nomisor

### Inmediato (esta semana)
1. **Iniciar Fase 0:** Auditoría de datos (ejecutar queries SQL de la sección H)
2. **Setup repos:** Crear monorepo GitHub con NestJS + Next.js
3. **Setup infra:** PostgreSQL en DigitalOcean, Vercel project, Cloudflare R2

### Semana 3-6
4. **Fase 1:** Auth + Users + Patients + Products + Inventario
5. **Migración de datos:** Ejecutar scripts de limpieza y migración

### Semana 7-10
6. **Fase 2:** Módulos clínicos + Citas + Google Calendar

### Semana 11-12
7. **Fase 3:** Recordatorios + Reportes + Dashboard + Cutover

### Post-MVP (Fase 2 futura)
8. **WooCommerce:** Integración con tienda online
9. **Reportes avanzados:** Analytics, gráficos, BI básico

---

**Documento generado:** 2026-01-15
**Actualizado:** 2026-03-02 (respuestas stakeholders + ajuste de alcance)
**Sistema analizado:** Capillaris Legacy (Laravel 5.8)
**Sistema destino:** NestJS + Next.js + PostgreSQL
**Hosting:** Vercel (frontend) + DigitalOcean (backend/DB) + Cloudflare R2 (imágenes)

