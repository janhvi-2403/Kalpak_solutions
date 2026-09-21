# Development & Operating Guide

## 1. Prerequisites
* **Node.js**: v20.x or v22.x LTS (active runtime: Node.js 22.19+)
* **Package Manager**: pnpm or npm
* **Docker & Docker Compose**: for local PostgreSQL 16 and Redis 7

---

## 2. Quickstart Guide

### 1. Environment Configuration
Copy the development template:
```bash
cp .env.example .env
```

### 2. Start Backing Services via Docker
```bash
npm run docker:up
```
This launches:
* **PostgreSQL 16** on `localhost:5432` with database `kalpak_saas_db` and RLS initialization scripts.
* **Redis 7** on `localhost:6379`.

### 3. Install Workspace Dependencies
```bash
pnpm install
# or
npm install
```

### 4. Apply Database Migrations & Seed Baseline Data
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Start Development Servers
Start all applications concurrently:
```bash
npm run dev
```
Or start services independently:
* API Server: `npm run dev:api` (Runs on `http://localhost:4000`, OpenAPI docs at `/api/docs`)
* Web Application: `npm run dev:web` (Runs on `http://localhost:3000`)
* Background Worker: `npm run dev:worker`

---

## 3. Useful Development Commands

| Command | Description |
| :--- | :--- |
| `npm run typecheck` | Runs TypeScript compilation verification across all apps and packages. |
| `npm run lint` | Runs ESLint analysis across the repository. |
| `npm run test` | Executes automated test suites. |
| `npm run db:studio` | Launches Prisma Studio GUI for database inspection. |
| `npm run docker:down` | Stops local backing containers. |
| `npm run docker:logs` | Streams container logs. |
