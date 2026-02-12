/**
 * FreshDairy Notification System
 * A beautiful, modern notification system matching the FreshDairy UI
 */

const FDNotify = (function() {
  let notificationContainer = null;
  let toastContainer = null;

  // Icons for different notification types
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    cart: '🛒',
    order: '📦',
    login: '👤',
    milk: '🥛'
  };

  // Initialize containers
  function init() {
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'fd-notification-container';
      document.body.appendChild(notificationContainer);
    }
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'fd-toast-container';
      document.body.appendChild(toastContainer);
    }
  }

  // Create notification element
  function createNotification(options) {
    const {
      type = 'success',
      title = '',
      message = '',
      icon = null,
      duration = 4000,
      showProgress = true,
      onClose = null
    } = options;

    const notification = document.createElement('div');
    notification.className = `fd-notification fd-${type}`;
    notification.style.position = 'relative';
    notification.style.overflow = 'hidden';

    const iconSymbol = icon || icons[type] || icons.info;

    notification.innerHTML = `
      <div class="fd-notification-icon">${iconSymbol}</div>
      <div class="fd-notification-content">
        <h4 class="fd-notification-title">${title}</h4>
        <p class="fd-notification-message">${message}</p>
      </div>
      <button class="fd-notification-close">&times;</button>
      ${showProgress && duration > 0 ? '<div class="fd-notification-progress"></div>' : ''}
    `;

    // Update progress animation duration
    if (showProgress && duration > 0) {
      const progress = notification.querySelector('.fd-notification-progress');
      if (progress) {
        progress.style.animationDuration = duration + 'ms';
      }
    }

    // Close button handler
    const closeBtn = notification.querySelector('.fd-notification-close');
    closeBtn.addEventListener('click', () => {
      hideNotification(notification, onClose);
    });

    return notification;
  }

  // Hide notification with animation
  function hideNotification(notification, callback) {
    notification.classList.add('hiding');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (callback) callback();
    }, 300);
  }

  // Show notification
  function show(options) {
    init();
    
    const notification = createNotification(options);
    notificationContainer.appendChild(notification);

    // Auto remove after duration
    if (options.duration !== 0) {
      const duration = options.duration || 4000;
      setTimeout(() => {
        hideNotification(notification, options.onClose);
      }, duration);
    }

    return notification;
  }

  // Shorthand methods
  function success(title, message, options = {}) {
    return show({ type: 'success', title, message, ...options });
  }

  function error(title, message, options = {}) {
    return show({ type: 'error', title, message, ...options });
  }

  function warning(title, message, options = {}) {
    return show({ type: 'warning', title, message, ...options });
  }

  function info(title, message, options = {}) {
    return show({ type: 'info', title, message, ...options });
  }

  // Special notification for adding to cart
  function cartAdded(productName, price) {
    return show({
      type: 'cart',
      title: 'Added to Cart!',
      message: `${productName} (₹${price}) has been added to your cart.`,
      icon: '🛒',
      duration: 3000
    });
  }

  // Order placed notification
  function orderPlaced(orderId) {
    return show({
      type: 'success',
      title: 'Order Placed Successfully!',
      message: orderId ? `Your order #${orderId} has been confirmed. Thank you!` : 'Your order has been confirmed. Thank you!',
      icon: '📦',
      duration: 5000
    });
  }

  // Login success notification
  function loginSuccess(userName) {
    return show({
      type: 'success',
      title: `Welcome back, ${userName}!`,
      message: 'You have successfully signed in.',
      icon: '👤',
      duration: 3000
    });
  }

  // Signup success notification
  function signupSuccess(userName) {
    return show({
      type: 'success',
      title: 'Account Created!',
      message: `Welcome to FreshDairy, ${userName}! Your account is ready.`,
      icon: '🎉',
      duration: 4000
    });
  }

  // Toast notification (simpler, centered at bottom)
  function toast(message, type = 'success', duration = 3000) {
    init();

    const toastEl = document.createElement('div');
    toastEl.className = `fd-toast fd-toast-${type}`;
    
    const iconSymbol = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toastEl.innerHTML = `<span class="fd-toast-icon">${iconSymbol}</span><span>${message}</span>`;

    toastContainer.appendChild(toastEl);

    setTimeout(() => {
      toastEl.classList.add('hiding');
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 300);
    }, duration);

    return toastEl;
  }

  // Confirm dialog (modal style)
  function confirm(options) {
    return new Promise((resolve) => {
      const {
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Yes',
        cancelText = 'Cancel',
        type = 'warning'
      } = options;

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fdFadeIn 0.2s ease;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #fff;
        padding: 35px 40px;
        border-radius: 22px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(47,125,87,0.25);
        animation: fdSlideIn 0.3s ease;
      `;

      const iconColor = type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#2f7d57';
      const iconBg = type === 'error' ? '#fdeaea' : type === 'warning' ? '#fef9e7' : '#e8f5ee';
      const iconSymbol = type === 'error' ? '✕' : type === 'warning' ? '⚠' : '?';

      modal.innerHTML = `
        <div style="width:70px;height:70px;background:${iconBg};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;color:${iconColor};">${iconSymbol}</div>
        <h3 style="font-family:'Playfair Display',serif;color:#1f2933;margin:0 0 12px 0;font-size:22px;">${title}</h3>
        <p style="color:#666;margin:0 0 25px 0;line-height:1.6;">${message}</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="fd-confirm-cancel" style="padding:12px 28px;border-radius:30px;border:2px solid #ddd;background:#fff;color:#666;cursor:pointer;font-size:15px;transition:all 0.2s;">${cancelText}</button>
          <button class="fd-confirm-yes" style="padding:12px 28px;border-radius:30px;border:none;background:#2f7d57;color:#fff;cursor:pointer;font-size:15px;transition:all 0.2s;">${confirmText}</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Button handlers
      modal.querySelector('.fd-confirm-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      modal.querySelector('.fd-confirm-yes').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  // Public API
  return {
    show,
    success,
    error,
    warning,
    info,
    toast,
    confirm,
    cartAdded,
    orderPlaced,
    loginSuccess,
    signupSuccess
  };
})();

// Also expose as window.notify for convenience
window.notify = FDNotify;
