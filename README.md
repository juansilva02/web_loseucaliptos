# Los Eucaliptus Corralon

Landing + catálogo comercial para **Corralon Los Eucaliptus**, con sucursales en Solano y Bosques (Zona Sur, Buenos Aires). Construida con React 19 + Vite 8, sin dependencias de UI externas.

## Stack

- `React 19`
- `Vite 8`
- `CSS` custom con tokens visuales

## Estado actual

### Home (`/`)

- Header utilitario con horarios y modalidades de atención
- Header sticky con acceso rápido al carrito y botones de WhatsApp por sucursal
- Hero con highlights animados rotativos y CTA de compra / WhatsApp
- Service band: envíos, stock, atención y medios de pago
- Grilla de productos destacados con filtro por categoría y carousel automático
- Rail de beneficios: envíos coordinados, medios de pago, armado de pedido, WhatsApp directo
- Carrusel de sucursales con mapa embed de Google Maps para Solano y Bosques
- Bloque editorial de cierre con CTA comercial
- Footer con datos de contacto y condiciones de cuotas
- Botón flotante de WhatsApp (Solano)
- Carrito flotante resumen con acceso directo al drawer
- Drawer de carrito lateral: cantidades, totales, envío a WhatsApp por sucursal

### Catálogo (`/catalogo`)

- Búsqueda por nombre, marca o categoría (normalización de tildes)
- Filtros por categoría con conteo de productos
- Grilla de productos: precio, marca, unidad, selector de cantidad
- Botón "Agregar al carrito" cuando hay precio, "Consultar precio" vía WhatsApp cuando no
- Nota de actualización de precios al pie

### Carrito

- Estado global via `CartContext` con persistencia en `localStorage`
- Construcción automática del mensaje de pedido para WhatsApp (ítems, cantidades, subtotal)
- Envío diferenciado por sucursal (Solano / Bosques)

## Sucursales

| Sucursal | Dirección | Teléfono | Horario |
|---|---|---|---|
| Solano | Av. Monteverde 2766, San Francisco Solano | 11 5974-8316 | Lun–Vie 8–12 y 14–19 \| Sab 8–14 |
| Bosques | Av. Guillermo Hudson 2855, Bosques, Florencio Varela | 11 3062-3113 | Lun–Vie 8–18 \| Sab 8–15 |

## Estructura de archivos

```
src/
├── App.jsx                         — home completo y layout raíz
├── App.css                         — estilos del storefront
├── index.css                       — tokens globales, tipografía, fondo base
├── main.jsx                        — entrada de la app
├── assets/
│   ├── logo-header-los-eucaliptos.png
│   ├── promo-camion.png / .svg
│   ├── promo-cta-corralon.png
│   ├── icono-cubo.png
│   └── featured-products/          — imágenes de productos destacados (SVG/PNG)
├── context/
│   └── CartContext.jsx             — carrito global + persistencia localStorage
├── data/
│   ├── catalog.js                  — catálogo raw importado del Excel (~3000 SKUs)
│   └── featured-catalog.json       — productos destacados y catálogo curado del CatalogPage
├── lib/
│   └── catalog.js                  — capa de transformación: categorías, marcas, precios, WhatsApp URLs
└── pages/
    ├── CatalogPage.jsx             — página de catálogo con búsqueda y filtros
    └── CatalogPage.css
```

## Datos cargados

- Catálogo raw del Excel con ~3000+ SKUs (`src/data/catalog.js`)
- 18 productos destacados curados con precios manuales (`featured-catalog.json`, actualizado 2026-06-05)
- ~63 productos para el CatalogPage en 6 categorías
- Marcas: Loma Negra, Weber, Klaukol, Tuyango, Acindar, Quilmes, Premecol, Polipol, Fanelli, Argent

## Categorías de productos

| Clave | Nombre |
|---|---|
| `aridos-y-obra-gruesa` | Áridos y Obra Gruesa |
| `hierros-y-estructura` | Hierros y Estructura |
| `ladrillos-y-bloques` | Ladrillos y Bloques |
| `construccion-en-seco` | Construcción en Seco |
| `sanitarios-y-plomeria` | Sanitarios y Plomería |
| `ferreteria-y-herramientas` | Ferretería y Herramientas |

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Desarrollo local

```bash
npm run dev
# → http://localhost:5173/
```

## Próximos pasos recomendados

- Completar precios en `featured-catalog.json` para los productos con `price: 0`
- Agregar imágenes reales para más productos destacados
- Cubrir más SKUs del catálogo raw en el CatalogPage
- Revisar optimización de imágenes pesadas del home
- Agregar número de teléfono de Solano en la sección de sucursales (actualmente sin `phone` explícito en el objeto de la sucursal)
