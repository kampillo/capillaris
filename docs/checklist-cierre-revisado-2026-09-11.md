# Checklist revisado de cierre y continuidad de Capillaris

Corte: 11 de septiembre de 2026. Revisión del código local, documentos originales, pruebas automatizadas y consultas de lectura a Neon develop. No certifica el estado de producción, aceptación del cliente, pagos ni servicios externos.

## Conclusión

El sistema tiene una base clínica implementada, pero todavía hay entregables del MVP sin terminar: WhatsApp y recompra automática, sincronización Brevo, galería y transporte de imágenes, filtros completos y exportaciones. No conviene declarar cerrado el alcance inicial ni consumir horas de soporte para completar esos faltantes sin un acuerdo explícito.

Las observaciones del cliente sí fueron trabajadas anteriormente. No hay que rehacerlas: el pendiente más claro es permitir a las cuentas individuales de enfermería registrar tratamientos PRP, DUT, BET, etc. El módulo nuevo habilita procedimientos, no tratamientos. La importación histórica de tratamientos ya está realizada en develop; quedan 16 registros sin clasificar.

Estados utilizados: **Verificado local** significa evidencia técnica o consulta de develop; **Implementado** significa localizado en código, sin aceptación integral; **Pendiente** significa función o corrección identificada; **Validación** significa que falta evidencia o decisión, no necesariamente desarrollo. Ningún estado implica publicación o aprobación comercial.

## Cambios respecto del checklist PDF del 10 de septiembre

| Referencia anterior | Estado revisado | Acción que realmente queda |
| --- | --- | --- |
| OB01 Enfermería | Parcial | Procedimientos, asignaciones y participación listos localmente. Falta tratamiento clínico con rol nurse y habilitar cuentas reales. |
| OB02 y RE06 Conteo por intervención | Verificado local | No reimplementar. Conservar pruebas, publicar con autorización y validar con cliente. |
| OB03 Mes de atribución | Resuelto por el usuario | Se usa el mes del primer día, incluyendo ambos días y sus folículos. |
| OB04 Máximo dos días consecutivos | Regla implementada y probada | Falta revisar históricos fuera de la regla y la presentación de errores negativos en pantalla. No corregir históricos automáticamente. |
| OB05 Duplicados señalados | Validación de clínica | Confirmar expediente correcto, decisión y evidencia de fusión si ya se realizó. No borrar solo por coincidencia de nombre. |
| OB06 Importación de tratamientos | Verificada en develop | 2,597 tratamientos; cero orígenes pendientes. No repetir la importación como tarea abierta. Conciliar contenido y producción por separado. |
| OB07 Tipos históricos sin equivalencia | Pendiente | Revisar y clasificar 16 tratamientos sin tipo; conservar texto original. |
| OB08 Demostración al cliente | Validación | Hacer una sesión de aceptación de los puntos ya implementados. |
| PU03 Migraciones | Actualizar criterio | El conteo no añadió tablas, pero enfermería sí: migración `20260911070000_nursing_access`, ya aplicada en develop. Publicación requiere verificarla en el destino autorizado. |
| LO01 a LO07 Mejoras locales | Mantener como trabajo local | No equivalen a entrega en producción. Se agregan enfermería y conteo mensual probado. |

El PDF anterior se conserva como corte histórico; este documento es la revisión actual, no una reexportación del PDF.

## Observaciones originales revisadas una por una

| Número del documento | Situación encontrada | Para cerrar |
| --- | --- | --- |
| 1 Título Dr. en todos los usuarios | Implementado: `displayName` solo añade Dr. cuando consta rol médico. No hay distinción automática Dr./Dra.; el documento permite retirar el título. | Validar las pantallas y revisar la cuenta compartida que aún tiene rol doctor. No inferir títulos por el nombre. |
| 2 Duplicados y eliminación por administración | Implementado: eliminación de pacientes restringida a admin; herramientas de fusión y reversión existentes. | Clínica confirma los tres casos citados y cuál información conservar. La existencia de la herramienta no prueba que los casos estén resueltos. |
| 3 Horas e informe del procedimiento | Implementado: inicio, comida, implantación, fin, datos técnicos y anestesia. | Aceptación de un reporte completo con el equipo clínico. |
| 4 Fecha desplazada un día | Helpers de fechas de calendario y usos corregidos; pruebas previas del caso de dos días. | Regresión de fechas de registro, agenda, recetas y tratamientos. El problema de fin de rango en reportes sigue separado y abierto. |
| 5 Enfermería registra PRP DUT BET | **Pendiente con el rol nuevo**: TreatmentsController permite admin/doctor/receptionist; no permite nurse. El formulario selecciona responsables desde useDoctors. | Extender el espacio restringido a tratamientos del paciente asignado, separar responsable de capturista y comprobar revocación. No basta con añadir nurse a un endpoint global sin filtrar pacientes. |
| 6 Un procedimiento de dos días y total de folículos | Verificado local: un grupo, dos reportes, folículos sumados y atribución al primer mes. | Validación clínica y publicación autorizada. |
| 7 Total de pelos y coeficiente | Implementado en tarjetas/formulario original: CB1 + 2×CB2 + 3×CB3 + 4×CB4; coeficiente sobre suma CB. | Validar con datos conocidos y el caso de total manual diferente de suma CB. Mostrar también estos resultados en el espacio nuevo de enfermería, que hoy muestra folículos pero no esos dos cálculos. |
| 8 Diagnóstico y Hamilton Norwood | Implementado: diagnóstico separado de grado Norwood/Ludwig. | Validar etiquetas y contenido histórico, sin reclasificar clínicamente de forma automática. |
| 9 Registro de tratamientos | Implementado: módulo, catálogo e importación. La interfaz actual permite crear/listar/eliminar; el API permite editar, pero no se encontró acción de edición en esa página. | Clasificar los 16 registros sin tipo; validar catálogo y decidir/habilitar edición en UI. La captura por enfermería permanece en el punto 5. |
| 10 Zonas donantes y receptoras | Implementado: la consulta etiqueta Zonas receptoras y separa valoración de donante. | Validación clínica de etiquetas, mapa y correspondencia de catálogos. |

## Pendientes de desarrollo para cerrar el alcance

### A Correcciones y observaciones residuales

- [ ] **A01 Enfermería y tratamientos**: crear/editar solo para pacientes asignados, elegir responsable real, registrar autoría y negar agenda, inventario y reportes. No ampliar acceso a expedientes completos.
- [ ] **A02 Paridad de datos del procedimiento**: añadir total de pelos y coeficiente visibles en el espacio nuevo de enfermería y probar coherencia con las tarjetas originales.
- [ ] **A03 Clasificación histórica**: presentar los 16 tratamientos sin tipo a la clínica, aprobar equivalencias y aplicar únicamente los cambios acordados.
- [ ] **A04 Protección de tratamientos**: confirmar antes de eliminar y acordar recuperación/trazabilidad. Hoy el botón llama directamente a la eliminación física.
- [ ] **A05 Errores visibles**: diferenciar fallo de carga y lista vacía en tratamientos; hoy la página solo utiliza data/isLoading y puede mostrar una lista vacía ante error.
- [ ] **A06 Edición de tratamientos**: habilitar la edición en interfaz usando el API existente y probar catálogos/relaciones; confirmar alcance con clínica si se adopta una política de registros inmutables.
- [ ] **A07 Última visita**: renombrar a Última actualización o calcular visita clínica real; hoy la columna muestra `updatedAt`.
- [ ] **A08 Pruebas de cierre clínico**: casos positivos/negativos de fechas, CB, agrupación, fusión/reversión y matriz completa de roles. Las 26 pruebas actuales no cubren todo el sistema.

### B WhatsApp y recordatorios automáticos

Incluido en fase 1 de la propuesta; el resumen de recordatorios internos o emails no sustituye WhatsApp.

- [ ] **B01 Accesos y configuración**: clínica confirma cuenta, número emisor, responsables y destinatarios de prueba autorizados.
- [ ] **B02 Envío real**: integrar transporte WhatsApp y plantillas necesarias; registrar respuesta del proveedor sin confundir aceptación con entrega.
- [ ] **B03 Programación**: crear recordatorios de cita a 24 horas y recompra vinculada a receta/producto. Acordar la regla exacta de recompra.
- [ ] **B04 Ejecución automática**: programar procesamiento de pendientes; no se encontró scheduler ni llamada a `processReminders` en la aplicación revisada.
- [ ] **B05 Cambios de cita**: actualizar/cancelar recordatorios al reprogramar o cancelar.
- [ ] **B06 Seguridad operacional**: reintentos acotados, idempotencia, errores visibles, manejo de teléfono inválido y consentimiento/canal acordado.
- [ ] **B07 Corregir falso enviado**: `sendEmail` devuelve éxito cuando falta SMTP y `processReminders` marca sent después de la llamada. Ningún mensaje sin transporte real debe figurar como enviado externamente.
- [ ] **B08 Aceptación**: probar envío, fallo, reintento, cambio/cancelación y ausencia de duplicados con destinatarios autorizados; nunca ejecutar procesamiento global para probar.

### C Brevo

- [ ] **C01 Preparación**: confirmar cuenta, listas, atributos, segmentos, responsable y alcance de consentimientos.
- [ ] **C02 Sincronización real**: conectar altas y actualizaciones de pacientes; no se encontró implementación Brevo en `apps/api/src`.
- [ ] **C03 Calidad y errores**: tratar correos ausentes/inválidos/cambiados, duplicados, reintentos y trazabilidad; mostrar fallos sin bloquear la captura clínica.
- [ ] **C04 Aceptación**: demostrar alta y actualización con contactos ficticios autorizados y verificar la política de exclusión de datos clínicos.

### D Imágenes clínicas

- [ ] **D01 Galería**: sustituir la pantalla que anuncia disponibilidad futura por consulta real por paciente.
- [ ] **D02 Archivos**: implementar carga y lectura segura del objeto. El API encontrado registra metadatos; no se encontró transporte S3/R2 ni URLs firmadas en `apps/api/src`.
- [ ] **D03 Históricos**: comprobar existencia, integridad y asociación de los 1,074 registros de imagen. Una fila en base no prueba que el archivo sea accesible o haya sido copiado.
- [ ] **D04 Migración de archivos**: copiar/verificar solo si hace falta, sin retirar el origen antes de conciliación y aprobación. Confirmar almacenamiento destino acordado.
- [ ] **D05 Experiencia y permisos**: categorías, antes/después, archivos válidos, acceso autorizado y denegado; definir eliminación coherente de metadato/archivo, actualmente hay TODO de borrado en almacenamiento.

### E Reportes y exportaciones

- [ ] **E01 Filtros**: agregar ciudad, edad, tipo de paciente y origen con el alcance acordado. Los endpoints de reportes revisados reciben solo startDate/endDate; un gráfico por origen no equivale a un filtro por origen.
- [ ] **E02 Fin de rango**: corregir límites de timestamps y zona horaria. `new Date(endDate)` con `lte` corta a medianoche UTC y excluye registros posteriores del último día. No confundir con `procedureDate`, que es una fecha de calendario.
- [ ] **E03 Consistencia**: alinear o etiquetar claramente métricas globales frente al periodo seleccionado; por ejemplo, byType y totalPatients son globales y monthlySeries usa los últimos seis meses.
- [ ] **E04 Exportación**: implementar Excel y PDF con los mismos filtros, permisos y totales de pantalla, según la semana 8 de la propuesta.
- [ ] **E05 Exportar pacientes**: conectar el botón sin acción del listado o retirarlo temporalmente; quitar el botón no satisface las exportaciones comprometidas.
- [ ] **E06 Conciliación**: validar pantalla/archivo/base y comparativos, incluyendo cruce de mes y enfermería. El conteo de procedimientos de dos días ya está resuelto; no repetir su desarrollo.

### F Calidad y migración de datos

- [ ] **F01 Fechas aproximadas**: contrastar el script que usa año de migración menos edad con la propuesta, que usa año de registro menos edad. No corregir en bloque sin comprobar qué fecha representaba la edad del origen.
- [ ] **F02 Transparencia de edad**: mostrar aproximación en expediente y formulario; permitir confirmar fecha exacta y retirar la marca. El espacio de enfermería sí indica aproximación, pero el expediente/formulario principal revisados no lo hacen.
- [ ] **F03 Altas nuevas**: acordar y aplicar obligatoriedad de nacimiento o excepción explícita para leads; la propuesta lo pide obligatorio, mientras el esquema del formulario y DTO son opcionales.
- [ ] **F04 Teléfonos**: normalizar y validar al crear/editar, no solo al migrar; resolver candidatos sin normalización, sin inventar números faltantes.
- [ ] **F05 Conciliación completa**: comprobar pacientes, historias y relaciones, consultas, procedimientos, recetas, tratamientos e imágenes entre origen/destino del corte acordado. La importación de tratamientos en develop no demuestra igualdad de todos los datos de producción.
- [ ] **F06 Diferencias históricas**: explicar los -13 registros por subtabla y cambios de catálogos del informe de migración de marzo antes de usar su “ALL CHECKS PASSED” como evidencia de entrega. Esas diferencias no prueban por sí solas pérdida de datos.
- [ ] **F07 Registros sintéticos**: revisar que producción no tenga cuentas, pacientes, catálogos o reportes de pruebas; los datos QA conservados en develop están documentados.
- [ ] **F08 Duplicados concretos**: obtener confirmación de la clínica y verificar la evidencia de los tres casos del documento. No fusionar ni borrar automáticamente durante esta revisión.

## Validaciones y decisiones que no deben confundirse con funciones faltantes

- [ ] **V01 Cuentas de enfermería**: nombres del personal, cuentas individuales, pacientes asignados y retiro programado de la cuenta compartida. No se crearon cuentas reales en esta revisión.
- [ ] **V02 Google Calendar**: la integración está en código. Probar con una cuenta autorizada alta, edición, cancelación/eliminación, expiración de acceso, fallos y edición de una cita por otro usuario. No generar eventos externos sin autorización.
- [ ] **V03 Prescripciones**: existe enlace de items a productos. Probar flujo de receta y catálogo; la automatización de recompra falta. No asumir que emitir receta debe descontar inventario sin definir cuándo ocurre una venta/dispensación.
- [ ] **V04 Aceptación clínica**: demostrar las diez observaciones con la clínica y registrar conformidad, pendientes excepcionales y responsables.
- [ ] **V05 Roles configurables**: confirmar si se comprometió asignar roles predeterminados o editar permisos libremente. Actualmente Usuarios asigna roles, Roles solo los lista y permisos operativos se expresan en código. Un editor completo de permisos no está demostrado.
- [ ] **V06 Auditoría de consultas**: existe auditoría de modificaciones y autenticación. Aclarar si también se necesita registro de lectura de expedientes para atender la referencia a “quién accedió” de la propuesta; no confundirlo con auditoría de escrituras.
- [ ] **V07 Nomisor y bandeja WhatsApp**: aclarar las menciones del resumen frente a fase 2 opcional. No incorporarlos como pendientes firmes ni descartarlos sin acuerdo. WooCommerce y portal de pacientes figuran como opcionales.

## Publicación y entrega

- [ ] **P01 Versión**: revisar el trabajo local sin commit, separar archivos temporales y pruebas de los entregables, autorizar la versión y después versionarla/publicarla.
- [ ] **P02 Respaldo y reversión**: confirmar acceso de clínica a respaldos y probar restauración; documentar procedimiento de retorno seguro.
- [ ] **P03 Entorno y migraciones**: verificar destino autorizado y aplicar migraciones pendientes antes del código correspondiente; la de enfermería ya existe en develop, no se aplicó en producción en este trabajo.
- [ ] **P04 Operación**: monitoreo, alertas, responsables, accesos de aplicación/base/dominio/almacenamiento y servicios externos.
- [ ] **P05 Regresión posterior a publicación**: login, roles, expediente, agenda, procedimientos, tratamientos, recetas, imágenes e integraciones. No asumir resultados de develop en producción.
- [ ] **P06 Documentación**: actualizar el progreso antiguo, que declara backend 100% pero no refleja los faltantes comprobados; preparar manual de usuario y guía operativa completa. Ya existe guía específica de enfermería.
- [ ] **P07 Capacitación y aceptación**: sesión con el equipo, dudas resueltas, acta de entrega y pendientes excepcionales con fecha y responsable acordados.

## Continuidad de soporte y desarrollo

Primero separar la lista de entrega inicial de la lista evolutiva. La propuesta enumera WhatsApp, Brevo, filtros/exportaciones, imágenes, pruebas, documentación y capacitación en el alcance inicial; no deben reclasificarse silenciosamente como nuevas horas de soporte.

- [ ] **S01 Acuerdo**: seleccionar plan, fecha de inicio, responsables y canales. No se ha verificado contratación/pago.
- [ ] **S02 Niveles de atención**: acordar horarios, severidades, tiempo de respuesta frente a resolución, escalamiento y emergencias.
- [ ] **S03 Bolsa de desarrollo**: registrar solicitudes, estimación, autorización, horas usadas y excedentes; definir acumulación o expiración de horas y la distinción entre bug y mejora.
- [ ] **S04 Rutina**: respaldos, comprobación de restauración, seguridad, monitoreo e integraciones; asignar responsabilidades.
- [ ] **S05 Costos**: confirmar cargos reales y quién paga infraestructura/proveedores. No usar el estimado de febrero como precio actual ni reproducir sus tarifas históricas de WhatsApp como vigentes.
- [ ] **S06 Mejoras candidatas**: búsqueda con espera breve, conservar filtros/página al volver, teclado/foco y accesibilidad, simplificar componentes grandes, ajustes visuales puntuales. No hay evidencia de que un rediseño completo sea necesario para cerrar.

Referencia documental, no contratación confirmada: plan A $8,000 MXN/mes, 2 horas de desarrollo, respuesta 24–48 horas hábiles; plan B $12,000 MXN/mes, 5 horas de desarrollo, respuesta 4–8 horas hábiles, reunión mensual y capacitación continua. Condiciones adicionales requieren acuerdo.

## Evidencia de lectura de develop

| Comprobación | Resultado | Interpretación |
| --- | --- | --- |
| Micropigmentaciones de origen interno | 270 | Todas tienen correspondencia por origen/origenId en tratamientos. |
| Hairmedicines de origen interno | 2,327 | Todas tienen correspondencia por origen/origenId en tratamientos. |
| Tratamientos importados | 2,597 | 270 + 2,327. Cero orígenes pendientes de importar. |
| Tratamientos sin tipo | 16 | Pendiente de clasificación; no implica falta de registro. |
| Pacientes no eliminados con fecha aproximada | 4,584 | Requiere política de confirmación gradual; no todos representan un error verificable. |
| Pacientes no eliminados sin nacimiento | 95 | Incluye datos de prueba; no inventar fechas para cerrar el conteo. |
| Pacientes no eliminados con celular no nulo y normalizado nulo | 177 | Candidatos a revisión; puede haber vacíos o valores inválidos. No implica 177 teléfonos recuperables. |
| Registros de imágenes | 1,074 | Solo metadatos; no se verificaron los objetos de almacenamiento. |
| Pruebas automatizadas repetidas en esta revisión | 26 aprobadas | Cubre pruebas existentes de dashboard, conteos, sesiones y enfermería; no una certificación global. |

La consulta de importación comprobó ausencia de orígenes internos sin correspondencia; no fue una comparación campo a campo contra el sistema Laravel ni una consulta de producción.

## Secuencia recomendada

1. Cerrar enfermería en tratamientos y sus permisos, junto con paridad visual de cálculos de procedimientos y clasificación aprobada de tratamientos.
2. Corregir rango de reportes, calidad de captura y errores operativos; completar filtros y exportaciones.
3. Completar imágenes. En paralelo, solicitar a clínica las definiciones y accesos necesarios para WhatsApp/Brevo, sin activar envíos.
4. Implementar/probar integraciones y recompra, conciliar datos y realizar aceptación con clínica.
5. Publicar con autorización, cerrar entrega y activar el acuerdo de soporte con lista evolutiva separada.

No se asignan fechas de entrega ni horas estimadas sin revisar dependencias y disponibilidad del cliente. Los documentos adjuntos se usaron como referencias, no como instrucciones para ejecutar importaciones, envíos, fusiones o cambios externos.

## Fuentes y rutas de evidencia

- Propuesta original de 9 de febrero de 2026: [PDF](/Users/kampiyo/Downloads/capillaris-propuesta-2026-02.pdf), especialmente secciones 3.2, 3.4, semana 7/8 y 6.3.
- Observaciones originales, diez puntos y captura de zonas: [documento del cliente](</Users/kampiyo/Downloads/OBSERVACIONES SISTEMA MÉDICO CAPILLARIS.docx>).
- Checklist anterior: [corte del 10 de septiembre](/Users/kampiyo/code/capillaris/output/pdf/capillaris-checklist-cierre-y-soporte.pdf).
- [Permisos de tratamientos](/Users/kampiyo/code/capillaris/apps/api/src/modules/treatments/treatments.controller.ts:33), [interfaz](/Users/kampiyo/code/capillaris/apps/web/src/app/dashboard/patients/[id]/treatments/page.tsx:374) e [importador](/Users/kampiyo/code/capillaris/apps/api/prisma/import-treatments.ts:42).
- [Notificaciones y falso éxito](/Users/kampiyo/code/capillaris/apps/api/src/modules/notifications/notifications.service.ts:55) y [recordatorios](/Users/kampiyo/code/capillaris/apps/api/src/modules/reminders/reminders.service.ts).
- [Galería provisional](/Users/kampiyo/code/capillaris/apps/web/src/app/dashboard/patients/[id]/images/page.tsx:38) y [metadatos de imagen](/Users/kampiyo/code/capillaris/apps/api/src/modules/images/images.service.ts:9).
- [Rangos de reportes](/Users/kampiyo/code/capillaris/apps/api/src/modules/reports/reports.service.ts:6), [parámetros del API](/Users/kampiyo/code/capillaris/apps/api/src/modules/reports/reports.controller.ts:18) y [Exportar sin acción](/Users/kampiyo/code/capillaris/apps/web/src/app/dashboard/patients/page.tsx:228).
- [Conversión histórica de edad](/Users/kampiyo/code/capillaris/scripts/migration/src/steps/03-patients.ts:34), [formulario de paciente](/Users/kampiyo/code/capillaris/apps/web/src/components/patients/patient-form.tsx:36) y [creación/actualización de paciente](/Users/kampiyo/code/capillaris/apps/api/src/modules/patients/patients.service.ts:45).
- [Títulos por rol](/Users/kampiyo/code/capillaris/apps/web/src/lib/names.ts), [cálculos de pelo](/Users/kampiyo/code/capillaris/apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx:435), [zonas](/Users/kampiyo/code/capillaris/apps/web/src/components/clinic/scalp-zones.ts) y [graduación](/Users/kampiyo/code/capillaris/apps/web/src/app/dashboard/patients/[id]/consultations/page.tsx:337).
- [Prueba anterior de dos días](/Users/kampiyo/code/capillaris/docs/qa-procedimientos-dos-dias.md) y [guía y pruebas de enfermería](/Users/kampiyo/code/capillaris/docs/enfermeria-acceso-y-qa.md).
- [Informe histórico de migración](/Users/kampiyo/code/capillaris/scripts/migration/MIGRATION-REPORT.md:5), [progreso desactualizado](/Users/kampiyo/code/capillaris/PROGRESS.md:3) y [auditoría de escrituras](/Users/kampiyo/code/capillaris/apps/api/src/prisma/prisma.service.ts).

Se utilizaron las guías PDF y documentos para leer/revisar las fuentes, React/Next.js para contrastar interfaz y funcionamiento, y variables de entorno para limitar la consulta a develop. Esta entrega solo añade el informe; no modifica código funcional, cuentas ni datos clínicos.
