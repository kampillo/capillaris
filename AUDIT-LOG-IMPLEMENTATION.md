# Audit Log / Historial de Actividad — Plan de Implementación

Documento de referencia para implementar el módulo de auditoría en Capillaris.
Pendiente: depende de tener definido el sistema de roles y permisos.

## Objetivo

Permitir que los administradores vean todos los movimientos de los usuarios:
qué crearon, editaron o borraron, cuándo y desde qué IP. Incluye eventos de
auth (login, logout, login fallido).

## Decisiones tomadas

1. **Auditar todas las entidades** (todos los modelos Prisma).
2. **Guardar diff completo** (`before` y `after` en JSON) — útil para uso clínico/legal.
3. **Soft delete se registra como `DELETE`**, no como `UPDATE`, para que sea más legible
   (cuando un `update` solo cambia `deletedAt` de null a fecha).
4. **Incluir login / logout / login fallido** como eventos.
5. **Retención: para siempre**. No purgar.
6. **Enmascarar campos sensibles** (`password`, `passwordHash`, `googleAccessToken`,
   `googleRefreshToken`) reemplazándolos por `"***"` antes de guardar el JSON.

## Backend

### 1. Modelo Prisma nuevo

```prisma
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid          // null en sistema / login fallido
  userEmail String?  @map("user_email") @db.VarChar(255) // denormalizado: sobrevive si borran al user
  action    String   @db.VarChar(20)   // CREATE | UPDATE | DELETE | LOGIN | LOGIN_FAILED | LOGOUT
  entity    String   @db.VarChar(50)   // "patient", "appointment", "user", "auth", ...
  entityId  String?  @map("entity_id")
  before    Json?    // estado previo (UPDATE / DELETE)
  after     Json?    // estado nuevo (CREATE / UPDATE)
  changes   Json?    // diff: { field: { from, to } } para UPDATE
  ipAddress String?  @map("ip_address") @db.VarChar(45)
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([createdAt])
  @@index([action])
  @@map("audit_logs")
}
```

### 2. Captura automática

- **AsyncLocalStorage**: middleware Nest que guarde `{ userId, userEmail, ip, userAgent }`
  por request, leyéndolo del JWT.
- **Prisma client extension**: hook en `$allOperations` que escribe el `AuditLog` por cada
  `create` / `update` / `delete` / `upsert` / `createMany` / `updateMany` / `deleteMany`.
  - Para `update` / `delete` hace un `findUnique` previo para capturar `before`.
  - Para `updateMany` / `deleteMany` pre-consulta los IDs afectados y registra uno por uno.
  - Excluye el modelo `AuditLog` (evita recursión).
  - Detecta soft delete: si el diff es solo `deletedAt: null → fecha`, registra como `DELETE`.
  - Enmascara campos sensibles antes de serializar.
- **Eventos de auth** (no pasan por Prisma writes): se emiten manualmente en `auth.service.ts`
  para `LOGIN`, `LOGIN_FAILED`, `LOGOUT`.

**Ventaja del enfoque**: ninguno de los 16 módulos actuales necesita cambios.

### 3. Módulo nuevo `audit`

- `GET /api/v1/audit-logs` con filtros: `userId`, `entity`, `action`, `from`, `to`, paginación.
- Guard que restringe acceso a rol admin (depende de definir el sistema de roles).

## Frontend

Página nueva en `/configuracion/historial`:

- **Filtros**: dropdown de usuario, dropdown de entidad, dropdown de acción, rango de fechas.
- **Tabla**: fecha/hora, usuario, acción (badge de color por tipo), entidad, ID, botón "ver cambios".
- **Modal de detalle**: diff tipo git (rojo = antes, verde = después). Para `CREATE` muestra el
  objeto creado; para `DELETE` muestra el objeto borrado.
- Paginación server-side.

## Consideraciones operativas

- **Performance**: cada UPDATE añade un SELECT + un INSERT. Imperceptible al volumen actual
  (22 usuarios, CRM). Si crece, mover el INSERT a una cola asíncrona.
- **Compliance**: típicamente requerido en CRM médico (NOM-024 MX, HIPAA EU). Buen
  selling point para el cliente.
- **Tamaño de tabla**: ~2KB por escritura con diff completo. ~150MB/año a 200 escrituras/día.
  No es problema en años; archivado eventual queda fuera de scope.
- **Bulk ops**: pre-consultar IDs antes de un `deleteMany` masivo puede ser caro. No se
  esperan casos masivos en este CRM.
- **Migración**: la auditoría empieza el día del deploy. No se reconstruye historial previo.

## Bloqueador actual

No está definido el sistema de roles/permisos. Antes de implementar este módulo hay que
decidir:
- Qué roles existen (admin, médico, recepción, etc.).
- Cómo se restringen rutas / acciones por rol.
- Si la decisión de "quién puede ver el historial" es por rol o por permiso granular.
