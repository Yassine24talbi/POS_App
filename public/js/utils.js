// Common utility functions for POS application

// Get auth token
function getToken() {
  return localStorage.getItem('token');
}

// Get current user
function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Check authentication
function checkAuth(allowedRoles = []) {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = '/';
    return false;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = '/';
    return false;
  }

  return true;
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// API request helper
async function apiRequest(url, options = {}) {
  const token = getToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Toast notification system
const toastContainer = document.getElementById('toastContainer') || createToastContainer();

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;padding:4px;margin-left:auto;">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `;
  
  const container = document.getElementById('toastContainer') || createToastContainer();
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Format currency (Moroccan Dirhams)
function formatCurrency(amount) {
  return `${parseFloat(amount).toFixed(2)} DH`;
}

// Format date
function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

// Format time only
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Modal helper
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }
});

// Loading state helper
function setLoading(element, isLoading, originalText = '') {
  if (isLoading) {
    element.disabled = true;
    element.dataset.originalText = element.innerHTML;
    element.innerHTML = '<span class="spinner"></span> Loading...';
  } else {
    element.disabled = false;
    element.innerHTML = originalText || element.dataset.originalText || 'Submit';
  }
}

// Confirm dialog
function confirmDialog(message) {
  return new Promise((resolve) => {
    const confirmed = confirm(message);
    resolve(confirmed);
  });
}

// Generate order receipt HTML for printing
function generateReceiptHTML(order) {
  const date = new Date(order.createdAt);
  
  let itemsHTML = order.items.map(item => `
    <tr>
      <td style="padding:4px 0;">${item.productName}</td>
      <td style="padding:4px 0;text-align:center;">x${item.quantity}</td>
      <td style="padding:4px 0;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:monospace;width:280px;padding:10px;font-size:12px;">
      <div style="text-align:center;margin-bottom:10px;">
        <h2 style="margin:0;font-size:18px;">RESTAURANT POS</h2>
        <p style="margin:5px 0;">Order Receipt</p>
      </div>
      
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin:10px 0;">
        <p style="margin:2px 0;"><strong>Order #${order.orderNumber}</strong></p>
        <p style="margin:2px 0;">Date: ${formatDate(date)}</p>
        ${order.tableNumber ? `<p style="margin:2px 0;">Table: ${order.tableNumber}</p>` : ''}
        <p style="margin:2px 0;">Type: ${order.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'}</p>
      </div>
      
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #000;">
            <th style="text-align:left;padding:4px 0;">Item</th>
            <th style="text-align:center;padding:4px 0;">Qty</th>
            <th style="text-align:right;padding:4px 0;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div style="border-top:1px dashed #000;margin-top:10px;padding-top:10px;">
        <div style="display:flex;justify-content:space-between;margin:4px 0;">
          <span>Subtotal:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${order.discount > 0 ? `
        <div style="display:flex;justify-content:space-between;margin:4px 0;color:#666;">
          <span>Discount${order.promoCodeUsed ? ` (${order.promoCodeUsed})` : ''}:</span>
          <span>-${formatCurrency(order.discount)}</span>
        </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;margin:8px 0;font-size:16px;font-weight:bold;">
          <span>TOTAL:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:4px 0;">
          <span>Paid:</span>
          <span>${formatCurrency(order.paidAmount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:4px 0;">
          <span>Change:</span>
          <span>${formatCurrency(order.changeAmount)}</span>
        </div>
      </div>
      
      <div style="text-align:center;margin-top:20px;padding-top:10px;border-top:1px dashed #000;">
        <p style="margin:4px 0;">Thank you for your visit!</p>
        <p style="margin:4px 0;font-size:10px;color:#666;">Powered by POS System</p>
      </div>
    </div>
  `;
}

// Print receipt
function printReceipt(order) {
  const receiptHTML = generateReceiptHTML(order);
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${order.orderNumber}</title>
      <style>
        body { margin: 0; padding: 10px; }
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      ${receiptHTML}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Print kitchen ticket
function printKitchenTicket(order) {
  const date = new Date(order.createdAt);
  
  let itemsHTML = order.items.map(item => `
    <div style="padding:8px 0;border-bottom:1px dashed #ccc;">
      <div style="font-size:18px;font-weight:bold;">${item.quantity}x ${item.productName}</div>
      ${item.notes ? `<div style="color:#666;font-size:14px;margin-top:4px;">Note: ${item.notes}</div>` : ''}
    </div>
  `).join('');

  const ticketHTML = `
    <div style="font-family:monospace;width:280px;padding:10px;">
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:10px;">
        <h1 style="margin:0;font-size:28px;">ORDER #${order.orderNumber}</h1>
        <p style="margin:5px 0;font-size:16px;">${order.orderType === 'dine-in' ? `TABLE ${order.tableNumber}` : 'TAKEAWAY'}</p>
        <p style="margin:5px 0;font-size:14px;">${formatTime(date)}</p>
      </div>
      
      <div style="margin-bottom:15px;">
        ${itemsHTML}
      </div>
      
      ${order.notes ? `
      <div style="background:#f0f0f0;padding:10px;margin-top:10px;">
        <strong>Order Notes:</strong><br>
        ${order.notes}
      </div>
      ` : ''}
    </div>
  `;

  const printWindow = window.open('', '_blank', 'width=350,height=500');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kitchen Ticket #${order.orderNumber}</title>
    </head>
    <body style="margin:0;padding:10px;">
      ${ticketHTML}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
