import { createServer } from '../server.js';
import { seedInitialData } from '../seed.js';

async function runTestSuite() {
  console.log('--- Starting CampusEats End-to-End Verification Suite ---');

  const app = await createServer();
  await seedInitialData();

  const server = app.listen(3099);
  const baseUrl = 'http://127.0.0.1:3099';

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Assignment 4 C5 & Assignment 6 A3 - POST /orders 201 + Location
    // -------------------------------------------------------------
    const idempotencyKey = `key-test-${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        studentId: '202351001',
        vendorId: 'vendor-canteen',
        deliveryAddress: 'Hostel Block B, Room 304',
        items: [{ itemId: 'dish-paneer-roll', quantity: 2 }]
      })
    });

    assert(createRes.status === 201, `Create order returns 201 Created (got ${createRes.status})`);
    const location = createRes.headers.get('Location');
    assert(location && location.startsWith('/api/v1/orders/ord-'), `Response includes Location header: ${location}`);
    const orderData = await createRes.json();
    assert(orderData.totalAmountInr === 180, `Calculated authoritative total is 180 INR (got ${orderData.totalAmountInr})`);
    const orderId = orderData.orderId;

    // -------------------------------------------------------------
    // Test 2: Assignment 4 C7 & Assignment 5 C3 - Idempotent Repeat
    // -------------------------------------------------------------
    const repeatRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        studentId: '202351001',
        deliveryAddress: 'Hostel Block B, Room 304',
        items: [{ itemId: 'dish-paneer-roll', quantity: 2 }]
      })
    });

    assert(repeatRes.status === 200, `Idempotent repeat returns 200 OK (got ${repeatRes.status})`);
    const repeatData = await repeatRes.json();
    assert(repeatData.orderId === orderId, `Idempotent repeat returns original order ID without duplicating work`);
    assert(repeatData.idempotentReplay === true, `Response confirms idempotentReplay flag`);

    // -------------------------------------------------------------
    // Test 3: Assignment 6 B3, C1, C2 - Multi-Field Validation Rejection (422)
    // -------------------------------------------------------------
    const invalidRes = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: '', // Invalid empty
        deliveryAddress: '', // Invalid empty
        items: [] // Invalid empty cart
      })
    });

    assert(invalidRes.status === 422, `Malformed/empty fields rejected with 422 Unprocessable Entity (got ${invalidRes.status})`);
    const errorBody = await invalidRes.json();
    assert(errorBody.errors && errorBody.errors.length >= 2, `Collected multiple validation errors at once (count: ${errorBody.errors?.length})`);
    assert(invalidRes.headers.get('Content-Type')?.includes('application/problem+json'), `Errors use RFC 7807 application/problem+json`);

    // -------------------------------------------------------------
    // Test 4: Assignment 5 B4 & C1 - GET order with ETag & Conditional 304
    // -------------------------------------------------------------
    const getRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}`);
    assert(getRes.status === 200, `GET /orders/${orderId} returns 200 OK`);
    const etag = getRes.headers.get('ETag');
    assert(etag && etag.startsWith('"'), `GET response sets valid ETag: ${etag}`);

    const conditionalGet = await fetch(`${baseUrl}/api/v1/orders/${orderId}`, {
      headers: { 'If-None-Match': etag }
    });
    assert(conditionalGet.status === 304, `Conditional GET with matching ETag returns 304 Not Modified (got ${conditionalGet.status})`);

    // -------------------------------------------------------------
    // Test 5: Assignment 5 C2 - Optimistic Locking with If-Match (412)
    // -------------------------------------------------------------
    const staleUpdate = await fetch(`${baseUrl}/api/v1/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': '"stale-etag-999"'
      },
      body: JSON.stringify({ deliveryAddress: 'Hostel Block A, Room 101' })
    });
    assert(staleUpdate.status === 412, `Conditional update with stale ETag returns 412 Precondition Failed (got ${staleUpdate.status})`);

    // -------------------------------------------------------------
    // Test 6: Assignment 6 C3 - Content Negotiation (XML / 406)
    // -------------------------------------------------------------
    const xmlRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}`, {
      headers: { 'Accept': 'application/xml' }
    });
    assert(xmlRes.status === 200, `Content negotiation for application/xml returns 200 OK`);
    assert(xmlRes.headers.get('Content-Type')?.includes('application/xml'), `Response header is application/xml`);
    const xmlText = await xmlRes.text();
    assert(xmlText.includes('<order>') && xmlText.includes(orderId), `Response body is well-formed XML`);

    const notAcceptableRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}`, {
      headers: { 'Accept': 'image/png' }
    });
    assert(notAcceptableRes.status === 406, `Unsupported Accept header returns 406 Not Acceptable (got ${notAcceptableRes.status})`);

    // -------------------------------------------------------------
    // Test 7: Assignment 5 A2 & Assignment 6 B2 - Sub-resource Cancel & 409 Conflict
    // -------------------------------------------------------------
    const cancelRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Ordered by mistake' })
    });
    assert(cancelRes.status === 200, `Sub-resource POST /orders/${orderId}/cancel returns 200 OK`);

    const repeatCancelRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Try cancelling again' })
    });
    assert(repeatCancelRes.status === 409, `Cancelling already cancelled order returns 409 Conflict (got ${repeatCancelRes.status})`);

    // -------------------------------------------------------------
    // Test 8: Assignment 7 - GraphQL Query & Mutation over Apollo Server
    // -------------------------------------------------------------
    const gqlQueryRes = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { dishes { id name price available } }`
      })
    });
    const gqlQueryResult = await gqlQueryRes.json();
    assert(gqlQueryResult.data?.dishes?.length > 0, `GraphQL Query { dishes } returns menu items from MongoDB (count: ${gqlQueryResult.data?.dishes?.length})`);

    const gqlMutRes = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation AddTestDish($input: AddDishInput!) {
          addDish(input: $input) {
            id
            name
            price
            available
          }
        }`,
        variables: {
          input: { name: 'Campus Special Sandwich', price: 65, category: 'Snacks' }
        }
      })
    });
    const gqlMutResult = await gqlMutRes.json();
    assert(gqlMutResult.data?.addDish?.name === 'Campus Special Sandwich', `GraphQL Mutation addDish creates new dish live in MongoDB`);

    // -------------------------------------------------------------
    // Test 9: CS543 Assignment 09 - Securing the API (JWT & Roles)
    // -------------------------------------------------------------
    console.log('\n--- Assignment 09: Securing the API Checks ---');

    // Case 1: Request with no token -> 401
    const noTokenRes = await fetch(`${baseUrl}/items`);
    assert(noTokenRes.status === 401, `Case 1: GET /items with no token returns 401 (got ${noTokenRes.status})`);

    // Case 2: Successful login -> JWT token
    const loginCustomerRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@iiitv.ac.in', password: 'Customer@123' })
    });
    assert(loginCustomerRes.status === 200, `Case 2a: POST /login with valid customer credentials returns 200 OK`);
    const customerLoginData = await loginCustomerRes.json();
    const customerToken = customerLoginData.token;
    assert(Boolean(customerToken), `Customer login returns valid JWT token`);

    const loginRestaurantRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'canteen@iiitv.ac.in', password: 'Canteen@123' })
    });
    assert(loginRestaurantRes.status === 200, `Case 2b: POST /login with valid restaurant credentials returns 200 OK`);
    const restaurantLoginData = await loginRestaurantRes.json();
    const restaurantToken = restaurantLoginData.token;
    assert(Boolean(restaurantToken), `Restaurant login returns valid JWT token`);

    // Case 3: Request with token on read route -> 200
    const readWithTokenRes = await fetch(`${baseUrl}/items`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(readWithTokenRes.status === 200, `Case 3: GET /items with valid JWT token returns 200 OK`);

    // Case 4: Privileged role (restaurant) on write route -> 201
    const privilegedWriteRes = await fetch(`${baseUrl}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${restaurantToken}`
      },
      body: JSON.stringify({
        name: 'Secured Special Thali',
        price: 120,
        category: 'Meals'
      })
    });
    assert(privilegedWriteRes.status === 201, `Case 4: POST /items by privileged role ('restaurant') returns 201 Created (got ${privilegedWriteRes.status})`);

    // Case 5: Non-privileged role (customer) on write route -> 403 Forbidden
    const unprivilegedWriteRes = await fetch(`${baseUrl}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        name: 'Hacked Unauthorized Dish',
        price: 10,
        category: 'Snacks'
      })
    });
    assert(unprivilegedWriteRes.status === 403, `Case 5: POST /items by non-privileged role ('customer') returns 403 Forbidden (got ${unprivilegedWriteRes.status})`);

  } finally {
    server.close();
    console.log(`\n--- Verification Finished: ${passed} Passed, ${failed} Failed ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTestSuite();
