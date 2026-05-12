// Formateadores unificados para JOZ — locale es-CO, sin decimales en moneda.
// Todo en es-CO para que la convención sea consistente: "." separador de miles, "," decimal.
// `fmtUSD` redondea a entero porque el negocio opera con cifras enteras y los
// decimales generan ruido visual (y antes había mezcla en-US/es-CO confundible).

const _usd = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const _num = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export const fmtUSD = (n) => _usd.format(Number(n) || 0)
export const fmtNum = (n) => _num.format(Number(n) || 0)

// Porcentaje con N decimales (ej. fmtPct(12.34, 1) => "12,3%")
export const fmtPct = (n, decimals = 0) => {
  const v = Number(n) || 0
  return `${v.toLocaleString('es-CO', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}%`
}

// Hora en formato HH:MM a partir de minutos desde medianoche.
// fmtHora(0)→"00:00", fmtHora(508)→"08:28", fmtHora(null)→"—".
export const fmtHora = (minutos) => {
  if (minutos === null || minutos === undefined) return '—'
  const m = Number(minutos)
  if (!Number.isFinite(m) || m < 0) return '—'
  const h = Math.floor(m / 60) % 24
  const mm = Math.floor(m % 60)
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
