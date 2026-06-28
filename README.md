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
- Grilla de productos destacados con buscador en vivo, filtro por categoría y carousel automático
- Rail de beneficios: envíos coordinados, medios de pago, armado de pedido, WhatsApp directo
- Carrusel de sucursales con mapa embed de Google Maps para Solano y Bosques
- Bloque editorial de cierre con CTA comercial
- Footer con datos de contacto y condiciones de cuotas
- Botón flotante de WhatsApp (Solano)
- Carrito flotante resumen con acceso directo al drawer
- Drawer de carrito lateral: cantidades, totales, envío a WhatsApp por sucursal
- Accesibilidad: objetivos táctiles ampliados, contraste del carrito y soporte de `prefers-reduced-motion`
- Header responsivo: logo y acciones en fila hasta 640px
- SEO: canonical, Open Graph con URL absoluta, JSON-LD `HardwareStore` por sucursal, `robots.txt` y `sitemap.xml` (dominio placeholder `web-loseucaliptus.vercel.app` — actualizar al definir dominio final)

### Catálogo (`/catalogo`)

- Búsqueda por nombre, marca o categoría (normalización de tildes)
- Filtros por categoría con conteo de productos
- Imágenes en las fichas de producto
- Grilla de productos: precio, marca, unidad, selector de cantidad
- Botón "Agregar al carrito" cuando hay precio, "Consultar precio" vía WhatsApp cuando no
- Nota de actualización de precios al pie

### Carrito

- Estado global via `CartContext` con persistencia en `localStorage`
- Construcción automática del mensaje de pedido para WhatsApp (ítems, cantidades, subtotal)
- Envío diferenciado por sucursal (Solano / Bosques)

### Panel de administración (`/#admin`)

Sección privada para que el administrador gestione el catálogo **sin tocar código**. Se accede agregando `#admin` a la URL (no aparece en la navegación del sitio).

- Acceso protegido con **usuario + contraseña** (validación en el navegador; credenciales configurables por variables de entorno `VITE_ADMIN_USER` y `VITE_ADMIN_PASS_HASH`)
- **Destacados (home):** editar título, subtítulo/marca, categoría, precio e imagen
- **Catálogo completo:** editar precio, marca, categoría y unidad; **ocultar/mostrar** un producto (sin borrarlo) o **eliminarlo**; agregar productos nuevos
- **Categorías:** renombrar las categorías del catálogo
- **Imágenes:** subir PNG/JPG/WEBP/SVG por producto con vista previa instantánea
- Borrador guardado en el navegador (sobrevive recargas)
- **Publicación (modelo export / commit):** el botón "Exportar cambios" descarga un `featured-catalog.json` actualizado y las imágenes nuevas; se reemplaza el JSON en `src/data/`, se copian las imágenes a `public/product-images/`, se commitea y Vercel redeploya
- Guía detallada de uso en [`ADMIN.md`](./ADMIN.md)

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
├── Root.jsx                        — enrutado por hash: storefront vs panel /#admin
├── admin/
│   ├── AdminPage.jsx               — panel de administración (login + editor)
│   ├── AdminPage.css               — estilos del panel
│   ├── adminConfig.js              — credenciales/hash y validación de acceso
│   └── catalogStore.js             — borrador, lectura del catálogo y exportación
├── assets/
│   ├── logo-header-los-eucaliptos.png
│   ├── promo-camion.png
│   ├── promo-cta-corralon.png
│   └── featured-products/          — imágenes de productos destacados (PNG)
├── components/
│   └── CoverageMap.jsx             — mapa Leaflet con radio de cobertura por sucursal
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

public/
└── product-images/                 — imágenes de producto administradas desde el panel /#admin

ADMIN.md                            — guía de uso del panel de administración
```

## Datos cargados

- Catálogo raw del Excel con 1756 SKUs (`src/data/catalog.js`), 1753 con precio cargado
- 18 productos destacados curados (`featured-catalog.json`, actualizado 2026-06-05) — todos con imagen real
- 64 productos para el CatalogPage en 6 categorías
- Marcas: Loma Negra, Weber, Klaukol, Tuyango, Acindar, Quilmes, Premecol, Polipol, Fanelli, Argent

## Categorías de productos

| Clave | Nombre |
|---|---|
| `aridos-y-obra-gruesa` | Áridos y Obra Gruesa |
| `hierros-y-estructura` | Hierros y Estructura |
| `ladrillos-y-bloques` | Ladrillos y Bloques |
| `construccion-en-seco` | Construcción en Seco |
| `sanitarios-y-plomeria` | Sanitarios y Plomería |
| `electricidad-y-ferreteria` | Electricidad y Ferretería |

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

- Cambiar las credenciales por defecto del panel antes de producción (ver [`ADMIN.md`](./ADMIN.md))
- Completar precios en `featured-catalog.json`: varios productos del CatalogPage tienen `price: 0` (hoy caen en "Consultar precio") — ahora editables desde el panel `/#admin`
- Cubrir más SKUs del catálogo raw en el CatalogPage
- Sumar imágenes reales a más productos del CatalogPage (desde el panel `/#admin`)
- Imágenes del home optimizadas (peso reducido ~50%); revisar al sumar nuevas
- Agregar número de teléfono de Solano en la sección de sucursales (actualmente sin `phone` explícito en el objeto de la sucursal)
