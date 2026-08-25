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
