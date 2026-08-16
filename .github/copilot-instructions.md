# Akash - Test Management App

## Architecture Overview

An MVP test management application with a NestJS backend and Next.js frontend, backed by PostgreSQL and deployed via Docker Compose or Vercel.

### Tech Stack
- **Backend**: NestJS (Node.js) with TypeScript, port 3000
- **Frontend**: Next.js 16 with TypeScript + Tailwind CSS 4, port 3001
- **Database**: PostgreSQL 16 (via Docker Compose)
- **Authentication**: JWT + Passport (`@nestjs/passport`, `passport-jwt`, `passport-local`)
- **ORM**: TypeORM 0.3.x with `synchronize: true` in development
- **Package Manager**: npm
- **Deployment**: Docker Compose / Vercel

### Monorepo Structure
npm workspace monorepo with three concerns:
```
akash/
├── package.json            # Root workspace scripts
├── docker-compose.yml      # PostgreSQL service
├── api/                    # NestJS backend (port 3000)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   ├── users/
│   │   ├── projects/
│   │   ├── test-cases/
│   │   ├── test-runs/
│   │   └── test-results/
│   ├── test/               # e2e tests
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── web/                    # Next.js frontend (port 3001)
│   ├── app/                # App Router pages
│   │   ├── (app)/          # Auth-protected route group
│   │   │   ├── dashboard/
│   │   │   └── projects/
│   │   ├── login/
│   │   └── register/
│   ├── components/         # Reusable components
│   └── lib/                # API client, types, auth context
├── test/                   # e2e tests (39 total, all passing)
├── docker-compose.yml      # PostgreSQL container
└── .env                    # Environment variables
```

## Development Workflow

### Starting the application
```bash
# Start database
npm run db:up

# Backend (port 3000) — from root
npm run dev:api

# Frontend (port 3001) — from root
npm run dev:web

# Or run individually from subdirectories
cd api && npm run start:dev
cd web && npm run dev
```

### Environment variables
Backend (`api/.env`):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL connection
- `JWT_SECRET` — Secret for signing JWT tokens
- `JWT_EXPIRES_IN` — Token expiry (default: `7d`)
- `PORT` — Server port (default: `3000`)

Frontend (`web/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default: `http://localhost:3000`)

## Backend Patterns (NestJS)

### Module pattern
Each feature is a separate NestJS module with controller, service, entity, and DTOs:
```
api/src/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── entities/{feature}.entity.ts
└── dto/
    ├── create-{feature}.dto.ts
    └── update-{feature}.dto.ts
```

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Register user, returns JWT |
| POST | `/auth/login` | ❌ | Login, returns JWT |
| GET/POST/PATCH/DELETE | `/users/:id` | ✅ | User CRUD |
| GET/POST/PATCH/DELETE | `/projects/:id` | ✅ | Projects (scoped by owner) |
| GET/POST/PATCH/DELETE | `/projects/:projectId/test-cases/:id` | ✅ | Test cases |
| GET/POST/PATCH/DELETE | `/projects/:projectId/test-runs/:id` | ✅ | Test runs |
| PATCH | `/projects/:projectId/test-runs/:id/results/:resultId` | ✅ | Update test result |

### Authentication flow
1. User registers/logs in → backend issues JWT with `{ sub: userId, email }`
2. Token stored in `localStorage` on the frontend
3. Protected routes use `@UseGuards(JwtAuthGuard)`
4. User ID accessed via `req.user.id` in controllers

### Validation
All DTOs use `class-validator` decorators. Global `ValidationPipe({ whitelist: true })` strips unknown fields.

## Frontend Patterns (Next.js)

### Route structure
```
app/
├── page.tsx                # Root redirect (→ /dashboard or /login)
├── login/page.tsx          # Login form
├── register/page.tsx       # Registration form
└── (app)/                  # Auth-protected group layout
    ├── layout.tsx           # Navbar + AuthGuard wrapper
    ├── dashboard/page.tsx   # Dashboard with project overview
    └── projects/
        ├── page.tsx         # Project list
        ├── new/page.tsx     # Create project form
        └── [id]/
            ├── page.tsx     # Project detail (cases + runs)
            ├── test-cases/
            │   ├── new/page.tsx
            │   └── [caseId]/page.tsx
            └── test-runs/
                ├── new/page.tsx
                └── [runId]/page.tsx
```

### API client (`lib/api.ts`)
Centralized fetch wrapper with JWT auth:
```typescript
import { get, post, patch, del } from '@/lib/api';
const projects = await get<Project[]>('/projects');
const created = await post<Project>('/projects', { name: 'New' });
```

### Auth context (`lib/auth-context.tsx`)
React context providing `{ user, loading, login, register, logout }`. Wraps the app in `AuthProvider`. Protected routes use `AuthGuard` component.

### Styling
Tailwind CSS 4 with zinc color palette. Dark mode supported via `prefers-color-scheme`.

## Common Tasks

### Adding a new backend feature
1. Generate module: `nest generate module feature`
2. Generate controller/service: `nest generate controller/service feature`
3. Define entity with TypeORM decorators
4. Define DTOs with class-validator
5. Register module in `app.module.ts`

### Adding a new frontend page
1. Create route in `web/app/(app)/[route]/page.tsx`
2. Use `'use client'` directive for interactive pages
3. Fetch data with `get()`/`post()` from `@/lib/api`
4. Auth is handled automatically by the `(app)` layout group

### Running tests
```bash
npm run test:e2e:api # Run API e2e tests from root
npm run test:api     # Unit tests

# Or from api/ directly
cd api && npm run test:e2e
```

## Key Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Group by feature, not by type
- All API errors throw `ApiError` with status, statusText, and parsed body
