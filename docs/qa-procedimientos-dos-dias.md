# Verificación de procedimientos de dos días

Fecha: 10 de septiembre de 2026. Entorno: aplicación local conectada a Neon
`develop`, proyecto Capillaris. No se modificó producción.

Paciente ficticio autorizado: `a060036b-a434-4b81-9fc1-bb4054a4e609`.
Nombre: PRUEBA FICTICIA QA Procedimiento Dos Dias 20260910.

## Resultado del bloque

- [x] Crear desde la interfaz el reporte del 31/08/2026 con 100 folículos sintéticos.
- [x] Crear desde la interfaz el reporte del 01/09/2026 con 50 folículos sintéticos.
- [x] Unir desde la interfaz: 1 procedimiento, 2 reportes diarios, 150 folículos.
- [x] Confirmar que el expediente muestra 1 procedimiento.
- [x] Separar desde la interfaz: 2 procedimientos, 2 reportes diarios.
- [x] Volver a unir desde la interfaz: 1 procedimiento, 2 reportes diarios.
- [x] Reporte visual 01/08 a 31/08: 1 procedimiento, 150 folículos totales y promedio.
- [x] Reporte visual de septiembre: 0 procedimientos de esta sesión.
- [x] Conciliar con el servicio de reportes y los registros de Neon develop.
- [x] Rechazar un tercer día mediante el servicio real y una transacción de prueba.
- [x] Rechazar días no consecutivos mediante el servicio real y una transacción de prueba.
- [x] Revertir las transacciones negativas y comprobar que los dos reportes originales quedan idénticos.

Las pruebas negativas se ejecutaron contra la base de desarrollo mediante el
servicio, no haciendo clic en la interfaz. No prueban la presentación de los
mensajes de error en pantalla. No se asignaron médicos reales al caso sintético.

## Regla confirmada

Un procedimiento agrupado admite dos reportes de días consecutivos. Se atribuye
al mes del primer día, incluyendo los folículos de ambos reportes. Separar los
reportes restablece su conteo individual.

## Datos conservados y pendientes

Se conserva el paciente ficticio y sus dos reportes unidos para futuras pruebas.
Estos datos incrementan los indicadores de develop: un paciente, un procedimiento
agrupado en agosto y 150 folículos. No son actividad clínica real.

- [ ] Decidir cuándo retirar o archivar los datos ficticios.
- [ ] Verificar visualmente mensajes de error de unión inválida.
- [x] Corregir superposición visual: «Día» y «separar de la sesión» ahora tienen una fila propia sobre cada tarjeta. Verificado visualmente en escritorio y mediante comprobación de tipos; no cambia el funcionamiento de la sesión.
- [ ] Actualizar el PDF general con este bloque validado y la regla mensual aprobada.
- [ ] Publicar únicamente tras revisión y autorización.
- [ ] Continuar con definición de enfermería y permisos.
