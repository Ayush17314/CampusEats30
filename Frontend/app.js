/**
 * ============================================================================
 * CampusEats (IIIT Vadodara) — Frontend Application Logic
 * Integrates REST (Assignments 1-6, 9) & GraphQL (Assignment 7)
 * ============================================================================
 */

// Application State
const state = {
  token: localStorage.getItem('campuseats_token') || null,
  user: JSON.parse(localStorage.getItem('campuseats_user') || 'null'),
  cart: JSON.parse(localStorage.getItem('campuseats_cart') || '[]'),
  dishes: [],
  orders: [],
  selectedCategory: 'All',
  apiMode: 'REST', // 'REST' or 'GRAPHQL'
  logs: []
};

// DOM Elements
const el = {
  userPill: document.getElementById('userPill'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  cartBtn: document.getElementById('cartBtn'),
  cartCount: document.getElementById('cartCount'),
  cartDrawer: document.getElementById('cartDrawer'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  cartItemsList: document.getElementById('cartItemsList'),
  cartTotal: document.getElementById('cartTotal'),
  dishesGrid: document.getElementById('dishesGrid'),
  ordersList: document.getElementById('ordersList'),
  ordersSection: document.getElementById('ordersSection'),
  restaurantSection: document.getElementById('restaurantSection'),
  apiModeBtn: document.getElementById('apiModeBtn'),
  apiModeLabel: document.getElementById('apiModeLabel'),
  inspectorLogs: document.getElementById('inspectorLogs'),
  loginModal: document.getElementById('loginModal')
};

// -------------------------------------------------------------
// Network & Protocol Inspector Logger
// -------------------------------------------------------------
function logNetwork(method, url, status, headersSent, responseData, durationMs) {
  const time = new Date().toLocaleTimeString();
  const entry = { time, method, url, status, headersSent, responseData, durationMs };
  state.logs.unshift(entry);
  if (state.logs.length > 20) state.logs.pop();

  if (el.inspectorLogs) {
    el.inspectorLogs.innerHTML = state.logs.map(log => {
      let statusClass = 's200';
      if (log.status >= 400 && log.status < 500) statusClass = `s${log.status}`;
      if (log.status === 304) statusClass = 's304';
      if (log.status === 201) statusClass = 's201';

      return `
        <div class="log-entry">
          <span class="log-time">[${log.time}]</span>
          <span class="log-status ${statusClass}">${log.status}</span>
          <span style="font-weight:700; color:#e2e8f0;">${log.method}</span>
          <span style="color:#94a3b8; word-break:break-all;">${log.url} (${log.durationMs}ms)</span>
        </div>
      `;
    }).join('');
  }
}

// Wrapper around fetch to inject Bearer token and record inspector logs
async function apiFetch(url, options = {}) {
  const start = performance.now();
  const headers = options.headers || {};

  if (state.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const duration = Math.round(performance.now() - start);

    let data = null;
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    logNetwork(options.method || 'GET', url, res.status, headers, data, duration);
    return { ok: res.ok, status: res.status, headers: res.headers, data };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    logNetwork(options.method || 'GET', url, 'ERR', headers, err.message, duration);
    throw err;
  }
}

// -------------------------------------------------------------
// Authentication & User Sessions (Assignment 9)
// -------------------------------------------------------------
function updateAuthUI() {
  if (state.user && state.token) {
    el.userPill.innerHTML = `
      <span>👤 ${state.user.name || state.user.email}</span>
      <span class="role-tag ${state.user.role}">${state.user.role}</span>
    `;
    el.loginBtn.style.display = 'none';
    el.logoutBtn.style.display = 'inline-flex';

    // Show restaurant admin portal if role is 'restaurant' or 'admin'
    if (state.user.role === 'restaurant' || state.user.role === 'admin') {
      el.restaurantSection.style.display = 'block';
    } else {
      el.restaurantSection.style.display = 'none';
    }
  } else {
    el.userPill.innerHTML = `
      <span>👤 Guest Student</span>
      <span class="role-tag anonymous">Unauthenticated</span>
    `;
    el.loginBtn.style.display = 'inline-flex';
    el.logoutBtn.style.display = 'none';
    el.restaurantSection.style.display = 'none';
  }
}

async function login(email, password) {
  try {
    const res = await apiFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 200) {
      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('campuseats_token', state.token);
      localStorage.setItem('campuseats_user', JSON.stringify(state.user));
      updateAuthUI();
      closeLoginModal();
      fetchDishes();
      fetchOrders();
      alert(`Logged in successfully as ${state.user.name} (${state.user.role.toUpperCase()})!`);
    } else {
      alert(`Login Failed (${res.status}): ${res.data?.error || 'Invalid credentials'}`);
    }
  } catch (err) {
    alert(`Network Error: Could not reach backend server at /login`);
  }
}

function quickLogin(role) {
  if (role === 'customer') {
    login('customer@iiitv.ac.in', 'Customer@123');
  } else if (role === 'restaurant') {
    login('canteen@iiitv.ac.in', 'Canteen@123');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('campuseats_token');
  localStorage.removeItem('campuseats_user');
  updateAuthUI();
  fetchDishes();
  alert('Logged out successfully.');
}

function openLoginModal() { el.loginModal.style.display = 'flex'; }
function closeLoginModal() { el.loginModal.style.display = 'none'; }

// -------------------------------------------------------------
// Mode Toggle (REST vs GraphQL - Assignment 7)
// -------------------------------------------------------------
function toggleApiMode() {
  state.apiMode = state.apiMode === 'REST' ? 'GRAPHQL' : 'REST';
  el.apiModeLabel.textContent = `Mode: ${state.apiMode}`;
  fetchDishes();
}

// -------------------------------------------------------------
// Menu & Catalogue Fetching (REST / GraphQL)
// -------------------------------------------------------------
async function fetchDishes() {
  el.dishesGrid.innerHTML = '<p style="color:#64748b; padding:20px;">Loading dishes from backend...</p>';

  try {
    let dishes = [];

    if (state.apiMode === 'GRAPHQL') {
      // Assignment 7: GraphQL Query over Apollo Server
      const query = `
        query GetDishes {
          dishes {
            id
            name
            price
            available
            category
          }
        }
      `;
      const res = await apiFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      dishes = res.data?.data?.dishes || [];
    } else {
      // Assignments 4, 5, 9: REST Endpoint GET /items
      const res = await apiFetch('/api/v1/catalogue/dishes');
      dishes = Array.isArray(res.data) ? res.data : [];
    }

    state.dishes = dishes;
    renderDishes();
  } catch (err) {
    el.dishesGrid.innerHTML = `
      <div style="background:#fee2e2; color:#dc2626; padding:16px; border-radius:8px;">
        Failed to load dishes from backend (${state.apiMode}). Ensure backend is running on port 3001.
      </div>
    `;
  }
}

function setCategoryFilter(category) {
  state.selectedCategory = category;
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.cat === category);
  });
  renderDishes();
}

function renderDishes() {
  const filtered = state.selectedCategory === 'All'
    ? state.dishes
    : state.dishes.filter(d => (d.category || 'General').toLowerCase().includes(state.selectedCategory.toLowerCase()));

  if (filtered.length === 0) {
    el.dishesGrid.innerHTML = '<p style="color:#64748b; padding:20px;">No dishes found in this category.</p>';
    return;
  }

  el.dishesGrid.innerHTML = filtered.map(dish => {
    const isAvailable = dish.available !== false;
    const dishIcon = dish.category === 'Beverages' ? '🥤' : dish.category === 'Meals' ? '🍛' : '🌯';

    return `
      <div class="dish-card">
        <div class="dish-img-placeholder">
          <span>${dishIcon}</span>
          <span class="vendor-badge">Central Canteen</span>
          <span class="status-badge ${isAvailable ? 'in-stock' : 'sold-out'}">
            ${isAvailable ? 'Available' : 'Sold Out'}
          </span>
        </div>
        <div class="dish-body">
          <h3 class="dish-name">${dish.name}</h3>
          <p class="dish-cat">${dish.category || 'General'} · ID: ${dish.id || dish.dishId}</p>
          <div class="dish-footer">
            <span class="dish-price">₹${Number(dish.price).toFixed(2)}</span>
            <button 
              class="btn btn-primary" 
              style="padding:6px 12px; font-size:0.8rem;" 
              ${!isAvailable ? 'disabled' : ''} 
              onclick='addToCart(${JSON.stringify(dish).replace(/'/g, "&apos;")})'>
              + Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Cart Management
// -------------------------------------------------------------
function saveCart() {
  localStorage.setItem('campuseats_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  el.cartCount.textContent = totalItems;
  el.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
}

function addToCart(dish) {
  const id = dish.id || dish.dishId;
  const existing = state.cart.find(i => i.itemId === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      itemId: id,
      name: dish.name,
      price: Number(dish.price),
      quantity: 1
    });
  }
  saveCart();
  openCartDrawer();
}

function updateCartQty(itemId, delta) {
  const item = state.cart.find(i => i.itemId === itemId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.itemId !== itemId);
  }
  saveCart();
}

function renderCart() {
  if (state.cart.length === 0) {
    el.cartItemsList.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px;">Your cart is empty.</p>';
    el.cartTotal.textContent = '₹0.00';
    return;
  }

  let total = 0;
  el.cartItemsList.innerHTML = state.cart.map(item => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>₹${item.price.toFixed(2)} each</p>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty('${item.itemId}', -1)">-</button>
          <span style="font-weight:700; width:20px; text-align:center;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.itemId}', 1)">+</button>
        </div>
        <div style="font-weight:700; width:65px; text-align:right;">₹${lineTotal.toFixed(2)}</div>
      </div>
    `;
  }).join('');

  el.cartTotal.textContent = `₹${total.toFixed(2)}`;
}

function openCartDrawer() {
  renderCart();
  el.cartDrawer.classList.add('open');
  el.drawerBackdrop.style.display = 'block';
}

function closeCartDrawer() {
  el.cartDrawer.classList.remove('open');
  el.drawerBackdrop.style.display = 'none';
}

// -------------------------------------------------------------
// Place Order (Orders Orchestrator - Assignments 4, 5, 6)
// -------------------------------------------------------------
async function handleCheckout() {
  if (state.cart.length === 0) {
    alert('Cannot checkout: Cart is empty.');
    return;
  }

  const address = document.getElementById('deliveryAddressInput').value.trim();
  const paymentMethod = document.getElementById('paymentMethodSelect').value;

  if (!address) {
    alert('Please enter a campus delivery address (e.g. Hostel Block B, Room 304).');
    return;
  }

  // Generate unique Idempotency Key (Assignment 4 C7 & Assignment 5 C3)
  const idempotencyKey = `web-order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const payload = {
    studentId: state.user?.id || '202351001',
    vendorId: 'vendor-canteen',
    deliveryAddress: address,
    paymentMethod,
    items: state.cart.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
  };

  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;
  btn.textContent = 'Orchestrating Order...';

  try {
    const res = await apiFetch('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 201 || res.status === 200) {
      alert(`🎉 Order Confirmed!\nOrder ID: ${res.data.orderId}\nStatus: ${res.data.status}\nTotal: ₹${res.data.totalAmountInr}`);
      state.cart = [];
      saveCart();
      closeCartDrawer();
      fetchOrders();
    } else {
      // RFC 7807 Problem Details Error Formatting (Assignment 6)
      const err = res.data;
      let msg = `Order Rejected (${res.status}): ${err.title || 'Error'}\n${err.detail || ''}`;
      if (err.errors) {
        msg += '\n\nValidation Details:';
        err.errors.forEach(e => { msg += `\n• ${e.field}: ${e.reason}`; });
      }
      alert(msg);
    }
  } catch (err) {
    alert(`Order failed: Network error communicating with /api/v1/orders.`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm & Place Order';
  }
}

// -------------------------------------------------------------
// Order Lifecycle & Cancellations (Assignment 5 A2 & Assignment 6)
// -------------------------------------------------------------
async function fetchOrders() {
  try {
    const res = await apiFetch('/api/v1/orders?limit=10');
    if (res.status === 200 && res.data?.orders) {
      state.orders = res.data.orders;
      renderOrders();
    }
  } catch (err) {
    console.warn('Could not fetch orders:', err.message);
  }
}

function renderOrders() {
  if (state.orders.length === 0) {
    el.ordersList.innerHTML = '<p style="color:#64748b; padding:12px;">No recent orders found.</p>';
    return;
  }

  el.ordersList.innerHTML = state.orders.map(order => {
    const canCancel = !['DELIVERED', 'CANCELLED'].includes(order.status);
    return `
      <div class="order-card">
        <div class="order-top">
          <span class="order-id">#${order.orderId}</span>
          <span class="status-chip ${order.status}">${order.status}</span>
        </div>
        <div style="font-size:0.85rem; color:#475569; margin-bottom:8px;">
          📍 Delivery To: <strong>${order.deliveryAddress}</strong> · Total: <strong>₹${Number(order.totalAmountInr).toFixed(2)}</strong>
        </div>
        <div style="font-size:0.8rem; color:#64748b; margin-bottom:10px;">
          Items: ${order.items.map(i => `${i.name} (×${i.quantity})`).join(', ')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:#94a3b8;">${new Date(order.createdAt).toLocaleString()}</span>
          ${canCancel ? `
            <button class="btn btn-danger" style="padding:4px 10px; font-size:0.75rem;" onclick="cancelOrder('${order.orderId}')">
              Cancel Order
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function cancelOrder(orderId) {
  if (!confirm(`Are you sure you want to cancel order #${orderId}?`)) return;

  try {
    // Non-CRUD state-changing sub-resource (Assignment 5 A2)
    const res = await apiFetch(`/api/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Student cancelled from web portal' })
    });

    if (res.status === 200) {
      alert(`Order #${orderId} was cancelled. Payment refunded!`);
      fetchOrders();
    } else {
      alert(`Could not cancel (${res.status}): ${res.data?.detail || res.data?.error}`);
    }
  } catch (err) {
    alert('Cancellation failed due to network error.');
  }
}

// -------------------------------------------------------------
// Restaurant Management Portal (Assignment 09 Role Guard Test)
// -------------------------------------------------------------
async function handleRestaurantAddDish(event) {
  event.preventDefault();
  const name = document.getElementById('newDishName').value.trim();
  const price = parseFloat(document.getElementById('newDishPrice').value);
  const category = document.getElementById('newDishCategory').value;

  try {
    // Guarded by requireRole('restaurant', 'admin') (Assignment 09)
    const res = await apiFetch('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, category })
    });

    if (res.status === 201) {
      alert(`✅ Dish Added Successfully!\nCreated '${res.data.name}' for ₹${res.data.price}`);
      document.getElementById('newDishName').value = '';
      document.getElementById('newDishPrice').value = '';
      fetchDishes();
    } else if (res.status === 403) {
      alert(`⛔ 403 FORBIDDEN!\n${res.data?.detail || res.data?.error || 'Role forbidden'}\n\nNotice: Your current role is not 'restaurant' or 'admin'. This demonstrates Assignment 9 Role Protection!`);
    } else if (res.status === 401) {
      alert('🔒 401 UNAUTHORIZED: Please login first with a restaurant account.');
    } else {
      alert(`Error (${res.status}): ${res.data?.detail || 'Request failed'}`);
    }
  } catch (err) {
    alert('Failed to connect to /items endpoint.');
  }
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  updateCartBadge();
  fetchDishes();
  fetchOrders();

  // Polling every 12 seconds for order updates
  setInterval(fetchOrders, 12000);
});
