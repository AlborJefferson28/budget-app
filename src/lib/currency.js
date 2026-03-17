const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export const formatCOP = (value) => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return COP_FORMATTER.format(0)
  return COP_FORMATTER.format(numericValue)
}

export const parseCOP = (value) => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  let normalized = String(value).trim().replace(/[^\d.,-]/g, '')

  const isDotThousandsFormat = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)

  if (isDotThousandsFormat) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (!normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replace(/,/g, '')
  } else {
    normalized = normalized.replace(/,/g, '')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
