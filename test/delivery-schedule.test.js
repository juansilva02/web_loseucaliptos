import test from 'node:test'
import assert from 'node:assert/strict'
import { getAvailableDeliveryDays } from '../src/lib/delivery-schedule.js'

test('agenda usa los proximos siete dias calendario y excluye domingo', () => {
  const days = getAvailableDeliveryDays({
    fromDate: new Date('2026-07-02T15:00:00Z'),
  })

  assert.deepEqual(
    days.map((day) => day.dateIso),
    ['2026-07-03', '2026-07-04', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09'],
  )
  assert.equal(days[0].slots.length, 2)
  assert.deepEqual(days[1].slots.map((slot) => slot.key), ['08-14'])
})

test('agenda nunca incluye el mismo dia', () => {
  const days = getAvailableDeliveryDays({
    fromDate: new Date('2026-07-04T01:00:00Z'),
  })

  assert.equal(days.some((day) => day.dateIso === '2026-07-03'), false)
})
