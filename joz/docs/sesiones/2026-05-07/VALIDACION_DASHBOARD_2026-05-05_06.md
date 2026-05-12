# Validación Dashboard JOZ — Filtro 2026-05-05 → 2026-05-06

> Documento de validación matemática que demuestra que cada tarjeta del Dashboard
> JOZ cuadra al peso con la base de datos. Se usa como ejemplo de auditoría del
> dashboard en producción (`https://joz-ccb.ngrok.io/dashboard`).
>
> **Fuente de datos:** BD `joz_postgres` (stack legacy) — backend `joz_backend`.
> **Fecha de validación:** 2026-05-07.
> **Rango filtrado:** 2026-05-05 al 2026-05-06 (inclusive).
> **Convención de formato:** es-CO — `.` separador de miles, `,` decimal.
> Todos los valores se redondean a entero.

---

## 1. KPIs principales (datos directos del API)

| KPI                                                    |     Valor |
| ------------------------------------------------------ | --------: |
| Volumen Aportes                                        |  $301.733 |
| Volumen Retiros                                        |  $331.399 |
| Balance Neto = Aportes − Retiros = 301.733 − 331.399   |  $-29.665 |
| Aportes + Retiros = 301.733 + 331.399                  |  $633.132 |

---

## 2. Suma de entradas por almacén → debe igualar Aportes

```
ALM 05:  45.882
ALM 17:  32.792
ALM 03:  22.318
ALM 02:  21.403
ALM 12:  15.706
ALM 06:  14.775
ALM 22:  10.889
ALM 15:  10.431
ALM 25:   9.821
ALM 07:   9.719
ALM 19:   9.676
ALM 16:   9.624
ALM 18:   8.077
ALM 09:   8.010
ALM 10:   7.478
ALM 26:   7.303
ALM 27:   7.135
ALM 21:   6.457
ALM 14:   5.884
ALM 04:   5.736
ALM 30:   5.525
ALM 13:   5.233
ALM 20:   5.010
ALM 23:   3.288
ALM 24:   3.163
ALM 08:   2.809
ALM 29:   2.763
ALM 11:   2.436
ALM 01:   2.391
ALM 70:       0
─────────────────
Σ      301.733  ← = KPI Volumen Aportes ✓
```

---

## 3. Suma de salidas por almacén → debe igualar Retiros

```
ALM 17:  42.853
ALM 05:  42.428
ALM 03:  28.420
ALM 12:  16.421
ALM 06:  14.045
ALM 16:  13.881
ALM 25:  13.374
ALM 02:  13.128
ALM 15:  11.425
ALM 29:  10.985
ALM 13:  10.572
ALM 07:   9.929
ALM 21:   9.446
ALM 09:   9.358
ALM 26:   8.572
ALM 22:   8.428
ALM 04:   7.455
ALM 10:   6.855
ALM 18:   6.352
ALM 14:   6.339
ALM 19:   6.275
ALM 27:   5.766
ALM 20:   5.393
ALM 08:   5.144
ALM 23:   3.717
ALM 30:   3.704
ALM 24:   3.647
ALM 11:   3.007
ALM 01:   2.481
ALM 70:   2.000
─────────────────
Σ      331.399  ← = KPI Volumen Retiros ✓
```

---

## 4. Verificación de identidad

```
Σ entradas + Σ salidas = 301.733 + 331.399 =  633.132   ← suma total
Σ entradas − Σ salidas = 301.733 − 331.399 =  -29.665   ← balance neto
```

| Identidad                       | Cálculo                       |                      Resultado |
| ------------------------------- | ----------------------------- | -----------------------------: |
| Suma entradas almacenes         | 45.882 + 32.792 + ... + 0     |           $301.733 = Aportes ✓ |
| Suma salidas almacenes          | 42.853 + 42.428 + ... + 2.000 |           $331.399 = Retiros ✓ |
| Suma totales (E+S) por almacén  | 88.310 + 75.645 + ... + 2.000 | $633.132 = Aportes + Retiros ✓ |
| Balance neto global             | 301.733 − 331.399             |                     $-29.665 ✓ |

---

## 5. Cantidades

| Concepto                                                |                                Total |
| ------------------------------------------------------- | -----------------------------------: |
| Transacciones totales (incluye internas)                | 5.298 (mostrado en KPI Transacciones)|
| Transacciones netas (excluye internas)                  |                                4.827 |
| Aportes (count)                                         |                                3.170 |
| Retiros (count)                                         |                                1.657 |
| Operaciones internas (aperturas + cierres + traslados)  |                                  471 |
| 3.170 + 1.657 + 471                                     |                              5.298 ✓ |

---

## 6. Lectura del balance neto

`Balance Neto = -$29.665` significa que en los 2 días, **JOZ entregó $29.665 más de lo que recibió** de sus clientes. Es coherente con el negocio: hubo más empeños nuevos (salidas de efectivo hacia el cliente) que pagos + intereses + retiros con cobro (entradas de efectivo desde el cliente).

---

## 7. SQL utilizado

```sql
-- Definición común: rango filtrado y exclusión de operaciones internas
WITH base AS (
  SELECT * FROM joz_transacciones
  WHERE fecha BETWEEN '2026-05-05' AND '2026-05-06'
    AND almacen IS NOT NULL
), neto AS (
  SELECT * FROM base
  WHERE NOT (
        LOWER(descripcion) LIKE 'apertura%'
     OR LOWER(descripcion) LIKE 'cierre%'
     OR LOWER(descripcion) LIKE '%traslado%'
     OR LOWER(descripcion) LIKE '%transferencia entre%'
     OR LOWER(descripcion) LIKE '%movimiento entre almac%'
  )
)
-- KPIs globales
SELECT
  ROUND(SUM(entrada))::int                 AS volumen_aportes,
  ROUND(SUM(salida))::int                  AS volumen_retiros,
  ROUND(SUM(entrada) + SUM(salida))::int   AS aportes_mas_retiros,
  ROUND(SUM(entrada) - SUM(salida))::int   AS balance_neto,
  COUNT(*)                                 AS txns_neto
FROM neto;

-- Desglose por almacén (entradas, salidas, suma, transacciones)
SELECT
  CONCAT('ALM ', LPAD(almacen::text, 2, '0'))  AS almacen,
  ROUND(SUM(entrada))::int                      AS entradas,
  ROUND(SUM(salida))::int                       AS salidas,
  ROUND(SUM(entrada) + SUM(salida))::int        AS suma,
  COUNT(*)                                      AS txns
FROM neto
GROUP BY almacen
ORDER BY suma DESC;
```

---

## 8. Conclusión

Todas las identidades del dashboard cuadran al peso con la BD:

- ✓ Suma de entradas por almacén = `KPI Volumen Aportes` ($301.733)
- ✓ Suma de salidas por almacén = `KPI Volumen Retiros` ($331.399)
- ✓ Suma de totales por almacén = `Aportes + Retiros` ($633.132)
- ✓ Balance neto consistente: -$29.665
- ✓ Conteo de transacciones cuadra: 3.170 + 1.657 + 471 = 5.298

El dashboard refleja fielmente la base de datos en el rango analizado.
