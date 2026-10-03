# Enfermería: acceso individual y participación

**Dirección vigente:** commit local en `develop` autorizado el 3 de octubre; no publicar ni declarar aceptado el proyecto. Ver [restricciones y plan de trabajo](direccion-de-trabajo.md). Las pruebas de septiembre descritas abajo son históricas y no sustituyen la validación pendiente de roles de los cambios posteriores. Las menciones a publicación requieren autorización expresa futura.

## Estado vigente del desarrollo local — 21 de septiembre de 2026

Última comprobación: a petición del usuario se inició el checkout habitual contra Neon **develop**, se verificó el ingreso del administrador y se aplicó allí la migración del rol Tratamientos. Ver [QA sobre develop y limpieza](qa-develop-enfermeria-2026-09-21.md). Producción permanece sin cambios en este bloque; las menciones siguientes a «no aplicada en Neon» describen el cierre previo, antes de esta autorización.

Actualización posterior: se amplió el QA manual a petición del usuario. Ver [reporte manual y estado del entorno local](qa-manual-enfermeria-2026-09-21.md). En esa segunda revisión se reiniciaron los servicios aislados y quedaron disponibles en el puerto 3300; el cierre de servicios descrito más abajo corresponde a la primera verificación.

El bloque de acceso quirúrgico sin asignación y el área separada de Tratamientos están implementados y verificados localmente. **No se han publicado.** Esta sección reemplaza las reglas de asignación descritas en el registro histórico de abajo; no describe el estado actualmente desplegado.

- **Enfermería quirúrgica (`nurse`)**: búsqueda mínima por nombre/apellido de cualquier paciente no eliminado, sin asignación previa. Puede consultar, crear y editar reportes de procedimientos y seleccionar participantes por día. No puede crear pacientes, abrir el expediente completo, agenda, inventario, reportes, administración ni borrar o agrupar/separar procedimientos.
- **Tratamientos (`treatment_staff`)**: área independiente para buscar pacientes, consultar el historial unificado y crear/editar aplicaciones de medicina capilar y micropigmentación. Utiliza los campos clínicos existentes; no necesita rol médico. No puede acceder a cirugía ni a los módulos generales, prescribir, modificar diagnósticos o eliminar tratamientos.
- **Identidad y participación**: la cuenta autenticada determina quién capturó o editó; los médicos y enfermeros participantes se seleccionan expresamente por reporte diario. En Tratamientos, “Realizado por” se registra por separado de la autoría. No se infiere participación a partir del acceso o de la captura.
- **Histórico**: se mantienen las asignaciones antiguas como historial, pero dejan de otorgar acceso. Las selecciones históricas de personal o tipos inactivos permanecen al editar, sin permitir nuevas selecciones inactivas. No se reasignaron autores, cuentas ni registros reales.
- **Seguridad**: denegación por defecto en API y control de navegación. Las cuentas con roles mixtos que incluyan un rol restringido siguen restringidas; ambos roles restringidos juntos permiten las dos áreas, no administración. Cada petición verifica el estado actual de la cuenta. Las escrituras validan paciente, propiedad del registro y campos permitidos; no aceptan autores enviados por el navegador.
- **Reportes existentes**: se conserva participación única por intervención y atribución al mes del primer día. No se modificaron fórmulas de folículos, cabellos ni reportes.

### Migración y activación pendientes

La nueva migración `20260921090000_treatment_staff_role` añade únicamente el rol Tratamientos, de forma idempotente. Fue probada junto con las otras once migraciones en una base PostgreSQL vacía y temporal local. **No se aplicó a Neon ni producción.** No activa ni modifica cuentas existentes.

Para activar este bloque faltan aceptación del cliente, autorización de publicación y definición de qué personas tendrán cada rol individual. No mezclar roles restringidos con administración esperando obtener acceso completo. La migración debe preceder a la asignación del nuevo rol. La cuenta histórica compartida no se modificó.

### Evidencia de cierre

- 31/31 pruebas automatizadas aprobadas: `node --test scripts/tests/*.test.cjs`.
- Comprobación de tipos API y web aprobada, esta última con `--incremental false`.
- Instalación limpia, generación de Prisma y compilación completa API/web aprobadas en una copia temporal sin archivos de secretos. Node 24.18.0; Next.js 14.2.35. Avisos no bloqueantes de dependencias obsoletas y Browserslist; no se actualizaron dependencias en este bloque.
- Prueba real HTTP → Nest/JWT → Prisma → PostgreSQL → lectura y auditoría aprobada mediante `scripts/tests/clinical-workspaces.local.e2e.cjs`. Valida roles aislados/mixtos, módulos prohibidos, cuenta desactivada, búsqueda mínima, cirugía sin asignación, edición por otra persona, participantes independientes por día, agrupación, autoría y tratamiento PRP/DUT/MICRO; sesión mayor de tres, limpieza de campos y conservación histórica. También rechaza cambios de propiedad, autoría falsificada, responsables inválidos y operaciones no autorizadas.
- Navegador contra compilación de producción local: login de enfermería, búsqueda sin asignación, edición de reporte y participantes del primer día conservando el segundo; agenda por URL redirige al área permitida. Login de Tratamientos, historial MICRO, creación de sesión PRP número cinco, edición, recarga y persistencia, con autoría separada del responsable. URL de cirugía redirige al área de Tratamientos. Sin errores ni advertencias en la consola capturada.
- Todo sobre datos y cuentas ficticias de una base exclusiva en `127.0.0.1:55439`, aplicación en 3300 y API en 3301. No se ejecutó la prueba antigua contra develop.
- Al cerrar la verificación se cerró la sesión y pestaña QA, y se detuvieron web, API y PostgreSQL temporales. Los archivos temporales contienen únicamente la copia de código sin secretos y datos sintéticos; no se eliminaron archivos del usuario.
- Guías de React/Next.js orientaron componentes y separación de acceso; la guía de verificación orientó la prueba completa navegador → API → base → resultado.

La prueba local requiere una base **vacía** llamada `capillaris_enfermeria_test` en el puerto 55439 y rechaza otros destinos o una base con tablas. Ejemplo, con PostgreSQL local ya preparado:

```sh
CAPILLARIS_TEST_DATABASE_URL=postgresql://capillaris_test@127.0.0.1:55439/capillaris_enfermeria_test node scripts/tests/clinical-workspaces.local.e2e.cjs
```

`--serve` conserva la API en 3301 para revisión visual manual; no es un modo de publicación. Las credenciales que figuran en ese script son únicamente de las cuentas sintéticas de esta prueba local.

### Fuera de este bloque

Las diferencias de los cuatro formatos físicos están documentadas en [Comparación de formatos](comparacion-formatos-enfermeria-2026-09-21.md). No se agregaron placas, medicamentos/dosis, signos vitales seriados, campos extra de micropigmentación ni consentimientos nuevos. Tampoco se expone todavía una indicación médica vigente o alergias como contexto de Tratamientos: falta acordar su fuente clínica autorizada. No se comprobó la integridad de la importación histórica en una base real. CRM/Brevo/Kommo quedan fuera de este bloque.

## Registro histórico — 11 de septiembre de 2026 (reglas anteriores)

Lo siguiente conserva evidencia del trabajo anterior. Las reglas de asignación y pendientes de aquella fecha **no son las reglas del nuevo código local**; consultar arriba.

Implementación local verificada el 11 de septiembre de 2026. Base: Neon **develop**, proyecto Capillaris (`holy-sea-52982481`), branch `br-green-dew-anwbw5sf`. No se desplegó ni migró producción.

## Operación

1. Administración crea una cuenta por persona desde Configuración → Usuarios, con rol **Enfermería**. No usar cuentas compartidas para la nueva captura.
2. Un médico o administrador abre el expediente y asigna esa cuenta en **Enfermería asignada**. También puede retirar el acceso allí.
3. Enfermería inicia sesión normalmente; entra en **Mis pacientes**, sin navegación administrativa. Solo puede buscar entre sus pacientes asignados y consultar su identificación básica y procedimientos.
4. Puede crear y editar reportes diarios, con campos de procedimiento, horarios, anestesia, médicos y tipos del catálogo. No puede crear pacientes, ver agenda/inventario/reportes administrativos, administrar cuentas ni borrar procedimientos.
5. **Enfermería participante** se selecciona expresamente por reporte diario. La asignación de acceso y la persona que captura NO se convierten automáticamente en participación.
6. Médicos/administración pueden abrir el espacio de enfermería desde el expediente. La participación también aparece en las tarjetas originales de procedimientos y en Reportes → Participación de enfermería.
7. Agrupar/separar los dos días sigue siendo responsabilidad de médicos/administración. Una fecha agrupada no puede modificarse directamente.

## Reglas y controles

- Rol `nurse`: denegación por defecto en servidor; cada endpoint permitido debe declararlo expresamente. Una cuenta con roles mixtos que incluya `nurse` conserva las restricciones de enfermería.
- La sesión se valida contra el estado y roles actuales de la cuenta en cada solicitud. Desactivar/eliminar lógicamente la cuenta invalida su acceso sin esperar a que expire el token.
- Las lecturas/escrituras del paciente comprueban la asignación vigente en una transacción. Conocer el identificador o manipular la URL no concede acceso.
- El navegador refresca el perfil y las asignaciones cada 30 segundos y al recuperar el foco; puede haber información previamente mostrada hasta el siguiente refresco. El servidor no permite nuevas operaciones después de revocar el acceso.
- La identificación expuesta a enfermería no incluye correo, teléfono, notas administrativas ni consentimientos del paciente. Tampoco se expone el resto del expediente clínico desde este módulo.
- La captura conserva `createdBy`/`updatedBy`; se muestran nombres de capturista y último editor, y continúa la auditoría existente de cambios.
- Solo se pueden añadir participantes activos de enfermería asignados al paciente. Las participaciones históricas conservadas siguen visibles aunque se revoque su acceso o se desactive la cuenta.
- Cada persona cuenta una vez por intervención, aunque participe ambos días. Toda la intervención pertenece al mes del primer día. La suma de participaciones puede superar el total de intervenciones.
- El registro alternativo `/auth/register` queda limitado a administración; las cuentas de personal se gestionan desde Usuarios.
- No se convirtió ni reasignó automáticamente la cuenta histórica **Enfermería Capillaris**, que conserva su rol anterior. No se atribuyeron registros históricos a personas específicas sin evidencia.

## Migración

`20260911070000_nursing_access`: tablas `nursing_assignments` y `procedure_report_nurses`, relaciones/índices y rol Enfermería. Aplicada únicamente a develop tras verificar el hostname. No modifica procedimientos históricos ni usuarios existentes.

Antes de publicar: revisar y versionar los cambios pendientes; comprobar respaldo y destino de producción; aplicar la migración antes del código que consulta las tablas nuevas. La decisión de desplegar requiere autorización independiente.

## Verificación

| Límite del flujo | Evidencia |
| --- | --- |
| Interfaz | Cuenta ficticia en navegador: login redirige a Mis pacientes, solo muestra paciente asignado; intento de agenda por URL vuelve a Mis pacientes. Formulario clínico y selección de participantes inspeccionados. |
| Cliente → API | Prueba HTTP con login real de cuentas QA y llamadas a los endpoints; respuestas 403 en módulos restringidos, 401 para cuenta desactivada. |
| API → base | Crear/editar reportes sobre paciente ficticio; lectura directa confirma totales, médicos, fechas y autoría persistidos. |
| Reportes | Dos días 31/agosto–1/septiembre: una participación en agosto, ninguna nueva en septiembre; folículos sumados sin duplicar intervención. |
| Revocación | Lectura, edición y cambio de participantes bloqueados después de revocar; participación histórica permanece. |
| Regresiones | 26 pruebas unitarias aprobadas; comprobación de tipos API y web sin errores. |

La revisión de los componentes nuevos con ESLint y las reglas `next/core-web-vitals` no produjo errores ni advertencias. Se ejecutó mediante configuración temporal en memoria: el comando habitual `npm run lint` aún solicita configurar ESLint en este repositorio. No se cambió esa configuración global.

La cuenta temporal de la prueba visual fue desactivada y eliminada lógicamente con sus asignaciones revocadas; se comprobó que su navegador volvió al inicio de sesión. No quedaron cuentas QA activas ni se alteró la sesión de administración del usuario.

Comandos reproducibles:

```sh
node --test scripts/tests/*.test.cjs
npm run --workspace @capillaris/api typecheck
npm run --workspace @capillaris/web typecheck -- --incremental false
node scripts/tests/nursing-develop.e2e.cjs --develop
```

La prueba E2E requiere servidor local en 3001 y el paciente ficticio autorizado `a060036b-a434-4b81-9fc1-bb4054a4e609`. Rechaza cualquier endpoint de base distinto del develop confirmado. Crea cuentas QA con contraseñas aleatorias y reportes temporales de 2090; elimina solo esos reportes, revoca asignaciones y desactiva/elimina lógicamente sus cuentas al finalizar. Mantiene el historial de auditoría. Los dos reportes originales del paciente ficticio (150 folículos) se conservan.

## Pendientes operativos (no automatizados)

- Definir con el cliente las personas que tendrán cuentas individuales y sus pacientes asignados.
- Decidir cuándo retirar el acceso compartido de la cuenta histórica, conservando su atribución anterior.
- Capacitar en la diferencia entre asignación, participación y captura; acordar quién agrupa los dos días.
- Aceptación del cliente y autorización de publicación. No se hizo commit, push ni despliegue en esta entrega.

Las guías de React/Next.js y autenticación orientaron el acceso restringido y la actualización de permisos; las de variables de entorno y verificación guiaron la migración exclusiva de develop y la prueba completa interfaz → API → base → resultado.
