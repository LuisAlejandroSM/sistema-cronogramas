# Instalación en servidor · Sistema de Cronogramas SST/SIHO

Guía para instalar el sistema en un servidor Linux. Se probó de punta a punta en el mismo
entorno donde se desarrolló: base vacía → migración → datos iniciales → compilación → app en
modo producción.

## 1. Requisitos

| Componente | Versión |
|---|---|
| Sistema operativo | Ubuntu Server 26.04 LTS (también sirve 24.04 LTS), 64 bits (x86_64) |
| PostgreSQL | **18** (desarrollado con 18.6) · codificación UTF8 · sin extensiones adicionales |
| Bun | **1.4.0** (ejecuta la aplicación; no hace falta Node.js) |
| Proxy web | nginx (o el que use Informática) con certificado HTTPS |
| Otros | git, 1 GB de RAM como mínimo, disco para fotos de formularios |

Archivos que se entregan:

- **Repositorio:** https://github.com/LuisAlejandroSM/sistema-cronogramas (rama `main`).
- **`datos-iniciales.sql`** (se entrega aparte, NO está en el repositorio porque contiene la
  contraseña cifrada del administrador): catálogo de 34 formatos (CVC-SST-FT-11), los
  formularios creados y la cuenta del administrador.

## 2. Zona horaria del servidor

El sistema calcula "hoy" con la hora del servidor (pendientes, atrasados, formularios del día).
Debe ser la hora local de la operación:

```bash
sudo timedatectl set-timezone America/Caracas
timedatectl   # verificar
```

## 3. PostgreSQL 18

En Ubuntu 26.04 viene en los repositorios oficiales:

```bash
sudo apt update
sudo apt install -y postgresql-18
```

En Ubuntu 24.04 instalarlo desde el repositorio oficial de PostgreSQL (PGDG):

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-18
```

Crear el usuario y la base de datos (cambie la contraseña):

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE admin_sst LOGIN PASSWORD 'CAMBIAR_CLAVE_SEGURA';
CREATE DATABASE sst_inspecciones OWNER admin_sst ENCODING 'UTF8' TEMPLATE template0;
SQL
```

## 4. Bun 1.4.0

```bash
sudo apt install -y unzip git
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.0"
sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
bun --version   # debe decir 1.4.0
```

## 5. Código y configuración

```bash
sudo useradd --system --create-home --home-dir /opt/sistema-cronogramas cronogramas
sudo -u cronogramas git clone https://github.com/LuisAlejandroSM/sistema-cronogramas.git /opt/sistema-cronogramas/app
cd /opt/sistema-cronogramas/app
sudo -u cronogramas cp .env.example .env.local
sudo -u cronogramas nano .env.local
```

En `.env.local` complete:

- `DATABASE_URL` con la contraseña del paso 3.
- `SESSION_SECRET`: un texto aleatorio nuevo (`openssl rand -base64 48`). **No reutilice el del
  equipo de desarrollo.**
- `TZ="America/Caracas"`.
- `ARCHIVOS_DIR`: carpeta de fotos y firmas (ver paso 6).
- `COOKIE_INSEGURA="1"` **solo** si el sistema se va a usar sin HTTPS.

## 6. Carpeta de fotos y firmas

Las fotos y firmas de los formularios se guardan en disco (no en la base de datos). La carpeta
debe persistir y entrar en los respaldos:

```bash
sudo mkdir -p /var/lib/sistema-cronogramas/archivos
sudo chown -R cronogramas:cronogramas /var/lib/sistema-cronogramas
```

## 7. Base de datos: estructura y datos iniciales

```bash
cd /opt/sistema-cronogramas/app
sudo -u cronogramas bun install --frozen-lockfile
sudo -u cronogramas bun run db:migrate          # crea las tablas (carpeta drizzle/)
psql "postgresql://admin_sst:CAMBIAR_CLAVE_SEGURA@localhost:5432/sst_inspecciones" \
     -v ON_ERROR_STOP=1 -f /ruta/a/datos-iniciales.sql
```

Verificación (debe mostrar 1 usuario, 34 formatos y 2 formularios):

```bash
psql "postgresql://admin_sst:CAMBIAR_CLAVE_SEGURA@localhost:5432/sst_inspecciones" -c \
  "select (select count(*) from usuarios) usuarios, (select count(*) from plantillas_inspeccion) formatos, (select count(*) from formularios) formularios;"
```

> **Instalación desde cero sin `datos-iniciales.sql`:** después de `db:migrate`, ejecute
> `bun run db:seed` (carga el catálogo) y `bun run db:crear-admin` (crea el administrador con
> `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_CLAVE` de `.env.local`).

## 8. Compilar y ejecutar como servicio

```bash
cd /opt/sistema-cronogramas/app
sudo -u cronogramas bun run build
```

Crear `/etc/systemd/system/sistema-cronogramas.service`:

```ini
[Unit]
Description=Sistema de Cronogramas SST/SIHO
After=network.target postgresql.service

[Service]
Type=simple
User=cronogramas
WorkingDirectory=/opt/sistema-cronogramas/app
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=TZ=America/Caracas
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sistema-cronogramas
sudo systemctl status sistema-cronogramas
curl -I http://127.0.0.1:3000/login   # debe responder 200
```

## 9. nginx con HTTPS

```nginx
server {
    listen 443 ssl;
    server_name cronogramas.empresa.com;            # ajustar

    ssl_certificate     /etc/ssl/certs/cronogramas.crt;   # ajustar
    ssl_certificate_key /etc/ssl/private/cronogramas.key; # ajustar

    # Las fotos de los formularios llegan hasta 4 MB por envío.
    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name cronogramas.empresa.com;
    return 301 https://$host$request_uri;
}
```

La sesión usa cookies seguras: **sin HTTPS no se puede iniciar sesión**, salvo que se defina
`COOKIE_INSEGURA="1"` en `.env.local`.

## 10. Primer ingreso

Entrar con la cuenta del administrador que viene en `datos-iniciales.sql`
(`admin@cronogramas.local`, con la contraseña que ya conoce el administrador del sistema).
Desde **Inspectores** se registran los usuarios reales y desde **Cronogramas** se generan sus planes.

## 11. Respaldos (recomendado diario)

```bash
# Base de datos
pg_dump -Fc "postgresql://admin_sst:CLAVE@localhost:5432/sst_inspecciones" \
  > /respaldos/sst_inspecciones_$(date +%F).dump
# Fotos y firmas
tar czf /respaldos/archivos_$(date +%F).tar.gz -C /var/lib/sistema-cronogramas archivos
```

Restaurar una copia: `pg_restore -d sst_inspecciones --clean --no-owner archivo.dump`.

## 12. Actualizar a una nueva versión

```bash
cd /opt/sistema-cronogramas/app
sudo -u cronogramas git pull
sudo -u cronogramas bun install --frozen-lockfile
sudo -u cronogramas bun run db:migrate     # aplica solo las migraciones nuevas
sudo -u cronogramas bun run build
sudo systemctl restart sistema-cronogramas
```

Los cambios de estructura de la base de datos llegan como migraciones nuevas en la carpeta
`drizzle/`; `db:migrate` aplica únicamente las que falten y nunca borra datos por sí solo.
