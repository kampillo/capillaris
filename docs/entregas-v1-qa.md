# Entregas físicas y auditoría: validación de cierre

La integración en develop reúne Entregas v1 y la corrección de auditoría de
historias clínicas y recetas. La migración de entregas ya está aplicada en
Neon develop; esta integración no vuelve a ejecutarla ni crea más fixtures.

## Comportamiento

- Emitir una receta no descuenta stock. Cada confirmación descuenta envases
  completos y cantidades enteras del saldo físico compartido de la clínica.
- `productId` identifica explícitamente el producto; nombre, dosis y duración
  no hacen equivalencias ni conversiones. `stockUnit` identifica la unidad
  física y `fulfillmentQuantity` el objetivo autorizado de entrega.
- Los históricos conservan objetivo nulo. Solo producto/unidad validados y
  objetivo explícito habilitan entrega por receta. La cantidad clínica antigua
  no se interpreta como número de envases.
- Se permiten entregas parciales hasta el objetivo, en recetas activas, no
  vencidas y de pacientes disponibles. La entrega directa no necesita paciente;
  un producto que requiere receta exige el flujo vinculado.
- Recepción, inventario y administración confirman; solo administración
  registra reversos. Doctor consulta cumplimiento, sin confirmar. Inventario
  recibe identificación mínima y cantidades, sin acceder a la receta clínica.
  Enfermería y tratamientos conservan sus restricciones, incluidos roles mixtos.
- Stock, movimiento, entrega, líneas y auditoría comparten transacción. Una
  clave repetida con el mismo contenido devuelve el registro original; reutilizar
  la clave con otro contenido genera conflicto.
- La UI guarda el intento antes de enviarlo, recupera su misma clave al recargar
  y la conserva tras timeout, error de red, 5xx, 408, 429 o pérdida de autorización.
  Timeout del cliente: 35 segundos; transacción: 30 segundos, con hasta tres
  intentos frente a conflictos de serialización.
- El reverso es completo, único y vinculado: exige motivo y confirmación física
  de todos los envases. Original y líneas son inmutables. Ítems con historial no
  se editan ni eliminan; recetas con entregas no se borran. Una presentación con
  objetivos o entregas exige otro producto para cambiar unidad, contenido o SKU.

No incluye cobros, devoluciones parciales, reservas, tienda, lotes ni otros
almacenes. La futura tienda compartirá saldo, pero su contrato de integración
permanece fuera de esta versión.

## Esquema y auditoría

Migración `20261005090000_deliveries_v1`, SHA256:
`2433f909c92f89683dd3c0ae11b85100e568fe0096b25a1ec90b2754616fa5e8`.

Añade dos campos nulos sin backfill, tablas `deliveries` y `delivery_lines`,
siete FK con borrado restringido, seis CHECK, siete índices explícitos y dos
índices de clave primaria, función y dos triggers de inmutabilidad. El archivo
usa BEGIN/COMMIT. Las 14 migraciones de develop se verificaron por metadatos y
checksum, sin pendientes, discrepancias o migraciones incompletas.

La auditoría captura el antes y después de los agregados clínicos dentro de
la misma transacción. Conserva Decimal y Date como JSON válido, registra los
cambios de descripción y notas y evita aparentar cambios de relaciones intactas.
Los snapshots excluyen perfiles completos de pacientes, usuarios y productos.
Un fallo de auditoría revierte la operación correspondiente.

## Evidencia y límites

- 127 pruebas automatizadas aprobadas: servicios, DTO, controllers y guard de
  roles reales, middleware, snapshots y controles React; almacenamiento y
  transporte sustituidos en esta suite. No representan una sesión de navegador.
- 23 casos SQL reales aprobados en PostgreSQL/Neon develop: idempotencia,
  parciales, stock y objetivos concurrentes, creación de receta sin descuento,
  rollback de stock y auditoría, reversos, overflow, snapshots, CHECK, FK y
  triggers. Dos clientes solapados produjeron P2034 reales y reintentos acotados;
  hubo un solo efecto al competir por el último envase o el mismo intento.
- QA manual de cierre reportó parciales, directa, doble clic, reversos y móvil
  aprobados, sin borradores pendientes. Sus tres entregas y tres reversos se
  conservaron; el producto ficticio terminó con saldo 20 y la receta con
  entregado 0/pendiente 4. No se borró auditoría ni se repitieron esas operaciones.
- Cliente Prisma local regenerado; tipos API/web, lint, esquema, CSS y diff se
  comprueban en la integración. No se hizo build web de producción.

Las pruebas SQL llamaron servicios con un actor ficticio existente, sin cambiar
roles ni credenciales; no acreditan permisos HTTP de ese actor. Juan revisará
los roles en el runtime integrado. La evidencia operativa e inventarios se
conservan fuera del repositorio y no se incluyen en el commit.

## Cierre con la clínica

1. Revisar con cuentas existentes administración, recepción, inventario, doctor,
   enfermería y tratamientos: rutas permitidas, denegaciones y acceso clínico.
2. Validar el catálogo físico y los objetivos de receta antes de entregar
   históricos. Confirmar el procedimiento de reverso y su disponibilidad física.
3. Completar por separado Calendar, WhatsApp/Brevo y cualquier integración
   externa acordada; no se acreditan mediante esta QA con proveedores apagados.
4. Confirmar entorno de producción, migración de históricos/imágenes,
   capacitación y documentación acordadas antes de entrega operativa.

El runtime local integrado usa web 3000/API 3001, configuración existente solo
en memoria y transportes externos apagados. Este trabajo no publica ni despliega
a producción, modifica usuarios ni instala credenciales nuevas.
