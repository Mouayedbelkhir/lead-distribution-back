# Lead Distribution Backend

## Project Overview

This repository contains the **Express.js** REST API for the Lead Distribution System. It manages clients, verticals, delivery configurations, leads, and real-time distribution. The API uses **Prisma** as the ORM with **PostgreSQL**, **JWT** for authentication, and **Swagger/OpenAPI** for interactive documentation.

## Tech Stack

- **Node.js 22**
- **Express.js 5**
- **PostgreSQL 16**
- **Prisma ORM** — Database access, migrations, and client generation.
- **JWT** — Stateless authentication via `jsonwebtoken`.
- **bcryptjs** — Password hashing.
- **Zod** — Runtime schema validation.
- **Swagger / OpenAPI 3.0** — Interactive API documentation generated with `swagger-ui-express` and `yamljs`.
- **Jest** — Unit testing framework.
- **Nodemon** — Development auto-reload.

## Architecture

The backend follows a layered architecture:

```text
HTTP Request
    ↓
Routes (src/routes)           — URL routing & middleware attachment
    ↓
Controllers (src/controllers) — Request/response handling
    ↓
Services (src/services)       — Business logic & database transactions
    ↓
Prisma Client (src/config/prisma.js) — Database access
    ↓
PostgreSQL
```

This separation keeps business rules testable and controllers thin.

## Folder Structure

```
lead-distribution-back/
├── prisma/
│   ├── migrations/        # Prisma database migrations
│   ├── schema.prisma      # Database schema definition
│   └── seed.js            # Admin user seed script
├── src/
│   ├── app.js             # Express application setup & route wiring
│   ├── config/
│   │   └── prisma.js      # PrismaClient singleton
│   ├── controllers/       # HTTP request handlers
│   ├── middleware/        # Authentication & authorization middleware
│   ├── routes/            # API route definitions
│   └── services/          # Business logic
├── server.js              # Application entry point
├── swagger.yaml           # OpenAPI specification
├── .env.example           # Environment variable template
├── Dockerfile
└── package.json
```

## Installation

1. Prerequisites:
   - Node.js 22+
   - PostgreSQL 16 running locally or in Docker
   - A created database (e.g. `lead_distribution`)

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secrets.

4. Generate the Prisma client:

```bash
npx prisma generate
```

5. Run migrations:

```bash
npx prisma migrate dev
```

6. (Optional) Seed the admin user:

```bash
npx prisma db seed
```

This creates the initial admin account using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Port the Express server listens on (default: `4000`). |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Secret key used to sign JWTs. |
| `JWT_EXPIRES_IN` | Yes | JWT token lifetime (e.g. `24h`). |
| `ADMIN_EMAIL` | Yes | Email for the seeded admin user. |
| `ADMIN_PASSWORD` | Yes | Password for the seeded admin user. |
| `FRONTEND_URL` | Yes | Allowed CORS origin for the frontend. |

See `.env.example` for placeholder values only. Never add real database credentials, passwords, or secrets to `.env.example`; copy it to `.env` and configure real values there.

## Demo Account

The Prisma seed script creates the initial admin account using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values defined in your `.env` file.

After running:

```bash
npx prisma db seed
```

you can use those credentials to log in through `POST /api/v1/auth/login` or the frontend login form.

For security reasons, no default credentials are provided.

## Initial Data

The current Prisma seed script (`prisma/seed.js`) only creates the initial `ADMIN` user from the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.

Business data such as clients, verticals, deliveries, and leads must be created manually through the API or the frontend after logging in.

Run the seed with:

```bash
npx prisma db seed
```

## Database Setup

Prisma manages the schema. The key models are:

- **User** — Admin accounts with role-based access.
- **Client** — Lead buyers.
- **Vertical** — Business categories.
- **Delivery** — Purchase rules linking a client and vertical with age range, capacity, price, postal codes, and time slots.
- **DeliveryPostalCode** — Allowed postal codes for a delivery.
- **DeliveryTimeSlot** — Allowed time windows for a delivery.
- **Lead** — Incoming leads with distribution status (`DISTRIBUTED` / `NOT_DISTRIBUTED`).

Run migrations with:

```bash
npx prisma migrate dev
```

## Running in Development

```bash
npm run dev
```

This uses `nodemon` to watch `server.js` and restart on changes. The server starts on `http://localhost:4000` by default.

## Production Build

No build step is required. Start the server with:

```bash
npm start
```

The backend `Dockerfile` only runs:

```dockerfile
CMD ["npm", "start"]
```

Production orchestration, database migration execution, seed execution, and container startup order are handled separately from this repository through the deployment configuration.

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `nodemon server.js` | Start the development server with auto-reload. |
| `start` | `node server.js` | Start the production server. |
| `test` | `jest` | Run the unit test suite. |

## API Documentation

The API is organized into the following modules:

| Module | Base Path |
|---|---|
| Authentication | `/api/v1/auth` |
| Clients | `/api/v1/clients` |
| Verticals | `/api/v1/verticals` |
| Deliveries | `/api/v1/deliveries` |
| Leads | `/api/v1/leads` |
| Dashboard | `/api/v1/dashboard` |
| Health | `/health` |

### Endpoints

**Auth**
- `POST /api/v1/auth/login` — Authenticate and receive a JWT.

**Clients**
- `GET /api/v1/clients` — List all clients.
- `GET /api/v1/clients/:id` — Get a client by ID.
- `POST /api/v1/clients` — Create a client (ADMIN only).
- `PUT /api/v1/clients/:id` — Update a client (ADMIN only).
- `DELETE /api/v1/clients/:id` — Delete a client (ADMIN only).

**Verticals**
- `GET /api/v1/verticals` — List all verticals.
- `GET /api/v1/verticals/:id` — Get a vertical by ID.
- `POST /api/v1/verticals` — Create a vertical (ADMIN only).
- `PUT /api/v1/verticals/:id` — Update a vertical (ADMIN only).
- `DELETE /api/v1/verticals/:id` — Delete a vertical (ADMIN only).

**Deliveries**
- `GET /api/v1/deliveries` — List all deliveries.
- `GET /api/v1/deliveries/:id` — Get a delivery by ID.
- `POST /api/v1/deliveries` — Create a delivery (ADMIN only).
- `PUT /api/v1/deliveries/:id` — Update a delivery (ADMIN only).
- `DELETE /api/v1/deliveries/:id` — Delete a delivery (ADMIN only).

**Leads**
- `GET /api/v1/leads` — List leads with pagination and filters (`page`, `limit`, `status`, `verticalId`, `clientId`, `startDate`, `endDate`).
- `POST /api/v1/leads` — Create and automatically distribute a lead.
- `POST /api/v1/leads/simulate` — Preview eligible deliveries without saving the lead.

**Dashboard**
- `GET /api/v1/dashboard/stats` — Retrieve aggregated KPIs.

**Health**
- `GET /health` — Service health check.

## Authentication

Authentication is stateless and based on JSON Web Tokens:

1. The client sends `POST /api/v1/auth/login` with email and password.
2. On success, the server returns a JWT and the user object (`id`, `email`, `role`).
3. Subsequent requests must include the token in the `Authorization: Bearer <token>` header.
4. The `authenticate` middleware verifies the token; the `authorize(...roles)` middleware restricts write operations to `ADMIN`.

Token expiration is controlled by `JWT_EXPIRES_IN`.

## Lead Distribution Workflow

1. A lead is submitted via `POST /api/v1/leads` or tested via `POST /api/v1/leads/simulate`.
2. The service validates the lead data (name, birth date, postal code, vertical).
3. Eligible deliveries are queried based on vertical, age, postal code, time slots, and remaining daily capacity.
4. Eligible deliveries are ranked and the best match is selected.
5. For `POST /api/v1/leads`, the lead is persisted:
   - `DISTRIBUTED` with `assignedDeliveryId`, `distributedAt`, and `pricePaid` if a match exists.
   - `NOT_DISTRIBUTED` otherwise.
6. The distribution runs inside a Prisma serializable transaction with automatic retry on serialization failures.

## Business Rules

### Eligibility

A delivery is eligible for a lead only when all of the following are true:

- **Matching vertical** — `delivery.verticalId` equals `lead.verticalId`.
- **Age range** — The lead's age falls between `delivery.minAge` and `delivery.maxAge` (inclusive).
- **Postal code** — The lead's postal code is in the delivery's `postalCodes` list.
- **Active time slot** — The current server time falls within at least one of the delivery's `timeSlots`.
- **Remaining daily capacity** — The number of leads already distributed to this delivery today is strictly less than `delivery.capacity`.

### Ranking

When multiple deliveries are eligible, they are sorted by:

1. **Highest price first** — `price` descending.
2. **Lowest load first** — Fewer leads already distributed today come first.
3. **Deterministic ordering** — Finally by ascending `id` to break any remaining ties.

### Result

- If at least one eligible delivery exists, the lead is marked `DISTRIBUTED` and assigned to the top-ranked delivery.
- If no delivery matches, the lead is saved as `NOT_DISTRIBUTED` and can be redistributed later if desired.

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:4000/api/docs
```

The specification is loaded from `swagger.yaml` and covers all endpoints, request/response schemas, and authentication requirements.

## Deployment

Deployment configuration is maintained separately from this repository.

The deployment configuration contains:

- Docker Compose setup
- Environment orchestration
- Production deployment instructions

This repository (`lead-distribution-back`) only provides the backend Dockerfile and application code. Do not run `docker-compose` commands from this folder; use the deployment configuration instead.

## Troubleshooting

- **Database connection errors**: Verify `DATABASE_URL` and ensure PostgreSQL is reachable.
- **Prisma client errors**: Run `npx prisma generate` after pulling schema changes.
- **JWT errors**: Ensure `JWT_SECRET` is set and consistent across restarts.
- **Seed fails**: `ADMIN_EMAIL` and `ADMIN_PASSWORD` must be defined in `.env`.
- **CORS errors**: Make sure `FRONTEND_URL` matches the frontend origin exactly.
