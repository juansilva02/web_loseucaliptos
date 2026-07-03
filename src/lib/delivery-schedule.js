import { deliveryScheduleConfig } from './delivery-config.js'

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  timeZone: deliveryScheduleConfig.timezone,
})
const DAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  timeZone: deliveryScheduleConfig.timezone,
})

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function businessDateParts(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: deliveryScheduleConfig.timezone,
  }).formatToParts(value)
  const get = (type) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function dateFromParts(parts, offsetDays = 0) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays, 12))
}

function toIsoDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function slotsForDay(dayNumber) {
  if (dayNumber === 0) return []
  return dayNumber === 6
    ? deliveryScheduleConfig.saturdaySlots
    : deliveryScheduleConfig.weekdaySlots
}

export function getAvailableDeliveryDays({
  fromDate = new Date(),
  calendarDays = deliveryScheduleConfig.windowCalendarDays,
} = {}) {
  const base = businessDateParts(fromDate)
  const days = []

  for (let offset = 1; offset <= calendarDays; offset += 1) {
    const day = dateFromParts(base, offset)
    const slots = slotsForDay(day.getUTCDay())
    if (!slots.length) continue
    days.push({
      dateIso: toIsoDate(day),
      label: `${capitalize(WEEKDAY_FORMATTER.format(day))} ${DAY_FORMATTER.format(day)}`,
      weekdayLabel: capitalize(WEEKDAY_FORMATTER.format(day)),
      slots,
    })
  }

  return days
}
