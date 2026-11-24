# CampusEats — Microservices & Web Platform

**Course:** CS543 Web Services  
**Institution:** Indian Institute of Information Technology Vadodara (IIITV)  
**Team Submission:** Group Group-30  

## Team Members
| # | Name | Roll Number | 
|---|---|---|---|
| 1 | **Ayush Kumar Dubey** | `20251651030` | 
| 2 | **Abhinav Jain** | `20251651003` | 
| 3 | **Bharath Kumar MP** | `20251651031` | 
| 4 | **Anuj Gupta** | `20251651025` | 
| 5 | **Kaushik Nanda Upadhaya** | `20251651050` | 

---

## How to Run the Project

### Prerequisites
* **Node.js** (v18+ or v20+)
* **MongoDB** (running locally on `mongodb://127.0.0.1:27017`)

### 1. Installation & Start (Single Command)
The Express backend directly serves both the microservices APIs and the integrated HTML/CSS/JS frontend:
```bash
cd Backend
npm install
npm run seed      # Seeds initial campus vendors, dishes, riders, and users into MongoDB
npm start         # Starts backend & frontend on http://localhost:3001
```

* **Frontend Web Application:** [http://localhost:3001/](http://localhost:3001/)
* **REST API Base URL:** [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
* **Apollo Server GraphQL Endpoint:** [http://localhost:3001/graphql](http://localhost:3001/graphql)
* **Health Check:** [http://localhost:3001/health](http://localhost:3001/health)

### 2. Running Automated Test Suite
To execute the end-to-end integration and security test suite:
```bash
cd Backend
npm test
```
*(Runs 29 automated assertions verifying REST, SOAP, GraphQL, caching, error shapes, and JWT security).*

### 3. Optional: Running Standalone Frontend via Vite
```bash
cd Frontend
npm run dev       # Launches Vite dev server at http://localhost:5173 (auto-proxies to 3001)
```

---

## Applications of Each Assignment & Service Mapping

| Assignment / Module | Application & Scope | Service(s) Used | Key Features Implemented |
| :--- | :--- | :--- | :--- |
| **Tutorial 2** | Microservice Boundaries & Data Ownership | **All 6 Services** (`Accounts`, `Catalogue`, `Orders`, `Payments`, `Delivery`, `Notifications`) | Strict database boundary isolation (`campuseats_*`), zero shared collections, cross-service contract calls. |
| **Assignment 1** | HTTP Fundamentals & Project Setup | **System-Wide** | Raw HTTP exploration with `curl -i`, DevTools network waterfall inspection, and system brief (`What`, `Who`, `Nouns`, `Verbs`). |
| **Assignment 2** | Service Design, Contracts & Schema | **All Services** | Service design benchmark diagram (`services.drawio`), isolated DDL schemas (`schema.sql`), and central `placeOrder` specification. |
| **Assignment 3** | External SOAP Partner Integration | **Payments Service** | Banking gateway integration using WSDL 1.1 (`partner.wsdl`), hand-formed XML SOAP envelopes, and SOAP fault mapping (`card_declined` $\to$ domain error). |
| **Assignment 4** | Rebuilding a Service in REST | **Orders Service** | Contract-first OpenAPI 3.0 (`openapi.yaml`), `as_json()` model separation, idempotency keys, and hardened outbound HTTP calls to Payments with backoff & jitter. |
| **Assignment 5** | HTTP Methods, Headers & Caching | **Orders & Catalogue Services** | Non-CRUD sub-resources (`POST /orders/:id/cancel`), query parameter pagination, `OPTIONS` with `Allow`, `ETag` conditional caching (`304`), optimistic locking (`412`), and per-client rate limiting (`429`). |
| **Assignment 6** | Honest Responses & Error Handling | **Orders Service** | RFC 7807/9457 Problem Details (`application/problem+json`), stable type catalogue, multi-field `422` validation (`errors[]`), internal error masking, and XML/JSON negotiation. |
| **Assignment 7** | Service in GraphQL | **Catalogue Service** | Apollo Server GraphQL API on `/graphql`, `schema.graphql` SDL, query (`dishes`), mutation (`addDish`), MongoDB resolvers, and HTML/CSS web frontend. |
| **Assignment 8** | Service as a REST API | **Catalogue Service** | Core REST API (`GET /items`, `GET /items/:id`, `POST /items`) with HTTP status codes (`200`, `201`, `404`, `422`), `express.json()`, and frontend integration. |
| **Assignment 9** | Securing the API | **Accounts & Catalogue Services** | Bcrypt password hashing, `POST /login` issuing signed JWTs, Guard 1 authentication (`auth`), and Guard 2 role authorization (`requireRole('restaurant', 'admin')`). |

---

## Assignment Answers

### Assignment 8: Build one CampusEats service as a REST API

#### 1. Which CampusEats service did you pick, and what are its routes (method + path)?
We picked the **Catalogue Service** (Menu / Items entity). Its core REST routes are:
* `GET  /items` — Lists all dishes/menu items.
* `GET  /items/:id` — Fetches a single dish by its ID.
* `POST /items` — Creates a new menu item.

#### 2. Which status codes did you return, and for which outcomes (200 / 201 / 404 / 422)?
* **`200 OK`**: Returned on successful read operations: fetching the list of items (`GET /items`) or retrieving a specific item by its ID (`GET /items/:id`).
* **`201 Created`**: Returned on `POST /items` when a new dish is successfully created and persisted.
* **`404 Not Found`**: Returned on `GET /items/:id` when the requested item ID does not exist in the database.
* **`422 Unprocessable Entity`**: Returned on `POST /items` when required fields (such as `name` or `price`) are missing or invalid in the request body.

#### 3. Where did you use req.params and where req.body? Why does POST need express.json()?
* **`req.params`**: Used in `GET /items/:id` (`req.params.id`) to read route parameters specified directly in the URL path.
* **`req.body`**: Used in `POST /items` to access the payload fields (`name`, `price`, `category`) submitted by the client.
* **Why POST needs `express.json()`**: HTTP request bodies arrive over the network as a stream of raw binary byte chunks. By default, Express does not parse this body, leaving `req.body` as `undefined`. The `express.json()` middleware buffers the incoming stream, parses the raw JSON string into a structured JavaScript object, and attaches it to `req.body`.

---

### Assignment 9: Securing the API

#### 1. Which route(s) require only authentication, and which also require a role? Give the method + path and the role allowed for each.
* **Requires only Authentication (`auth` guard):**
  * `GET /items` (and `GET /items/:id`): Accessible by any authenticated user regardless of role (both `customer` and `restaurant`).
* **Requires Authentication + Role Authorization (`requireRole('restaurant', 'admin')` guard):**
  * `POST /items`: Allowed roles are `restaurant` and `admin` only.
  * `PATCH /items/:id/availability`: Allowed roles are `restaurant` and `admin` only.

#### 2. Show one 401 and one 403 from your demo. In one line each, say why the server returned that code (not the other).
* **`401 Unauthorized`**:
  * Returned on `GET /items` with no token (`{"error": "missing token"}`) because the client failed to provide identity credentials.
* **`403 Forbidden`**:
  * Returned on `POST /items` when called with a student's token (`{"error": "forbidden"}`) because the client's identity was successfully authenticated, but their role (`customer`) lacks permission to modify restaurant menu items.

#### 3. What is inside your JWT payload? Why is it safe to trust the role claim on the server, and why must the secret stay out of your code?
* **Inside the JWT Payload**: `{ id: user.studentId, role: user.role, email: user.email, iat: <issued_at>, exp: <expiry> }`.
* **Why it is safe to trust the role claim**: The JWT is cryptographically signed with HMAC-SHA256 using the server's private secret (`process.env.JWT_SECRET`). Any tampering with the payload invalidates the signature, causing `jwt.verify()` to reject it with `401`.
* **Why the secret must stay out of your code**: If `JWT_SECRET` is committed into source control, an attacker can forge counterfeit tokens with arbitrary roles (such as `role: "admin"`), completely bypassing all security guards.

---

### Assignment 7: Build one CampusEats service in GraphQL

#### 1. Which CampusEats service did you pick?
We picked the **Catalogue Service** (specifically the **Menu / Dishes** entity), modeling dish records with `id`, `name`, `price`, `available`, `category`, and `vendorId`.

#### 2. Name one field a client can skip and one it cannot (why we use the "!" sign).
* **Cannot skip (`!` Non-Null):** In `addDish(input: AddDishInput!)`, the field `name: String!` is marked with `!`. The client must provide it; omitting it triggers an immediate schema validation failure before the resolver executes.
* **Can skip (Nullable):** `category: String` (and `available: Boolean`) does not have `!`, so the client can omit it and the resolver applies a safe default.

#### 3. Map it to SQL/database: Which part of your query became the WHERE, and which resolver ran the INSERT?
* **WHERE mapping:** In `query { dishes(category: "Snacks", available: true) }`, the arguments `category` and `available` map directly to `{ category: 'Snacks', available: true }` (equivalent to SQL `WHERE category = 'Snacks' AND available = true`).
* **INSERT resolver:** The mutation resolver `Mutation.addDish` executed `Dish.create(...)`, equivalent to SQL `INSERT INTO dishes (id, name, price, available) VALUES (...)`.

---

## Other Necessary Details

### 1. Default Demonstration Credentials
Passwords are stored as 10-round salted `bcrypt` hashes:
| Role | Email / Identifier | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Student (Customer)** | `customer@iiitv.ac.in` | `Customer@123` | Browse menus, place orders, track delivery (`GET /items`, `POST /orders`) |
| **Canteen Manager (Restaurant)** | `canteen@iiitv.ac.in` | `Canteen@123` | Browse menus AND create/modify dishes (`POST /items`, `PATCH`) |

### 2. Demonstration Video & Screenshots
* **Google Drive Video Link:** `[PASTE_YOUR_GOOGLE_DRIVE_VIDEO_LINK_HERE]` *(Set permissions to "Anyone with the link can view")*
* **Screenshots Directory:** `screenshots/`
  * `screenshots/1_before_mutation.png` (Menu query before adding dish)
  * `screenshots/2_after_mutation.png` (Live update after mutation)
  * `screenshots/3_security_401.png` (Unauthorized request with no token)
  * `screenshots/4_security_403.png` (Forbidden write request with customer role)
