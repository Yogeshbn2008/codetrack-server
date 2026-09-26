# ⚡ CodeTrack Backend API

<p align="left">
  <a href="https://github.com/Yogeshbn2008/codetrack-server/actions/workflows/ci.yml">
    <img src="https://github.com/Yogeshbn2008/codetrack-server/actions/workflows/ci.yml/badge.svg" alt="Node.js CI Pipeline" />
  </a>
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white" alt="Node Version" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Jest-Testing-C21325?logo=jest&logoColor=white" alt="Jest" />
  <img src="https://img.shields.io/badge/Security-Helmet%20%7C%20RateLimit-orange" alt="Security" />
</p>

A scalable, secure, and production-grade RESTful API powering the **CodeTrack** technical interview and DSA preparation platform. Built with Node.js, Express, and MongoDB Atlas, with enterprise-level security, database optimizations, and automated CI/CD.

* 🌐 **Live Production API:** <a href="https://codetrack-server.onrender.com" target="_blank">https://codetrack-server.onrender.com</a>
* 🖥️ **Live Web Application:** <a href="https://codetrack-henna.vercel.app" target="_blank">https://codetrack-henna.vercel.app</a>

---

## 🏛 System Architecture

```text
 Client (React 19)
        │
        ▼  HTTPS Requests
 ┌───────────────────────────────────────────────┐
 │ Express API Gateway (Reverse Proxy Aware)     │
 │ ├─ Helmet.js (HTTP Security Headers)          │
 │ ├─ Rate Limiting (DDoS & Brute-Force Defense) │
 │ └─ CORS & JSON Parsers                        │
 └──────────────────────┬────────────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
 /api/auth/*                      /api/problems/*
 (Bcrypt + JWT)                 (JWT Auth Guarded)
                                         │
        ┌────────────────────────────────┴────────────────┐
        ▼                                                 ▼
 [Problem CRUD & Filter Engine]                 [Metadata Scraper]
        │                                        ├─ SSRF Domain Guard
        ▼                                        ├─ LeetCode GraphQL API
 [MongoDB Aggregation Engine]                    └─ Fallback HTML Parser
  ├─ $facet Multi-Pipeline
  ├─ Compound Indexed Queries
        │
        ▼
 MongoDB Atlas Database
```

---

## 🚀 Key Engineering & Architecture Features

### 1. Database Indexing & Aggregation Pipelines
* **Single-Query Dashboard Stats:** Replaced in-memory JavaScript computations with a high-performance MongoDB **Aggregation Pipeline (`$facet`, `$group`)**, computing totals, difficulty breakdowns, topic solve rates, and pattern coverage in a single database round-trip (~5ms).
* **Compound Indexing:** Engineered compound B-tree indexes (`{ userId: 1, createdAt: -1 }`, `{ userId: 1, status: 1 }`, `{ userId: 1, lastRevisedAt: 1 }`) to eliminate full collection scans (`COLLSCAN`) and guarantee sub-millisecond query execution (`IXSCAN`).

### 2. Multi-Layer Security Architecture
* **SSRF Defense:** Strict HTTPS-only protocol enforcement and domain whitelisting (`leetcode.com`, `codeforces.com`, etc.) on `/fetch-meta` to prevent Server-Side Request Forgery.
* **Brute-Force & Rate Limiting:** Configured `express-rate-limit` with reverse-proxy trust (`trust proxy: 1`), restricting authentication endpoints to 10 attempts per 15 minutes.
* **Security Headers:** Integrated `helmet` to safeguard against Cross-Site Scripting (XSS), clickjacking, and MIME-sniffing.
* **Credential Protection:** Passwords securely salted and hashed using **Bcrypt (10 rounds)**; stateless sessions managed via signed **JSON Web Tokens (JWT)**.

### 3. Automated Testing & Continuous Integration (CI/CD)
* **Integration Test Suite:** Built automated end-to-end API tests using **Jest** and **Supertest** covering registration, duplicate rejection, and authentication failures.
* **GitHub Actions CI Pipeline:** Automated Linux-based CI workflow (`ci.yml`) that validates code and runs test suites on every pull request and push to `main`.

---

## 📋 API Endpoints

### 🔐 Authentication (`/api/auth`)

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Endpoint</th>
      <th>Description</th>
      <th>Access</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/auth/register</code></td>
      <td>Register a new user account with bcrypt password hashing</td>
      <td>Public (Rate Limited)</td>
    </tr>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/auth/login</code></td>
      <td>Authenticate user credentials and issue signed JWT</td>
      <td>Public (Rate Limited)</td>
    </tr>
  </tbody>
</table>

### 📚 Problems & Analytics (`/api/problems`)

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Endpoint</th>
      <th>Description</th>
      <th>Access</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>GET</code></td>
      <td><code>/api/problems</code></td>
      <td>List problems with search, topic, pattern, and difficulty filters</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>GET</code></td>
      <td><code>/api/problems/stats/summary</code></td>
      <td>Compute complete dashboard statistics via MongoDB aggregation</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/problems</code></td>
      <td>Create and store a new problem log with approach photo & notes</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/problems/fetch-meta</code></td>
      <td>Auto-fetch platform and title via URL (SSRF Protected)</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>GET</code></td>
      <td><code>/api/problems/:id</code></td>
      <td>Fetch full problem details by record ID</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>PUT</code></td>
      <td><code>/api/problems/:id</code></td>
      <td>Update problem details, notes, or revision intervals</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>PATCH</code></td>
      <td><code>/api/problems/:id/revise</code></td>
      <td>Mark problem as revised (resets interval clock)</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>DELETE</code></td>
      <td><code>/api/problems/:id</code></td>
      <td>Delete a problem record</td>
      <td>Bearer Token</td>
    </tr>
    <tr>
      <td><code>GET</code></td>
      <td><code>/api/problems/meta/options</code></td>
      <td>Fetch distinct user topics and patterns for dynamic filters</td>
      <td>Bearer Token</td>
    </tr>
  </tbody>
</table>

---

## 🛠️ Local Development & Testing

### 1. Clone the repository
```bash
git clone https://github.com/Yogeshbn2008/codetrack-server.git
cd codetrack-server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
```

### 4. Run the development server
```bash
npm run dev
```

### 5. Run automated tests
```bash
npm test
```

---

## 👨‍💻 Author
* **GitHub:** <a href="https://github.com/Yogeshbn2008" target="_blank">@Yogeshbn2008</a>
* **Live Web Project:** <a href="https://codetrack-henna.vercel.app" target="_blank">CodeTrack Platform</a>