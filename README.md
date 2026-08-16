# 🌿 Mint TCMS — Modern Open-Source Test Management

A modern, AI-powered test case management system built for QA engineers.

**Features:** Test management • AI test generation • Execution tracking • Comprehensive reporting • REST API

**Tech Stack:** NestJS API (port 3000) • Next.js frontend (port 3001) • PostgreSQL • Docker

## Prerequisites

- [Node.js](https://nodejs.org) + npm
- [Docker](https://www.docker.com) (for the database)

## Setup

```bash
# Install dependencies
npm install
```

Create `api/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mint
JWT_SECRET=changeme
JWT_EXPIRES_IN=7d
ONBOARDING_MODE=self_serve
PORT=3000
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-20b
AI_API_KEY=your_ai_api_key
```

`ONBOARDING_MODE` values:
- `self_serve` (default): new users get their own personal organization automatically
- `enterprise`: reserved for future implementation (currently not enabled)

In `self_serve` mode, registration requires `organizationName`.
Organization names are unique (case-insensitive), so an existing name cannot be reused.

Create `web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Running

```bash

# Start full stack (db + api + web) via Docker Compose
npm run stack:up

```

Stop services:

```bash
# Stop everything started by compose
npm run stack:down

```

## Testing

```bash
npm run test:api       # Unit tests
npm run test:e2e:api   # API e2e tests
npm run test:e2e       # Playwright feature tests
npm run test:a11y      # Accessibility tests
```

## API Reference

When the API is running, documentation is available at:

- Scalar UI: http://localhost:3000/api-reference
- OpenAPI JSON: http://localhost:3000/openapi.json

## Quick Links

- 🌐 **Website:** https://minttcms.com
- 📖 **Docs:** See repository wiki
- 🐛 **Issues:** Report bugs on GitHub
- 💬 **Discussions:** GitHub discussions

## License

MIT
