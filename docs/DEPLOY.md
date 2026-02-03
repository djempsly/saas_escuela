# Guía de Deploy - Plataforma Educativa Multi-Tenant

## Requisitos del Servidor

- **VPS con Ubuntu 22.04/24.04 LTS** (recomendado: DigitalOcean, Hetzner, Vultr)
- **Mínimo:** 2GB RAM, 50GB SSD
- **Docker y Docker Compose** instalados
- **Un dominio propio** con acceso a configuración DNS

## Paso 1: Preparar el Servidor

```bash
# Conectar al VPS
ssh root@TU_IP

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Verificar instalación
docker --version
docker compose version
```

## Paso 2: Configurar DNS de tu Dominio

En tu proveedor de DNS (Cloudflare, Namecheap, etc.), configura:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | [IP del VPS] | 3600 |
| A | * | [IP del VPS] | 3600 |

El registro wildcard `*` hace que **todos** los subdominios lleguen a tu servidor.

## Paso 3: Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/plataforma-escuela-v2.git /opt/plataforma
cd /opt/plataforma

# Crear archivo de entorno
cp .env.production.example .env

# Editar con tus valores
nano .env
```

### Variables de Entorno Importantes:

```env
# Generar password seguro
DB_PASSWORD=$(openssl rand -base64 24)

# Generar JWT secret
JWT_SECRET=$(openssl rand -base64 48)

# Tu dominio
BASE_DOMAIN=tudominio.com
SERVER_IP=xxx.xxx.xxx.xxx
```

## Paso 4: Deploy

```bash
# Dar permisos a scripts
chmod +x scripts/*.sh

# Ejecutar deploy
./scripts/deploy.sh
```

Esto levanta:
- **App:** Backend Node.js en puerto 4000 (interno)
- **DB:** PostgreSQL en puerto 5432 (interno)
- **Caddy:** Proxy reverso en puertos 80/443 con SSL automático

## Paso 5: Verificar

```bash
# Ver logs
docker compose logs -f

# Verificar servicios
docker compose ps

# Probar endpoint
curl https://tudominio.com/api/v1/auth/health
```

---

## Agregar Instituciones con Dominio Propio

### Opción 1: Desde el Panel de Admin (Recomendado)

1. El admin de la institución entra a su panel
2. Va a **Configuración → Dominios → Agregar dominio**
3. Escribe su dominio (ej: `politecnicoolga.com`)
4. El sistema muestra las instrucciones DNS
5. El cliente configura su DNS
6. El sistema verifica automáticamente cada hora
7. Cuando el DNS está verificado, el dominio funciona con SSL automático

### Opción 2: Desde la Terminal

```bash
./scripts/add-domain.sh politecnicoolga.com INSTITUCION_ID
```

### Instrucciones para el Cliente

> **Para conectar tu dominio a la plataforma:**
>
> 1. Ve a tu proveedor de dominio
> 2. Busca "DNS" o "Configuración DNS"
> 3. Agrega este registro:
>    - Tipo: **A**
>    - Nombre: **@**
>    - Valor: **[IP DEL VPS]**
> 4. Para que www también funcione:
>    - Tipo: **CNAME**
>    - Nombre: **www**
>    - Valor: **tudominio.com**
> 5. Los cambios pueden tardar hasta 48 horas
> 6. El certificado SSL se genera automáticamente

---

## Operaciones Comunes

### Ver Logs

```bash
# Logs en tiempo real
docker compose logs -f app

# Logs de un servicio específico
docker compose logs -f caddy
```

### Actualizar la Aplicación

```bash
./scripts/deploy.sh
```

### Rollback

```bash
./scripts/rollback.sh
```

### Backup Manual

```bash
# Backup de base de datos
docker compose exec db pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql

# Backup de uploads
tar -czf uploads_$(date +%Y%m%d).tar.gz uploads/
```

### Restaurar Backup

```bash
docker compose exec -T db psql -U $DB_USER $DB_NAME < backup_YYYYMMDD.sql
```

---

## Monitoreo

### Estado de Servicios

```bash
docker compose ps
docker stats
```

### Ver Certificados SSL

```bash
docker compose exec caddy caddy list-certificates
```

### Logs de Acceso (Caddy)

```bash
docker compose exec caddy tail -f /data/access.log
```

---

## Troubleshooting

### El dominio no carga

1. Verificar DNS: `dig +short tudominio.com`
2. Verificar que apunta a tu IP
3. Revisar logs de Caddy: `docker compose logs caddy`

### Error de certificado SSL

1. Verificar que el puerto 80 y 443 están abiertos
2. Revisar que el dominio está verificado en la DB
3. Reiniciar Caddy: `docker compose restart caddy`

### App no responde

1. Ver logs: `docker compose logs app`
2. Verificar health: `docker compose exec app wget -qO- localhost:4000/`
3. Reiniciar: `docker compose restart app`

### Base de datos llena

```bash
# Ver uso de disco
docker system df

# Limpiar imágenes viejas
docker image prune -a

# Ver tamaño de DB
docker compose exec db psql -U $DB_USER -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));"
```

---

## Arquitectura

```
                    ┌─────────────┐
    Internet ────▶  │   Caddy     │  ◀──── SSL automático
                    │  (80/443)   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   App       │  ◀──── Backend Node.js
                    │  (4000)     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │  ◀──── Base de datos
                    │  (5432)     │
                    └─────────────┘
```

## Flujo de Dominios Personalizados

```
1. Cliente registra dominio → INSERT en InstitucionDominio
2. Job verifica DNS cada hora → UPDATE verificado=true
3. Usuario accede al dominio → Caddy pregunta /api/internal/verify-domain
4. Backend responde 200 OK → Caddy genera certificado
5. Caddy hace reverse proxy → App resuelve tenant por hostname
6. Landing page del cliente aparece con su branding
```
