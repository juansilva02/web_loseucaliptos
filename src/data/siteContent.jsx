// Contenido estático del sitio (data, no lógica). Separado de App.jsx.
import { CreditCard, Landmark, Truck, MapPin, Hammer, Zap } from 'lucide-react'
import promoMateriales from '../assets/promo-cta-corralon.webp'

export const promoImages = [
  { src: promoMateriales, alt: 'Materiales para la construccion en Corralon Los Eucaliptus' },
]

export const benefitTicker = [
  { Icon: CreditCard, label: <>Efectivo, transferencia y <strong>tarjetas</strong></> },
  { Icon: Landmark, label: <><strong>1 a 3 cuotas</strong> 20% int. · <strong>4 a 6</strong> 29%</> },
  { Icon: Truck, label: <>Envíos propios <strong>Zona Sur</strong></> },
  { Icon: MapPin, label: <>Retirá en <strong>Solano</strong> y <strong>Bosques</strong></> },
  { Icon: Hammer, label: <>Stock <strong>permanente</strong></> },
  { Icon: Zap, label: <>Atención <strong>mayorista y minorista</strong></> },
]

// Coincide con el FAQPage JSON-LD de index.html (AEO)
export const faqs = [
  {
    q: '¿Hacen envíos a domicilio?',
    a: 'Sí. Tenemos envío propio en Zona Sur desde nuestras sucursales de Solano y Bosques. Coordinás la entrega por WhatsApp y verificás tu zona desde el sitio.',
  },
  {
    q: '¿Dónde están las sucursales?',
    a: 'Tenemos dos sucursales: Solano en Av. Monteverde 2766 (San Francisco Solano) y Bosques en Av. Guillermo Hudson 2855 (Florencio Varela).',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos efectivo, transferencias bancarias y tarjetas de credito y debito. Con tarjeta de credito: de 1 a 3 cuotas tiene un 20% de interes y de 4 a 6 cuotas un 29% de interes.',
  },
  {
    q: '¿Cuál es el horario de atención?',
    a: 'Solano: lunes a viernes de 8:00 a 12:00 y de 14:00 a 19:00, sábados de 8:00 a 14:00. Bosques: lunes a viernes de 8:00 a 18:00, sábados de 8:00 a 15:00.',
  },
  {
    q: '¿Cómo hago un pedido?',
    a: 'Armás tu carrito en el sitio y lo enviás por WhatsApp, o nos consultás directamente. Te respondemos en el día con precios y disponibilidad.',
  },
  {
    q: '¿Puedo retirar en el corralón?',
    a: 'Sí, podés retirar tu pedido por cualquiera de las dos sucursales, Solano o Bosques.',
  },
]

export const heroSignals = [
  'Tarjetas de credito: 1 a 3 cuotas 20% int. · 4 a 6 cuotas 29%',
  'Pedidos por WhatsApp con respuesta directa',
  'Envios rapidos en Zona Sur y alrededores',
]

export const branches = [
  {
    name: 'Corralon Los Eucaliptus "Solano"',
    kicker: 'Sucursal Solano',
    heading: 'Visitanos en Av. Monteverde 2766',
    description:
      'Estamos en San Francisco Solano, Zona Sur. Podes acercarte o escribirnos por WhatsApp para coordinar el pedido y la entrega.',
    address: 'Av. Monteverde 2766, San Francisco Solano, Buenos Aires',
    hours: 'Lun a Vie 8:00 a 12:00 y 14:00 a 19:00 | Sab 08:00 a 14:00',
    lat: -34.7904685,
    lng: -58.3096963,
    coverageRadius: 5000, // metros (5 km)
    mapsEmbedUrl: 'https://www.google.com/maps?q=-34.7904685,-58.3096963&output=embed',
    mapsDirectionsUrl:
      'https://www.google.com/maps/place/Corral%C3%B3n+Los+Eucaliptus+%22Solano%22/@-34.7904685,-58.3096963,17z/data=!3m1!4b1!4m6!3m5!1s0x95a32c71520b4479:0x4a3a34f33c1db2be!8m2!3d-34.7904685!4d-58.3096963!16s%2Fg%2F11c6pnxypl?hl=en-US&entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D',
  },
  {
    name: 'Corralon Los Eucaliptus "Bosques"',
    kicker: 'Sucursal Bosques',
    heading: 'Visitanos en Av. Guillermo Hudson 2855',
    description:
      'Encontranos en Bosques, Florencio Varela. Los mismos materiales, la misma atencion y el mismo compromiso de siempre.',
    address: 'Av. Guillermo Hudson 2855, Bosques, Buenos Aires',
    phone: '11 3062-3113',
    hours: 'Lun a Vie 08:00 a 18:00 | Sab 08:00 a 15:00',
    lat: -34.8315412,
    lng: -58.2423633,
    coverageRadius: 5000, // metros (5 km)
    mapsEmbedUrl: 'https://www.google.com/maps?q=-34.8315412,-58.2423633&output=embed',
    mapsDirectionsUrl:
      'https://www.google.com/maps/place/Corralon+Los+Eucaliptus+%22Bosques%22/@-34.8315412,-58.2449382,17z/data=!3m1!4b1!4m6!3m5!1s0x95a329fb5902748d:0xc9956ec6f35647e6!8m2!3d-34.8315412!4d-58.2423633!16s%2Fg%2F11l2fcpsk1?entry=tts',
  },
]

export const purchaseSteps = [
  {
    title: 'Arma tu carrito',
    text: 'Suma ladrillos, cemento, hierros y todo lo que pida tu obra.',
    tone: 'light',
  },
  {
    title: 'Envialo por WhatsApp',
    text: 'El pedido llega directo a Solano o Bosques y te respondemos en el dia.',
    tone: 'dark',
    showWhatsapp: true,
  },
  {
    title: 'Elegi como pagar',
    text: 'Efectivo, transferencia, debito o credito. Con credito: 1 a 3 cuotas 20% de interes y 4 a 6 cuotas 29%.',
    tone: 'accent',
  },
  {
    title: 'Recibilo en obra',
    text: 'Coordinamos el envio en Zona Sur o lo retiras por la sucursal.',
    tone: 'light',
  },
]
