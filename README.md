# CampusEats — Microservices & Security Backend

**Course:** CS543 Web Services  
**Institution:** Indian Institute of Information Technology Vadodara (IIITV)  
**Team Submission:**  Group-03 

## Team Members
| Name | Roll Number | 
| :--- | :--- | :--- |
| **Ayush Kumar Dubey** | *20251651030* | 
| *Abhinav Jain* | *20251651003* | 
| *Anuj Gupta* | *20251651025* |
| *Bharath Kumar MP* | *20251651031* |
| *Kaushik Nanda upadhaya* | *20251651050* | 

---

## One-Line Run Instruction
```bash
cd Backend && npm install && npm start
```
* Server runs at: `http://localhost:3001`
* Interactive Web Page: `http://localhost:3001/`
* Apollo Server GraphQL Endpoint: `http://localhost:3001/graphql`
* REST API Base: `http://localhost:3001/api/v1`

---

## CS543 Assignment 09: Securing the API

### Seeded Test Credentials (Passwords stored as bcrypt hashes)
| Role | Email / Identifier | Plain Password | Permissions |
| :--- | :--- | :--- | :--- |
| **customer** | `customer@iiitv.ac.in` | `Customer@123` | Can read menus/dishes (`GET /items`) |
| **restaurant** | `canteen@iiitv.ac.in` | `Canteen@123` | Can read menus AND create/modify items (`POST /items`, `PATCH`) |

---

### Demonstration of the Five Cases (Task 6)

#### Case 1: Request with No Token $\to$ `401 Unauthorized`
```bash
curl -i http://localhost:3001/items
```
*Response: `HTTP/1.1 401 Unauthorized` with `{"error": "missing token"}`*

#### Case 2: Login $\to$ Issues JWT Token
```bash
# Login as Customer:
curl -i -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@iiitv.ac.in","password":"Customer@123"}'

# Login as Restaurant (Privileged):
curl -i -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"canteen@iiitv.ac.in","password":"Canteen@123"}'
```
*Response: `HTTP/1.1 200 OK` with `{"token": "<JWT_STRING>", "user": {...}}`*

#### Case 3: Read Route with Valid Token $\to$ `200 OK`
```bash
curl -i http://localhost:3001/items \
  -H "Authorization: Bearer <CUSTOMER_OR_RESTAURANT_TOKEN>"
```
*Response: `HTTP/1.1 200 OK` returning list of dishes.*

#### Case 4: Privileged Role (`restaurant`) on Write Route $\to$ `201 Created`
```bash
curl -i -X POST http://localhost:3001/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <RESTAURANT_TOKEN>" \
  -d '{"name":"Special Paneer Pulao","price":110,"category":"Meals"}'
```
*Response: `HTTP/1.1 201 Created` with created dish payload.*

#### Case 5: Non-Privileged Role (`customer`) on Write Route $\to$ `403 Forbidden`
```bash
curl -i -X POST http://localhost:3001/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -d '{"name":"Hacked Unauthorized Dish","price":10}'
```
*Response: `HTTP/1.1 403 Forbidden` with `{"error": "forbidden"}`*

---

## Answers to Assignment 09 Questions

### 1. Which route(s) require only authentication, and which also require a role? Give the method + path and the role allowed for each.
* **Requires only Authentication (`auth` guard):**
  * `GET /items` (and `GET /dishes`): Allows any authenticated user regardless of role (both `customer` and `restaurant`) to browse dishes.
* **Requires Authentication + Role Authorization (`requireRole('restaurant', 'admin')` guard):**
  * `POST /items` (and `POST /dishes`): Allowed roles: `restaurant`, `admin`.
  * `PATCH /items/:id/availability`: Allowed roles: `restaurant`, `admin`.

### 2. Show one 401 and one 403 from your demo. In one line each, say why the server returned that code (not the other).
* **`401 Unauthorized`:**
  * Output: `HTTP/1.1 401 Unauthorized` — `{"error": "missing token"}` (or `"invalid token"`).
  * **Why:** Returned because the caller has not proven their identity (missing, invalid, or expired Bearer token).
* **`403 Forbidden`:**
  * Output: `HTTP/1.1 403 Forbidden` — `{"error": "forbidden"}`.
  * **Why:** Returned because the caller's identity is authenticated and verified, but their role (`customer`) lacks permission to modify restaurant menu data.

### 3. What is inside your JWT payload? Why is it safe to trust the role claim on the server, and why must the secret stay out of your code?
* **Inside the JWT Payload:** The signed claims contain `{ id: user.studentId, role: user.role, email: user.email, iat: ..., exp: ... }`.
* **Why it is safe to trust the role claim:** The JWT is signed using a cryptographic signature (`HMAC-SHA256`) with `process.env.JWT_SECRET`. If a client tampers with the payload (e.g., trying to change `"role": "customer"` to `"role": "restaurant"`), the cryptographic signature check in `jwt.verify()` fails immediately, causing the server to reject it with `401`.
* **Why the secret must stay out of your code:** If `JWT_SECRET` leaks into source code or Git history, an attacker can sign their own counterfeit JWTs with arbitrary `role: "admin"` or `role: "restaurant"` privileges, completely bypassing all authentication and authorization guards.

---

## Answers to Assignment 7 Questions (GraphQL)

### 1. Which CampusEats service did you pick?
We picked the **Catalogue Service** (specifically the **Menu / Dishes** entity). It models dish items available across campus eateries with fields `id`, `name`, `price`, `available`, `category`, and `vendorId`.

### 2. Name one field a client can skip and one it cannot (why we use the "!" sign).
* **Field a client cannot skip:** `name: String!` (and `price: Float!`) inside `AddDishInput`. The exclamation mark `!` denotes a **Non-Null** type in GraphQL SDL. If a client attempts to execute `addDish` without providing `name`, GraphQL's schema validation rejects the operation before executing the resolver.
* **Field a client can skip:** `category: String` (and `available: Boolean`). Because it lacks the `!` symbol, it is **Nullable**. The client is free to omit it from the mutation payload, and the resolver safely defaults to `"General"` or `true`.

### 3. Map it to SQL/database: Which part of your query became the WHERE, and which resolver ran the INSERT?
* **WHERE mapping:** In `query { dishes(category: "Snacks", available: true) }`, arguments `category` and `available` map directly to `{ category: 'Snacks', available: true }` (the exact equivalent of SQL `WHERE category = 'Snacks' AND available = true`).
* **INSERT resolver:** The mutation resolver `Mutation.addDish` ran `Dish.create({ ... })`, which corresponds directly to SQL `INSERT INTO dishes (...) VALUES (...)`.
