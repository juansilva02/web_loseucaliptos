# Seguridad de la automatizacion WhatsApp

## Alcance

Las rutas `/api/automation/consultations` reciben datos sensibles del cliente:
telefono, nombre, mensaje, CUIL, direccion y forma de pago. No son rutas para el
frontend publico ni para el panel de administracion.

## Capas activas

1. Nginx devuelve `404` para `POST` y `GET /api/automation/consultations` cuando
   llegan por el dominio publico. El `404` evita revelar que la ruta existe.
2. El API valida la IP del socket de cada solicitud. Solo acepta loopback y la
   red Docker configurada en `AUTOMATION_ALLOWED_CIDRS`.
3. La configuracion actual es:

   `127.0.0.1/32,::1/128,172.28.0.0/16`

   El rango Docker debe revisarse si cambia el proyecto Compose. No se confia en
   `X-Forwarded-For`, porque una solicitud externa puede falsificar esa cabecera.
4. La ruta conserva idempotencia mediante `idempotencyKey`, para evitar guardar
   dos veces un mismo mensaje de OpenWA.

## Integracion n8n

n8n debe usar exclusivamente la URL interna:

`http://loseucaliptos-api:3001/api/automation/consultations`

El workflow `eucabot` permanece inactivo durante las pruebas de seguridad. No se
debe activar en produccion sin probar primero un mensaje real y confirmar que la
consulta queda guardada una sola vez.

En esta fase no hay un secreto compartido entre n8n y el API. La proteccion se
basa en la red privada Docker y en el bloqueo de Nginx. Un contenedor comprometido
que comparta esa red podria alcanzar la ruta. La siguiente mejora recomendada es
agregar Header Auth con un secreto fuera del JSON exportado del workflow.

## Verificacion

Desde cualquier equipo externo, la ruta debe responder `404`:

```sh
curl -i https://corralonloseucaliptus.com/api/automation/consultations
```

En el VPS, el API debe seguir listo:

```sh
curl -fsS http://127.0.0.1:3001/health/ready
docker ps --format '{{.Names}} {{.Status}}' | grep -E 'loseucaliptos-api|n8n|openwa'
```

Para probar desde la red de n8n sin crear datos, enviar un cuerpo incompleto y
esperar `400`:

```sh
docker exec n8n node -e "fetch('http://loseucaliptos-api:3001/api/automation/consultations',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(async r=>console.log(r.status,await r.text()))"
```

## Operacion y rollback

Antes de cambiar el rango permitido, comprobar la red:

```sh
docker network inspect loseucaliptos_default
```

Despues de cualquier cambio de codigo:

```sh
cd /opt/loseucaliptos/server
docker compose up -d --build api
docker compose ps
```

Para revertir solo la regla Nginx, restaurar la copia creada en el VPS y validar
antes de recargar:

```sh
cp /root/corralon.nginx.before-automation-security /etc/nginx/sites-enabled/corralon
nginx -t && systemctl reload nginx
```

Para revertir el API, usar el commit anterior en Git y reconstruir solo el
servicio `api`. No reiniciar n8n ni OpenWA como parte de este rollback.

## Datos y registros

No incluir CUIL, direccion ni el contenido completo del mensaje en logs, commits,
exports de n8n o capturas. Los logs actuales registran metodo, ruta, estado,
duracion e identificador de solicitud, no el cuerpo JSON.
