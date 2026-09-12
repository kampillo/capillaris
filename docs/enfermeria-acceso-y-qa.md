# Enfermería: acceso individual y participación

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
