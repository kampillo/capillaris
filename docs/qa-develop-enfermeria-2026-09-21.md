# QA manual en el entorno habitual — 21 de septiembre de 2026

## Entorno y resultado

Se inició `npm run dev` directamente en `/Users/kampiyo/code/capillaris`, conservando su configuración habitual. Web en `http://127.0.0.1:3000/login`, API en 3001. Ambos siguen ejecutándose al cierre. Se detuvieron exclusivamente los servicios anteriores de QA en 3300/3301 y PostgreSQL temporal en 55439.

Destino comprobado con Neon CLI: proyecto Capillaris `holy-sea-52982481`, rama **develop** `br-green-dew-anwbw5sf`. El endpoint de la conexión de esa rama coincide con `apps/api/.env` (misma identidad, con pooler); es distinto del de `.env.production`. No se imprimieron cadenas de conexión con credenciales ni se modificaron archivos de entorno. La primera consulta no respondió correctamente; una nueva lectura confirmó conectividad y migraciones.

Había once migraciones aplicadas y faltaba únicamente `20260921090000_treatment_staff_role`. Se revisó y aplicó sólo esa migración en develop: inserta el rol Tratamientos, sin asignar ni cambiar cuentas. No hubo reset, seed masivo, importación, publicación, commit ni push.

**La cuenta autorizada del usuario sí ingresó desde el navegador.** Perfil efectivo **Administrador**, confirmado por la interfaz y por sus roles almacenados. No se cambió contraseña ni permisos. El rechazo anterior correspondía a la base ficticia, donde esa cuenta no existía.

## Recorridos efectivamente comprobados en develop

Se prepararon tres cuentas nuevas QA (enfermería, Tratamientos y médico ficticio para participación) y un paciente nuevo, sin contacto ni comunicaciones. Las capturas y ediciones se realizaron desde la interfaz, no mediante el script automatizado.

- Enfermería: login, búsqueda sin resultados, búsqueda por marcador QA, identificación mínima y ausencia de procedimientos; cancelar alta sin crear registro; fecha obligatoria; alta, edición y recarga desde Neon.
- Cirugía: dos reportes nuevos en días consecutivos; médico ficticio, capturista y enfermero participante identificados por separado. Sólo uno de los reportes recibió enfermería participante y el otro permaneció sin participantes. No se agruparon en esta ronda; la agrupación y reglas mensuales conservan la evidencia previa de la prueba aislada y pruebas automatizadas.
- Fecha quirúrgica: cambio mediante control nativo y persistencia confirmada tras recargar. Las capturas inmediatas posteriores al guardado podían mostrar la tarjeta anterior hasta terminar la actualización; se verificó siempre leyendo de nuevo. El llenado automatizado de fecha no se tomó como evidencia por sí solo.
- Tratamientos: login con rol exclusivo `treatment_staff`; paciente sin historial; cancelar sin crear registro; sesión cero bloqueada; alta sesión 4 con PRP, Dutasteride y Micropigmentación del catálogo de develop; médico ficticio como responsable distinto del capturista; edición de comentarios y segunda sesión 5; ambas persistidas tras recargar.
- Permisos de ambos perfiles: intentos por URL de expediente completo, agenda, inventario, reportes y administración de usuarios redirigen al área permitida; Tratamientos tampoco accede a enfermería. Las pantallas no ofrecen borrar ni agrupar.
- Salida de los perfiles de prueba. Lectura final de base confirmó dos reportes, dos aplicaciones (sesiones 4 y 5), autores correctos y ocho entradas de auditoría asociadas.

**Sin defectos bloqueantes nuevos observados en estos recorridos.** No se corrigió código en esta ronda.

## Diferencias y límites

- La cuenta histórica compartida de enfermería aparece en el catálogo de médicos de develop. Es un pendiente de configuración/roles existentes; no se reclasificó automáticamente a ninguna persona o cuenta real. Conviene resolverlo con el cliente antes de habilitar cuentas individuales definitivas.
- Se reutilizó la evidencia previa de pantalla estrecha, catálogos inactivos, errores simulados y validaciones adicionales: [QA aislado previo](qa-manual-enfermeria-2026-09-21.md). Esas pruebas **no se presentan como hechas contra Neon**. No se interrumpió Neon ni se desactivaron cuentas/catálogos reales.
- No se auditó contenido clínico histórico ni integridad de importación, carga, concurrencia o el resto de módulos. No se digitalizaron los campos pendientes de los formatos físicos ni se cambiaron fórmulas, medicamentos o CRM.

## Limpieza y disponibilidad

- Se eliminaron únicamente los dos reportes y dos aplicaciones creados para esta prueba. No tienen restauración desde la interfaz; se conservó la auditoría de sus capturas/ediciones.
- El paciente QA `c028047c-4014-49a3-a28a-8ea0cf8cc180` se eliminó lógicamente; las tres cuentas QA se desactivaron y eliminaron lógicamente. No se alteró el paciente ficticio de pruebas anteriores ni expedientes existentes.
- Identificadores de cuentas QA para trazabilidad: `f3e7fd8e-f93c-43df-b345-b7759a44e1bb`, `b05335fe-2db0-437f-9045-40ee446a025f`, `9de1c277-ac06-4edb-8624-a5eb985751d3`. Sin credenciales en este documento.
- El entorno habitual queda disponible en el puerto 3000; se solicitó abrirlo en el panel de la tarea de origen. La disponibilidad depende de que continúe el proceso local `npm run dev`.

Siguiente etapa sugerida, todavía no iniciada: pacientes y agenda. La activación de cuentas reales y cualquier publicación requieren un paso separado.
