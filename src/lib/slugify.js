export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function makeUniqueSlug(value, occupiedIds) {
  const base = slugify(value) || 'producto'
  let candidate = base
  let suffix = 2
  while (occupiedIds.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  occupiedIds.add(candidate)
  return candidate
}
