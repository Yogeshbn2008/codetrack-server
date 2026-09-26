# ⚡ CodeTrack Backend API
[![Node.js CI Pipeline](https://github.com/Yogeshbn2008/codetrack-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Yogeshbn2008/codetrack-server/actions/workflows/ci.yml)
![Node Version](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-Testing-C21325?logo=jest&logoColor=white)
![Security](https://img.shields.io/badge/Security-Helmet%20%7C%20RateLimit-orange)
A scalable, secure, and production-grade RESTful API powering the **CodeTrack** technical interview and DSA preparation platform. Built with Node.js, Express, and MongoDB Atlas, with enterprise-level security, database optimizations, and automated CI/CD.
🌐 **Live Production API:** [https://codetrack-server.onrender.com](https://codetrack-server.onrender.com)  
🖥️ **Live Web Application:** [https://codetrack-henna.vercel.app](https://codetrack-henna.vercel.app)
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
🚀 Key Engineering & Architecture Features
1. Database Indexing & Aggregation Pipelines
Single-Query Dashboard Stats: Replaced in-memory JavaScript computations with a high-performance MongoDB Aggregation Pipeline ($facet, $group), computing totals, difficulty breakdowns, topic solve rates, and pattern coverage in a single database round-trip (~5ms).
Compound Indexing: Engineered compound B-tree indexes ({ userId: 1, createdAt: -1 }, { userId: 1, status: 1 }, { userId: 1, lastRevisedAt: 1 }) to eliminate full collection scans (COLLSCAN) and guarantee sub-millisecond query execution (IXSCAN).
2. Multi-Layer Security Architecture
SSRF Defense: Strict HTTPS-only protocol enforcement and domain whitelisting (leetcode.com, codeforces.com, etc.) on /fetch-meta to prevent Server-Side Request Forgery.
Brute-Force & Rate Limiting: Configured express-rate-limit with reverse-proxy trust (trust proxy: 1), restricting authentication endpoints to 10 attempts per 15 minutes.
Security Headers: Integrated helmet to safeguard against Cross-Site Scripting (XSS), clickjacking, and MIME-sniffing.
Credential Protection: Passwords securely salted and hashed using Bcrypt (10 rounds); stateless sessions managed via signed JSON Web Tokens (JWT).
3. Automated Testing & Continuous Integration (CI/CD)
Integration Test Suite: Built automated end-to-end API tests using Jest and Supertest covering registration, duplicate rejection, and authentication failures.
GitHub Actions CI Pipeline: Automated Linux-based CI workflow (ci.yml) that validates code and runs test suites on every pull request and push to main.
📋 API Endpoints
🔐 Authentication (/api/auth)
Method	Endpoint	Description	Access
POST	/api/auth/register	Register a new user (hashed password)	Public (Rate Limited)
POST	/api/auth/login	Authenticate user & issue JWT	Public (Rate Limited)
📚 Problems & Analytics (/api/problems)
Method	Endpoint	Description	Access
GET	/api/problems	List problems with search, topic, and difficulty filters	Bearer Token
GET	/api/problems/stats/summary	Compute full dashboard metrics via aggregation pipeline	Bearer Token
POST	/api/problems	Log a new solved/attempted problem	Bearer Token
POST	/api/problems/fetch-meta	Auto-extract platform & problem title via URL (SSRF guarded)	Bearer Token
GET	/api/problems/:id	Fetch problem details by ID	Bearer Token
PUT	/api/problems/:id	Update problem notes, tags, or approach photo	Bearer Token
PATCH	/api/problems/:id/revise	Mark problem as revised (resets interval)	Bearer Token
DELETE	/api/problems/:id	Remove a problem record	Bearer Token
GET	/api/problems/meta/options	Fetch unique user topics & patterns for filter dropdowns	Bearer Token
🛠️ Local Development & Testing
1. Clone the repository
bash


git clone https://github.com/Yogeshbn2008/codetrack-server.git
cd codetrack-server
2. Install dependencies
bash


npm install
3. Set up environment variables
Create a .env file in the root directory:

env


PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
4. Run the development server
bash


npm run dev
5. Run automated tests
bash


npm test
👨‍💻 Author
Yogesh B N

GitHub: @Yogeshbn2008
Live Project: codetrack-henna.vercel.app