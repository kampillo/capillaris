# Migración MySQL → PostgreSQL — Documentación de Sesión

**Fecha:** 2026-03-04
**Estado:** Migración ejecutada exitosamente, validación pasada al 100%

---

## 1. Qué se hizo

Se implementó y ejecutó un sistema completo de migración de datos desde la base MySQL legacy (Laravel 5.8) hacia PostgreSQL (Prisma/NestJS). El dump `cap290126.sql` (5.1MB) se cargó en MySQL local y se migró a la base `capillaris` en PostgreSQL.

### Resultados

| Tabla | MySQL | PG | Estado |
|-------|------:|---:|--------|
| users | 22 | 22 | OK |
| patients | 4,449 | 4,449 | OK |
| clinical_histories | 4,786 | 4,786 | OK |
| hairmedicines | 2,165 | 2,165 | OK |
| medical_consultations | 1,956 | 1,956 | OK |
| procedure_reports | 1,878 | 1,878 | OK |
| patient_images | 1,074 | 1,074 | OK |
| micropigmentations | 253 | 253 | OK |
| appointments | 30 | 30 | OK |
| prescriptions | 6 | 6 | OK |
| Sub-tablas clínicas | 4,799 | 4,786 | OK (13 huérfanos en MySQL) |
| Catálogos (donor_zones, variants, hair_types) | 7/5/7 | 12/12/12 | OK (se agregaron estándares faltantes) |

- **FK Integrity:** Todas las 15 verificaciones pasaron
- **Sample Audit:** 5 pacientes random, todos coinciden campo por campo
- **Tiempo total:** ~9.5 segundos
- **198 teléfonos** con formato incompleto (e.g., "1234") — no se pudieron normalizar

---

## 2. Estructura del sistema

```
scripts/migration/
├── docker-compose.yml          # MySQL 5.7 Docker (alternativa, no se usó)
├── package.json                # deps: mysql2, @prisma/client, uuid, tsx
├── tsconfig.json
├── .env.migration              # Conexiones MySQL local + PG local
├── .gitignore                  # Ignora dump.sql, node_modules, report
├── src/
│   ├── index.ts                # Orquestador: corre steps en orden, genera report
│   ├── config.ts               # Carga .env.migration
│   ├── mysql-source.ts         # Pool mysql2/promise
│   ├── pg-target.ts            # PrismaClient standalone
│   ├── id-map.ts               # UUID v5 determinístico: Map<tabla, Map<oldId, newUuid>>
│   ├── phone-normalizer.ts     # Normalización +52XXXXXXXXXX
│   └── steps/
│       ├── 00-clean.ts         # TRUNCATE CASCADE 34 tablas PG
│       ├── 01-roles-permissions.ts  # 4 roles + 60 permisos + catálogos
│       ├── 02-users.ts         # 22 users + role assignment heurístico
│       ├── 03-patients.ts      # edad→fecha, phone norm, tipo_paciente int→string
│       ├── 04-appointments.ts  # date→startDatetime/endDatetime
│       ├── 05-clinical-histories.ts # + 4 sub-tablas
│       ├── 06-consultations.ts # + pivots donor_zones, variants
│       ├── 07-prescriptions.ts # medicines pivot → prescription_items
│       ├── 08-procedures.ts    # Flatten 4 tablas 1:1 → procedure_reports
│       ├── 09-micropigmentations.ts
│       ├── 09b-hairmedicines.ts
│       └── 10-images.ts        # S3 URL → s3Key extraction
└── src/validate/
    ├── index.ts                # Orquestador de validación
    ├── count-check.ts          # Compara conteos MySQL vs PG
    ├── fk-integrity.ts         # 15 checks de FKs huérfanas
    └── sample-audit.ts         # 5 pacientes random, campo por campo
```

### Comandos

```bash
cd scripts/migration
npm run migrate           # Migración completa (~9.5s)
npm run migrate:step 03   # Solo un step específico
npm run validate          # Validar conteos + FKs + sample audit
```

---

## 3. Requisitos del entorno

- **MySQL:** Instalado via `brew install mysql`, corriendo en puerto 3306, sin password, usuario `root`
- **PostgreSQL:** Ya existía, corriendo en puerto 5432, usuario `kampiyo`, base `capillaris`
- **Prisma:** Se debe generar el client antes de migrar: `cd apps/api && npx prisma generate`
- **Dump SQL:** `cap290126.sql` en la raíz del proyecto (5.1MB)
- **Carga del dump:** `mysql -u root capillaris_legacy < cap290126.sql`
- **Node modules:** `cd scripts/migration && npm install` (pero el `@prisma/client` local se eliminó para que resuelva al del root donde está generado)

### Nota importante sobre @prisma/client

La migración usa el `@prisma/client` generado en el root (`node_modules/@prisma/client`), NO el local. Se eliminó `scripts/migration/node_modules/@prisma` y `scripts/migration/node_modules/.prisma` para que resuelva correctamente. Si se hace `npm install` de nuevo, hay que volver a eliminarlos:

```bash
cd scripts/migration
rm -rf node_modules/@prisma node_modules/.prisma
```

---

## 4. Hallazgos del dump real

### Tablas vacías en MySQL
- `roles` — 0 registros (Spatie nunca se pobló)
- `permissions` — 0 registros
- `model_has_roles` — 0 registros
- `model_has_permissions` — 0 registros
- `medicines` — 0 registros
- `medicines_prescriptions` — 0 registros

### Esquema MySQL real vs asumido

Varias columnas tenían nombres diferentes a lo esperado:

**micropigmentations:**
| Columna MySQL real | Lo que asumíamos |
|---|---|
| `name` | (no existía) |
| `tono` | (no existía) |
| `date` (datetime) | `fecha` |
| `duration` (int) | `duracion` |
| `description` | `descripcion` |
| `dilucion` | `dilucion` |
| NO hay `comments` | `comments` |

**hairmedicines:**
| Columna MySQL real | Lo que asumíamos |
|---|---|
| `name` | (no existía) |
| `date` (datetime) | `fecha` |
| `duration` (int) | `duracion` |
| `comments` | `comments` |
| NO hay `descripcion` | `descripcion` |

**anesthesia tables:**
- `fecha_inicial_extraccion` y `fecha_final_extraccion` son TIME strings ("09:00:00"), no DateTime
- `lidocaina` viene como string O int dependiendo del registro

**physical_explorations:**
- `fc` y `fr` vienen como strings, no ints
- `temperatura`, `peso`, `talla` vienen como strings, no floats

**users:**
- `id` es `int unsigned auto_increment` (no string como se temía)
- `apellido` puede ser NULL

---

## 5. Transformaciones clave implementadas

### IDs: MySQL INT → UUID v5 determinístico
```
uuid5("tabla:oldId", NAMESPACE_UUID)
```
Misma entrada siempre produce el mismo UUID. El namespace se genera desde `"capillaris-migration"`.

### Pacientes: edad → fechaNacimiento
```
edad = 35 → fechaNacimiento = 2026-01-01 - 35 = 1991-01-01
edadApproximada = true
```
Si edad ≤ 0 o > 120: fechaNacimiento = null, approximada = false.

### Pacientes: tipo_paciente (int → string)
```
0 → 'lead'
1 → 'registered'
2 → 'evaluation'
3 → 'active'
```

### Pacientes: genero (normalización)
```
1 / 'hombre' / 'masculino' → 'hombre'
2 / 'mujer' / 'femenino'   → 'mujer'
3 / 'otro'                  → 'otro'
```

### Teléfonos: normalización México
- Strip no-dígitos → quitar prefijo 52/521/1 → si 10 dígitos → `+52XXXXXXXXXX`
- 198 de 4,449 no pudieron normalizarse (formato corto como "1234")

### Passwords: bcrypt directo
PHP bcrypt y Node.js bcrypt son compatibles. Se copian tal cual.

### Procedimientos: flatten 4→1
```
procedure_reports + hair_follicles + tools + anesthesia_extractions + anesthesia_implantations
→ procedure_reports (columnas: cb1-4, totalFoliculos, punchSize, implantador, anestExt*, anestImp*)
```

### Anestesia: TIME → DateTime
MySQL TIME "09:00:00" + fecha del procedimiento → DateTime completo.

### Micropigmentaciones: name+tono+description → descripcion
```
"SMP | Tono: 18:1 | Sesión completa" (joined con " | ")
```

### Imágenes: S3 URL → s3Key
```
"https://bucket.s3.amazonaws.com/patients/123/photo.jpg"
→ s3Key: "patients/123/photo.jpg", s3Bucket: "bucket", fileName: "photo.jpg"
```

### Roles: creados desde cero
MySQL Spatie vacío → 4 roles estándar (admin, doctor, receptionist, inventory_manager) + 60 permisos.
User ID 1 → admin, todos los demás → doctor.

---

## 6. Idempotencia

1. Step 00 hace `TRUNCATE CASCADE` de todas las tablas PG
2. UUID v5 determinístico garantiza mismos IDs en cada corrida
3. Se puede ejecutar `npm run migrate` N veces con resultado idéntico

---

## 7. Pendientes para el futuro

### Migración final (go-live)
- El sistema legacy sigue en uso → habrá datos nuevos al momento del cutover
- **Estrategia recomendada:** Cutover de fin de semana (Viernes 6pm → Lunes 8am)
  1. Bloquear acceso al sistema Laravel
  2. Obtener dump fresco
  3. Correr migración completa
  4. Validar
  5. Arrancar sistema nuevo
- **Opcional:** Convertir `create` → `upsert` para modo delta/incremental

### No migrado (por diseño)
- **Inventario** (products, stock_input, stock_output, balances): estaba desactivado en Laravel
- **Audit log**: se crea vacío, se poblará con uso del nuevo sistema
- **Reminders**: no existían en legacy
- **IntegrationSyncLog**: nuevo, no existía

### Data quality
- 198 teléfonos con formato incompleto necesitan limpieza manual
- 13 sub-tablas clínicas huérfanas en MySQL (sin clinical_history padre)
- Emails opcionales en pacientes (muchos null)

---

## 8. Cómo re-ejecutar desde cero

```bash
# 1. Asegurarse de que MySQL y PG están corriendo
brew services start mysql
# PG ya corre normalmente

# 2. Cargar dump (si es primera vez o dump nuevo)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS capillaris_legacy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root capillaris_legacy < cap290126.sql

# 3. Generar Prisma client
cd apps/api && npx prisma generate && cd ../..

# 4. Instalar deps y limpiar Prisma local
cd scripts/migration
npm install
rm -rf node_modules/@prisma node_modules/.prisma

# 5. Ejecutar migración
npx tsx src/index.ts

# 6. Validar
npx tsx src/validate/index.ts

# 7. (Opcional) Apagar MySQL cuando no se necesite
brew services stop mysql
```

---

## 9. Archivos de referencia

- `apps/api/prisma/schema.prisma` — Esquema PG destino (34 tablas)
- `apps/api/prisma/seed.ts` — Lógica de catálogos que se reutilizó
- `packages/shared/src/enums.ts` — Valores válidos de enums
- `ANALYSIS-MIGRATION.md` — Documentación completa del esquema MySQL fuente
- `scripts/migration/MIGRATION-REPORT.md` — Reporte auto-generado de última corrida
