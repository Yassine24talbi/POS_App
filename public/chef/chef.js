// Chef/Kitchen Display JavaScript

let orders = [];
let completedOrders = [];
let lastOrderCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth(['chef', 'admin']);
  loadUserInfo();
  updateClock();
  setInterval(updateClock, 1000);
  loadOrders();
  loadCompletedOrders();
  loadStats();
  
  // Refresh orders every 10 seconds
  setInterval(() => {
    loadOrders();
    loadCompletedOrders();
    loadStats();
  }, 10000);
  
  // Update elapsed times every second
  setInterval(updateElapsedTimes, 1000);
});

// Load user info
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('user-name').textContent = user.name || 'Chef';
}

// Update clock
function updateClock() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Load orders
async function loadOrders() {
  try {
    const newOrders = await apiRequest('/api/chef/orders');
    if (newOrders.length > lastOrderCount && lastOrderCount > 0) {
      playNotificationSound();
    }
    lastOrderCount = newOrders.length;
    orders = newOrders;
    renderOrders();
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

// Load completed orders
async function loadCompletedOrders() {
  try {
    completedOrders = await apiRequest('/api/chef/completed-orders');
    renderCompletedOrders();
  } catch (error) {
    console.error('Failed to load completed orders:', error);
  }
}

// Load stats
async function loadStats() {
  try {
    const stats = await apiRequest('/api/chef/stats');
    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('preparing-count').textContent = stats.preparing;
    document.getElementById('completed-count').textContent = stats.completed;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Mark order as preparing
async function markPreparing(orderId) {
  try {
    await apiRequest(`/api/chef/orders/${orderId}/preparing`, { method: 'PUT' });
    loadOrders();
    loadStats();
    showToast('Order marked as preparing');
  } catch (error) {
    showToast(error.message || 'Failed to update order', 'error');
  }
}
// Mark order as ready
async function markReady(orderId) {
  try {
    await apiRequest(`/api/chef/orders/${orderId}/ready`, { method: 'PUT' });
    loadOrders();
    loadCompletedOrders();
    loadStats();
    showToast('Order marked as ready!', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to update order', 'error');
  }
}
// Render orders
function renderOrders() {
  const grid = document.getElementById('orders-grid');
  
  if (orders.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#x1F373;</div>
        <div class="empty-state-text">No active orders</div>
      </div>
    `;
    return;
  }
  
  // Sort: pending first, then by time
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  
  grid.innerHTML = sortedOrders.map(order => createOrderCard(order)).join('');
}

// Create order card HTML
function createOrderCard(order) {
  const createdAt = new Date(order.createdAt);
  const timeStr = createdAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const elapsed = getElapsedTime(createdAt);
  const elapsedClass = getElapsedClass(elapsed.minutes);
  
  const itemsHtml = order.items.map(item => `
    <li class="order-item">
      <span class="item-qty">${item.quantity}x</span>
      <div class="item-details">
        <span class="item-name">${item.productName || item.product?.name || 'Item'}</span>
        ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
      </div>
    </li>
  `).join('');
  
  const isPending = order.status === 'pending';
  const isPreparing = order.status === 'preparing';
  
  return `
    <div class="order-card ${order.status}" data-order-id="${order._id}" data-created="${order.createdAt}">
      <div class="order-card-header">
        <div class="order-number">#${order.orderNumber}</div>
        <div class="order-meta">
          ${order.tableNumber ? `<div class="order-table">Table ${order.tableNumber}</div>` : ''}
          <div class="order-time">${timeStr}</div>
          <div class="order-elapsed ${elapsedClass}" data-created="${order.createdAt}">${elapsed.text}</div>
        </div>
      </div>
      <div class="order-card-body">
        <ul class="order-items">
          ${itemsHtml}
        </ul>
        ${order.notes ? `
          <div class="order-notes">
            <div class="order-notes-label">Order Notes</div>
            <div class="order-notes-text">${order.notes}</div>
          </div>
        ` : ''}
      </div>
      <div class="order-card-footer">
        <div class="order-actions">
          ${isPending ? `
            <button class="btn btn-preparing" onclick="markPreparing('${order._id}')">
              Start Preparing
            </button>
          ` : ''}
          ${isPreparing ? `
            <button class="btn btn-ready" onclick="markReady('${order._id}')">
              Mark Ready
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Get elapsed time
function getElapsedTime(createdAt) {
  const now = new Date();
  const diff = Math.floor((now - createdAt) / 1000);
  
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  
  return {
    minutes,
    text: `${minutes}:${seconds.toString().padStart(2, '0')}`
  };
}

// Get elapsed class based on time
function getElapsedClass(minutes) {
  if (minutes < 5) return 'elapsed-normal';
  if (minutes < 10) return 'elapsed-warning';
  return 'elapsed-danger';
}

// Update elapsed times
function updateElapsedTimes() {
  document.querySelectorAll('.order-elapsed').forEach(el => {
    const createdAt = new Date(el.dataset.created);
    const elapsed = getElapsedTime(createdAt);
    el.textContent = elapsed.text;
    el.className = `order-elapsed ${getElapsedClass(elapsed.minutes)}`;
  });
}

// Render completed orders
function renderCompletedOrders() {
  const list = document.getElementById('completed-list');
  
  if (completedOrders.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-text">No completed orders yet</div></div>';
    return;
  }
  
  list.innerHTML = completedOrders.map(order => {
    const time = new Date(order.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    return `
      <div class="completed-item">
        <span class="completed-order-number">#${order.orderNumber}</span>
        <span class="completed-time">${time}</span>
      </div>
    `;
  }).join('');
}

// Mark order as preparing
async function markPreparing(orderId) {
  try {
    const data = await apiRequest(`/api/chef/orders/${orderId}/preparing`, {
      method: 'PUT'
    });

    if (!data.error) {
      loadOrders();
      loadStats();
      showToast('Order marked as preparing');
    } else {
      showToast(data.error || 'Failed to update order', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to update order', 'error');
  }
}

// Mark order as ready
async function markReady(orderId) {
  try {
    const data = await apiRequest(`/api/chef/orders/${orderId}/ready`, {
      method: 'PUT'
    });

    if (!data.error) {
      loadOrders();
      loadCompletedOrders();
      loadStats();
      showToast('Order marked as ready!', 'success');
    } else {
      showToast(data.error || 'Failed to update order', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to update order', 'error');
  }
}

// Play notification sound
function playNotificationSound() {
  const audio = document.getElementById('notification-sound');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }
}

// Refresh orders manually
function refreshOrders() {
  loadOrders();
  loadCompletedOrders();
  loadStats();
  showToast('Orders refreshed');
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
