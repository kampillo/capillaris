# Capillaris — diagnóstico y mapa inicial v1

**Corte histórico:** el análisis ampliado ya concluyó. Consultar la [auditoría integral](auditoria-integral-2026-09-21.md) y su [cobertura](auditoria-2026-09-21/cobertura.md) para el estado vigente.

21 de septiembre de 2026. Documento de conversación y priorización, **no auditoría exhaustiva concluida ni propuesta de reescritura**. Rige la [dirección de trabajo](direccion-de-trabajo.md): no publicar ni modificar producción sin autorización expresa futura.

## Lectura inicial

La base actual permite atención clínica, agenda, inventario y reportes, con controles específicos de enfermería ya probados. No hay evidencia para descartar toda la estructura heredada. Sí hay tres asuntos que ordenar antes de rediseñar pantallas: qué representa cada registro, cuál es su fuente vigente y quién puede capturarlo o consultarlo.

La convivencia de historia importada, módulos antiguos y nuevos explica parte de la complejidad. Además hay defectos puntuales de código independientes de esa herencia. Una mejora visual general por sí sola no resolvería esas diferencias.

**Inspeccionado en esta ronda:** esquema Prisma, importadores de pacientes/usuarios/tratamientos, servicios/controladores de pacientes, fusión, agenda/Google, roles, inventario, recetas, recordatorios, imágenes y reportes; componentes de listado de pacientes y movimientos de inventario; documentos de formularios, acceso y QA. Se reutilizó la evidencia funcional reciente, sin repetir recorridos ni consultar/modificar expedientes. No se ejecutaron migraciones, scripts de importación, envíos ni pruebas de explotación en esta ronda. No se trasladan datos incidentales privados de la reunión al informe.

**Evidencia funcional disponible:** [QA efectivo en develop](qa-develop-enfermeria-2026-09-21.md), [QA aislado adicional](qa-manual-enfermeria-2026-09-21.md), [guía de accesos](enfermeria-acceso-y-qa.md), [comparación de cuatro formatos](comparacion-formatos-enfermeria-2026-09-21.md). Los conteos de documentos anteriores son de su fecha; no son conteos actuales certificados.

## 1. Mapa de módulos, flujos y datos

| Área | Flujo/estructura actual | Relación y límite importante |
| --- | --- | --- |
| Identidad y expediente | Listado/búsqueda → alta/edición → ficha de `Patient`; estados `lead`, `registered`, `evaluation`, `active`, `inactive`, `archived` | La tabla mezcla identificación y etapa; estado de paciente no es estado de cita ni de tratamiento. Default `lead`; alta manual todavía existe. |
| Agenda | `Appointment` enlaza un paciente y un usuario médico, inicio/fin, estado y posible evento Google | No tiene FK a una consulta o intervención concreta. Completar una cita no demuestra por sí solo una consulta documentada. |
| Historia y consulta | `ClinicalHistory` y subtablas de antecedentes/exploración; `MedicalConsultation` con médico, fecha, diagnóstico, grados y estrategia | Un paciente puede tener varias historias y consultas. Ambos guardan diagnóstico; no hay una referencia explícita desde una aplicación al plan/indicación vigente. |
| Cirugía | `ProcedureReport` por día; `sessionGroupId`/`sessionDay` agrupan dos reportes; médicos y enfermeros en tablas puente; quirófano/zonas | Una intervención puede tener dos reportes. Participante ≠ capturista/editor. No existe tabla de placas. Hay total manual y conteos CB separados. |
| Tratamientos | `Treatment` con fecha, sesión, responsable; `TreatmentOnType` y `TreatmentZone` permiten varios tipos/zonas | Área general y área restringida usan la misma tabla unificada. Coexisten `Hairmedicine` y `Micropigmentation` antiguos con APIs propias. No sumar sus filas como si fueran atenciones adicionales. |
| Recetas | `Prescription` por paciente/médico, con `PrescriptionItem`; vínculo opcional a producto, dosis y datos de dispensación | Prescribir no equivale a aplicar ni a dispensar/vender. El servicio revisado no conecta automáticamente la receta con movimientos de stock. |
| Inventario | `Product`/categoría → `StockMovement` → `StockBalance`; cantidades enteras | Movimiento y saldo se escriben juntos, pero ajustes y validación de saldo necesitan revisión. La referencia a otra entidad es tipo+ID, no FK clínica. |
| Reportes | Pacientes, procedimientos, citas, recetas, stock, orígenes y datos clínicos; fechas como filtros | Hay métricas globales y por periodo. Procedimientos tienen lógica específica de agrupación/primer día; no debe extrapolarse a todos los reportes. |
| Imágenes | `PatientImage` enlaza paciente y opcionalmente reporte; guarda clave/bucket y metadatos | Una fila no acredita archivo disponible. Galería/transporte incompletos según código y comparación previa; consentimientos actuales no son autorización de redes. |
| Personal y trazabilidad | `User` ↔ `UserRole` ↔ `Role`; también existen `Permission`/`RolePermission`; `AuditLog` | La autorización operativa revisada usa `@Roles` en código, no una matriz editable completa de permisos. Autoría clínica usa IDs; auditoría aporta actor y cambios. |
| Integraciones/seguimiento | Google OAuth/token por usuario, eventos de cita; `Reminder`, servicio de email y `IntegrationSyncLog` | Tener tabla de sincronización no acredita conector funcionando. No se encontró implementación Brevo/Kommo en las fuentes de aplicación revisadas. |

Fuente central: [esquema Prisma](../apps/api/prisma/schema.prisma), [enums](../packages/shared/src/enums.ts), módulos en `apps/api/src/modules` y rutas en `apps/web/src/app/dashboard`.

### Relaciones que conviene preservar

- `Patient` es el punto común de citas, historia, consultas, procedimientos, tratamientos, recetas, imágenes y recordatorios. No hace falta convertirlo en una tabla enorme para unir el recorrido de pantalla.
- Las relaciones múltiples de médicos, enfermería, tipos y zonas evitan limitar una atención a una sola persona/categoría. Preservarlas al simplificar la UI.
- `legacyId`, mapa de IDs, `origen/origenId`, texto original y rastro de fusiones ayudan a conciliar historia. No eliminarlos por parecer duplicados.
- Fusión de pacientes ya registra destino y los IDs movidos para reversión; incluye tratamientos y módulos antiguos. Hace falta validar casos, no empezar por reemplazar la herramienta. Fuente: [servicio de fusión](../apps/api/src/modules/patients/patient-merge.service.ts).

## 2. Qué sabemos de la herencia

| Evidencia | Valor conservado | Riesgo/pregunta, no conclusión automática |
| --- | --- | --- |
| Importador MySQL → Prisma con mapa de IDs y `Patient.legacyId` | Asociación histórica entre entidades | No certifica por sí solo integridad actual; conciliar muestras y relaciones con un corte definido. |
| [Migración de pacientes](../scripts/migration/src/steps/03-patients.ts) convierte edad a 1 de enero del año de migración menos edad y marca aproximación | No oculta que la fecha es estimada | ¿La edad original correspondía al registro o al momento de migrar? No corregir cumpleaños en bloque ni presentarlos como exactos. |
| Mismo importador traduce estados numéricos 0–3 a lead/registered/evaluation/active y normaliza teléfono | Hace utilizables estados/contactos antiguos | El significado operativo debe revisarse ante el nuevo flujo CRM; la normalización histórica no garantiza validación de altas actuales. |
| [Migración de usuarios](../scripts/migration/src/steps/02-users.ts): ID1 admin, resto doctor, por heurística documentada | Conserva usuarios y atribución | Explica una posible procedencia de clasificaciones amplias. No prueba que todos ejerzan medicina ni autoriza cambiarles el rol sin validación. |
| [Importación de tratamientos](../apps/api/prisma/import-treatments.ts) copia antiguos a `Treatment`, preserva texto y origen y omite pares ya importados | Trazabilidad y protección contra duplicados de origen | Nuevas escrituras/ediciones en APIs antiguas no se reflejan automáticamente. Volver a ejecutar tampoco actualiza lo ya importado. |
| Tablas antiguas no se borran | Permiten contraste y recuperación histórica | Acordar si serán sólo lectura y cuál es la fuente única de captura; verificar consumidores antes de retirar APIs. |

No se revisó nuevamente la base MySQL ni se ejecutó conciliación total. El checklist del 11/09 documentaba 2,597 tratamientos importados en develop y 16 sin clasificación: son evidencia histórica para contrastar, no una nueva medición ni permiso para clasificarlos automáticamente.

## 3. Hallazgos priorizados

Prioridad **A** = acordar o comprobar antes de extender esa área; **B** = siguiente etapa correspondiente. “Confirmado en código” demuestra el comportamiento de la implementación, no un incidente ocurrido en la clínica.

### A. Integridad, seguridad y definiciones de trabajo

1. **Google OAuth: control de asociación de cuenta insuficiente — defecto de seguridad confirmado en código.** [Controlador](../apps/api/src/modules/google-calendar/google-calendar.controller.ts): usa el ID de usuario como `state`; callback público lo acepta y el servicio guarda tokens para ese ID, sin validar allí un estado aleatorio ligado a la sesión. Impacto potencial: asociación de calendario a usuario incorrecto. **Siguiente:** revisión acotada del flujo y prueba con dobles locales, seguida de propuesta de estado verificable/expirable; no se probó explotación ni se conectó ninguna cuenta externa.

2. **Una sola fuente de tratamientos — discrepancia estructural confirmada, integridad actual por comprobar.** APIs antiguas permiten crear/editar; el nuevo espacio sólo lee `Treatment`; importador salta pares existentes. Impacto: una edición del antiguo podría no verse en el nuevo o dos pantallas podrían representar la misma atención. **Siguiente:** localizar consumidores, conciliar muestras por `origen/origenId` y acordar captura única; no borrar tablas ni reimportar a ciegas. Evidencia: [hairmedicines](../apps/api/src/modules/hairmedicines/hairmedicines.controller.ts), [micropigmentations](../apps/api/src/modules/micropigmentations/micropigmentations.controller.ts), importador citado.

3. **Contacto CRM ≠ paciente — discrepancia entre modelo actual y flujo futuro confirmado por el usuario.** `Patient` tiene default `lead`, alta manual y no una relación de identidad externa dedicada. Futuro: seleccionar contacto Brevo/Kommo → crear/vincular expediente, sin importar todos los prospectos. Impacto: duplicados o métricas mezcladas si se añade integración sin definir identidad/estados. **Siguiente:** acordar cuándo nace el expediente, mínimos de datos, coincidencias ambiguas y coexistencia entre ambos CRM. No elegir un CRM ni implementar conexión en este diagnóstico.

4. **Indicación, aplicación y alergias — pregunta clínica abierta con evidencia de campos dispersos.** Diagnóstico en historia y consulta; tratamiento aplicado no referencia una indicación; alergias booleanas no distinguen adecuadamente desconocido de revisado negativo. Impacto: enfermería podría no contar con contexto inequívoco. **Siguiente:** señalar fuente médica autorizada, vigencia y lectura mínima requerida; no exponer expediente completo como solución. Fuente: esquema y [comparación de formularios](comparacion-formatos-enfermeria-2026-09-21.md).

5. **Placas y resumen quirúrgico — discrepancia de requisitos, no fallo de permisos.** No hay placas estructuradas; total manual puede diferir de suma CB, mientras cabellos/promedio derivan de CB. Faltan campos del papel para tiempos, medicación y constantes seriadas. Impacto: doble captura o totales de distinta procedencia. **Siguiente:** confirmar unidades/columnas, fuente del total y versión vigente del formulario; preservar modo histórico sin inventar desglose. No cambiar dosis, fármacos ni fórmulas.

6. **Inventario: cálculo y controles — defectos de código y regla abierta.** [Servicio](../apps/api/src/modules/inventory/inventory.service.ts): todo tipo distinto de entrada resta; para saldo inexistente recorta a cero, mientras con saldo existente puede quedar negativo. `getLowStock` filtra sólo <=0 y no aplica luego `minStockAlert`. [DTO](../apps/api/src/modules/inventory/dto/create-stock-movement.dto.ts) acepta tipos como texto libre. Impacto: movimientos/saldo o alertas no reflejan lo esperado; “ajuste” no tiene semántica explícita. **Siguiente:** prueba aislada de entradas/salidas/ajustes y umbral; decidir si ajuste significa saldo final o delta y si se permite negativo antes de corregir. No se alteró stock real.

7. **Permisos heredados y permisos amplios — discrepancia/pregunta de política, no sólo cuenta compartida.** El QA mostró la cuenta compartida de enfermería en médicos; migrador asignó doctor por heurística. [ReportsController](../apps/api/src/modules/reports/reports.controller.ts) permite `inventory_manager` en todos sus reportes, incluso clínicos; [TreatmentsController](../apps/api/src/modules/treatments/treatments.controller.ts) permite captura/edición a recepción. No se ha acordado aquí si esas amplitudes son intencionales. Impacto: visibilidad y responsabilidad distintas de las asumidas por la UI. **Siguiente:** matriz por tarea/dato para todas las funciones, y validación de personas reales con la clínica. No modificar roles reales ni inferir profesión del nombre. Nurse/Tratamientos restringidos ya fueron probados.

### B. Exactitud de operación y experiencia

8. **Reportes: último día y contexto de cifras — defecto de límite temporal + mejora de claridad.** [Servicio](../apps/api/src/modules/reports/reports.service.ts): `new Date(endDate)` + `lte` corta los timestamps a medianoche de ese límite; mezcla total global/tipos globales con serie de seis meses y altas filtradas. Impacto: el usuario puede interpretar cifras como si compartieran periodo. **Siguiente:** tabla de definición de cada indicador y pruebas de fin de día/zona horaria. Distinguir fechas de calendario de timestamps; conservar la regla quirúrgica del primer día.

9. **Email puede figurar enviado sin transporte — defecto confirmado en código; automatización incompleta.** [Notificaciones](../apps/api/src/modules/notifications/notifications.service.ts) retorna éxito sin SMTP y el procesador marca `sent`; no se encontró invocación/scheduler en las fuentes revisadas. Impacto: falsa confianza en seguimiento si se activa ese flujo. **Siguiente:** estados de envío, transporte y ejecución acotada con destinatarios de prueba, nunca procesar pendientes globales. No afirmar que Brevo de la clínica está conectado al sistema porque exista email genérico.

10. **Agenda/Google: propiedad, errores y horarios — riesgos de implementación y preguntas operativas.** Citas guardan `doctorId` pero sincronizan usando al usuario que ejecuta la acción; edición/borrado también usan al actor actual. Evento usa zona `America/Mexico_City`; errores pueden devolver null/false sin revertir la cita local. DTO valida fechas por separado; servicio no compara inicio/fin ni detecta traslapes. Impacto potencial: calendario diferente, cambios externos no reflejados o citas inconsistentes. **Siguiente:** decidir calendario propietario, zona de clínica, reglas de conflicto y política ante fallo. No concluye que haya citas mal guardadas ni autoriza eventos externos. Fuentes: [citas](../apps/api/src/modules/appointments/appointments.service.ts), [DTO](../apps/api/src/modules/appointments/dto/create-appointment.dto.ts), [Google](../apps/api/src/modules/google-calendar/google-calendar.service.ts).

11. **Imágenes y consentimiento — discrepancia funcional confirmada.** [Servicio de imágenes](../apps/api/src/modules/images/images.service.ts) administra metadatos y deja TODO del borrado de objeto; galería anuncia disponibilidad futura. Consentimiento de datos/marketing no equivale a fotografías para redes. Impacto: no basta conservar filas ni enlazar archivos para completar el uso clínico/autorización. **Siguiente:** acordar captura, permisos, conservación y consentimiento específico; muestreo de archivos históricos sin publicar ni copiar masivamente.

12. **Señales de UI que pueden inducir a error — defecto de etiqueta y mejoras de usabilidad.** [Listado](../apps/web/src/app/dashboard/patients/page.tsx) presenta `updatedAt` como “Última visita” y muestra Exportar sin acción enlazada. Fechas estimadas necesitan indicación consistente; formularios largos y capturas repetidas entre áreas merecen una revisión por tarea. Impacto: interpretar una edición como visita o buscar acciones inexistentes. **Siguiente:** corregir etiquetas/estados pequeños después de acordar el recorrido principal; probar una pantalla representativa antes de rediseñar todo.

## 4. Preguntas que más reducen incertidumbre

1. ¿Qué evento concreto habilita abrir expediente desde un contacto CRM y quién lo confirma? ¿Qué ocurre si ya existe o no tiene teléfono/correo?
2. ¿Qué significa hoy cada estado de paciente para el equipo y cuáles necesitan dentro de Capillaris, sin duplicar etapas comerciales?
3. ¿Qué valoración/indicación es vigente, quién la valida y qué debe ver Tratamientos sobre alergias y autorización de aplicar?
4. ¿Qué cuenta cada columna de placas, cómo deriva el total y cómo se corrige historia sin placas?
5. ¿Quién usa cada módulo realmente, qué puede corregir y qué no debe ver? Incluye recepción, inventario, médicos, cirugía y Tratamientos.

R/color/áreas de MICRO, consentimiento de redes, medicamentos/tiempos, reglas de stock y calendario se tratan al llegar a su etapa. No hace falta resolver todas las preguntas para empezar.

## 5. Secuencia propuesta de revisión, no autorizaciones de implementación

| Etapa | Objetivo de diseño/función/datos | Salida pequeña y verificable |
| --- | --- | --- |
| 1. Entrada y recorrido del paciente | Persona vs prospecto/paciente; búsqueda, identificación, duplicados, estados y agenda | Mapa acordado de un recorrido y matriz mínima de datos/roles. Sin integrar CRM aún. |
| 2. Valoración → atención | Historia/consulta/indicación, cirugía por día, placas y aplicaciones | Un formulario clínico aprobado a la vez, correspondencia campo→fuente→responsable y ejemplos ficticios. Reutilizar QA de accesos terminado. |
| 3. Datos y fuentes vigentes | Conciliación por muestras, edad aproximada, tratamientos antiguos/unificados, fusiones | Lista de excepciones y plan reversible; no correcciones masivas sin aceptación. Esta revisión acompaña etapas 1–2 si condiciona decisiones. |
| 4. Operación y cifras | Inventario/dispensación, indicadores, fechas, filtros, exportaciones | Definiciones y casos de conciliación antes de cambiar cálculos. |
| 5. Archivos y conexiones | Fotos/consentimiento, Google, recordatorios y diseño de Brevo/Kommo | Alcances y pruebas aisladas por integración. El control OAuth señalado debe revisarse antes de cualquier nueva conexión. |

En cada etapa: escoger pocas tareas, revisar el recorrido con el usuario, implementar sólo lo autorizado y devolver QA. Seguridad e integridad se atienden antes de habilitar la función afectada, aunque pertenezca a una etapa posterior. La decisión de publicar permanece separada y actualmente prohibida.

**Fin de esta subtarea:** sólo diagnóstico y registro de dirección. No se emprendió rediseño, refactorización, cambios de base ni una nueva auditoría integral.
