# Plataforma Escolar v2

Sistema de gestión escolar multi-tenant con soporte para múltiples sistemas educativos (República Dominicana y Haití).

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Radix UI |
| **Backend** | Express 5, TypeScript, Prisma ORM, Zod |
| **Base de datos** | PostgreSQL 16 |
| **Almacenamiento** | Amazon S3 + CloudFront |
| **Proxy reverso** | Caddy (SSL automático) |
| **Monitoreo** | Sentry |
| **Contenedores** | Docker + Docker Compose |

## Estructura de carpetas

```
plataforma-escuela-v2/
├── backend/
│   ├── prisma/              # Schema y migraciones de BD
│   └── src/
│       ├── config/          # Configuración (DB, logger, env)
│       ├── controllers/     # Controladores de rutas
│       ├── errors/          # Clases de error personalizadas
│       ├── jobs/            # Tareas programadas (cron)
│       ├── middleware/      # Auth, tenant, error handler
│       ├── routes/          # Definición de rutas
│       ├── services/        # Lógica de negocio
│       ├── types/           # Tipos TypeScript
│       └── utils/           # Schemas Zod, helpers
├── frontend/
│   └── src/
│       ├── app/             # Rutas Next.js (App Router)
│       ├── components/      # Componentes React
│       ├── lib/             # API client, utilidades
│       ├── store/           # Estado global (Zustand)
│       └── middleware.ts    # Middleware multi-tenant
├── docker-compose.yml       # Orquestación de contenedores
├── Caddyfile                # Configuración del proxy reverso
└── scripts/                 # Scripts de utilidad
```

## Setup local

### Prerrequisitos

- Node.js 20+
- PostgreSQL 16
- npm

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd plataforma-escuela-v2

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# Frontend
# Crear frontend/.env.local con:
# NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
# NEXT_PUBLIC_BASE_DOMAIN=localhost
```

### 3. Configurar base de datos

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Iniciar servidores de desarrollo

```bash
# Terminal 1 - Backend (puerto 4000)
cd backend
npm run dev

# Terminal 2 - Frontend (puerto 3000)
cd frontend
npm run dev
```

## Comandos disponibles

### Backend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compilar TypeScript a JavaScript |
| `npm run start` | Iniciar servidor compilado (producción) |
| `npm run lint` | Ejecutar ESLint |
| `npm run format` | Formatear código con Prettier |
| `npx tsc --noEmit` | Verificar tipos sin compilar |
| `npx prisma migrate dev` | Ejecutar migraciones pendientes |
| `npx prisma studio` | Abrir GUI de base de datos |

### Frontend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Next.js |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar build de producción |
| `npm run lint` | Ejecutar ESLint |

### Docker (producción)

```bash
docker compose up -d        # Levantar todos los servicios
docker compose down          # Detener servicios
docker compose logs -f app   # Ver logs del backend
```
