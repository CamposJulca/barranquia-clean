# JOZ Monitoring

## Su sistema de vigilancia inteligente para operaciones financieras

---

## Que es JOZ Monitoring

JOZ Monitoring es una plataforma que vigila automaticamente todas las operaciones financieras de sus 30 sucursales, las 24 horas del dia, los 7 dias de la semana. El sistema se conecta directamente a SuperEfectivo, analiza cada transaccion y le avisa cuando algo no se ve normal.

Pienselo como un auditor digital que nunca duerme: revisa cada empeno, cada retiro, cada abono, cada apertura y cierre de caja, y solo le notifica cuando encuentra algo que merece su atencion.

---

## Que problema resuelve

Antes de JOZ, detectar irregularidades requeria revisar manualmente miles de transacciones o esperar a las auditorias periodicas. Con 30 sucursales generando cientos de movimientos diarios, es humanamente imposible revisar todo.

JOZ resuelve esto automatizando la vigilancia:

- **Antes:** Se enteraba de problemas dias o semanas despues
- **Ahora:** Recibe alertas el mismo dia, con detalle de que paso y donde

- **Antes:** Revisaba reportes generales sin saber donde enfocar la atencion
- **Ahora:** El sistema le dice exactamente cuales sucursales necesitan atencion y por que

- **Antes:** Dependia de la experiencia individual para identificar patrones sospechosos
- **Ahora:** Reglas matematicas objetivas analizan cada transaccion bajo los mismos criterios

---

## Como funciona (en terminos simples)

### Paso 1 — El sistema recoge los datos

Cada hora, JOZ se conecta a SuperEfectivo y descarga todos los movimientos nuevos de las 30 sucursales. No tiene que hacer nada: esto ocurre automaticamente, de dia y de noche.

### Paso 2 — Analiza cada transaccion

El sistema pasa cada transaccion por tres filtros de deteccion:

**Filtro 1: Montos fuera de lo normal**
Si en una sucursal el promedio de transacciones es de $500.000 y aparece una de $8.000.000, el sistema la marca. No cualquier monto alto genera alerta — tiene que ser verdaderamente excepcional comparado con lo que es normal *para esa sucursal especifica*. Cada almacen tiene su propio patron.

**Filtro 2: Operaciones fuera de horario**
Si una transaccion se registra a las 3 de la manana o a las 11 de la noche, el sistema la marca. El horario operativo configurado es de 5:00 AM a 10:00 PM. Transacciones de madrugada con montos altos reciben mayor atencion.

**Filtro 3: Cajeros con actividad inusual**
Si un cajero procesa 3 veces mas transacciones que el promedio en un dia, el sistema lo detecta. Esto puede indicar sobrecarga, falta de rotacion, o actividad que vale la pena revisar.

### Paso 3 — Clasifica la gravedad

No todas las alertas son iguales. El sistema les asigna una severidad:

- **Critica** — Situacion muy inusual que requiere atencion inmediata (ejemplo: un monto 6 veces por encima de lo normal)
- **Alta** — Situacion significativa que debe revisarse pronto
- **Media** — Situacion que vale la pena conocer pero no es urgente

### Paso 4 — Calcula el riesgo de cada sucursal

Con base en las alertas, el sistema calcula un nivel de riesgo para cada almacen:

- **Riesgo Alto** — Sucursales con patron sostenido de anomalias. Requieren investigacion
- **Riesgo Medio** — Sucursales con algunas anomalias. Monitorear de cerca
- **Riesgo Bajo** — Sucursales operando dentro de parametros normales

### Paso 5 — Usted toma decisiones

Toda esta informacion se presenta en un panel visual donde puede ver el panorama general, profundizar en una sucursal, revisar alertas individuales y marcarlas como revisadas, resueltas o descartadas.

---

## Que ve en cada pantalla

### Inicio (Dashboard)

La primera pantalla que ve al entrar. Le muestra de un vistazo:

- Cuantas transacciones se han procesado y el volumen total de dinero
- Cuantos aportes y retiros hubo
- Cuantas anomalias se detectaron hoy y cuantas alertas criticas hay abiertas
- Un desglose por tipo de operacion (empenos, retiros de empeno, abonos, aperturas/cierres de caja)
- Una tabla dia por dia mostrando la actividad y el porcentaje de anomalias
- Tarjetas por cada sucursal con su volumen — puede hacer clic en cualquiera para ver su detalle

Puede filtrar por rango de fechas para comparar periodos.

### Alertas

Es el centro de trabajo diario. Aqui gestiona las anomalias detectadas:

- Ve la lista completa de alertas con fecha, sucursal, tipo de anomalia, monto y severidad
- Puede filtrar por nivel de riesgo (alto, medio, bajo), por sucursal o por fechas
- Al hacer clic en "Ver", se abre el detalle con la explicacion completa de por que se genero la alerta
- Puede cambiar el estado de cada alerta: **Abierta** → **En revision** → **Resuelta** o **Descartada**
- La pantalla se actualiza automaticamente cada 30 segundos

**Ejemplo de lo que vera:**
> *"Aporte por $7.250.000 en almacen 02 (2026-04-25). Z-score 5.8 (promedio $412.000, desviacion $1.180.000). Cliente: Juan Perez."*

Esto le dice: en el almacen 02, donde lo normal es alrededor de $412.000, se registro una operacion de $7.250.000. Es 5.8 veces la desviacion tipica. El sistema considero esto critico.

### Riesgos

Vista estrategica que responde la pregunta: **cuales sucursales necesitan mas atencion?**

- Grafico circular mostrando cuantas sucursales estan en riesgo alto, medio y bajo
- Ranking de las 5 sucursales con mas anomalias
- Tabla con todos los riesgos operativos calculados, incluyendo probabilidad e impacto estimado
- Tarjetas de cada sucursal con su nivel de riesgo
- Boton "Recalcular riesgos" para actualizar el analisis en cualquier momento

### Historial

Explorador completo de todas las transacciones:

- Busque por nombre de cliente, numero de documento, cedula o descripcion
- Filtre por fechas y por origen de datos
- Vea cada transaccion con su referencia, fecha, sucursal, tipo de operacion, cliente, cajero, entrada y salida

### Detalle por Almacen

Al hacer clic en una sucursal desde el Dashboard, ve todo sobre ella:

- Total de transacciones, ingresos, retiros y balance
- Lista completa de sus operaciones
- Filtrable por fechas

### Monitor ETL

Muestra el estado de la conexion con SuperEfectivo:

- Si la sincronizacion automatica esta activa (cada hora)
- Cuantas ejecuciones se han hecho y cuantos registros se han cargado
- Historial de cada sincronizacion con su resultado (exitosa o con errores)
- Opcion de ejecutar una sincronizacion manual si necesita datos al momento

### Inteligencia Artificial

Modulo avanzado de Machine Learning que complementa las reglas operativas:

- Utiliza un algoritmo llamado **Isolation Forest** que analiza 9 variables de cada transaccion simultaneamente
- Mientras las reglas evaluan una cosa a la vez (monto, horario, cajero), la IA busca combinaciones inusuales que las reglas individuales no capturan
- Se entrena con un clic y aprende automaticamente que es "normal" en sus operaciones
- Util para descubrir patrones nuevos que no se habian contemplado

### Consola SQL

Herramienta para consultas avanzadas sobre los datos. Permite hacer preguntas especificas como:
- "Cuantas transacciones hizo el cajero X la semana pasada?"
- "Cual es el monto promedio por sucursal este mes?"
- Solo permite consultas de lectura — no se pueden modificar datos

### Configuracion

Donde se ajustan las reglas de deteccion:

- **Activar o desactivar** cada regla con un interruptor (switch)
- **Ajustar los umbrales** — por ejemplo, hacer mas o menos estricta la deteccion de montos inusuales
- **Guardar** los cambios
- **Ejecutar la deteccion** para que las nuevas reglas se apliquen inmediatamente

Tambien permite cambiar la contrasena del usuario.

---

## Las reglas que protegen su operacion

### Regla 1: Montos fuera de lo normal

| | |
|---|---|
| **Que detecta** | Transacciones con montos excepcionalmente altos o bajos para una sucursal |
| **Como decide** | Compara cada monto contra el promedio historico de esa sucursal. Solo alerta si la desviacion es extrema (3.5 veces la desviacion estandar o mas) |
| **Severidad media** | El monto se desvia 3.5 veces de lo normal |
| **Severidad alta** | El monto se desvia 5 veces de lo normal |
| **Severidad critica** | El monto se desvia 6.5 veces de lo normal |
| **Alertas actuales** | 409 de 17,925 transacciones (2.3%) |

### Regla 2: Operaciones fuera de horario

| | |
|---|---|
| **Que detecta** | Transacciones registradas antes de las 5:00 AM o despues de las 10:00 PM |
| **Severidad alta** | Operaciones entre 11:00 PM y 4:00 AM (madrugada), o fuera de horario con monto mayor a $5.000 |
| **Severidad media** | Operaciones entre 4:00 AM y 5:00 AM, o entre 10:00 PM y 11:00 PM |
| **Alertas actuales** | 237 |

### Regla 3: Cajeros con actividad concentrada

| | |
|---|---|
| **Que detecta** | Cajeros que procesan 3 veces mas transacciones que el promedio diario |
| **Dato de contexto** | El promedio es ~22 transacciones por cajero por dia. Un cajero necesita superar 66 para generar alerta |
| **Severidad alta** | 4 veces el promedio o mas |
| **Severidad media** | Entre 3 y 4 veces el promedio |
| **Alertas actuales** | 21 |

### Resumen actual

| Concepto | Cantidad |
|----------|----------|
| Total de transacciones analizadas | 17,925 |
| Total de alertas generadas | 667 |
| Promedio de alertas por dia | ~22 (menos de 1 por sucursal) |
| Alertas criticas | 22 |
| Alertas altas | 221 |
| Alertas medias | 424 |
| Sucursales en riesgo alto | 3 |
| Sucursales en riesgo medio | 25 |
| Sucursales en riesgo bajo | 2 |

---

## Flujo de trabajo recomendado

### Rutina diaria (5-10 minutos)

1. Entre al **Dashboard** y revise los KPIs del dia — especialmente "Alertas Hoy" y "Criticas"
2. Vaya a **Alertas**, filtre por severidad "Alto" y revise las mas importantes
3. Para cada alerta relevante, haga clic en "Ver", lea la descripcion y cambie el estado a "En revision" o "Resuelta"
4. Si una alerta no amerita accion, marquela como "Descartada"

### Revision semanal (15-20 minutos)

1. Revise la pantalla de **Riesgos** — identifique si alguna sucursal subio o bajo de nivel
2. Consulte el **Historial** de las sucursales en riesgo alto para entender el contexto
3. En el **Monitor ETL**, verifique que la sincronizacion automatica viene funcionando sin errores

### Ajuste mensual

1. En **Configuracion**, revise si los umbrales siguen siendo adecuados
2. Si hay demasiadas alertas de un tipo, suba el umbral. Si se estan escapando situaciones, bajelo
3. Considere entrenar el modelo de **IA** con los datos acumulados del mes para descubrir patrones nuevos

---

## Preguntas frecuentes

**El sistema puede modificar datos en SuperEfectivo?**
No. JOZ solamente lee informacion. No puede crear, modificar ni eliminar transacciones en SuperEfectivo.

**Que pasa si se cae la conexion a internet?**
El scheduler reintenta la sincronizacion cada hora. Cuando la conexion se restaura, descarga los datos pendientes. No se pierde informacion.

**Puedo cambiar que tan estrictas son las reglas?**
Si. Desde Configuracion > Deteccion puede subir o bajar los umbrales de cada regla, activarlas o desactivarlas, y ejecutar la deteccion inmediatamente para ver el efecto.

**Que significa el "Score de anomalia"?**
Es un numero de 0 a 100 que indica que tan inusual es una transaccion. Mayor a 80 es preocupante. Mayor a 90 es critico. Se calcula automaticamente segun la regla que lo detecto.

**Cuantos usuarios pueden acceder?**
El sistema soporta multiples usuarios autenticados. Cada uno con su contrasena.

**Los datos estan seguros?**
Si. El acceso requiere autenticacion, la conexion es por HTTPS, y la consola SQL solo permite consultas de lectura.

**Cada cuanto se actualizan los datos?**
Cada hora, automaticamente. Tambien puede forzar una actualizacion manual desde el Monitor ETL.

---

*JOZ Monitoring v1.0 — Desarrollado por BarranquIA*
*Abril 2026*
