# Dirección vigente del trabajo — Capillaris

Actualizada el 3 de octubre de 2026 por instrucción expresa del usuario.

**Dirección vigente:** versionar localmente en `develop` los cambios acumulados aprobados y el saneamiento autorizado. No hacer push, merge ni despliegue. Después, revisar la dirección visual general, los formularios y componentes antes de implementar otro rediseño. Se conservan identidad visual, lógica clínica y permisos; la revisión de diseño produce propuestas, no nuevas funciones.

La revisión integral de septiembre y las pruebas de sus documentos son cortes históricos. Las iteraciones posteriores corrigieron producto con autorizaciones específicas; no equivalen a aceptación completa ni a validación de producción. El [estado local de octubre](cierre-bloque-uno-2026-10-03.md) distingue evidencia actual y pendientes. Algunos enlaces de informes históricos apuntan a evidencia local privada no incluida en Git.

## Restricción de producción

**NO publicar todavía. Ningún despliegue, promoción, migración, cambio de configuración, cuenta o dato de producción sin una autorización expresa futura para esa acción.** Terminar un módulo, una prueba o un documento no autoriza publicarlo. Las propuestas de publicación de documentos anteriores quedan subordinadas a esta instrucción.

El objetivo actual es revisar y mejorar **todo el sistema por etapas**, incluyendo diseño/experiencia, funcionalidad, datos heredados y correspondencia con los formularios reales. No se declara cerrado el proyecto ni se prepara una publicación de enfermería. La cuenta compartida de enfermería es un pendiente entre varios, no el pendiente único.

## Entorno habitual

- Checkout: `/Users/kampiyo/code/capillaris`; iniciar con `npm run dev` y conservar los cambios locales.
- Web habitual: `http://127.0.0.1:3000`; API en 3001.
- Base verificada: Neon, proyecto `holy-sea-52982481`, rama **develop** `br-green-dew-anwbw5sf`. La comprobación del 21/09 vinculó el endpoint de Neon con `apps/api/.env`, distinto de producción.
- Volver a verificar destino si cambia configuración. No sustituir esta conexión por una copia temporal para presentar resultados como QA de develop.
- Usar datos claramente QA para pruebas de escritura; no alterar expedientes existentes, roles reales o catálogos compartidos para simular casos. No disparar comunicaciones ni eventos externos sin autorización específica. No reset, seed masivo, importación ni reclasificación automática.

## Estado y decisiones preservadas

- Auditoría integral concluida: [informe y prioridades](auditoria-integral-2026-09-21.md), [cobertura por módulo](auditoria-2026-09-21/cobertura.md), [evidencias y límites](auditoria-2026-09-21/evidencias.md) e [inventario](auditoria-2026-09-21/inventario.md). Limpieza de fixtures terminada. No se corrigió producto ni se publicó durante la auditoría; el siguiente paso es acordar los bloques de implementación.

- QA de enfermería quirúrgica y Tratamientos del 21 de septiembre terminado en develop, sin nuevos fallos bloqueantes en sus recorridos. Ver [evidencia histórica](qa-develop-enfermeria-2026-09-21.md). La validación por rol de los cambios acumulados de octubre sigue pendiente; no se reiniciarán pruebas DB denegadas ni se crearán identidades para sortear el bloqueo.
- Permisos terminados **no equivalen** a digitalización completa de los cuatro formularios. Ver [comparación de formatos](comparacion-formatos-enfermeria-2026-09-21.md).
- Flujo futuro acordado: buscar/seleccionar contacto de Brevo o Kommo y crear o vincular su expediente sin recapturar la persona. Prospectos permanecen en CRM; no importar todos como pacientes. Aún no se elige un único CRM ni se autoriza implementar la integración.
- Procedimientos: máximo dos días consecutivos; atribución al mes del primer día; participación por día separada del autor de captura.
- Requieren aclaración clínica: columnas de placas, fuente de alergias/indicación, consentimiento de imágenes para redes, R/color/áreas de micropigmentación y diferencias de medicamentos/tiempos del papel. No inventar reglas ni equivalencias.

## Método de continuidad

Preservar historia y distinguir defecto demostrado, discrepancia de requisito, mejora de UX y pregunta abierta. Los bloqueos de una integración no detienen el resto. La siguiente propuesta de diseño debe distinguir lo responsive ya aplicado de mejoras nuevas y recomendar una pantalla piloto; no implementarla sin la autorización correspondiente. No tomar un commit o informe como autorización para publicar.

Punto de partida: [diagnóstico y mapa inicial v1](diagnostico-mapa-sistema-2026-09-21.md). Los checklists y documentos de cierre anteriores son cortes históricos, no el plan operativo vigente.
