# JOZ — Preguntas frecuentes del cliente (con respuestas)

Guía rápida para responder al cliente en demos, reuniones de seguimiento y auditorías. Las respuestas se basan en el código actual de `joz/backend/joz` y la BD de producción `barranquia_postgres`.

---

## 1. Datos y cuadre

### ¿Estos números son los reales? ¿Coinciden con mi contabilidad?

Sí. El dashboard suma directo de `joz_transacciones`, que es lo que llega del endpoint `/api/AportesRetiros/Movimientos/porfecha` de SuperEfectivo. Para 5-6 mayo:
- Total monto neto: **USD 316,705.24** (suma de los campos `monto` excluyendo aperturas/cierres y traslados).
- Entradas: **USD 164,143.82**, Salidas: **USD 152,561.42**.
- 30 almacenes, suma por almacén = USD 316,705.24 (cuadra al centavo).

Si quiere validar contra su ERP, tenemos consola SQL en `/sql-console` para correr `SELECT` en vivo.

### ¿Por qué hay 2,612 transacciones netas pero al sumar las cantidades por almacén me da 2,058?

Son dos cosas distintas:
- **2,612 = filas** en la tabla. El ERP descompone cada operación en varios asientos contables (ej. un retiro de empeño de USD 385 son 2 filas: USD 35 de interés + USD 350 de capital).
- **2,058 = operaciones únicas**, deduplicadas por `referencia` (`nrodocumento` del ERP). Es lo que el cliente reconoce como "una operación".

Las dos son correctas para sus propósitos. El total monetario se suma sobre las filas (porque cada asiento aporta plata real); las "operaciones distintas" se cuentan deduplicadas.

### ¿Por qué las aperturas/cierres de caja no aparecen en aportes/retiros?

Porque no son flujo de cliente, son contabilidad interna del cajero al iniciar/cerrar turno. Si los incluyéramos, el promedio de aporte de un día subiría artificialmente porque el cajero "aporta" todo lo que tiene en caja al abrir.

Igual los exponemos aparte para transparencia: en el dashboard, bloque "Operaciones internas excluidas" → 194 aperturas/cierres + 43 traslados (rango 5-6 mayo).

### ¿Y si el ERP me manda dos veces la misma transacción?

Tenemos restricción única `uq_transaccion_id_externo` sobre el `id` que devuelve el API de SuperEfectivo. Si el ETL recibe el mismo `id` dos veces, la segunda inserción falla y se cuenta como duplicado en `joz_etl_log.filas_error`. La transacción no se duplica en BD.

---

## 2. ETL y sincronización

### ¿Por qué no hay datos del 6 de mayo si hoy es 7?

El worker batch del ETL está detenido desde el 4 de mayo (lo confirmamos en `docker ps` — `joz_etl_worker` no aparece como activo en barranquia). El último `cargado_en` es `2026-05-06 08:01:59` para datos del 5 de mayo. Para reanudarlo:
```bash
docker exec barranquia_joz_backend python manage.py run_etl
```
o levantar el contenedor `joz_etl_worker`.

### ¿Cada cuánto se sincroniza?

El scheduler interno (`joz/backend/joz/scheduler.py`) está configurado para correr cada cierto intervalo (configurable). En el panel `/etl-monitor` se ve el historial: hora de inicio, hora de fin, filas recibidas/insertadas/error. Endpoint: `GET /api/joz/etl/schedule/`.

### Si SuperEfectivo cambia el formato de respuesta, ¿se rompe?

Sí, hoy el `_serializar_movimiento` en `views.py` mapea campos específicos (`almorigen`, `nrodocumento`, `numeroidentificacion`, etc.). Si el API cambia un nombre de campo lo veríamos en `joz_etl_log.filas_error` y en logs. La mitigación es testing de contrato; hoy lo detectamos por monitoreo, no por alerta automática.

### ¿Puedo descargar los datos crudos de un día específico?

Sí, dos opciones:
1. **Tiempo real** — `GET /api/joz/consulta-realtime/?fecha_inicio=2026-05-05&fecha_fin=2026-05-05` consulta directo a SuperEfectivo, sin pasar por nuestra BD.
2. **Histórico de BD** — `/sql-console` con `SELECT * FROM joz_transacciones WHERE fecha = '2026-05-05'`.

---

## 3. Alertas

### ¿Quién atiende las 2,653 alertas abiertas?

Hoy nadie — todas están en estado `abierta`. El flujo previsto es:
1. Analista entra a `/alertas`, filtra por severidad `crítica` o `alta`.
2. Pone una en `en_revision` mientras la investiga.
3. La marca como `resuelta` (era real, se actuó) o `descartada` (falso positivo).

El sistema soporta acciones masivas: seleccionar varias y cambiar estado de golpe. Las acciones quedan en `actualizado_en` para auditoría.

### Si marco como `descartada`, ¿la regla aprende y deja de mandarme eso?

**Hoy no.** La regla seguirá generando esa alerta porque está basada en umbrales fijos. **Mañana sí**, cuando lancemos la fase 2 de IA: el clasificador supervisado usará las descartadas como negativos fuertes y dejará de mostrar alertas similares. Es la siguiente fase del roadmap (sección 5 del documento técnico).

### ¿Por qué la misma transacción genera dos alertas distintas?

Porque las 3 reglas son independientes y no se anulan entre sí: la misma transacción puede ser inusual por su monto (regla 1) Y porque ese día su cajero procesó muchas (regla 3). En la página de alertas se ven como 2 filas con distinto `tipo`. Es por diseño — el motor da máximo recall y deja la decisión de priorización al analista.

### ¿Puedo asignar alertas a un analista específico?

Hoy no hay campo `assigned_to` en `joz_alertas`. Si lo necesita, son ~30 minutos de migración + ajuste en frontend. Lo agregamos al backlog si lo confirma como requerimiento.

### Cuando borro una alerta, ¿desaparece del histórico?

Sí, `DELETE` borra la fila físicamente. Si necesita conservarla para auditoría, debe usar `descartada` o `resuelta` en lugar de borrar. Recomiendo cambiar el comportamiento del botón "Eliminar" para que sea soft-delete (un campo `eliminada_en`); es ~1 hora de trabajo si lo confirmamos.

---

## 4. Reglas de detección

### ¿Por qué Z-score > 2 y no 1.5? ¿Esos umbrales son los correctos para mi negocio?

Z=2 es el umbral estadístico estándar para "fuera de lo normal" (≈2.5% de la cola superior asumiendo distribución normal). Lo elegimos como punto de partida razonable, pero **es ajustable en `/configuracion`** sin tocar código:
- `zscore_media: 2.0` → `zscore_alta: 3.0` → `zscore_critica: 4.0`

Si genera demasiadas alertas, súbalo a 2.5/3.5/4.5. Si muy pocas, baje a 1.8/2.5/3.5. Recomiendo iterar después de 2 semanas con feedback del equipo.

### ALMACEN 17 mueve 10x más que ALMACEN 70 — ¿no debería tener umbrales distintos?

Conceptualmente sí. Hoy las reglas usan los mismos umbrales para todos los almacenes, pero **el cálculo del Z-score se hace por grupo `(almacén, tipo, categoría)`** — entonces `μ` y `σ` ya son específicas de cada tienda. Un Z=3 en ALMACEN 70 significa "3 desviaciones del promedio de 70", no del promedio global.

Lo que falta es threshold de severidad por almacén (que ALMACEN 17 tolere Z=2 como normal y ALMACEN 70 lo trate como alto). Está en el roadmap fase 3.

### ¿Puedo crear una regla nueva sin tocar código?

Sí, con limitaciones. El endpoint `POST /api/joz/reglas-deteccion/` permite crear reglas nuevas eligiendo entre los 3 motores existentes (`zscore`, `conteo`, `ratio`) y configurando sus parámetros. Lo que NO puede hacer es crear motores nuevos (ej. "alerta si la suma de aportes del día supera X") — eso requiere agregar un motor en `detectar_anomalias.py`.

Su regla "cliente saca más de USD 5,000 en una hora" sería un motor `ventana_temporal` nuevo, no existe hoy. Lo podemos agregar (~4 horas de desarrollo).

### ¿Por qué fraccionamiento empieza en 5 y no en 3?

5 es el umbral típico de regulación AML para detectar structuring (partir una operación grande en muchas pequeñas para evadir reportes). Lo configuró su equipo de cumplimiento; si quiere hacerlo más sensible está en `parametros.min_txns` de la regla.

### Si desactivo una regla, ¿se borran sus alertas históricas?

No. Desactivar (`habilitada=false`) solo evita que se generen nuevas alertas. Las existentes quedan en BD con su estado actual. Para borrarlas hay que hacer DELETE explícito.

---

## 5. Riesgos

### ALMACEN 02 sale en `alto riesgo` con 92% — ¿qué hago?

92% NO es probabilidad de fraude. Es un score compuesto que pondera:
- 40% frecuencia de alertas (12.5% de las txns generan alerta)
- 30% calidad/severidad promedio de cada alerta
- 30% proporción de alertas graves

Que ALMACEN 02 esté en alto significa: **vale la pena auditar primero esta tienda** porque concentra muchas anomalías y de severidad alta. No significa que haya fraude. Recomiendo:
1. Click en "Ver detalle" → ver tipos de alerta más frecuentes.
2. Filtrar `/alertas?almacen=2&severidad=critica`.
3. Revisar las 5 más recientes con el gerente del almacén.

### ¿Qué quiere decir `probabilidad: 0.9266`?

Es el score normalizado de 0 a 1. **No es probabilidad estadística** de un evento puntual; es el peso relativo del riesgo del almacén comparado con los demás. Lo que el frontend muestra como "92%" es eso × 100. La descripción del modelo en la documentación es honesta sobre esto.

Si el cliente necesita una probabilidad real de fraude, hay que entrenar el modelo supervisado (fase 2 del roadmap IA) sobre alertas etiquetadas; ese sí da `predict_proba` interpretable.

### ALMACEN 70 dice `bajo` con 13 transacciones — ¿es seguro o falta data?

**Falta data.** El score sale 0.0 porque no hay alertas, pero con sólo 13 transacciones cualquier modelo es poco confiable. La regla 1 (Z-score) ni siquiera evalúa grupos con `n<5`. ALMACEN 70 está en producción reciente o muy poco activo; recomiendo verlo manualmente cada semana hasta acumular más datos.

### ¿El ranking se calcula con todo el histórico o solo con el rango filtrado?

**Todo el histórico.** El comando `_actualizar_riesgo_tiendas` no filtra por fecha, suma todas las transacciones y todas las alertas asociadas al almacén. Es por diseño — el riesgo no debería oscilar por filtros temporales del usuario que mira el dashboard.

Si quiere "riesgo solo del rango 5-6 mayo", hay que correr `detectar_anomalias --dias 2 --limpiar` (destructivo, borra el histórico de alertas).

### Si recalculo, pierdo el feedback de las alertas que ya curé. ¿Hay otra forma?

Hoy "Recalcular riesgos" desde la página corre `--limpiar` que borra todo. Lo correcto es:
- Para actualizar riesgos sin perder alertas: ajustar el código para que use `--dias N` sin `--limpiar` (lo dejamos para el próximo sprint).
- Mientras tanto: si curaste alertas y necesitas recalcular, exportá primero a CSV con `/sql-console`.

---

## 6. Inteligencia Artificial

### ¿La IA ya está corriendo en producción?

Parcialmente:
- **Ya entrenado y disponible**: Isolation Forest no supervisado (`joz/backend/joz/ml.py`), `POST /api/joz/ia/entrenar/` lo entrena en background con sus 23,247 transacciones; `GET /api/joz/ia/anomalias/` devuelve resultados.
- **No está aún**: el clasificador supervisado que aprende de las alertas curadas. Eso depende de tener varios cientos de alertas con estado `resuelta`/`descartada` por parte de su equipo. Hoy todas están en `abierta`, así que el feedback aún no existe.

### ¿Cuándo voy a ver resultados distintos a las reglas?

Cuando su equipo cure ~500 alertas (positivas/negativas) — estimamos 2-4 semanas de uso real. Ahí tiene sentido entrenar el clasificador y empezar a filtrar las alertas por `predict_proba > 0.7` para reducir ruido.

### Si la IA descarta una alerta real y no se actúa, ¿de quién es la responsabilidad?

La IA no descarta alertas en producción hoy; solo las prioriza. La decisión final siempre la toma el analista. En la fase 3 (filtro automático), el sistema mantendrá un log de todas las alertas suprimidas para que cumplimiento pueda revisar el "lado B" del filtro.

Es importante documentar contractualmente que la IA es asistencia, no automatización de decisiones de cumplimiento.

### ¿La IA expone los datos a OpenAI o servicios externos?

**No.** El modelo es scikit-learn corriendo dentro del contenedor `barranquia_joz_backend`. Los datos no salen de su infraestructura. Si en el futuro agregamos embeddings de descripción libre, le confirmamos antes el modelo (probablemente uno open-source local tipo sentence-transformers, también dentro del contenedor).

---

## 7. Compliance y auditoría

### ¿Puedo descargar los criterios de detección en PDF para la SBS / SAR?

Hoy no hay export PDF, pero el endpoint `GET /api/joz/reglas-deteccion/` devuelve JSON con todas las reglas, sus fórmulas, parámetros y descripciones. Es ~2 horas de trabajo agregar un export PDF si lo confirma como requerimiento.

Mientras tanto, este documento (`CALCULO_DASHBOARD_Y_REGLAS.md`) ya tiene toda la documentación formal y se puede compartir con el regulador.

### ¿Cuánto tiempo se guardan las alertas?

Indefinidamente, no hay TTL. Si su política exige 5 años, ya está cubierto. Si exige borrado a los X años (GDPR-like), hay que agregar un cron de purga.

### ¿Hay log de quién entró al dashboard y qué vio?

Login se loguea (token Django REST), pero no hay audit log de páginas vistas o acciones. Para una auditoría formal recomiendo agregar middleware de access-log → tabla `audit_log` (~1 día de trabajo).

### ¿Hay 2FA / rotación de contraseñas?

Hoy no, autenticación es usuario+contraseña con tokens DRF. Si su política lo requiere, integramos con su SSO corporativo o agregamos TOTP.

---

## 8. Operación y costo

### ¿Cuánto cuesta mantener esto al mes?

Hoy corre en infraestructura compartida del hub BarranquIA: 1 contenedor backend + 1 contenedor frontend + 1 PostgreSQL + 1 worker ETL. Costo de infra (servidor compartido): ~USD X/mes (depende del proveedor). Si requiere infra dedicada, se cotiza aparte.

La IA (Isolation Forest) corre dentro del backend, no agrega costo. La fase supervisada tampoco — entrenamiento es CPU local en minutos.

### Si abro ALMACEN 31, ¿qué configuro?

Nada en JOZ — el ETL detecta automáticamente cualquier código de almacén nuevo que aparezca en la respuesta del API de SuperEfectivo. Las reglas se aplican igual al almacén nuevo. Lo único es que hasta que acumule 5+ transacciones del mismo `(tipo, categoría)`, la regla Z-score no la evalúa (ese grupo no tiene base estadística).

### ¿Aguanta 100 tiendas?

Hoy con 30 tiendas y 23k transacciones, las consultas tardan <100ms. Con 100 tiendas y ~75k transacciones diarias seguiríamos en buen rango (PostgreSQL maneja millones de filas sin problema). Posibles cuellos:
- Detección de anomalías: hoy carga todo en memoria. A 1M+ transacciones hay que paginar (~1 día de trabajo).
- Frontend: si pinta >2000 alertas a la vez se pone lento. Se mitiga con paginación virtual.

Conclusión: 100 tiendas requieren un sprint de optimización pero la arquitectura aguanta.

### ¿Puedo conectar PowerBI / Excel para mis reportes?

Sí, dos formas:
1. **API directa** — los endpoints `/api/joz/stats/`, `/api/joz/historial/`, `/api/joz/alertas/` devuelven JSON. PowerBI lo consume con un Web Connector.
2. **PostgreSQL directo** — abrir un usuario read-only sobre la BD `joz` (~30 minutos de configuración) y conectar PowerBI vía driver PostgreSQL. Es lo recomendado para reportería pesada.

---

## 9. Las picantes

### Mostrame en VIVO una alerta crítica del día y qué hago con ella en 5 minutos.

Acción de la demo: filtrar `/alertas?severidad=critica&fecha_desde=2026-05-05`. Tomar la primera. Mostrar:
1. **Qué dispara** la alerta — texto descriptivo: "Aporte por USD X en almacén Y. Z-score 4.2 vs promedio del grupo".
2. **Contexto** — clic en el cliente para ver sus operaciones de la semana en `/historial`.
3. **Decisión** — si es legítima (cliente conocido, monto alto pero explicable), `descartada`. Si es sospechosa, `en_revision` y se contacta al gerente del almacén.
4. **Documentar** — comentario en el campo descripción (TODO: el campo de comentario aún no existe — agregarlo es ~30 min).

### Si el cajero está robando, ¿el sistema lo dice?

Directamente no. El sistema dice: "Cajero MARIA G. procesó 18 retiros el 5-may, 3.2x el promedio de 6/cajero/día" — esa es **señal**, no acusación. El analista cruza con: ¿es viernes de quincena (alto volumen normal)? ¿el monto promedio se mantiene? ¿hay patrones repetidos del mismo cliente?

Lo que SÍ va a detectar bien:
- Aperturas de caja con montos atípicos (regla 1).
- Retiros antes del horario de apertura (regla 1 + alerta de horario).
- Mismos clientes con muchas operaciones consecutivas (regla 2).
- Concentración de operaciones en un solo cajero (regla 3).

### Tuvimos un fraude el mes pasado que no detectamos. ¿Esta herramienta lo habría visto?

Para responder honestamente: pásenos el caso (transacciones, fechas, almacén, cajero) y lo corremos contra el motor. Le devolvemos en 24 hrs un análisis con: qué reglas habrían disparado, qué severidad, qué `score_anomalia`. Si ninguna lo detecta, identificamos qué regla nueva habría hecho falta.

Es la mejor demo posible: pruebas con datos reales del cliente.

### Mi competencia ofrece lo mismo a mitad de precio.

Las preguntas que vale la pena hacerle a la competencia:
1. ¿Sus reglas están documentadas con fórmula explícita o son una caja negra?
2. ¿Puede crear/desactivar reglas desde la interfaz, o requiere ticket al proveedor?
3. ¿La IA aprende del feedback de su equipo o es un modelo pre-entrenado genérico?
4. ¿Los datos salen de su infra hacia una nube externa?
5. ¿Le entregan el código fuente, o quedan atados al proveedor?

JOZ está en el repositorio del cliente, las reglas son administrables, la IA corre en su infra y no expone datos. Si la competencia es más barata pero entrega menos control, vale repensar el TCO a 3 años.

---

## 10. Cierre típico de la reunión

> "¿Qué necesita de nosotros para el próximo paso?"

Respuesta sugerida:
1. **Reanudar el ETL** para tener data del 6 de mayo en adelante (1 día).
2. **Onboarding del equipo de cumplimiento** — 2 horas de capacitación en `/alertas` y `/configuracion`.
3. **2 semanas de uso real** — ellos curan alertas (`resuelta`/`descartada`).
4. **Revisión conjunta** — al final de las 2 semanas, miramos los umbrales: ¿hay demasiadas? ¿muy pocas? Ajustamos.
5. **Lanzamiento de IA supervisada** — cuando haya ~500 alertas curadas.

Ese es un plan de 4-6 semanas, claro y ejecutable.
