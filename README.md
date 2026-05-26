# Los Eucaliptus Corralon

Storefront publicitario y de venta para **Corralon Los Eucaliptus Solano**, construido sobre React + Vite y preparado para evolucionar hacia un flujo comercial con carrito, pedido y backend de ordenes.

## Stack

- `React 19`
- `Vite 8`
- `CSS` custom con tokens visuales
- `Node.js` para backend liviano de ordenes

## Estado actual

La web incluye:

- home comercial con identidad visual propia
- header sticky, hero, destacados y bloques de compra
- productos destacados curados manualmente
- carrito cliente-side con resumen flotante
- drawer de carrito con cantidades
- CTA directos a WhatsApp
- footer comercial con contacto y medios de pago

## Datos comerciales cargados

Se incorporaron referencias reales de:

- productos destacados
- precios manuales de productos clave
- formas de pago
- condiciones comerciales
- datos requeridos para tomar pedidos

## Estructura principal

- `src/App.jsx`: home y experiencia principal
- `src/App.css`: layout y estilos del storefront
- `src/index.css`: tokens globales, tipografia y fondo base
- `src/context/CartContext.jsx`: carrito y persistencia local
- `src/lib/catalog.js`: capa de catalogo derivada del Excel
- `server/index.js`: backend simple para ordenes
- `server/payway.js`: adaptador inicial para futura integracion de pagos

## Scripts

```bash
npm install
npm run dev
npm run build
npm run server
```

## Desarrollo local

Frontend:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

URL local esperada:

- [http://127.0.0.1:4173/](http://127.0.0.1:4173/)

Backend:

```bash
npm run server
```

API local:

- `GET /api/health`
- `POST /api/orders`
- `POST /api/orders/:id/payment-proof`

## Proximo paso recomendado

- conectar imagenes reales para productos destacados
- completar lista de precios por rubro
- cerrar flujo de checkout y pedido
- integrar medio de pago real cuando se defina el camino de Payway
