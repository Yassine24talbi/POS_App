// Cashier Page JavaScript

// Check authentication
if (!checkAuth(['cashier', 'admin'])) {
  window.location.href = '/';
}

// State
let categories = [];
let products = [];
let cart = [];
let orderType = 'dine-in';
let paymentMethod = 'cash';
let appliedPromo = null;
let lastCompletedOrder = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('cashierName').textContent = user.name;
  }

  loadCategories();
  loadProducts();
  loadTodayStats();
});

// Load categories
async function loadCategories() {
  try {
    categories = await apiRequest('/api/cashier/categories');
    renderCategories();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load products
async function loadProducts() {
  try {
    products = await apiRequest('/api/cashier/products');
    renderProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Load today's stats
async function loadTodayStats() {
  try {
    const stats = await apiRequest('/api/cashier/today-stats');
    document.getElementById('orderCount').textContent = `${stats.orderCount} orders today`;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Render categories
function renderCategories() {
  const bar = document.getElementById('categoriesBar');
  bar.innerHTML = `
    <button class="category-btn active" data-category="all" onclick="filterByCategory('all')">All</button>
    ${categories.map(cat => `
      <button class="category-btn" data-category="${cat._id}" onclick="filterByCategory('${cat._id}')" style="--cat-color: ${cat.color}">
        ${cat.name}
      </button>
    `).join('')}
  `;
}

// Render products
function renderProducts(categoryFilter = 'all') {
  const grid = document.getElementById('productsGrid');
  let filteredProducts = products;

  if (categoryFilter !== 'all') {
    filteredProducts = products.filter(p => p.category?._id === categoryFilter);
  }

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="loading-products">
        <p>No products found</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(product => `
    <div class="product-card" onclick="addToCart('${product._id}')">
      <div class="product-icon">${getProductEmoji(product.category?.name)}</div>
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formatCurrency(product.price)}</div>
    </div>
  `).join('');
}

// Get emoji based on category
function getProductEmoji(categoryName) {
  const emojis = {
    'drinks': '🥤',
    'beverages': '🥤',
    'food': '🍽️',
    'meals': '🍽️',
    'desserts': '🍰',
    'snacks': '🍟',
    'coffee': '☕',
    'tea': '🍵',
    'pizza': '🍕',
    'burger': '🍔',
    'salads': '🥗',
    'default': '📦'
  };

  const name = (categoryName || '').toLowerCase();
  for (const [key, emoji] of Object.entries(emojis)) {
    if (name.includes(key)) return emoji;
  }
  return emojis.default;
}

// Filter by category
function filterByCategory(categoryId) {
  // Update active button
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.category === categoryId) {
      btn.classList.add('active');
    }
  });

  renderProducts(categoryId);
}

// Add to cart
function addToCart(productId, qnt) {
  const product = products.find(p => p._id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: qnt || 1,
    });
  }

  renderCart();
  showToast(`${product.name} added to cart`, 'success');
}

// Update cart item quantity
function updateCartQty(productId, change) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    cart = cart.filter(i => i.productId !== productId);
  }

  renderCart();
}

// Remove from cart
function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  renderCart();
}

// Clear cart
function clearCart() {
  cart = [];
  appliedPromo = null;
  document.getElementById('tableInputSection').children[0].value = '';  
  document.getElementById('promoCodeInput').value = '';
  document.getElementById('promoApplied').classList.add('hidden');
  document.getElementById('discountRow').classList.add('hidden');
  document.getElementById('completeOrderBtn').classList.add('active');
  document.getElementById('paydlaterOrder').classList.remove('active');
  const el1 = document.getElementById('tableInputSection');
  const el2 = document.getElementById('cartItems');
  const ordrtype = document.getElementById('orderTypeSelector');
  const laterbtn = document.getElementById('laterbtn');
  laterbtn.disabled = false;
  laterbtn.style.textDecoration = "none";
  ordrtype.style.pointerEvents = 'auto';
  ordrtype.style.opacity = '1';
  el1.style.pointerEvents = 'auto';
  el2.style.pointerEvents = 'auto';
  el1.style.opacity = '1';
  el2.style.opacity = '1';
  renderCart();
}

// Render cart
function renderCart() {
  const cartContainer = document.getElementById('cartItems');
  const clearBtn = document.getElementById('clearCartBtn');
  const completeBtn = document.getElementById('completeOrderBtn');

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p>Cart is empty</p>
        <span>Add products to start an order</span>
      </div>
    `;
    clearBtn.disabled = true;
    completeBtn.disabled = true;
    updateTotals('completeOrderBtn');
    return;
  }

  clearBtn.disabled = false;

  cartContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.productName}</div>
        <div class="cart-item-price">${formatCurrency(item.price)} each</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn ${item.quantity === 1 ? 'remove' : ''}" onclick="updateCartQty('${item.productId}', -1)">
          ${item.quantity === 1 ? '×' : '-'}
        </button>
        <span class="cart-item-qty">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQty('${item.productId}', 1)">+</button>
      </div>
      <div class="cart-item-total">${formatCurrency(item.price * item.quantity)}</div>
    </div>
  `).join('');

  updateTotals('completeOrderBtn');
}

// Update totals
function updateTotals(activeButtonId) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;

  if (appliedPromo) {
    discount = appliedPromo.discount;
    document.getElementById('discountRow').classList.remove('hidden');
    document.getElementById('discountAmount').textContent = `-${formatCurrency(discount)}`;
  } else {
    document.getElementById('discountRow').classList.add('hidden');
  }

  const total = subtotal - discount;

  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('total').textContent = formatCurrency(total);

  // Update complete button state
  const completeBtn = document.getElementById(activeButtonId);
  if (cart.length > 0) {
    if (paymentMethod === 'cash') {
      const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
      completeBtn.disabled = paidAmount < total;
    } else {
      completeBtn.disabled = false;
    }
  } else {
    completeBtn.disabled = true;
  }

  calculateChange();
}

// Set order type
function setOrderType(type) {
  orderType = type;
  
  document.querySelectorAll('.order-type-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.type === type) {
      btn.classList.add('active');
    }
  });

  // Show/hide table input
  const tableSection = document.getElementById('tableInputSection');
  if (type === 'dine-in') {
    tableSection.style.display = 'block';
    document.getElementById('laterbtn').disabled = false;
    document.getElementById('laterbtn').style.textDecoration = "none";
  } else {
    tableSection.style.display = 'none';
    document.getElementById('laterbtn').disabled = true;
    document.getElementById('laterbtn').style.textDecoration = "line-through";
    document.getElementById('tableNumber').value = '';
    setPaymentMethod('cash');
  }
}

// Set payment method
function setPaymentMethod(method) {
  paymentMethod = method;
  
  document.querySelectorAll('.payment-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.method === method) {
      btn.classList.add('active');
    }
  });

  // Show/hide cash input
  const cashInput = document.getElementById('cashInputSection');
  if (method === 'cash') {
    cashInput.style.display = 'block';
  } else if (method === 'later') {
    cashInput.style.display = 'none';
    document.getElementById('paidAmount').value = '';
  }else{
     cashInput.style.display = 'none';
    document.getElementById('paidAmount').value = '';
  }

  updateTotals('completeOrderBtn');
}

// Set quick cash amount
function setQuickCash(amount) {
  document.getElementById('paidAmount').value = amount;
  calculateChange();
  updateTotals('completeOrderBtn');
}

// Set exact amount
function setExactAmount() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = appliedPromo ? appliedPromo.discount : 0;
  const total = subtotal - discount;
  document.getElementById('paidAmount').value = total.toFixed(2);
  calculateChange();
  updateTotals('completeOrderBtn');
}

// Calculate change
function calculateChange() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = appliedPromo ? appliedPromo.discount : 0;
  const total = subtotal - discount;
  const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
  const change = paidAmount - total;

  document.getElementById('changeAmount').textContent = formatCurrency(Math.max(0, change));
}

// Apply promo code
async function applyPromoCode() {
  const code = document.getElementById('promoCodeInput').value.trim();
  if (!code) {
    showToast('Please enter a promo code', 'warning');
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    const result = await apiRequest('/api/cashier/validate-promo', {
      method: 'POST',
      body: JSON.stringify({ code, orderTotal: subtotal })
    });

    appliedPromo = {
      id: result.promoCode.id,
      code: result.promoCode.code,
      discount: result.discount
    };

    document.getElementById('promoApplied').classList.remove('hidden');
    document.getElementById('appliedPromoCode').textContent = appliedPromo.code;
    document.getElementById('promoDiscount').textContent = `-${formatCurrency(appliedPromo.discount)}`;
    document.getElementById('promoCodeInput').value = '';

    updateTotals('completeOrderBtn');
    showToast('Promo code applied!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Remove promo code
function removePromoCode() {
  appliedPromo = null;
  document.getElementById('promoApplied').classList.add('hidden');
  document.getElementById('promoCodeInput').value = '';
  updateTotals('completeOrderBtn');
}

// Complete order
async function completeOrder() {
  if (cart.length === 0) {
    showToast('Cart is empty', 'error');
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = appliedPromo ? appliedPromo.discount : 0;
  const total = subtotal - discount;
  const tableNumber = document.getElementById('tableNumber').value;
  const paidAmount = paymentMethod === 'cash' 
    ? parseFloat(document.getElementById('paidAmount').value) || total 
    : total;

  if (paymentMethod === 'cash' && paidAmount < total) {
    showToast('Insufficient payment amount', 'error');
    return;
  }

  if (orderType === 'dine-in' && !tableNumber) {
    showToast('Please enter table number', 'warning');
    return;
  }

  const orderData = {
    items: cart.map(item => ({
      product: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal,
    promoCodeId: appliedPromo?.id,
    promoCodeUsed: appliedPromo?.code,
    discount,
    total,
    tableNumber: tableNumber || null,
    orderType,
    paymentMethod,
    paidAmount,
    notes: '',
    waiterId: null,
  };

  try {
    const result = await apiRequest('/api/cashier/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    
    lastCompletedOrder = {
      id: result.order.id,
      orderNumber: result.order.orderNumber,
      total: result.order.total,
      changeAmount: result.order.changeAmount,
      isPaid: result.order.isPaid
    };

    // Show success modal
    document.getElementById('completedOrderNumber').textContent = `#${result.order.orderNumber}`;
    document.getElementById('completedOrderChange').textContent = `Change: ${formatCurrency(result.order.changeAmount)}`;
    openModal('orderCompleteModal');

    // Setup print button
    document.getElementById('printReceiptBtn').onclick = async () => {
      try {
        const order = await apiRequest(`/api/cashier/orders/${lastCompletedOrder.id}`);
        printReceipt(order);
      } catch (error) {
        showToast('Failed to print receipt', 'error');
      }
    };

    // Update stats
    loadTodayStats();

    showToast('Order completed successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Close order complete modal
function closeOrderComplete() {
  closeModal('orderCompleteModal');
  
  // Reset for new order
  clearCart();
  document.getElementById('tableNumber').value = '';
  document.getElementById('paidAmount').value = '';
  setOrderType('dine-in');
  setPaymentMethod('later');
}

// Calculate cash total for close register
function calculateCashTotal() {
  const count200 = parseInt(document.getElementById('count200').value) || 0;
  const count100 = parseInt(document.getElementById('count100').value) || 0;
  const count50 = parseInt(document.getElementById('count50').value) || 0;
  const count20 = parseInt(document.getElementById('count20').value) || 0;
  const countCoins = parseFloat(document.getElementById('countCoins').value) || 0;

  const total200 = count200 * 200;
  const total100 = count100 * 100;
  const total50 = count50 * 50;
  const total20 = count20 * 20;

  document.getElementById('total200').textContent = `${total200} DH`;
  document.getElementById('total100').textContent = `${total100} DH`;
  document.getElementById('total50').textContent = `${total50} DH`;
  document.getElementById('total20').textContent = `${total20} DH`;
  document.getElementById('totalCoins').textContent = `${countCoins.toFixed(2)} DH`;

  const grandTotal = total200 + total100 + total50 + total20 + countCoins;
  document.getElementById('cashCountTotal').textContent = formatCurrency(grandTotal);
}

// Close register
async function closeRegister() {
  const data = {
    bills200: parseInt(document.getElementById('count200').value) || 0,
    bills100: parseInt(document.getElementById('count100').value) || 0,
    bills50: parseInt(document.getElementById('count50').value) || 0,
    bills20: parseInt(document.getElementById('count20').value) || 0,
    coins: parseFloat(document.getElementById('countCoins').value) || 0,
    notes: document.getElementById('closeNotes').value
  };

  try {
    const result = await apiRequest('/api/cashier/close-register', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    closeModal('closeRegisterModal');

    // Show result
    const summary = result.summary;
    const resultHTML = `
      <div class="result-row">
        <span class="result-label">Your Count</span>
        <span class="result-value">${formatCurrency(summary.countedTotal)}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Expected</span>
        <span class="result-value">${formatCurrency(summary.expectedTotal)}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Difference</span>
        <span class="result-value ${summary.difference >= 0 ? 'positive' : 'negative'}">
          ${summary.difference >= 0 ? '+' : ''}${formatCurrency(summary.difference)}
        </span>
      </div>
      <div class="result-row">
        <span class="result-label">Total Orders</span>
        <span class="result-value">${summary.totalOrders}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Cash / Card</span>
        <span class="result-value">${summary.cashOrders} / ${summary.cardOrders}</span>
      </div>
      <div class="result-status ${summary.status}">
        <h3>${summary.status === 'balanced' ? 'Balanced!' : (summary.status === 'over' ? 'Over' : 'Short')}</h3>
        <p>${summary.status === 'balanced' ? 'Great job!' : `Difference: ${formatCurrency(Math.abs(summary.difference))}`}</p>
      </div>
    `;

    document.getElementById('resultSummary').innerHTML = resultHTML;
    openModal('closeResultModal');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function todayOrders() {
  try {
    const result = await apiRequest('/api/cashier/today-stats');
    const orders = result.ordersList;
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';

    if (orders.length === 0) {
      ordersList.innerHTML = '<li>No orders unpaid today</li>';
    } else {
      orders.forEach(order => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong>Order #<label id="numorder">${order.orderNumber}</label>:</strong> <span>${order.isPaid ? "Paid" : "Unpaid"}</span>
        <button class = "btn-valid" onclick="payorder(this)">Pay</button>`;
        sessionStorage.setItem(`order_${order.orderNumber}`, JSON.stringify(order));
        ordersList.appendChild(listItem);
      });
    }
  } catch (error) {
    console.error("Error fetching today's orders:", error);
  }
};
// showing order at cart to pay it
async function payorder(btn){
  clearCart();
  setPaymentMethod('cash');
  setOrderType('dine-in');
  document.getElementById('completeOrderBtn').classList.remove('active');
  document.getElementById('paydlaterOrder').classList.add('active');
  document.getElementById('paydlaterOrder').disabled = false;
  const home = btn.parentElement;
  const orderNumber = home.querySelector('#numorder').textContent;
  const order = await JSON.parse(sessionStorage.getItem(`order_${orderNumber}`));
  sessionStorage.clear();
  sessionStorage.setItem(`order`, JSON.stringify(order));
  if (order.orderNumber == orderNumber) {
    showToast("Order Back", 'success');
    document.getElementById('tableInputSection').children[0].value = order.tableNumber;
    const el1 = document.getElementById('tableInputSection');
    const el2 = document.getElementById('cartItems');
    const ordrtype = document.getElementById('orderTypeSelector');
    const laterbtn = document.getElementById('laterbtn');
    laterbtn.disabled = true;
    laterbtn.style.textDecoration = "line-through";
    ordrtype.style.pointerEvents = 'none';
    ordrtype.style.opacity = '0.5';
    el1.style.pointerEvents = 'none';
    el2.style.pointerEvents = 'none';
    el1.style.opacity = '0.5';
    el2.style.opacity = '0.5';
    order.items.forEach(item => addToCart(item.product,item.quantity));
    closeModal('ordersTodayModal');
  } else {
    showToast("Order not found", 'error');
    order._id = null;
  }
  return order._id;
}

// pay order that was added to cart from today orders list
async function paydlaterOrder(){
  const order = await JSON.parse(sessionStorage.getItem(`order`));
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = appliedPromo ? appliedPromo.discount : 0;
  const total = subtotal - discount;
  const tableNumber = document.getElementById('tableNumber').value;
  const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
  if (paymentMethod === 'cash' && paidAmount < total ) {
    showToast('Insufficient payment amount', 'error');
    return;
  } else {
    const orderData = {
    items: cart.map(item => ({
      product: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal,
    promoCodeId: appliedPromo?.id,
    promoCodeUsed: appliedPromo?.code,
    discount,
    orderNumber : order.orderNumber,
    total,
    tableNumber: tableNumber || null,
    orderType,
    paymentMethod,
    paidAmount : paidAmount || total,
  };

  try {
    const result = await apiRequest(`/api/cashier/orderpay/${order._id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
    
    lastCompletedOrder = {
      id: result.order.id,
      orderNumber: result.order.orderNumber,
      total: result.order.total,
      changeAmount: result.order.changeAmount,
      isPaid: result.order.isPaid,
    };
    // Show success modal
    document.getElementById('completedOrderNumber').textContent = `#${result.order.orderNumber}`;
    document.getElementById('completedOrderChange').textContent = `Change: ${formatCurrency(result.order.changeAmount)}`;
    openModal('orderCompleteModal');

    // Setup print button
    document.getElementById('printReceiptBtn').onclick = async () => {
      try {
        const order = await apiRequest(`/api/cashier/orders/${lastCompletedOrder.id}`);
        printReceipt(order);
      } catch (error) {
        showToast('Failed to print receipt', 'error');
      }
    };

    // Update stats
    loadTodayStats();

    showToast('Order completed successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
  }
};