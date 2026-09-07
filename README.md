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

### Backend checks

Run these commands from the `backend` directory:

```bash
npm run type-check
npm run lint -- --no-fix
npm test -- --runInBand
npm run build
```

To run the Redis integration test, start the Docker services and use:

```bash
docker compose exec -e REDIS_INTEGRATION=true backend npm test -- --runInBand
```

The regular test command skips the Redis integration suite when
`REDIS_INTEGRATION` is not set to `true`.

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
