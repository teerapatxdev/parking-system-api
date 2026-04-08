# Parking System API

A REST API for managing a parking system, built with **NestJS**, **TypeScript**, **TypeORM**, and **PostgreSQL**.

The service is split into two audiences:

- **Public endpoints** (no login required) — for end customers: browse parking lots, view a lot's live status, park a car, and leave a slot.
- **Authenticated endpoints** (JWT required) — for staff/admins: user management, creating/updating/deleting parking lots, and viewing ticket history.

---

## Tech Stack

- **Framework**: [NestJS 11](https://nestjs.com/) (TypeScript)
- **Database**: PostgreSQL 16 (via [TypeORM](https://typeorm.io/))
- **Auth**: JWT (`@nestjs/jwt` + `passport-jwt`)
- **Validation**: `class-validator` + `class-transformer`
- **API Docs**: Swagger (`@nestjs/swagger`)
- **Containerization**: Docker + Docker Compose
- **Tests**: Jest (unit tests)

---

## Prerequisites

Before running the project, please install the following on your machine:

- **[Docker](https://www.docker.com/products/docker-desktop/)** (with Compose v2) — required to build and run the API + database with a single command.
- **[PostgreSQL 16](https://www.postgresql.org/download/)** — required **only** if you plan to run the app locally without Docker (see [Local Development](#local-development-without-docker)). If you use the Docker path, Postgres 16 is provided automatically by the `postgres` service in [docker-compose.yml](docker-compose.yml) and you do **not** need to install it on your host.

---

## Quick Start (Docker — recommended)

The only requirement on your machine is **Docker** (with Compose v2).

```bash
git clone <this-repo-url>
cd parking-system-api
docker compose up --build
```

That single command will:

1. Build the API image from [Dockerfile](Dockerfile)
2. Pull and start a PostgreSQL 16 container
3. Wait until Postgres is healthy
4. Run all TypeORM migrations
5. Start the NestJS app on port `3000`

When you see `Nest application successfully started`, the API is ready.

### Endpoints

| Resource | URL |
|---|---|
| API base | http://localhost:3000/api |
| Swagger UI | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/api/health |

### Stopping

```bash
# stop containers
docker compose down

# stop AND wipe the database volume (fresh start, migrations re-run next time)
docker compose down -v
```

> **Note on port `5432`**: the Postgres container is **not** exposed to the host by default — the API talks to it over the internal Docker network. If you want to connect a DB client (DBeaver / TablePlus / psql), uncomment the `ports` block under the `postgres` service in [docker-compose.yml](docker-compose.yml).

---

## Local Development (without Docker)

If you prefer to run the app directly on your machine:

### Prerequisites

- Node.js 20+
- npm 10+
- A running PostgreSQL 16 instance

### Setup

```bash
# 1. install dependencies
npm install

# 2. create your local env file
cp .env.example .env
# then edit .env to point to your local Postgres

# 3. run migrations
npm run migration:run

# 4. start in watch mode
npm run start:dev
```

The app will be available at the same `http://localhost:3000/api` URL.

### Environment Variables

| Variable | Description | Example |
|---|---|---|
| `MODE` | App environment label (`DEV` / `UAT` / `PROD`) | `DEV` |
| `PORT` | HTTP port | `3000` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:3001` |
| `DB_HOST` | Postgres host | `localhost` |
| `DB_PORT` | Postgres port | `5432` |
| `DB_USERNAME` | Postgres user | `postgres` |
| `DB_PASSWORD` | Postgres password | `postgres` |
| `DB_NAME` | Postgres database name | `parking-system-db` |
| `JWT_SECRET` | Secret key used to sign JWT tokens | `your-secret` |
| `JWT_EXPIRES_IN` | JWT expiration time | `1d` |

All variables are validated at startup by [src/common/config/env.validation.ts](src/common/config/env.validation.ts) — the app will refuse to boot if anything is missing.

---

## API Overview

All routes are prefixed with `/api`. Each endpoint below is marked as either:

- 🔓 **Public** — no token required, callable by end customers
- 🔒 **JWT** — requires a Bearer JWT in the `Authorization` header (staff/admin only)

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | 🔓 Public | Login with email/password, returns JWT |
| GET | `/me` | 🔒 JWT | Get current authenticated user |

### User — `/api/user`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/create` | 🔒 JWT (SUPER) | Create a new user |
| GET | `/find-list` | 🔒 JWT | List users |
| GET | `/find-one-by-id/:userId` | 🔒 JWT | Get user by id |
| PATCH | `/update/:userId` | 🔒 JWT | Update user |
| DELETE | `/delete/:userId` | 🔒 JWT (SUPER) | Delete user |

### Parking Lot — `/api/parking-lot`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/create` | 🔒 JWT | Create a parking lot (with N slots) |
| GET | `/find-list` | 🔓 Public | List all parking lots (with filters) |
| GET | `/find-one-by-id/:parkingLotId` | 🔓 Public | Get a parking lot status (slots + occupancy) |
| PATCH | `/update/:parkingLotId` | 🔒 JWT | Update a parking lot |
| DELETE | `/delete/:parkingLotId` | 🔒 JWT | Delete a parking lot |

### Ticket — `/api/ticket`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/park-car` | 🔓 Public | Park a car into a slot (creates a ticket) |
| PATCH | `/leave-car` | 🔓 Public | Mark a car as left (closes the ticket) |
| GET | `/find-car-list/:parkingLotId` | 🔒 JWT | List cars currently parked in a lot (filterable by `carSize`) |
| GET | `/find-ticket-history` | 🔒 JWT | View historical tickets |

> See **Swagger UI** at http://localhost:3000/api/docs for full request/response schemas, DTOs, and the ability to call endpoints interactively.

---

## Running Tests

```bash
# run all unit tests
npm run test

# watch mode
npm run test:watch

# coverage report
npm run test:cov
```

---

## Database Migrations

Migrations live in [src/database/migrations/](src/database/migrations/) and are run automatically on container start. For local development:

```bash
# apply pending migrations
npm run migration:run

# generate a new migration from entity changes
npm run migration:generate -- <MigrationName>

# create an empty migration file
npm run migration:create -- <MigrationName>

# revert the last migration
npm run migration:revert
```

---

## Project Structure

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
├── common/                    # Shared code (filters, interceptors, middlewares, config)
├── database/                  # TypeORM data source + migrations
└── modules/
    ├── auth/                  # Login, JWT strategy, guards
    ├── user/                  # User CRUD
    ├── parking-lot/           # Parking lot + slot management
    └── ticket/                # Park / leave / history
```

---

## Notes for Reviewers

- **One command to run**: `docker compose up --build` is all you need — no manual DB setup, no `.env` editing.
- **Migrations are run automatically** on container start (see `CMD` in [Dockerfile](Dockerfile)). The schema is **never** auto-synchronized (`synchronize: false`) — every change goes through a migration file for traceability.
- **Env validation** uses `class-validator` so misconfiguration fails fast and loudly.
- **Global guards** are applied: every route is JWT-protected by default, with `@Public()` decorators used to opt-out (e.g. `POST /auth/login`).
- **Dev-mode JWT bypass** (for easier review): when `MODE=DEV` (the default in [docker-compose.yml](docker-compose.yml)), you can skip the login flow and authenticate as any existing user directly from Swagger UI:
  1. Open http://localhost:3000/api/docs
  2. Click the **Authorize** button (top-right)
  3. In the **Value** field, enter `email:<user-email>` — for example `email:admin@example.com`
  4. Click **Authorize** → all subsequent requests will be authenticated as that user

  Internally this is handled by [src/modules/auth/guards/jwt-auth.guard.ts:34](src/modules/auth/guards/jwt-auth.guard.ts#L34) and is **only** active when `MODE=DEV`, so it cannot be exploited in production.
- **Commit history**: each commit is scoped to a single concern (foundation → auth/user/parking-lot → ticket → docker setup) so the evolution of the solution is easy to follow via `git log`.
