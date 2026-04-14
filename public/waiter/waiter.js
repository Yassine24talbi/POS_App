// Waiter Page JavaScript

let categories = [];
let products = [];
let cart = [];
let currentCategory = 'all';
let currentItemForNotes = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth(['waiter', 'admin']);
  loadUserInfo();
  loadCategories();
  loadProducts();
  loadStats();
  setupTabs();
  
  // Refresh data periodically
  setInterval(() => {
    loadStats();
    loadReadyOrders();
  }, 15000);
});

// Load user info
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('user-name').textContent = user.name || 'Waiter';
}

// Setup tabs
function setupTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

// Switch tab
function switchTab(tab) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });
  
  // Load data for specific tabs
  if (tab === 'my-orders') {
    loadMyOrders();
  } else if (tab === 'ready-orders') {
    loadReadyOrders();
  }
}

// Load categories
async function loadCategories() {
  try {
    categories = await apiRequest('/api/waiter/categories');
    renderCategories();
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Load products
async function loadProducts() {
  try {
    products = await apiRequest('/api/waiter/products');
    renderProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

// Submit order
async function submitOrder() {
  if (cart.length === 0) {
    showToast('Add items to cart first', 'error');
    return;
  }
  
  const tableNumber = document.getElementById('table-number').value;
  const notes = document.getElementById('order-notes').value.trim();
  
  const items = cart.map(item => ({
    product: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    price: item.price,
    notes: item.notes
  }));
  
  try {
    const response = await apiRequest('/api/waiter/orders', {
      method: 'POST',
      body: JSON.stringify({
        items,
        tableNumber: tableNumber ? parseInt(tableNumber) : null,
        notes
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      showToast(`Order #${data.order.orderNumber} sent to kitchen!`, 'success');
      
      // Clear cart
      cart = [];
      document.getElementById('table-number').value = '';
      document.getElementById('order-notes').value = '';
      renderCart();
      loadStats();
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to submit order', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to submit order', 'error');
  }
}

// Load stats
async function loadStats() {
  try {
    const response = await apiRequest('/api/waiter/stats');
    if (response.ok) {
      const stats = await response.json();
      document.getElementById('total-orders').textContent = stats.totalOrders;
      document.getElementById('total-sales').textContent = `${stats.totalSales} DH`;
      
      // Update badges
      const pendingBadge = document.getElementById('pending-badge');
      const readyBadge = document.getElementById('ready-badge');
      
      if (stats.pendingOrders > 0) {
        pendingBadge.textContent = stats.pendingOrders;
        pendingBadge.style.display = 'block';
      } else {
        pendingBadge.style.display = 'none';
      }
      
      if (stats.readyOrders > 0) {
        readyBadge.textContent = stats.readyOrders;
        readyBadge.style.display = 'block';
      } else {
        readyBadge.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load my orders
async function loadMyOrders() {
  try {
    const response = await apiRequest('/api/waiter/my-orders');
    if (response.ok) {
      const orders = await response.json();
      renderMyOrders(orders);
    }
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

// Render my orders
function renderMyOrders(orders) {
  const list = document.getElementById('my-orders-list');
  
  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-orders">
        <div class="empty-orders-icon">&#x1F4CB;</div>
        <p>No orders today</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = orders.map(order => createOrderCard(order)).join('');
}

// Load ready orders
async function loadReadyOrders() {
  try {
    const response = await apiRequest('/api/waiter/ready-orders');
    if (response.ok) {
      const orders = await response.json();
      renderReadyOrders(orders);
    }
  } catch (error) {
    console.error('Failed to load ready orders:', error);
  }
}

// Render ready orders
function renderReadyOrders(orders) {
  const list = document.getElementById('ready-orders-list');
  
  if (orders.length === 0) {
    list.innerHTML = `
      <div class="empty-orders">
        <div class="empty-orders-icon">&#x2705;</div>
        <p>No orders ready for pickup</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = orders.map(order => createOrderCard(order, true)).join('');
}

// Create order card HTML
function createOrderCard(order, showServeButton = false) {
  const time = new Date(order.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const itemsHtml = order.items.map(item => `
    <div class="order-item-row">
      <span>${item.quantity}x ${item.productName}</span>
      <span>${item.price * item.quantity} DH</span>
    </div>
  `).join('');
  
  return `
    <div class="order-card ${order.status}">
      <div class="order-card-header">
        <div class="order-info">
          <span class="order-number">#${order.orderNumber}</span>
          ${order.tableNumber ? `<span class="order-table-badge">Table ${order.tableNumber}</span>` : ''}
        </div>
        <span class="order-status ${order.status}">${order.status}</span>
      </div>
      <div class="order-items-list">
        ${itemsHtml}
        <div class="order-total-row">
          <span>Total</span>
          <span>${order.total} DH</span>
        </div>
      </div>
      <div class="order-card-footer">
        <span class="order-time">${time}</span>
        ${showServeButton && order.status === 'ready' ? `
          <button class="btn btn-primary btn-sm" onclick="markServed('${order._id}')">Mark Served</button>
        ` : ''}
      </div>
    </div>
  `;
}

// Mark order as served
async function markServed(orderId) {
  try {
    const response = await apiRequest(`/api/waiter/orders/${orderId}/served`, {
      method: 'PUT'
    });
    
    if (response.ok) {
      showToast('Order marked as served', 'success');
      loadReadyOrders();
      loadMyOrders();
      loadStats();
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to update order', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to update order', 'error');
  }
}

// Render categories
function renderCategories() {
  const bar = document.getElementById('categories-bar');
  
  let html = `<button class="category-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">All</button>`;
  
  html += categories.map(cat => `
    <button class="category-btn ${currentCategory === cat._id ? 'active' : ''}" 
            onclick="filterByCategory('${cat._id}')"
            style="${currentCategory === cat._id ? `background: ${cat.color}; color: white;` : ''}">
      ${cat.name}
    </button>
  `).join('');
  
  bar.innerHTML = html;
}

// Filter by category
function filterByCategory(categoryId) {
  currentCategory = categoryId;
  renderCategories();
  renderProducts();
}

// Render products
function renderProducts() {
  const grid = document.getElementById('products-grid');
  
  let filtered = products;
  if (currentCategory !== 'all') {
    filtered = products.filter(p => p.category?._id === currentCategory || p.category === currentCategory);
  }
  
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-orders"><p>No products in this category</p></div>';
    return;
  }
  
  grid.innerHTML = filtered.map(product => `
    <div class="product-card ${!product.isAvailable ? 'unavailable' : ''}" 
         onclick="addToCart('${product._id}')">
      <div class="product-name">${product.name}</div>
      <div class="product-price">${product.price} DH</div>
    </div>
  `).join('');
}

// Add to cart
function addToCart(productId) {
  const product = products.find(p => p._id === productId);
  if (!product || !product.isAvailable) return;
  
  const existingItem = cart.find(item => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      notes: ''
    });
  }
  
  renderCart();
}

// Render cart
function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const submitBtn = document.getElementById('submit-order-btn');
  
  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty"><p>No items in cart</p></div>';
    totalEl.textContent = '0 DH';
    submitBtn.disabled = true;
    return;
  }
  
  submitBtn.disabled = false;
  
  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.productName}</div>
        <div class="cart-item-price">${item.price} DH each</div>
        ${item.notes ? `<div class="cart-item-notes">${item.notes}</div>` : ''}
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
        <span class="qty-value">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
      </div>
      <div class="cart-item-actions">
        <button class="item-action-btn" onclick="openItemNotes(${index})" title="Add notes">&#x270F;</button>
        <button class="item-action-btn delete" onclick="removeFromCart(${index})" title="Remove">&times;</button>
      </div>
    </div>
  `).join('');
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  totalEl.textContent = `${total} DH`;
}

// Update quantity
function updateQuantity(index, delta) {
  cart[index].quantity += delta;
  
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  
  renderCart();
}

// Remove from cart
function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

// Open item notes modal
function openItemNotes(index) {
  currentItemForNotes = index;
  const item = cart[index];
  
  document.getElementById('item-notes-product-name').textContent = item.productName;
  document.getElementById('item-notes-input').value = item.notes || '';
  document.getElementById('item-notes-modal').classList.add('active');
}

// Close item notes modal
function closeItemNotesModal() {
  document.getElementById('item-notes-modal').classList.remove('active');
  currentItemForNotes = null;
}

// Save item notes
function saveItemNotes() {
  if (currentItemForNotes !== null) {
    cart[currentItemForNotes].notes = document.getElementById('item-notes-input').value.trim();
    renderCart();
  }
  closeItemNotesModal();
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
