# QA manual — Enfermería quirúrgica y Tratamientos

Fecha: 21 de septiembre de 2026. Primera etapa; el resto del sistema no fue auditado en esta ejecución.

## Resultado

**Sin fallos bloqueantes observados en los recorridos ejecutados.** No se requirieron cambios de código durante esta ampliación de QA. Esto no equivale a certificar todos los escenarios posibles ni a digitalizar completamente los formatos físicos.

Se reutilizó la compilación API/web y la base temporal de la verificación anterior, sin volver a ejecutar la batería automatizada. La evidencia anterior sigue en [Guía de acceso y QA](enfermeria-acceso-y-qa.md): 31 pruebas, tipos, compilación limpia y prueba HTTP real, además de edición quirúrgica, participantes por día, historial y edición de tratamientos en navegador.

## Cobertura manual adicional

| Área | Recorrido observado | Resultado |
| --- | --- | --- |
| Acceso | Credenciales incorrectas; ingreso y salida; URL protegida tras salir | Mensaje «Credenciales inválidas»; navegación al área correspondiente; tras salir vuelve a login. |
| Búsqueda | Sin coincidencias, búsqueda corta, nombre y apellido, paciente sin fecha de nacimiento | Estados explícitos; identificación mínima; sin notas, correo ni expediente completo. |
| Cirugía | Paciente sin reportes, cancelar una nueva captura, fecha vacía, cantidad negativa | Sin registros tras cancelar; validación impide guardar valores inválidos. |
| Cirugía | Alta con médico, zona y descripción; volver a abrir tras recarga | Un reporte persistido; capturista correcto; ninguna participación de enfermería asignada automáticamente. |
| Cirugía histórica | Desactivar sólo al médico ficticio, editar descripción manteniendo su selección | Se muestra «histórico» y se conserva el médico al guardar. |
| Participación histórica | Desactivar sólo a la enfermera ficticia ya participante; guardar primer día | Participante histórico conservado; segundo día sin cambios. |
| Tratamientos | Búsqueda sin coincidencias, historial vacío y cancelación | Estados legibles, sin aplicación creada al cancelar. |
| Tratamientos | Sesión cero y duración negativa | Validaciones nativas bloquean envío; contador de historial no aumenta. |
| Tratamientos | Alta de sesión 6 con PRP + DUT + MICRO y responsable distinto del capturista | Tipos y responsable persistidos, autoría separada. |
| Error de guardado | Desactivar PRP ficticio después de abrir el formulario; intentar alta de sesión 7 | «Selecciona tipos activos del catálogo»; borrador conservado; no crea registro inválido. |
| Reintento | Reactivar PRP ficticio y volver a guardar la misma captura; recargar | Se guarda una vez; historial con sesiones 6 y 7 y comentarios correctos. |
| Histórico de tratamientos | Desactivar MICRO y responsable ficticios; editar sesión 6 | Ambos aparecen como históricos y se conservan al guardar comentarios. |
| Navegación | Intentar expediente completo, agenda, inventario, reportes, usuarios y área contraria | Redirección al área permitida; no se ofrecen eliminar ni agrupar. Agenda de enfermería y restricciones de API ya tenían evidencia anterior; se ampliaron URLs de ambos roles. |
| Servicio no disponible | Detener exclusivamente PostgreSQL temporal y recargar | No muestra contenido clínico: «No pudimos verificar tus permisos» y Reintentar. |
| Recuperación | Reiniciar base temporal y pulsar Reintentar | Recupera sesión e historial persistido sin nuevo login. |
| Pantalla estrecha | 390 × 844: tarjetas, encabezados, formularios, guardado y cancelación | Operables; no se observó desbordamiento horizontal. Ancho normal restaurado al terminar. |

Se observaron también los estados «Verificando acceso…» y «Cargando historial de tratamientos…». Las capturas visuales de la conversación muestran la tarjeta y formulario quirúrgicos a 390 px, la validación de sesión mínima y las tarjetas de tratamientos con autoría y responsable diferentes. Los errores HTTP deliberados de autenticación, catálogo y caída local son esperados, no incidencias de la aplicación.

## Observaciones menores y límites

- Las ayudas nativas de fecha obligatoria y mínimos numéricos aparecen en inglés en este navegador de prueba. Dependen del idioma del navegador; los mensajes de la aplicación probados están en español. Si se exige idioma español uniforme, conviene añadir mensajes propios en otra mejora de UX.
- La selección histórica de enfermería se conserva correctamente, pero no lleva el sufijo «histórico» que sí muestran médicos y tratamientos. Mejora informativa opcional; no se observó pérdida de datos ni ampliación de permisos.
- El formulario permite «Realizado por: Sin registrar» conforme al modelo actual. No se inventó la obligatoriedad de ese dato ni nuevos criterios clínicos.
- No se repitieron pruebas de carga, concurrencia o importación histórica real. No se probaron todos los dispositivos/navegadores ni cada campo clínico individual. No se simularon desconexiones en cada punto de una escritura en curso.
- No se auditaron módulos generales ni se agregaron campos de los formatos físicos. No se modificaron medicamentos, fórmulas ni autorizaciones.

## Entorno disponible al cierre

- Web: `http://127.0.0.1:3300/login`; API: `http://127.0.0.1:3301/api/v1`.
- PostgreSQL exclusivo de QA: `127.0.0.1:55439/capillaris_enfermeria_test`.
- Datos y cuentas 100% ficticios. Se restauraron las activaciones de catálogo/personas alteradas para simular históricos. Sesión de navegador cerrada.
- **Los tres servicios quedan encendidos localmente** para revisión; no son una publicación. Panel de navegador solicitado en la tarea de origen. Su disponibilidad depende de que sigan ejecutándose los procesos locales.
- Web usa copia aislada `/tmp/capillaris-nursing-build.gZTrFP`; PostgreSQL, `/tmp/capillaris-nursing-pg.WXoRCg`. No se alteró el entorno habitual ni Neon.
- Cuentas sintéticas: `nurse@example.invalid` y `treatments@example.invalid`; contraseña exclusivamente local documentada en `scripts/tests/clinical-workspaces.local.e2e.cjs`.

## Siguientes etapas propuestas — no iniciadas

1. Pacientes y agenda: altas/edición según flujo vigente, búsqueda, duplicados, citas y cambios de estado.
2. Expediente y procedimientos desde perfiles médicos/administración: consultas, antecedentes, prescripciones, imágenes y agrupación de dos días.
3. Inventario y reportes: movimientos, filtros, totales, participación y límites entre meses.
4. Integraciones y operación: revisar sólo las conexiones ya implementadas; acordar aparte el alcance Brevo/Kommo, publicación y seguimiento.

Elegir la siguiente etapa tras revisar este resultado. Las guías de verificación y entorno se usaron para aislar los fallos simulados y comprobar el recorrido de interfaz a datos y de vuelta, sin repetir innecesariamente la batería automatizada.
