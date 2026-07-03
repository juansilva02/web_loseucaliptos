import test from 'node:test'
import assert from 'node:assert/strict'
import { makeUniqueSlug, slugify } from '../src/lib/slugify.js'

test('slugify normaliza nombres de producto', () => {
  assert.equal(slugify('Cemento Loma Negra 50 Kg.'), 'cemento-loma-negra-50-kg')
})

test('makeUniqueSlug evita IDs numericos dependientes de la posicion', () => {
  const occupied = new Set(['cemento', 'cemento-2'])
  assert.equal(makeUniqueSlug('Cemento', occupied), 'cemento-3')
})
