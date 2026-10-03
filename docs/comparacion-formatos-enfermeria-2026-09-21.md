# Comparación de los cuatro formatos físicos — 21 de septiembre de 2026

**Actualización posterior:** el estado de implementación descrito abajo corresponde al momento de este análisis. Los permisos ya tienen [QA en develop](qa-develop-enfermeria-2026-09-21.md); la [auditoría integral](auditoria-integral-2026-09-21.md) conserva los faltantes de equivalencia de los formularios. Permisos terminados no equivalen a formularios completos.

## Estado y límites

**Análisis documental y de código terminado. Implementación de permisos todavía en curso al emitir este análisis.** No equivale a que las cuatro hojas estén digitalizadas por completo.

Evidencia: inspección visual de IMG_7067.JPG, IMG_7068.JPG, IMG_7070.JPG e IMG_7069.JPG (formularios vacíos), modelo Prisma, DTO, servicios, rutas y componentes. La referencia anterior a los cambios es el commit `db7c747`. Se distingue lo preexistente de los ajustes locales de esta solicitud. No se consultaron expedientes reales ni se comprobó la integridad de la importación histórica en las bases actuales. La comparación de pantallas es de su implementación, no de una revisión autenticada de cada pantalla en producción.

Las fotografías no constituyen una prescripción. No se recomiendan dosis, se sustituyen fármacos ni se reinterpretan categorías clínicas. Los nombres/concentraciones que siguen son transcripción de etiquetas para identificar diferencias.

## 1. Medicina capilar — IMG_7067

| Parte del papel | Evidencia anterior a los cambios | Diferencia / propuesta |
|---|---|---|
| Paciente y edad | `Patient` guarda nombre, fecha de nacimiento y bandera de edad aproximada; expediente general calcula edad. | El subsistema restringido identifica por nombre y nacimiento. Presentar edad derivada es posible sin duplicar un dato que envejece; señalar aproximación. |
| Diagnóstico, valorado por, fecha de valoración | `MedicalConsultation`: diagnostico, doctorId y consultationDate. `ClinicalHistory` también tiene diagnostico. | Están en otros módulos, no en la aplicación del tratamiento. No elegir automáticamente cuál diagnóstico es la indicación vigente. Proponer una referencia explícita a valoración/indicación médica y lectura mínima para Tratamientos. |
| Fecha de inicio de tratamiento | `Treatment.fecha` es fecha de cada aplicación. | No hay plan/ciclo con una fecha de inicio independiente. La primera aplicación histórica no prueba inicio del plan actual. Confirmar si necesitan ciclos/planes. |
| Alergia a medicamento | `ClinicalHistory.nonPathologicalPersonal.alergias` es booleano; antecedentes patológicos y otros son texto general. | No hay lista estructurada de alergias medicamentosas. Un false por defecto no prueba revisión negativa. No exponer todo el antecedente para resolverlo. Proponer alerta médica mínima, revisada, de sólo lectura; definir fuente y estado desconocido. |
| Fotografías | Hay `PatientImage` y API de metadatos; página de imágenes es un aviso de próxima disponibilidad. | No hay flujo completo visible de carga/consulta. “Fotografías” en esta hoja no especifica autorización para redes. |
| Tratamiento indicado | Catálogo sembrable PRP, DUT, BET, BICA, BIOEST y otros, incluido MICRO. Historia tiene texto `tratamiento`; prescripciones tienen sus propios ítems. | Marcar un tipo en `Treatment` registra una aplicación, **no** una indicación médica. No convertir el catálogo o la captura de enfermería en prescripción. |
| Bitácora fecha / tratamiento / comentarios / enfermera | `Treatment` tiene fecha, tipos múltiples, comentarios, descripción, realizadoPorId, createdBy y updatedBy. | Base suficiente para aplicaciones, no para toda la cabecera médica. Antes, UI general creaba/listaba y seleccionaba sólo doctores como responsables; no tenía edición visible aunque API sí. El rol nurse no entraba. |

Grafía: la foto parece imprimir **“Bioetimulación capilar”**, sin la s después de “e”; el catálogo dice “Bioestimulación”. Papel: “Bicalutamide”; catálogo: “Bicalutamida”. Son diferencias de etiqueta a validar; no se crea otro medicamento ni se cambia el catálogo por una fotografía.

**Quién:** médico mantiene valoración, diagnóstico e indicación; Tratamientos registra aplicaciones y responsable, lee sólo el contexto médico necesario una vez definida su fuente. No obtiene permiso de prescribir o cambiar diagnóstico.

**Cambio local en curso:** área `treatment-care` con búsqueda mínima, historial, creación y edición, selección de responsables activos de Tratamientos/médicos y autoría separada. No añade ni muestra todavía diagnóstico/alergias/plan médico por la ambigüedad de origen. Incluye las aplicaciones de medicina capilar existentes en `Treatment`.

Evidencia: [modelo Patient](../apps/api/prisma/schema.prisma#L118), [consulta](../apps/api/prisma/schema.prisma#L278), [historia](../apps/api/prisma/schema.prisma#L514), [Treatment](../apps/api/prisma/schema.prisma#L700), [catálogo](../apps/api/prisma/seed-treatment-types.ts#L19), [formulario general](../apps/web/src/app/dashboard/patients/[id]/treatments/page.tsx#L144), [API general](../apps/api/src/modules/treatments/treatments.service.ts#L26), [galería pendiente](../apps/web/src/app/dashboard/patients/[id]/images/page.tsx#L38).

## 2. Micropigmentación capilar — IMG_7068

| Parte del papel | Evidencia anterior | Diferencia / propuesta |
|---|---|---|
| Paciente / edad | Datos generales de paciente. | Misma identificación mínima que medicina capilar. |
| Cirugía previa / indicaciones | Procedimientos e historia pueden contener antecedentes; historia guarda `tratamiento`. | No existe cabecera específica del plan de micropigmentación. No inferir “sin cirugía previa” porque no haya un procedimiento digitalizado. |
| Consentimiento de fotografías (autorización a redes) | Paciente tiene consentimiento de procesamiento de datos y comunicación comercial. | **Ninguno equivale a autorización de fotografías ni a uso en redes.** Falta consentimiento específico, alcance, fecha y evidencia; no reutilizar consentMarketing. |
| Sesiones 1, 2, 3 y R, varias filas por sesión | `Treatment.sesionNumero` entero opcional, mínimo 1, sin máximo de 3; cada aplicación tiene fecha. | No admite etiqueta R ni subfilas de valoración por área dentro de una sesión. Confirmar R; no asumir “retoque”. No limitar el historial a tres. |
| Área | `Treatment.zonas` usa hair_types; el modelo antiguo de micropigmentación también tiene zonas. | Comparar catálogo real con frontal/coronilla/laterales/cicatriz antes de mapear; no equiparar nombres automáticamente ni sembrar catálogos reales. |
| Color, caspa, grasa, descamación, otros | `MedicalConsultation` tiene color del cabello, caspa y grasa; no están por sesión de micropigmentación. | Color de cabello no necesariamente es color de pigmento. Faltan evaluación por sesión/área y descamación. Texto libre no equivale a campos estructurados. |
| Enfermera / observaciones | `Treatment.realizadoPorId`, comentarios y autoría. | La nueva área podrá registrar responsable de Tratamientos sin hacerlo médico. |
| Diagramas de cabeza | Existen componentes de zonas para otros usos; el formulario general de tratamientos usa selección de zonas. | No hay anotación gráfica de micropigmentación equivalente al papel. Seleccionar una zona no guarda un dibujo. |

Persistencia histórica: existen tablas antiguas `Micropigmentation` y `Hairmedicine`, con APIs propias. El importador a `Treatment` conserva origen/origenId (únicos), fecha, responsable y texto; MICRO identifica micropigmentación. **No son dos historiales que deban sumarse**: podrían ser las mismas aplicaciones importadas. El área nueva lee `Treatment`; no duplica filas ni ejecuta importaciones. No se ha verificado hoy si hay registros antiguos aún sin importar.

**Quién:** Tratamientos registra/edita aplicaciones de micropigmentación y medicina capilar en el mismo subsistema. Cabecera/indicación y permisos sobre consentimientos requieren definición aparte. Los nuevos campos de evaluación de micropigmentación se proponen para otra modificación aprobada.

**Cambio local:** inclusión de MICRO en el catálogo común e historial existente, no un formulario completo nuevo de micropigmentación. No se añadieron R, consentimiento, pigmentos ni nuevos criterios clínicos.

Evidencia: [Micropigmentation](../apps/api/prisma/schema.prisma#L609), [Treatment](../apps/api/prisma/schema.prisma#L700), [importador](../apps/api/prisma/import-treatments.ts#L1), [DTO sesión](../apps/api/src/modules/treatments/dto/create-treatment.dto.ts#L46), [consulta](../apps/api/prisma/schema.prisma#L278), [consentimientos visibles](../apps/web/src/components/patients/patient-form.tsx#L583).

## 3. Resumen quirúrgico — IMG_7070

| Parte del papel | Evidencia anterior | Diferencia / propuesta |
|---|---|---|
| Paciente / fecha / médicos / asistentes | ProcedureReport tiene fecha, médicos múltiples, relación de enfermeras participantes, createdBy/updatedBy. | Ya existe participación por reporte diario y autoría separada. El acceso por asignación no corresponde a rotación semanal. No todas las cuentas autorizadas son participantes. Confirmar si “asistentes” incluye personal distinto de médicos/enfermería. |
| Qx1 / Qx2 | `operatingRoomId` con catálogo de quirófanos. | Compatible conceptualmente; no asegurar que las etiquetas reales del catálogo coincidan sin revisarlo. |
| Inicio/fin de incisiones, extracción, comida e implantación | Inicio general, inicio/fin comida, inicio implantación, fin general; timestamps de anestesia extracción/implantación. | No existen pares independientes para incisiones y extracción. Fin general no está tipificado como fin de implantación. **Hora de anestesia no equivale a hora de extracción.** Proponer campos explícitos por fase tras confirmar semántica. |
| Dos tomas de TA/FC con hora | Historia tiene exploración física con TA/FC. | No hay mediciones seriadas ni horas en el reporte quirúrgico. Las constantes de una consulta no sustituyen las intraoperatorias. |
| CB1–CB4 / folículos / cabellos / promedio | Guarda cuatro conteos y totalFoliculos; UI general calcula cabellos y promedio. | Véase cálculo exacto en sección 4. Subformulario nurse previo permite conteos/total manual, pero no muestra el mismo resumen calculado que UI general. |
| Anestesia extracción / implantación | Bloques separados en modelo, DTO y UI para lidocaína, adrenalina, bicarbonato, solución fisiológica, infiltrada y betametasona. | Coincide la separación, **no** todos los fármacos/campos. |
| Concentraciones/unidades impresas | Papel: lidocaína 1% extracción y 2% implantación; adrenalina 1mg/1ml; dexametasona 4mg/1ml. Encabezado ANESTESIA LOCAL (ml). | App: lidocaína/infiltrada/betametasona texto libre; adrenalina/bicarbonato/solución numéricos con etiqueta mL. No hay concentración estructurada equivalente. No cambiar etiquetas de registros históricos sin conocer qué se capturó. |
| Dexametasona / ácido tranexámico | Papel incluye ambos; app tiene betametasona y bicarbonato. | Dexametasona no debe renombrar betametasona; no hay campos de tranexámico. Presentar catálogo/estructura clínica para aprobación, conservando campos históricos. |
| Bloqueo con cánula: frontal, occipital, retroauricular, temporal; Directo | No hay modelo/campos específicos en ProcedureReport. | Faltan registros por zona/vía. Papel menciona ropivacaína, lidocaína-epinefrina y dexametasona; no crear equivalencias o dosis automáticas. |
| Medicación y diagrama | Prescripciones están en otro módulo; el reporte tiene descripción/zonas. | No hay registro quirúrgico de medicación administrada equivalente a esa tabla ni dibujo libre. Una prescripción no prueba administración. |

El formulario general preexistente contiene plantillas `ANESTHESIA_RECIPES` y una acción `applyRecipe`. No se incorporan al área restringida ni se consideran protocolo clínico aprobado por mostrar una hoja. Su revisión clínica es un pendiente independiente.

**Quién:** enfermería quirúrgica puede completar formularios permitidos; médicos/enfermeras participantes se indican por día. Valoración/prescripción continúan fuera de su alcance. La nueva implementación conserva las relaciones por reporte y los autores; no cambia ni recalcula historia previa.

Evidencia: [modelo quirúrgico](../apps/api/prisma/schema.prisma#L371), [DTO creación](../apps/api/src/modules/procedures/dto/create-procedure.dto.ts), [servicio](../apps/api/src/modules/procedures/procedures.service.ts#L57), [formulario general](../apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx#L712), [resumen/cálculo](../apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx#L435), [editor restringido](../apps/web/src/app/dashboard/nursing/[id]/page.tsx), [exploración física](../apps/api/prisma/schema.prisma#L587).

## 4. Detalle de conteo por placas — IMG_7069

**No existe equivalente estructurado.** No hay entidad de placa, hora por placa, ordinal de placa/bloque, subtotales por bloque ni formulario de líneas de conteo. El API y la base sólo persisten CB1–CB4 agregados por reporte diario y totalFoliculos. Escribir líneas en descripción no da totales verificables ni edición estructurada.

El papel dice “1 Folículo”, “2 Folículos”, “3 Folículos”, “4 Folículos”; el resumen quirúrgico dice “1 cb.” hasta “4 cbs.”. **Evidencia del software, no interpretación del papel:**

- Folículos derivados: `cb1 + cb2 + cb3 + cb4`.
- Cabellos derivados: `cb1 + 2*cb2 + 3*cb3 + 4*cb4`.
- Promedio: cabellos derivados / suma de CB, con dos decimales y vacío si el denominador es cero.
- Folículos que muestra la tarjeta: `totalFoliculos` manual si existe; en su defecto, suma de CB.
- El promedio usa suma de CB aunque el total manual difiera. API no obliga a reconciliarlos.
- En sesiones de dos días se suman los reportes; reportes estadísticos usan totalFoliculos almacenado (no crean conteo por placas).

**Riesgo comprobado:** es posible mostrar un total manual distinto de la suma CB; cabellos/promedio se basan en la distribución, no necesariamente en ese total visible. Introducir placas con otro total editable produciría una tercera fuente contradictoria.

**Propuesta, no implementada:** una tabla de placas por reporte diario; el resumen obtiene sus CB del detalle y muestra una única procedencia de los totales. Para historia sin placas, conservar modo “total histórico/manual” sin inventar desglose. Antes se necesita confirmar qué cuenta cada celda, si las columnas corresponden a unidades de 1–4 cabellos y cuándo puede corregirse un total manual. No cambiar fórmulas hasta confirmarlo.

**Quién:** enfermería quirúrgica, con autoría de captura/edición y participantes de la cirugía separados. No hace falta acceso al expediente completo para esa hoja.

Evidencia: [modelo](../apps/api/prisma/schema.prisma#L371), [cálculos](../apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx#L435), [payload](../apps/web/src/app/dashboard/patients/[id]/procedures/page.tsx#L815), [agregado estadístico](../apps/api/src/modules/reports/reports.service.ts#L118).

## Decisiones pendientes y orden sugerido

1. **Placas:** ¿las cuatro columnas cuentan unidades de 1, 2, 3 y 4 cabellos, y el total del resumen debe salir de la suma de placas? Es la pregunta prioritaria para evitar cambiar cálculos por intuición.
2. Aprobar versión vigente del resumen quirúrgico: fármacos, concentraciones, unidades y significado de los tiempos. Añadir campos nuevos sin reinterpretar los históricos.
3. Definir R y estructura de filas/áreas por sesión de micropigmentación; confirmar qué significa Color.
4. Definir valoración/indicación médica fuente y alerta mínima de alergias para lectura de Tratamientos, sin permitir edición de diagnósticos/prescripciones. No mostrar diagnósticos múltiples como si fueran un plan vigente.
5. Separar captura de fotografías de autorización a redes con evidencia específica. No reutilizar consentimiento comercial.

Mientras se resuelven: completar y probar el acceso quirúrgico sin asignaciones, el rol separado Tratamientos y la captura/edición del modelo existente. No bloquear ese trabajo por las diferencias clínicas; tampoco afirmar que ese trabajo sustituye los cuatro formatos completos.

## Diferencias de esta solicitud respecto de la versión publicada

- **Preexistente:** modelos de procedimientos/tratamientos, catálogos, autoría y auditoría, agrupación dos días, participación por día, importador histórico. Sin placas ni equivalencia completa de formularios físicos.
- **En modificación local:** acceso quirúrgico sin asignación, búsqueda mínima, catálogo de enfermería participante no condicionado a asignación, área separada Tratamientos con lectura/captura/edición y responsables, controles de permisos servidor/interfaz y pruebas.
- **Sin implementar deliberadamente:** nuevos campos médicos de las hojas, recetas/dosis, placas, interpretación R, consentimientos fotográficos, nuevos reportes o CRM. Requieren alcance/semántica aprobados.
- **Sin cambios operativos:** ninguna cuenta real activada, ninguna migración aplicada a bases compartidas y ningún despliegue de esta solicitud.
