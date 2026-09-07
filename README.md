# Financial Monitoring App

## 📌 Overview

Financial Monitoring is a comprehensive full-stack web application designed to help users track their finances, monitor expenses, and analyze financial data efficiently. The platform provides a seamless user experience for managing personal or business finances with real-time insights.

## 🚀 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React)
- **Backend**: [NestJS](https://nestjs.com/) (Node.js)
- **Infrastructure**: Docker & Docker Compose

## 📁 Project Structure

```text
.
├── backend/
├── frontend/
└── docker-compose.yml
```

## 🛠️ Getting Started

### Prerequisites

To run this project locally, you will need to have the following installed on your machine:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Environment variables

Create a `.env` file in the project root, next to `docker-compose.yml`. Use
placeholders or environment-specific values; never commit real passwords,
tokens, private keys, or cloud credentials.

```env
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=financial_db
DATABASE_URL="postgresql://your-postgres-user:your-postgres-password@db:5432/financial_db?schema=public"

REDIS_PASSWORD=your-redis-password
REDIS_DATABASES=2

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN_MINUTES=120
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
HASH_SALT_ROUNDS=12

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Storage provider: local, aws, gcp, azure, or oracle
STORAGE_PROVIDER=local

# Local storage. Use C:/test on Windows, or an absolute/relative path on Linux/macOS.
BASE_UPLOAD_PATH=./uploads

# Common cloud storage settings
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=your-region
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_ENDPOINT=

# Docker emulators
AWS_STORAGE_BUCKET=profiles
AWS_STORAGE_REGION=us-east-1
AWS_STORAGE_ACCESS_KEY_ID=test-access-key
AWS_STORAGE_SECRET_ACCESS_KEY=test-secret-key
AWS_STORAGE_ENDPOINT=http://localstack:4566
GCP_STORAGE_BUCKET=profiles
GCP_STORAGE_ENDPOINT=http://fake-gcs:4443
GCP_PROJECT_ID=local-project
AZURE_STORAGE_ENDPOINT=http://azurite:10000/devstoreaccount1
ORACLE_STORAGE_BUCKET=profiles
ORACLE_STORAGE_REGION=us-east-1
ORACLE_STORAGE_ACCESS_KEY_ID=test-access-key
ORACLE_STORAGE_SECRET_ACCESS_KEY=test-secret-key
ORACLE_STORAGE_ENDPOINT=http://minio:9000

# Google Cloud Storage
GCP_PROJECT_ID=your-gcp-project
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your-storage-account
AZURE_STORAGE_KEY=your-storage-key
AZURE_STORAGE_CONTAINER=profiles

# Oracle Object Storage uses an S3-compatible endpoint
# STORAGE_ENDPOINT=https://your-namespace.compat.objectstorage.your-region.oraclecloud.com
```

For Docker, the backend receives the upload directory as `/app/uploads`. The
host directory is taken from `BASE_UPLOAD_PATH` and mounted into the container.
When `STORAGE_PROVIDER=local`, cloud variables can remain as placeholders. For
cloud storage, configure the credentials through your deployment secret
manager instead of committing them to the repository.

### Local cloud emulators

Docker Compose includes local emulators for cloud storage:

| Provider              | Emulator              | Endpoint from the backend container     |
| --------------------- | --------------------- | --------------------------------------- |
| AWS S3                | LocalStack            | `http://localstack:4566`                |
| Google Cloud Storage  | fake-gcs-server       | `http://fake-gcs:4443`                  |
| Azure Blob Storage    | Azurite               | `http://azurite:10000/devstoreaccount1` |
| Oracle Object Storage | MinIO (S3-compatible) | `http://minio:9000`                     |

The emulator credentials in `.env.example` are local-only test values. Select
one provider at a time with `STORAGE_PROVIDER`, then recreate the backend:

```bash
docker compose up -d localstack fake-gcs azurite minio
docker compose up -d --force-recreate backend
```

For the Azure emulator, Compose fixes the local `devstoreaccount1` account and
key so the backend and Azurite use the same credentials. The Azure endpoint is
HTTP only inside Docker and is configured with insecure transport enabled for
local testing; use HTTPS and managed credentials in production.

These emulators validate object-storage behavior without cloud credentials. The
LocalStack image is pinned to its Community edition tag so it does not require
a `LOCALSTACK_AUTH_TOKEN`.
They do not reproduce production IAM policies, managed encryption, quotas,
latency, or provider-specific infrastructure behavior.

The AWS emulator uses S3 path-style addressing inside Docker. This is required
because the bucket hostname form (for example, `profiles.localstack`) is not
resolvable on the Compose network. Production AWS S3 can use the provider's
default addressing behavior.

### Running the Application

The easiest and recommended way to initialize and run both the frontend and backend simultaneously is by using Docker Compose.

1. **Navigate to the project root directory** (where your `docker-compose.yml` is located):

   ```bash
   cd path/to/FinancialMonitoring
   ```

2. **Start the containers**:

   ```bash
   docker compose up -d
   ```

   _Note: The `-d` flag runs the containers in detached mode (in the background). Remove it if you want to see the live console logs._

3. **Access the application**:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:3001](http://localhost:3001)

### Stopping the Application

To stop the running containers, execute:

```bash
docker compose down
```

### Command reference

Run these commands from the project root unless noted otherwise:

```bash
# Start the complete stack
docker compose up -d

# Show service status
docker compose ps

# Follow logs for all services
docker compose logs -f

# Follow logs for the backend only
docker compose logs -f backend

# Restart the backend after changing .env or STORAGE_PROVIDER
docker compose up -d --force-recreate backend

# Start only the local cloud emulators
docker compose up -d localstack fake-gcs azurite minio

# Recreate the storage emulator buckets and backend
docker compose up -d --force-recreate storage-init backend

# Stop and remove containers but keep named volumes
docker compose down

# Stop and remove containers and all persisted local data
docker compose down -v
```

The `storage-init` service creates the `profiles` buckets in LocalStack and
MinIO. Google Cloud Storage and Azure create their bucket/container when the
first image is saved. The emulator services use local test credentials from
`.env`; do not reuse them in production.

### Backend checks

Run these commands from the `backend` directory:

```bash
npm run type-check
npm run lint -- --no-fix
npm test -- --runInBand
npm run build
```

To run only the Redis integration test, start the Docker services and use:

```bash
docker compose exec -e REDIS_INTEGRATION=true backend npm test -- --runInBand test/redis-session-store.integration.spec.ts
```

The regular test command skips the Redis integration suite when
`REDIS_INTEGRATION` is not set to `true`.

To run the complete backend test suite, including Redis, from the project root:

```bash
docker compose exec -e REDIS_INTEGRATION=true backend npm test -- --runInBand
```

### API endpoints

The backend is available at `http://localhost:3001` when using Docker. The
Swagger documentation is available at `http://localhost:3001/api/docs`.

Authenticated profile operations include:

```text
PATCH /auth/me
POST  /auth/profile-picture/upload
GET   /auth/profile-picture/me
```

These endpoints require an access token in the `Authorization: Bearer <token>`
header. The profile picture endpoints accept and return images through the
backend; they do not download images from arbitrary external URLs.

### Continuous integration

The backend workflow runs on every push to `develop`, `main`, or `master`, and on pull requests targeting any of those branches. It runs lint, type-check, automated tests, and build; a pull request should only be merged after these checks pass.

In Docker Compose, the backend runs its automated tests before starting the API. If a test fails, the backend process exits and the frontend waits because it requires a healthy backend.

For the `develop` to `master` flow, configure branch protection in GitHub for `develop`, `main`, and `master` with these rules:

- Require a pull request before merging.
- Require the `Lint, type-check, test and build` status check.
- Require branches to be up to date before merging.
- Require conversations to be resolved.
- Do not allow direct pushes or force pushes to protected branches.

Merge conflicts are reported by GitHub on the existing pull request. The author should update that branch with the target branch and resolve the conflict; opening a second pull request for the same change is unnecessary. If issue tracking is required, create an issue from the conflicted pull request and link it to that pull request.

## 👨‍💻 Manual Setup (Without Docker)

If you prefer to run the repositories locally without Docker for development purposes, you will need [Node.js](https://nodejs.org/) installed.

**1. Initialize the Backend:**

```bash
cd backend
npm install
npm run start:dev
```

**2. Initialize the Frontend:**
Open a new terminal window and run:

```bash
cd frontend
npm install
npm run dev
```
