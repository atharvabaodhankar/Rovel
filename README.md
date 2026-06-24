# CodeShip

CodeShip is a self-hosted, lightweight Platform-as-a-Service (PaaS) designed to provide a zero-config, Vercel-like developer experience running entirely on your own single VPS. It automates the entire lifecycle of cloning, building, isolating, and routing applications with automatic HTTPS.

---

## 🚀 Architectural Overview

```text
GitHub Push (User App)
       │
       ▼ (Webhook)
┌─────────────────────────────────────────────────────────┐
│ CodeShip Next.js 15 Dashboard & API (Port 3000)         │
└──────────────┬──────────────────────────────────────────┘
               │ (Enqueue Job)
               ▼
┌─────────────────────────────────────────────────────────┐
│ Redis & BullMQ Queue Manager (Port 6379)                │
└──────────────┬──────────────────────────────────────────┘
               │ (Process Job)
               ▼
┌─────────────────────────────────────────────────────────┐
│ CodeShip Background Worker (Node.js Daemon)             │
└──────────────┬─────────────────────────────┬────────────┘
               │                             │
               ▼ (Programmatic Build)        ▼ (Proxy Config)
 ┌───────────────────────────┐  ┌───────────────────────────┐
 │ Docker Engine             │  │ Nginx Reverse Proxy       │
 │ ├── App 1 (Port 3001)     │  │ ├── app1.apps.domain (443)│
 │ ├── App 2 (Port 3002)     │  │ ├── app2.apps.domain (443)│
 │ └── App 3 (Port 3003)     │  │ └── codeship.domain (443) │
 └───────────────────────────┘  └───────────────────────────┘
```

---

## 🛠️ Technology Stack: What, How, and Why

CodeShip is built as an npm monorepo utilizing workspaces to keep the codebase modular, type-safe, and highly performant.

### 1. The Core Runtime: Next.js 15, TypeScript & Tailwind CSS
* **What we used**: Next.js 15 App Router, TypeScript, and a Stark Monochrome Tailwind theme.
* **How we used it**: Built a unified management dashboard for managing projects, managing environment variables, viewing deployment histories, and polling real-time build log consoles.
* **Why we used it**: Next.js 15 provides excellent server-side rendering (SSR) capabilities for security, high-performance static page optimization for the dashboard, and a clean API routing layer. TypeScript guarantees type-safety across the monorepo, while the monochrome aesthetic delivers a premium, developer-focused, high-contrast user interface.

### 2. Database & State: PostgreSQL & Prisma ORM
* **What we used**: PostgreSQL database served via Docker, managed through Prisma ORM.
* **How we used it**: Created models for `User` (OAuth profiles), `Project` (active configurations, frameworks, and ports), `Deployment` (execution logs and build statuses), and `EnvironmentVariable` (stored encrypted).
* **Why we used it**: PostgreSQL provides robust relational integrity, which is critical for mapping users, projects, and deployments. Prisma provides a type-safe database client shared directly across the frontend and worker workspaces, preventing runtime SQL errors and speeding up schema migrations.

### 3. Background Job Processing: Redis & BullMQ
* **What we used**: Redis cache in Docker orchestrating a BullMQ message queue.
* **How we used it**: Implemented a lazy-loading queue pattern in the Next.js app to enqueue build jobs without blocking Next.js build-time static generation. A background Node.js daemon (the worker) listens to the queue and processes builds sequentially.
* **Why we used it**: Repository compilation and Docker builds are long-running, resource-intensive tasks. Moving these tasks out of the HTTP request-response lifecycle into a reliable, persistent background queue prevents timeouts, ensures sequential resource usage on a single VPS, and allows real-time execution tracking.

### 4. Containerization: Docker Engine (Official CE)
* **What we used**: Docker Engine Community Edition, managing isolated, resource-constrained containers.
* **How we used it**: The worker programmatically clones repositories, automatically detects the project framework, writes an optimized `Dockerfile` on the fly, builds the container image, and launches it with memory limits (`512MB`) and CPU limits (`0.5 CPU`). It also automatically prunes dangling build layers and deletes obsolete older deployment images to prevent VPS disk exhaustion.
* **Why we used it**: Docker provides complete OS-level virtualization and process isolation. By restricting CPU and RAM, we ensure a single heavy user application cannot crash the host VPS or affect other deployments.

### 5. Reverse Proxy: Nginx
* **What we used**: Nginx web server acting as a reverse proxy and routing engine.
* **How we used it**: When a container starts, the worker dynamically generates a custom Nginx configuration block at `/etc/nginx/sites-enabled/<project-slug>.conf`, proxying the subdomain (e.g., `app.apps.domain`) to the container's allocated host port, and reloads Nginx using a passwordless sudoers rule.
* **Why we used it**: Nginx is highly efficient, secure, and can handle thousands of concurrent requests. It acts as the gateway of the VPS, keeping internal application ports (`3001-9999`) safely closed behind the firewall while routing external web traffic seamlessly.

### 6. SSL Encryption: Certbot & Let's Encrypt Wildcard Certificates
* **What we used**: Certbot Nginx and manual DNS plugins.
* **How we used it**: Configured a wildcard SSL certificate (`*.apps.domain`) on the VPS. The worker automatically detects the presence of this certificate and upgrades deployments from HTTP (port `80`) to secure HTTPS (port `443`) with automatic HTTP-to-HTTPS redirects.
* **Why we used it**: Modern web applications require SSL/TLS to protect user data. A wildcard certificate allows us to secure an infinite number of dynamic subdomains without needing to request a new certificate for every single project deployment, avoiding Let's Encrypt rate limits.

---

## 📦 Monorepo Workspaces

The repository is structured as a modular npm monorepo:
* **`apps/web`**: Next.js 15 frontend dashboard, custom GitHub OAuth handlers, API endpoints, and real-time log polling.
* **`apps/worker`**: Background BullMQ worker daemon that runs git clone, framework detection, Docker builds, port allocation, and Nginx reloads.
* **`packages/db`**: Core database layer containing the Prisma schema, migrations, and the singleton Prisma Client.
* **`packages/shared`**: Utility library containing AES-256-GCM encryption/decryption functions (used to protect environment variables in the database) and OS/Docker host socket detection helpers.
* **`infrastructure/`**: Deployment automation containing VPS bootstrapping scripts and production Nginx templates.

---

## ⚙️ Production Deployments & Workflows

CodeShip is built to deploy and update itself with zero manual intervention.

### 1. Deployed App CI/CD Workflow
Once you deploy an application on your CodeShip dashboard, you can configure continuous deployment:
```text
[ Developer runs: git push ]
             │
             ▼
[ GitHub triggers Webhook POST to CodeShip ]
             │
             ▼
[ CodeShip API creates Deployment and Enqueues Job ]
             │
             ▼
[ Worker clones repo -> Builds Docker Image -> Replaces Container -> Reloads Nginx ]
             │
             ▼
[ New code is instantly live with zero downtime ]
```

### 2. CodeShip Self-Update (Continuous Delivery)
The CodeShip platform itself utilizes a automated GitHub Actions workflow (`.github/workflows/deploy.yml`) for continuous delivery:
1. When code is pushed to the `main` branch of the CodeShip repository, a GitHub Actions runner is triggered.
2. The runner connects to the production VPS securely via SSH using an authorized private key secret (`VPS_SSH_KEY`).
3. It executes the `./update.sh` script on the VPS, which pulls the latest code, installs new npm packages, runs Prisma database migrations, compiles the Next.js and worker builds, and restarts the services under the **PM2** process manager.
