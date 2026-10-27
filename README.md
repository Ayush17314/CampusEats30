# CampusEats — GraphQL Service (Assignment 7)

**Course:** CS543 Web Services  
**Assignment:** Assignment 7 of 12 — Build one CampusEats service in GraphQL  
**Institution:** Indian Institute of Information Technology Vadodara (IIITV)  
**Team Submission:** Group Group-30  

## Team Members
| Name | Roll Number | Service Responsibility |
| :--- | :--- | :--- |
| **Ayush Kumar Dubey** | 202351001 | Catalogue Service (GraphQL API & Resolvers) |
| *[Member 2 Name]* | *[Roll No]* | Frontend GraphQL Client (`index.html`) |
| *[Member 3 Name]* | *[Roll No]* | Database Schema & Seed Data |
| *[Member 4 Name]* | *[Roll No]* | Testing & Demonstration Recording |

---

## One-Line Run Instruction
```bash
cd Backend && npm install && npm start
```
* Server runs at: `http://localhost:3001`
* Interactive Web Page: `http://localhost:3001/`
* Apollo Server GraphQL Endpoint: `http://localhost:3001/graphql`

---

## Demonstration Video & Screenshots
* **Google Drive Video Link:** `[PASTE_YOUR_GOOGLE_DRIVE_VIDEO_LINK_HERE]` *(Ensure sharing is set to "Anyone with the link can view")*
* **Screenshot 1 (Before Mutation - Initial Query):** Located in `screenshots/1_before_mutation.png`
* **Screenshot 2 (After Mutation - Live Update):** Located in `screenshots/2_after_mutation.png`

---

## Answers to Assignment 7 Questions

### 1. Which CampusEats service did you pick?
We picked the **Catalogue Service** (specifically the **Menu / Dishes** entity). It models dish items available across campus eateries (Central Canteen, Night Mess, Nescafe Kiosk) with fields `id`, `name`, `price`, `available`, `category`, and `vendorId`.

### 2. Name one field a client can skip and one it cannot (why we use the "!" sign).
* **Field a client cannot skip:** `name: String!` (and `price: Float!`) inside `AddDishInput`. The exclamation mark `!` denotes a **Non-Null** type in GraphQL SDL. If a client attempts to execute `addDish` without providing `name`, GraphQL's schema validation rejects the operation before executing the resolver.
* **Field a client can skip:** `category: String` (and `available: Boolean`). Because it lacks the `!` symbol, it is **Nullable**. The client is free to omit it from the mutation payload, and the resolver safely defaults to `"General"` or `true`.

### 3. Map it to SQL/database: Which part of your query became the WHERE, and which resolver ran the INSERT?
* **WHERE mapping:** In the GraphQL query:
  ```graphql
  query {
    dishes(category: "Snacks", available: true) {
      id name price available
    }
  }
  ```
  The query arguments `category: "Snacks"` and `available: true` map directly to the database query filter `{ category: 'Snacks', available: true }` (the exact equivalent of `WHERE category = 'Snacks' AND available = true` in SQL). Similarly, `dish(id: $id)` maps to `WHERE dish_id = $id` (`findOne({ dishId: id })`).
* **INSERT resolver:** The mutation resolver `Mutation.addDish` executed the database insertion:
  ```javascript
  addDish: async (_, { input }) => {
    return await Dish.create({
      dishId: `dish-${Date.now().toString(36)}`,
      name: input.name,
      price: input.price,
      available: input.available !== undefined ? input.available : true,
      category: input.category || 'General'
    });
  }
  ```
  This corresponds directly to SQL `INSERT INTO dishes (id, name, price, available, category) VALUES (...)`.
