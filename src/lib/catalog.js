import { deliveryBranchByKey } from './delivery-config'

export const whatsappBase = deliveryBranchByKey('solano').whatsappUrl
export const whatsappBosques = deliveryBranchByKey('bosques').whatsappUrl

export const categoryDefinitions = [
  {
    key: 'aridos-y-obra-gruesa',
    name: 'Aridos y Obra Gruesa',
    shortName: 'Aridos',
    description: 'Arena, cascote, piedra, tosca, cemento y cal para arranque de obra.',
  },
  {
    key: 'hierros-y-estructura',
    name: 'Hierros y Estructura',
    shortName: 'Hierros',
    description: 'Varillas, vigas, mallas, alambres y refuerzos para estructura.',
  },
  {
    key: 'ladrillos-y-bloques',
    name: 'Ladrillos y Bloques',
    shortName: 'Ladrillos',
    description: 'Bloques, ladrillos y piezas de mamposteria para cerramientos.',
  },
  {
    key: 'construccion-en-seco',
    name: 'Construccion en Seco',
    shortName: 'Seco',
    description: 'Yesos, placas, masillas, membranas y terminaciones.',
  },
  {
    key: 'sanitarios-y-plomeria',
    name: 'Sanitarios y Plomeria',
    shortName: 'Sanitarios',
    description: 'Bachas, canillas, vanitorys, canos, uniones y accesorios de agua.',
  },
  {
    key: 'ferreteria-y-herramientas',
    name: 'Ferreteria y Herramientas',
    shortName: 'Ferreteria',
    description: 'Electricidad, herramientas, fijaciones y accesorios para la obra.',
  },
  {
    key: 'otros-materiales',
    name: 'Otros Materiales',
    shortName: 'Otros',
    description: 'Materiales y accesorios para distintas etapas de obra.',
  },
]

const categoryByKey = new Map(categoryDefinitions.map((category) => [category.key, category]))

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function getCategoryDefinition(key) {
  return categoryByKey.get(key) || categoryByKey.get('otros-materiales')
}

export function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0)
}

export function formatPrice(value) {
  return Number(value) > 0 ? formatMoney(value) : 'A consultar'
}

export function resolveImage(path) {
  if (!path) return null
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path
  return `${import.meta.env.BASE_URL}${path}`
}
