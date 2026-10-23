/**
 * InvoicePro - Main Application Orchestrator & View Controller
 */

const App = (() => {
  let activeView = 'dashboard';

  /**
   * Initialize Application
   */
  const init = () => {
    // 1. Initialize Firebase & DB
    FirebaseManager.init();
    DB.init();

    // 2. Setup Firebase connection status listener
    FirebaseManager.onConnectionChange((status, label) => {
      updateConnectionBadge(status, label);
      if (status === 'connected') {
        DB.setupFirebaseListeners();
      }
    });

    // 3. Setup DB reactive changes listener
    DB.subscribe((entity) => {
      refreshActiveView();
    });

    // 4. Load Business Profile settings into form
    loadBusinessSettings();
    DB.BandwidthGuard.updateUI();

    // 5. Navigate to default view
    navigate('dashboard');

    // 6. Setup global event listeners
    setupEventListeners();

    console.log('InvoicePro: Application initialized successfully.');
  };

  /**
   * View Navigation
   */
  const navigate = (viewName) => {
    activeView = viewName;

    // Toggle active navigation link in sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Toggle active view section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update Top Header Page Title
    const titleEl = document.getElementById('header-view-title');
    if (titleEl) {
      const titles = {
        dashboard: 'Dashboard & Revenue Overview',
        invoices: 'Invoice Management',
        customers: 'Customer Directory',
        products: 'Products & Services Catalog',
        settings: 'Business & Bank Settings'
      };
      titleEl.textContent = titles[viewName] || 'InvoicePro';
    }

    // Refresh contents for the target view
    refreshActiveView();

    // Close mobile sidebar if open
    closeMobileSidebar();
  };

  /**
   * Refresh the active view
   */
  const refreshActiveView = () => {
    if (activeView === 'dashboard') {
      Dashboard.update();
    } else if (activeView === 'invoices') {
      Invoices.renderList();
    } else if (activeView === 'customers') {
      Customers.renderList();
    } else if (activeView === 'products') {
      Products.renderList();
    } else if (activeView === 'settings') {
      loadBusinessSettings();
    }
  };

  /**
   * Update Sidebar Connection Badge
   */
  const updateConnectionBadge = (status, label) => {
    const dot = document.getElementById('db-status-dot');
    const title = document.getElementById('db-status-title');
    const sub = document.getElementById('db-status-sub');

    if (!dot || !title || !sub) return;

    dot.className = 'status-dot';

    if (status === 'connected') {
      dot.classList.add('connected');
      title.textContent = 'Firebase Cloud';
      sub.textContent = 'Realtime Sync Active';
    } else if (status === 'connecting') {
      dot.classList.add('local');
      title.textContent = 'Connecting...';
      sub.textContent = 'Checking Firebase';
    } else {
      dot.classList.add('local');
      title.textContent = 'Local Mode';
      sub.textContent = 'Synced locally (Click to configure)';
    }
  };

  /**
   * Load Business Settings into form fields
   */
  const loadBusinessSettings = () => {
    const business = DB.getBusiness();
    if (!business) return;

    setVal('biz-name', business.name);
    setVal('biz-tagline', business.tagline);
    setVal('biz-email', business.email);
    setVal('biz-phone', business.phone);
    setVal('biz-tax-id', business.taxId);
    setVal('biz-currency', business.currency || 'USD');
    setVal('biz-currency-symbol', business.currencySymbol || '$');
    setVal('biz-address', business.address);

    const bank = business.bankDetails || {};
    setVal('biz-bank-name', bank.bankName);
    setVal('biz-account-title', bank.accountTitle);
    setVal('biz-account-number', bank.accountNumber);
    setVal('biz-swift', bank.routingOrSwift);
    setVal('biz-bank-notes', bank.notes);

    const inv = business.invoiceSettings || {};
    setVal('biz-inv-prefix', inv.prefix || 'INV-');
    setVal('biz-inv-next', inv.nextNumber || 1001);
    setVal('biz-inv-due-days', inv.defaultDueDays || 14);
    setVal('biz-inv-notes', inv.defaultNotes || '');
    setVal('biz-inv-terms', inv.defaultTerms || '');

    // Logo preview
    const logoPreview = document.getElementById('biz-logo-preview');
    if (logoPreview) {
      if (business.logo) {
        logoPreview.src = business.logo;
        logoPreview.style.display = 'block';
      } else {
        logoPreview.style.display = 'none';
      }
    }
  };

  /**
   * Save Business Settings
   */
  const saveBusinessSettings = (e) => {
    if (e) e.preventDefault();

    const current = DB.getBusiness();
    const updated = {
      name: getVal('biz-name'),
      tagline: getVal('biz-tagline'),
      email: getVal('biz-email'),
      phone: getVal('biz-phone'),
      taxId: getVal('biz-tax-id'),
      currency: getVal('biz-currency'),
      currencySymbol: getVal('biz-currency-symbol'),
      address: getVal('biz-address'),
      logo: current.logo || '',
      bankDetails: {
        bankName: getVal('biz-bank-name'),
        accountTitle: getVal('biz-account-title'),
        accountNumber: getVal('biz-account-number'),
        routingOrSwift: getVal('biz-swift'),
        notes: getVal('biz-bank-notes')
      },
      invoiceSettings: {
        prefix: getVal('biz-inv-prefix'),
        nextNumber: parseInt(getVal('biz-inv-next'), 10) || 1001,
        defaultDueDays: parseInt(getVal('biz-inv-due-days'), 10) || 14,
        defaultNotes: getVal('biz-inv-notes'),
        defaultTerms: getVal('biz-inv-terms')
      }
    };

    DB.saveBusiness(updated);
    showToast('Business & payment settings saved successfully!', 'success');
  };

  /**
   * Compress logo image using canvas to minimize Firebase bandwidth
   */
  const compressImage = (file, maxWidth = 280, maxHeight = 140, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle Logo File Upload with Automatic Compression
   */
  const handleLogoUpload = async (input) => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('Logo file size must be less than 5MB', 'warning');
        return;
      }

      showToast('Compressing and optimizing logo...', 'info');
      try {
        const compressedBase64 = await compressImage(file, 280, 140, 0.8);
        const business = DB.getBusiness();
        business.logo = compressedBase64;
        DB.saveBusiness(business);

        const preview = document.getElementById('biz-logo-preview');
        if (preview) {
          preview.src = compressedBase64;
          preview.style.display = 'block';
        }
        showToast('Logo optimized and saved! (Bandwidth saver active)', 'success');
      } catch (err) {
        console.error('Image compression error:', err);
        showToast('Error processing logo image', 'error');
      }
    }
  };

  /**
   * Set Sync Mode (Delta, Manual, Realtime)
   */
  const setSyncMode = (mode) => {
    DB.setSyncMode(mode);
    const labels = {
      delta: 'Delta Child Sync (Ultra-Saver: < 5 MB/day)',
      manual: 'Manual / On-Demand Sync (Zero Background Bandwidth)',
      realtime: 'Full Realtime Stream'
    };
    showToast(`Sync mode set to: ${labels[mode] || mode}`, 'info');
  };

  /**
   * Manual Cloud Sync Trigger
   */
  const syncNow = () => {
    DB.syncNow();
  };

  /**
   * Open Firebase Settings Modal
   */
  const openFirebaseModal = () => {
    const config = FirebaseManager.getSavedConfig();
    const projectId = config.projectId || '';
    const authDomain = (!config.authDomain || config.authDomain.includes('your-project'))
      ? (projectId ? `${projectId}.firebaseapp.com` : '')
      : config.authDomain;

    setVal('fb-api-key', config.apiKey || '');
    setVal('fb-auth-domain', authDomain);
    setVal('fb-database-url', config.databaseURL || '');
    setVal('fb-project-id', projectId);
    setVal('fb-storage-bucket', config.storageBucket || '');
    setVal('fb-sender-id', config.messagingSenderId || '');
    setVal('fb-app-id', config.appId || '');

    // Set sync mode selector
    const syncSelect = document.getElementById('fb-sync-mode');
    if (syncSelect) {
      syncSelect.value = DB.getSyncMode();
    }

    // Refresh Bandwidth stats
    DB.BandwidthGuard.updateUI();

    const statusMsg = document.getElementById('fb-test-status');
    if (statusMsg) statusMsg.innerHTML = '';

    openModal('modal-firebase-config');
  };

  /**
   * Save Firebase Configuration
   */
  const saveFirebaseConfig = () => {
    const projectId = getVal('fb-project-id').trim();
    let authDomain = getVal('fb-auth-domain').trim();
    if (!authDomain || authDomain.includes('your-project')) {
      authDomain = projectId ? `${projectId}.firebaseapp.com` : '';
    }

    const config = {
      apiKey: getVal('fb-api-key').trim(),
      authDomain: authDomain,
      databaseURL: getVal('fb-database-url').trim().replace(/\/+$/, ''),
      projectId: projectId,
      storageBucket: getVal('fb-storage-bucket').trim(),
      messagingSenderId: getVal('fb-sender-id').trim(),
      appId: getVal('fb-app-id').trim()
    };

    FirebaseManager.saveConfig(config);
    showToast('Firebase configuration saved. Activating cloud sync...', 'success');
    closeModal('modal-firebase-config');

    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  /**
   * Test Firebase Connection
   */
  const testFirebaseConnection = async () => {
    const projectId = getVal('fb-project-id').trim();
    let authDomain = getVal('fb-auth-domain').trim();
    if (!authDomain || authDomain.includes('your-project')) {
      authDomain = projectId ? `${projectId}.firebaseapp.com` : '';
    }

    const config = {
      apiKey: getVal('fb-api-key').trim(),
      authDomain: authDomain,
      databaseURL: getVal('fb-database-url').trim().replace(/\/+$/, ''),
      projectId: projectId
    };

    const statusEl = document.getElementById('fb-test-status');
    if (statusEl) {
      statusEl.innerHTML = '<span style="color: #6366f1;"><i class="fa-solid fa-spinner fa-spin"></i> Testing connection to Firebase Realtime Database...</span>';
    }

    const res = await FirebaseManager.testConnection(config);
    if (statusEl) {
      if (res.success) {
        statusEl.innerHTML = `<span style="color: #10b981; font-weight: 600;"><i class="fa-solid fa-check-circle"></i> ${res.message}</span>`;
      } else {
        statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;"><i class="fa-solid fa-circle-xmark"></i> ${res.message}</span>`;
      }
    }
  };

  /**
   * Download Full JSON Backup
   */
  const exportBackupJSON = () => {
    const data = DB.exportFullBackup();
    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', str);
    a.setAttribute('download', `InvoicePro_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Backup JSON downloaded successfully!', 'success');
  };

  /**
   * Restore Full JSON Backup
   */
  const importBackupJSON = (input) => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const res = DB.importFullBackup(json);
          if (res.success) {
            showToast('Backup restored successfully!', 'success');
            refreshActiveView();
          } else {
            showToast('Failed to restore backup: ' + (res.message || 'Invalid format'), 'error');
          }
        } catch (err) {
          showToast('Invalid JSON file', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  /**
   * Modal Management
   */
  const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  };

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  };

  /**
   * Toast Notifications
   */
  const showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'error') icon = 'fa-circle-xmark';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  /**
   * Mobile Sidebar Drawer
   */
  const toggleMobileSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  };

  const closeMobileSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');
  };

  /**
   * Global Event Listeners
   */
  const setupEventListeners = () => {
    // Close modal on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
          modal.classList.remove('active');
        });
      }
    });

    // Close modal when clicking on backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  };

  // Helpers
  const getVal = (id) => (document.getElementById(id)?.value || '');
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  return {
    init,
    navigate,
    refreshActiveView,
    openModal,
    closeModal,
    showToast,
    saveBusinessSettings,
    handleLogoUpload,
    openFirebaseModal,
    saveFirebaseConfig,
    testFirebaseConnection,
    setSyncMode,
    syncNow,
    exportBackupJSON,
    importBackupJSON,
    toggleMobileSidebar,
    closeMobileSidebar
  };
})();

// Start App when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
