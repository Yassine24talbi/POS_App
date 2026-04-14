// Admin Dashboard JavaScript

// Check authentication
if (!checkAuth(['admin'])) {
  window.location.href = '/';
}

// Global data
let categories = [];
let products = [];
let users = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  }

  // Set current date
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Set default date for orders filter
  document.getElementById('ordersDateFilter').value = new Date().toISOString().split('T')[0];

  // Handle hash navigation
  handleNavigation();
  window.addEventListener('hashchange', handleNavigation);

  // Load initial data
  loadDashboard();
});

// Navigation
function handleNavigation() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  showSection(hash);
}

function showSection(sectionName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionName) {
      item.classList.add('active');
    }
  });

  // Show/hide sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  const section = document.getElementById(`${sectionName}Section`);
  if (section) {
    section.classList.add('active');
  }

  // Load section data
  switch (sectionName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'users':
      loadUsers();
      break;
    case 'categories':
      loadCategories();
      break;
    case 'products':
      loadProducts();
      break;
    case 'promo-codes':
      loadPromoCodes();
      break;
    case 'orders':
      loadOrders();
      break;
  }

  // Update URL hash
  window.location.hash = sectionName;
}

// Toggle sidebar on mobile
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closemenu(){
    document.getElementById('sidebar').classList.remove('open');
};

// ============ DASHBOARD ============

async function loadDashboard() {
  try {
    const data = await apiRequest('/api/admin/dashboard');

    document.getElementById('todaySales').textContent = formatCurrency(data.todaySales);
    document.getElementById('todayOrders').textContent = `${data.todayOrderCount} orders`;
    document.getElementById('weekSales').textContent = formatCurrency(data.weekSales);
    document.getElementById('monthSales').textContent = formatCurrency(data.monthSales);
    document.getElementById('productCount').textContent = data.productCount;

    // Recent orders
    const recentOrdersTable = document.getElementById('recentOrdersTable');
    if (data.recentOrders && data.recentOrders.length > 0) {
      recentOrdersTable.innerHTML = data.recentOrders.map(order => `
        <tr>
          <td>#${order.orderNumber}</td>
          <td>${order.items.length} items</td>
          <td>${formatCurrency(order.total)}</td>
          <td><span class="badge status-${order.status}">${order.status}</span></td>
          <td>${formatTime(order.createdAt)}</td>
        </tr>
      `).join('');
    } else {
      recentOrdersTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No orders yet</td></tr>';
    }

    // Best sellers
    const bestSellers = document.getElementById('bestSellers');
    if (data.bestSellers && data.bestSellers.length > 0) {
      bestSellers.innerHTML = data.bestSellers.map((item, index) => `
        <div class="best-seller-item">
          <span class="best-seller-rank">${index + 1}</span>
          <div class="best-seller-info">
            <div class="best-seller-name">${item._id}</div>
            <div class="best-seller-qty">${item.totalQty} sold</div>
          </div>
          <span class="best-seller-sales">${formatCurrency(item.totalSales)}</span>
        </div>
      `).join('');
    } else {
      bestSellers.innerHTML = '<div class="text-center text-muted p-4">No sales data yet</div>';
    }

    // Waiter sales
    const waiterSalesTable = document.getElementById('waiterSalesTable');
    if (data.waiterSales && data.waiterSales.length > 0) {
      waiterSalesTable.innerHTML = data.waiterSales.map(waiter => `
        <tr>
          <td>${waiter.name}</td>
          <td>${waiter.orderCount}</td>
          <td>${formatCurrency(waiter.totalSales)}</td>
        </tr>
      `).join('');
    } else {
      waiterSalesTable.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No waiter data yet</td></tr>';
    }

  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ USERS ============

async function loadUsers() {
  try {
    users = await apiRequest('/api/admin/users');
    renderUsersTable();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderUsersTable() {
  const table = document.getElementById('usersTable');
  if (users.length === 0) {
    table.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No users found</td></tr>';
    return;
  }

  table.innerHTML = users.map(user => `
    <tr>
      <td>${user.name}</td>
      <td>${user.username}</td>
      <td><span class="badge badge-primary">${user.role}</span></td>
      <td><span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>${formatDate(user.createdAt, { hour: undefined, minute: undefined })}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" onclick="editUser('${user._id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteUser('${user._id}')" style="color: var(--accent-danger)">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function resetUserForm() {
  document.getElementById('userModalTitle').textContent = 'Add User';
  document.getElementById('userId').value = '';
  document.getElementById('userFormName').value = '';
  document.getElementById('userFormUsername').value = '';
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormPassword').placeholder = 'Enter password';
  document.getElementById('userFormPassword').required = true;
  document.getElementById('userFormRole').value = 'waiter';
  document.getElementById('userFormStatus').value = 'true';
}

function editUser(id) {
  const user = users.find(u => u._id === id);
  if (!user) return;

  document.getElementById('userModalTitle').textContent = 'Edit User';
  document.getElementById('userId').value = user._id;
  document.getElementById('userFormName').value = user.name;
  document.getElementById('userFormUsername').value = user.username;
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormPassword').placeholder = 'Leave empty to keep current';
  document.getElementById('userFormPassword').required = false;
  document.getElementById('userFormRole').value = user.role;
  document.getElementById('userFormStatus').value = user.isActive.toString();

  openModal('userModal');
}

async function saveUser(e) {
  e.preventDefault();

  const id = document.getElementById('userId').value;
  const data = {
    name: document.getElementById('userFormName').value,
    username: document.getElementById('userFormUsername').value,
    role: document.getElementById('userFormRole').value,
    isActive: document.getElementById('userFormStatus').value === 'true'
  };

  const password = document.getElementById('userFormPassword').value;
  if (password) {
    data.password = password;
  }

  try {
    if (id) {
      await apiRequest(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('User updated successfully', 'success');
    } else {
      if (!password) {
        showToast('Password is required for new users', 'error');
        return;
      }
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('User created successfully', 'success');
    }

    closeModal('userModal');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
    showToast('User deleted successfully', 'success');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ CATEGORIES ============

async function loadCategories() {
  try {
    categories = await apiRequest('/api/admin/categories');
    renderCategoriesGrid();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderCategoriesGrid() {
  const grid = document.getElementById('categoriesGrid');
  if (categories.length === 0) {
    grid.innerHTML = '<div class="text-center text-muted p-4">No categories found. Add your first category!</div>';
    return;
  }

  grid.innerHTML = categories.map(cat => `
    <div class="category-card" style="--category-color: ${cat.color}">
      <h4 class="category-name">${cat.name}</h4>
      <p class="category-description">${cat.description || 'No description'}</p>
      <div class="category-actions">
        <button class="btn btn-ghost btn-sm" onclick="editCategory('${cat._id}')">Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteCategory('${cat._id}')" style="color: var(--accent-danger)">Delete</button>
      </div>
    </div>
  `).join('');
}

function resetCategoryForm() {
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryFormName').value = '';
  document.getElementById('categoryFormDescription').value = '';
  document.getElementById('categoryFormColor').value = '#3b82f6';
}

function editCategory(id) {
  const category = categories.find(c => c._id === id);
  if (!category) return;

  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  document.getElementById('categoryId').value = category._id;
  document.getElementById('categoryFormName').value = category.name;
  document.getElementById('categoryFormDescription').value = category.description || '';
  document.getElementById('categoryFormColor').value = category.color;

  openModal('categoryModal');
}

async function saveCategory(e) {
  e.preventDefault();

  const id = document.getElementById('categoryId').value;
  const data = {
    name: document.getElementById('categoryFormName').value,
    description: document.getElementById('categoryFormDescription').value,
    color: document.getElementById('categoryFormColor').value
  };

  try {
    if (id) {
      await apiRequest(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('Category updated successfully', 'success');
    } else {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Category created successfully', 'success');
    }

    closeModal('categoryModal');
    loadCategories();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Are you sure you want to delete this category?')) return;

  try {
    await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' });
    showToast('Category deleted successfully', 'success');
    loadCategories();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ PRODUCTS ============

async function loadProducts() {
  try {
    // Load categories for the form dropdown
    if (categories.length === 0) {
      categories = await apiRequest('/api/admin/categories');
    }

    products = await apiRequest('/api/admin/products');
    renderProductsTable();
    populateCategoryDropdown();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function populateCategoryDropdown() {
  const select = document.getElementById('productFormCategory');
  select.innerHTML = '<option value="">Select Category</option>' +
    categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
}

function renderProductsTable() {
  const table = document.getElementById('productsTable');
  if (products.length === 0) {
    table.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No products found</td></tr>';
    return;
  }

  table.innerHTML = products.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category?.name || 'N/A'}</td>
      <td>${formatCurrency(product.price)}</td>
      <td><span class="badge ${product.isAvailable ? 'badge-success' : 'badge-danger'}">${product.isAvailable ? 'Available' : 'Unavailable'}</span></td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" onclick="editProduct('${product._id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${product._id}')" style="color: var(--accent-danger)">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function resetProductForm() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productId').value = '';
  document.getElementById('productFormName').value = '';
  document.getElementById('productFormCategory').value = '';
  document.getElementById('productFormPrice').value = '';
  document.getElementById('productFormDescription').value = '';
  document.getElementById('productFormPrepTime').value = '10';
  document.getElementById('productFormStatus').value = 'true';
}

function editProduct(id) {
  const product = products.find(p => p._id === id);
  if (!product) return;

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = product._id;
  document.getElementById('productFormName').value = product.name;
  document.getElementById('productFormCategory').value = product.category?._id || '';
  document.getElementById('productFormPrice').value = product.price;
  document.getElementById('productFormDescription').value = product.description || '';
  document.getElementById('productFormPrepTime').value = product.preparationTime || 10;
  document.getElementById('productFormStatus').value = product.isAvailable.toString();

  openModal('productModal');
}

async function saveProduct(e) {
  e.preventDefault();

  const id = document.getElementById('productId').value;
  const data = {
    name: document.getElementById('productFormName').value,
    category: document.getElementById('productFormCategory').value,
    price: parseFloat(document.getElementById('productFormPrice').value),
    description: document.getElementById('productFormDescription').value,
    preparationTime: parseInt(document.getElementById('productFormPrepTime').value),
    isAvailable: document.getElementById('productFormStatus').value === 'true'
  };

  try {
    if (id) {
      await apiRequest(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('Product updated successfully', 'success');
    } else {
      await apiRequest('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Product created successfully', 'success');
    }

    closeModal('productModal');
    loadProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' });
    showToast('Product deleted successfully', 'success');
    loadProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ PROMO CODES ============

let promoCodes = [];

async function loadPromoCodes() {
  try {
    promoCodes = await apiRequest('/api/admin/promo-codes');
    renderPromoCodesTable();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderPromoCodesTable() {
  const table = document.getElementById('promoCodesTable');
  if (promoCodes.length === 0) {
    table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No promo codes found</td></tr>';
    return;
  }

  table.innerHTML = promoCodes.map(promo => {
    const isExpired = new Date(promo.validUntil) < new Date();
    const usageLimitReached = promo.usageLimit && promo.usedCount >= promo.usageLimit;
    
    return `
      <tr>
        <td><code style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px;">${promo.code}</code></td>
        <td>${promo.type === 'percentage' ? 'Percentage' : 'Fixed'}</td>
        <td>${promo.type === 'percentage' ? promo.value + '%' : formatCurrency(promo.value)}</td>
        <td>${promo.usedCount}${promo.usageLimit ? '/' + promo.usageLimit : ''}</td>
        <td>${formatDate(promo.validUntil, { hour: undefined, minute: undefined })}</td>
        <td>
          <span class="badge ${promo.isActive && !isExpired && !usageLimitReached ? 'badge-success' : 'badge-danger'}">
            ${isExpired ? 'Expired' : usageLimitReached ? 'Limit Reached' : (promo.isActive ? 'Active' : 'Inactive')}
          </span>
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick="editPromoCode('${promo._id}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="deletePromoCode('${promo._id}')" style="color: var(--accent-danger)">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleMaxDiscount() {
  const type = document.getElementById('promoFormType').value;
  document.getElementById('maxDiscountGroup').style.display = type === 'percentage' ? 'block' : 'none';
}

function resetPromoForm() {
  document.getElementById('promoModalTitle').textContent = 'Add Promo Code';
  document.getElementById('promoId').value = '';
  document.getElementById('promoFormCode').value = '';
  document.getElementById('promoFormType').value = 'percentage';
  document.getElementById('promoFormValue').value = '';
  document.getElementById('promoFormMaxDiscount').value = '';
  document.getElementById('promoFormMinOrder').value = '0';
  document.getElementById('promoFormUsageLimit').value = '';
  document.getElementById('promoFormValidUntil').value = '';
  document.getElementById('promoFormStatus').value = 'true';
  toggleMaxDiscount();
}

function editPromoCode(id) {
  const promo = promoCodes.find(p => p._id === id);
  if (!promo) return;

  document.getElementById('promoModalTitle').textContent = 'Edit Promo Code';
  document.getElementById('promoId').value = promo._id;
  document.getElementById('promoFormCode').value = promo.code;
  document.getElementById('promoFormType').value = promo.type;
  document.getElementById('promoFormValue').value = promo.value;
  document.getElementById('promoFormMaxDiscount').value = promo.maxDiscount || '';
  document.getElementById('promoFormMinOrder').value = promo.minOrderAmount || 0;
  document.getElementById('promoFormUsageLimit').value = promo.usageLimit || '';
  document.getElementById('promoFormValidUntil').value = promo.validUntil.split('T')[0];
  document.getElementById('promoFormStatus').value = promo.isActive.toString();
  toggleMaxDiscount();

  openModal('promoModal');
}

async function savePromoCode(e) {
  e.preventDefault();

  const id = document.getElementById('promoId').value;
  const data = {
    code: document.getElementById('promoFormCode').value,
    type: document.getElementById('promoFormType').value,
    value: parseFloat(document.getElementById('promoFormValue').value),
    minOrderAmount: parseFloat(document.getElementById('promoFormMinOrder').value) || 0,
    validUntil: document.getElementById('promoFormValidUntil').value,
    isActive: document.getElementById('promoFormStatus').value === 'true'
  };

  const maxDiscount = document.getElementById('promoFormMaxDiscount').value;
  if (maxDiscount && data.type === 'percentage') {
    data.maxDiscount = parseFloat(maxDiscount);
  }

  const usageLimit = document.getElementById('promoFormUsageLimit').value;
  if (usageLimit) {
    data.usageLimit = parseInt(usageLimit);
  }

  try {
    if (id) {
      await apiRequest(`/api/admin/promo-codes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('Promo code updated successfully', 'success');
    } else {
      await apiRequest('/api/admin/promo-codes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Promo code created successfully', 'success');
    }

    closeModal('promoModal');
    loadPromoCodes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deletePromoCode(id) {
  if (!confirm('Are you sure you want to delete this promo code?')) return;

  try {
    await apiRequest(`/api/admin/promo-codes/${id}`, { method: 'DELETE' });
    showToast('Promo code deleted successfully', 'success');
    loadPromoCodes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============ ORDERS ============

async function loadOrders() {
  try {
    const date = document.getElementById('ordersDateFilter').value;
    const status = document.getElementById('ordersStatusFilter').value;

    let url = '/api/admin/orders?';
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}`;

    const orders = await apiRequest(url);
    renderOrdersTable(orders);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderOrdersTable(orders) {
  const table = document.getElementById('ordersTable');
  if (!orders || orders.length === 0) {
    table.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No orders found</td></tr>';
    return;
  }

  table.innerHTML = orders.map(order => `
    <tr>
      <td>#${order.orderNumber}</td>
      <td>${order.tableNumber || '-'}</td>
      <td>${order.items.length} items</td>
      <td>${formatCurrency(order.total)}</td>
      <td>${order.waiter?.name || '-'}</td>
      <td><span class="badge status-${order.status}">${order.status}</span></td>
      <td><span class="badge badge-secondary">${order.paymentMethod}</span></td>
      <td>${formatTime(order.createdAt)}</td>
    </tr>
  `).join('');
}

// ============ REPORTS ============

async function loadReports() {
  try {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
      showToast('Please select both start and end dates', 'warning');
      return;
    }

    const reports = await apiRequest(`/api/admin/cash-registers?startDate=${startDate}&endDate=${endDate}`);
    renderReportsTable(reports);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderReportsTable(reports) {
  const table = document.getElementById('reportsTable');
  if (!reports || reports.length === 0) {
    table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No reports found for selected date range</td></tr>';
    return;
  }

  table.innerHTML = reports.map(report => `
    <tr>
      <td>${formatDate(report.date, { hour: undefined, minute: undefined })}</td>
      <td>${report.cashier?.name || 'N/A'}</td>
      <td>${formatCurrency(report.expectedTotal)}</td>
      <td>${formatCurrency(report.countedTotal)}</td>
      <td class="${report.difference === 0 ? '' : (report.difference > 0 ? 'text-success' : 'text-danger')}">
        ${report.difference >= 0 ? '+' : ''}${formatCurrency(report.difference)}
      </td>
      <td>${report.totalOrders} (${report.cashOrders} cash / ${report.cardOrders} card)</td>
      <td>
        <span class="badge ${report.difference === 0 ? 'badge-success' : (Math.abs(report.difference) < 10 ? 'badge-warning' : 'badge-danger')}">
          ${report.difference === 0 ? 'Balanced' : (report.difference > 0 ? 'Over' : 'Short')}
        </span>
      </td>
    </tr>
  `).join('');
}
