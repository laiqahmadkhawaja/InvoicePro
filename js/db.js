/**
 * InvoicePro - Unified Data Layer (Firebase Realtime Database & LocalStorage)
 */

const DB = (() => {
  const STORAGE_KEYS = {
    BUSINESS: 'invoicepro_data_business',
    CUSTOMERS: 'invoicepro_data_customers',
    PRODUCTS: 'invoicepro_data_products',
    INVOICES: 'invoicepro_data_invoices'
  };

  let changeListeners = [];

  // Default Business Profile
  const DEFAULT_BUSINESS = {
    name: 'InvoicePro Solutions',
    tagline: 'Professional Billing & Invoicing',
    email: 'contact@invoicepro.com',
    phone: '+1 (555) 234-5678',
    address: '742 Evergreen Terrace, Suite 100, Springfield, OR',
    taxId: 'US-TAX-982103',
    currency: 'USD',
    currencySymbol: '$',
    logo: '',
    bankDetails: {
      bankName: 'Silicon Valley Commercial Bank',
      accountTitle: 'InvoicePro Solutions Inc',
      accountNumber: '987002134569',
      routingOrSwift: 'SVCB-US-66',
      notes: 'Please mention Invoice # in payment reference'
    },
    invoiceSettings: {
      prefix: 'INV-',
      nextNumber: 1004,
      defaultDueDays: 14,
      defaultNotes: 'Thank you for your business. Please reach out if you have any questions regarding this invoice.',
      defaultTerms: 'Payment due within 14 days of invoice date. 1.5% monthly late fee applies.'
    }
  };

  // Sample seed data to showcase features immediately
  const SEED_CUSTOMERS = {
    'cust_1': {
      id: 'cust_1',
      name: 'Sarah Connor',
      company: 'Cyberdyne Media',
      email: 'sarah@cyberdynemedia.com',
      phone: '+1555302910',
      address: '100 Industrial Pkwy, Los Angeles, CA',
      taxId: 'TAX-88910',
      createdAt: Date.now() - 86400000 * 10
    },
    'cust_2': {
      id: 'cust_2',
      name: 'Michael Scott',
      company: 'Dunder Mifflin Paper Co',
      email: 'michael@dundermifflin.com',
      phone: '+1555981240',
      address: '1725 Slough Avenue, Scranton, PA',
      taxId: 'TAX-11223',
      createdAt: Date.now() - 86400000 * 20
    },
    'cust_3': {
      id: 'cust_3',
      name: 'Bruce Wayne',
      company: 'Wayne Enterprises',
      email: 'bruce@wayneenterprises.com',
      phone: '+1555123998',
      address: '1007 Mountain Drive, Gotham City, NJ',
      taxId: 'TAX-99001',
      createdAt: Date.now() - 86400000 * 30
    }
  };

  const SEED_PRODUCTS = {
    'prod_1': {
      id: 'prod_1',
      name: 'Web Application Development',
      sku: 'DEV-WEB-PRO',
      description: 'End-to-end modern web app development & integration',
      price: 1500.00,
      unit: 'project',
      taxRate: 10,
      createdAt: Date.now()
    },
    'prod_2': {
      id: 'prod_2',
      name: 'UI/UX Brand Design & Prototyping',
      sku: 'DSGN-UI-UX',
      description: 'High-fidelity Figma mockups, design system & user journeys',
      price: 800.00,
      unit: 'package',
      taxRate: 5,
      createdAt: Date.now()
    },
    'prod_3': {
      id: 'prod_3',
      name: 'Cloud Infrastructure & DevOps Setup',
      sku: 'CLD-DEV-OPS',
      description: 'Firebase Realtime Database, CI/CD and production deployment',
      price: 450.00,
      unit: 'setup',
      taxRate: 0,
      createdAt: Date.now()
    },
    'prod_4': {
      id: 'prod_4',
      name: 'Monthly Maintenance & Support',
      sku: 'SRV-MNT-MNTH',
      description: 'Ongoing technical maintenance, updates and security monitoring',
      price: 250.00,
      unit: 'month',
      taxRate: 10,
      createdAt: Date.now()
    }
  };

  const SEED_INVOICES = {
    'inv_1001': {
      id: 'inv_1001',
      invoiceNumber: 'INV-1001',
      customerId: 'cust_1',
      customerName: 'Sarah Connor',
      customerCompany: 'Cyberdyne Media',
      customerPhone: '+1555302910',
      customerEmail: 'sarah@cyberdynemedia.com',
      customerAddress: '100 Industrial Pkwy, Los Angeles, CA',
      issueDate: new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0],
      dueDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
      status: 'Paid',
      items: [
        {
          productId: 'prod_1',
          name: 'Web Application Development',
          description: 'Custom portal frontend & backend',
          quantity: 1,
          unitPrice: 1500.00,
          taxRate: 10,
          taxAmount: 150.00,
          subtotal: 1650.00
        }
      ],
      subtotal: 1500.00,
      taxTotal: 150.00,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0.00,
      shippingFee: 0.00,
      grandTotal: 1650.00,
      amountPaid: 1650.00,
      balanceDue: 0.00,
      payments: [
        {
          id: 'pay_1',
          date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
          amount: 1650.00,
          method: 'Bank Transfer',
          note: 'Full payment received via wire'
        }
      ],
      notes: 'Thank you for your business!',
      terms: 'Payment due within 14 days.',
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now() - 86400000 * 5
    },
    'inv_1002': {
      id: 'inv_1002',
      invoiceNumber: 'INV-1002',
      customerId: 'cust_2',
      customerName: 'Michael Scott',
      customerCompany: 'Dunder Mifflin Paper Co',
      customerPhone: '+1555981240',
      customerEmail: 'michael@dundermifflin.com',
      customerAddress: '1725 Slough Avenue, Scranton, PA',
      issueDate: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
      status: 'Partially Paid',
      items: [
        {
          productId: 'prod_2',
          name: 'UI/UX Brand Design & Prototyping',
          description: 'Client portal interface revamp',
          quantity: 1,
          unitPrice: 800.00,
          taxRate: 5,
          taxAmount: 40.00,
          subtotal: 840.00
        },
        {
          productId: 'prod_4',
          name: 'Monthly Maintenance & Support',
          description: 'Quarterly retainer upfront (2 months)',
          quantity: 2,
          unitPrice: 250.00,
          taxRate: 10,
          taxAmount: 50.00,
          subtotal: 550.00
        }
      ],
      subtotal: 1300.00,
      taxTotal: 90.00,
      discountType: 'fixed',
      discountValue: 50.00,
      discountAmount: 50.00,
      shippingFee: 0.00,
      grandTotal: 1340.00,
      amountPaid: 600.00,
      balanceDue: 740.00,
      payments: [
        {
          id: 'pay_2',
          date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
          amount: 600.00,
          method: 'Credit Card',
          note: 'Deposit received'
        }
      ],
      notes: 'Deposit paid. Remaining balance due on project milestone completion.',
      terms: 'Payment due within 14 days.',
      createdAt: Date.now() - 86400000 * 8,
      updatedAt: Date.now() - 86400000 * 4
    },
    'inv_1003': {
      id: 'inv_1003',
      invoiceNumber: 'INV-1003',
      customerId: 'cust_3',
      customerName: 'Bruce Wayne',
      customerCompany: 'Wayne Enterprises',
      customerPhone: '+1555123998',
      customerEmail: 'bruce@wayneenterprises.com',
      customerAddress: '1007 Mountain Drive, Gotham City, NJ',
      issueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
      status: 'Unpaid',
      items: [
        {
          productId: 'prod_3',
          name: 'Cloud Infrastructure & DevOps Setup',
          description: 'Dedicated high-security private cloud architecture',
          quantity: 2,
          unitPrice: 450.00,
          taxRate: 0,
          taxAmount: 0.00,
          subtotal: 900.00
        }
      ],
      subtotal: 900.00,
      taxTotal: 0.00,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0.00,
      shippingFee: 0.00,
      grandTotal: 900.00,
      amountPaid: 0.00,
      balanceDue: 900.00,
      payments: [],
      notes: 'Invoice sent for review. Direct wire instructions provided below.',
      terms: 'Payment due within 14 days.',
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2
    }
  };

  // Helper for localStorage
  const getLocal = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Error reading localStorage ${key}`, e);
      return fallback;
    }
  };

  const setLocal = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving localStorage ${key}`, e);
    }
  };

  // Initialize and Seed
  const init = () => {
    // If local storage is empty, initialize with seed
    if (!localStorage.getItem(STORAGE_KEYS.BUSINESS)) {
      setLocal(STORAGE_KEYS.BUSINESS, DEFAULT_BUSINESS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      setLocal(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      setLocal(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      setLocal(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    }

    // Attach Firebase Realtime Database listeners if active
    setupFirebaseListeners();
  };

  let listenersAttached = false;
  let syncMode = localStorage.getItem('invoicepro_sync_mode') || 'delta'; // 'delta' | 'manual' | 'realtime'

  // ==========================================
  // BandwidthGuard: Quota Shield & Tracker
  // Prevents exceeding Firebase Spark 360MB/day
  // ==========================================
  const BandwidthGuard = (() => {
    const STORAGE_KEY = 'invoicepro_bandwidth_stats';
    const DAILY_LIMIT = 360 * 1024 * 1024; // 360 MB Spark Limit

    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    const getStats = () => {
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const today = getTodayDateString();
        if (data.date !== today) {
          const fresh = { date: today, bytes: 0 };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          return fresh;
        }
        return data;
      } catch {
        return { date: getTodayDateString(), bytes: 0 };
      }
    };

    const track = (byteCount) => {
      const stats = getStats();
      stats.bytes += Math.max(0, byteCount);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
      updateUI(stats);
      return stats;
    };

    const formatBytes = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const updateUI = (stats = null) => {
      if (!stats) stats = getStats();
      const usedBytes = stats.bytes;
      const pct = Math.min(100, (usedBytes / DAILY_LIMIT) * 100);

      const usageText = document.getElementById('bandwidth-usage-text');
      const progressBar = document.getElementById('bandwidth-progress-bar');
      const modalText = document.getElementById('modal-bandwidth-text');
      const modalBar = document.getElementById('modal-bandwidth-bar');

      const formatted = `${formatBytes(usedBytes)} / 360 MB (${pct.toFixed(2)}%)`;

      if (usageText) usageText.textContent = `${formatBytes(usedBytes)} / 360 MB`;
      if (progressBar) {
        progressBar.style.width = Math.max(0.5, pct) + '%';
        progressBar.style.backgroundColor = pct > 80 ? '#ef4444' : (pct > 50 ? '#f59e0b' : '#10b981');
      }

      if (modalText) modalText.textContent = formatted;
      if (modalBar) {
        modalBar.style.width = Math.max(0.5, pct) + '%';
        modalBar.style.backgroundColor = pct > 80 ? '#ef4444' : (pct > 50 ? '#f59e0b' : '#10b981');
      }
    };

    return {
      track,
      getStats,
      formatBytes,
      updateUI
    };
  })();

  const setSyncMode = (mode) => {
    syncMode = mode;
    localStorage.setItem('invoicepro_sync_mode', mode);
    listenersAttached = false;
    setupFirebaseListeners();
  };

  const getSyncMode = () => syncMode;

  const setupFirebaseListeners = () => {
    const database = FirebaseManager.getDatabase();
    if (!database) return;

    BandwidthGuard.updateUI();

    // Check if cloud database is empty; if so, push initial seed data
    database.ref().once('value', (snapshot) => {
      const val = snapshot.val();
      if (!val || Object.keys(val).length === 0) {
        console.log('Firebase cloud database is empty. Uploading current data to cloud...');
        const b = getBusiness();
        const c = getCustomers();
        const p = getProducts();
        const inv = getInvoices();

        database.ref('business').set(b).catch(() => {});
        database.ref('customers').set(c).catch(() => {});
        database.ref('products').set(p).catch(() => {});
        database.ref('invoices').set(inv).catch(() => {});

        BandwidthGuard.track(JSON.stringify({ b, c, p, inv }).length);
      }
    }).catch(err => {
      console.warn('Initial cloud check warning:', err);
    });

    // If manual sync mode, do not attach continuous background listeners
    if (syncMode === 'manual') {
      console.log('InvoicePro: Manual Sync Mode Active (Zero Background Bandwidth)');
      return;
    }

    if (listenersAttached) return;
    listenersAttached = true;

    // Delta Child Listeners for Collections (Transfers ONLY changed individual items)
    const attachCollectionListeners = (collectionName, storageKey) => {
      const ref = database.ref(collectionName);

      ref.on('child_added', (snap) => {
        const item = snap.val();
        if (!item) return;
        BandwidthGuard.track(JSON.stringify(item).length);
        const all = getLocal(storageKey, {});
        all[snap.key] = item;
        setLocal(storageKey, all);
        notifySubscribers(collectionName, all);
      });

      ref.on('child_changed', (snap) => {
        const item = snap.val();
        if (!item) return;
        // Only this single modified child is downloaded over the wire!
        BandwidthGuard.track(JSON.stringify(item).length);
        const all = getLocal(storageKey, {});
        all[snap.key] = item;
        setLocal(storageKey, all);
        notifySubscribers(collectionName, all);
      });

      ref.on('child_removed', (snap) => {
        BandwidthGuard.track(40);
        const all = getLocal(storageKey, {});
        delete all[snap.key];
        setLocal(storageKey, all);
        notifySubscribers(collectionName, all);
      });
    };

    // Attach Delta Listeners to collections
    attachCollectionListeners('customers', STORAGE_KEYS.CUSTOMERS);
    attachCollectionListeners('products', STORAGE_KEYS.PRODUCTS);
    attachCollectionListeners('invoices', STORAGE_KEYS.INVOICES);

    // Business info listener (single small object)
    database.ref('business').on('value', (snap) => {
      const val = snap.val();
      if (val !== null && val !== undefined) {
        BandwidthGuard.track(JSON.stringify(val).length);
        setLocal(STORAGE_KEYS.BUSINESS, val);
        notifySubscribers('business', val);
      }
    });
  };

  /**
   * Manual Sync on-demand
   */
  const syncNow = async () => {
    const database = FirebaseManager.getDatabase();
    if (!database) {
      App.showToast('Firebase is not connected yet', 'warning');
      return;
    }

    App.showToast('Syncing with Firebase Cloud...', 'info');
    try {
      const nodes = ['business', 'customers', 'products', 'invoices'];
      for (const node of nodes) {
        const snap = await database.ref(node).once('value');
        const val = snap.val();
        if (val !== null && val !== undefined) {
          BandwidthGuard.track(JSON.stringify(val).length);
          const storageKey = STORAGE_KEYS[node.toUpperCase()];
          setLocal(storageKey, val);
          notifySubscribers(node, val);
        }
      }
      App.showToast('Cloud synchronization complete!', 'success');
      BandwidthGuard.updateUI();
    } catch (err) {
      console.error('Manual sync error:', err);
      App.showToast('Sync failed: ' + (err.message || 'Network error'), 'error');
    }
  };

  const notifySubscribers = (entity, data) => {
    changeListeners.forEach(listener => {
      try {
        listener(entity, data);
      } catch (e) {
        console.error('Data change listener error:', e);
      }
    });
  };

  const subscribe = (callback) => {
    if (typeof callback === 'function') {
      changeListeners.push(callback);
    }
  };

  // --- CRUD Operations for Business ---
  const getBusiness = () => {
    return getLocal(STORAGE_KEYS.BUSINESS, DEFAULT_BUSINESS);
  };

  const saveBusiness = (businessData) => {
    const current = getBusiness();
    const updated = { ...current, ...businessData };
    setLocal(STORAGE_KEYS.BUSINESS, updated);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(JSON.stringify(updated).length);
      database.ref('business').set(updated).catch(err => console.warn('Firebase RTDB write error:', err));
    }

    notifySubscribers('business', updated);
    return updated;
  };

  // --- CRUD Operations for Customers ---
  const getCustomers = () => {
    return getLocal(STORAGE_KEYS.CUSTOMERS, {});
  };

  const getCustomer = (id) => {
    const all = getCustomers();
    return all[id] || null;
  };

  const saveCustomer = (customer) => {
    const all = getCustomers();
    const id = customer.id || ('cust_' + Date.now());
    const updatedCustomer = {
      ...customer,
      id,
      updatedAt: Date.now(),
      createdAt: customer.createdAt || Date.now()
    };
    all[id] = updatedCustomer;
    setLocal(STORAGE_KEYS.CUSTOMERS, all);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(JSON.stringify(updatedCustomer).length);
      database.ref(`customers/${id}`).set(updatedCustomer).catch(err => console.warn('Firebase RTDB write error:', err));
    }

    notifySubscribers('customers', all);
    return updatedCustomer;
  };

  const deleteCustomer = (id) => {
    const all = getCustomers();
    delete all[id];
    setLocal(STORAGE_KEYS.CUSTOMERS, all);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(40);
      database.ref(`customers/${id}`).remove().catch(err => console.warn('Firebase RTDB delete error:', err));
    }

    notifySubscribers('customers', all);
    return true;
  };

  // --- CRUD Operations for Products ---
  const getProducts = () => {
    return getLocal(STORAGE_KEYS.PRODUCTS, {});
  };

  const getProduct = (id) => {
    const all = getProducts();
    return all[id] || null;
  };

  const saveProduct = (product) => {
    const all = getProducts();
    const id = product.id || ('prod_' + Date.now());
    const updatedProduct = {
      ...product,
      id,
      updatedAt: Date.now(),
      createdAt: product.createdAt || Date.now()
    };
    all[id] = updatedProduct;
    setLocal(STORAGE_KEYS.PRODUCTS, all);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(JSON.stringify(updatedProduct).length);
      database.ref(`products/${id}`).set(updatedProduct).catch(err => console.warn('Firebase RTDB write error:', err));
    }

    notifySubscribers('products', all);
    return updatedProduct;
  };

  const deleteProduct = (id) => {
    const all = getProducts();
    delete all[id];
    setLocal(STORAGE_KEYS.PRODUCTS, all);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(40);
      database.ref(`products/${id}`).remove().catch(err => console.warn('Firebase RTDB delete error:', err));
    }

    notifySubscribers('products', all);
    return true;
  };

  // --- CRUD Operations for Invoices ---
  const getInvoices = () => {
    return getLocal(STORAGE_KEYS.INVOICES, {});
  };

  const getInvoice = (id) => {
    const all = getInvoices();
    return all[id] || null;
  };

  const saveInvoice = (invoice) => {
    const all = getInvoices();
    const id = invoice.id || ('inv_' + Date.now());
    
    // Auto-update sequence number in business settings if new
    if (!invoice.id) {
      const business = getBusiness();
      const nextNum = (business.invoiceSettings?.nextNumber || 1000) + 1;
      saveBusiness({
        invoiceSettings: {
          ...business.invoiceSettings,
          nextNumber: nextNum
        }
      });
    }

    const updatedInvoice = {
      ...invoice,
      id,
      updatedAt: Date.now(),
      createdAt: invoice.createdAt || Date.now()
    };

    all[id] = updatedInvoice;
    setLocal(STORAGE_KEYS.INVOICES, all);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(JSON.stringify(updatedInvoice).length);
      database.ref(`invoices/${id}`).set(updatedInvoice).catch(err => console.warn('Firebase RTDB write error:', err));
    }

    notifySubscribers('invoices', all);
    return updatedInvoice;
  };

  const deleteInvoice = (id) => {
    const all = getInvoices();
    delete all[id];
    setLocal(STORAGE_KEYS.INVOICES, all);

    const database = FirebaseManager.getDatabase();
    if (database) {
      BandwidthGuard.track(40);
      database.ref(`invoices/${id}`).remove().catch(err => console.warn('Firebase RTDB delete error:', err));
    }

    notifySubscribers('invoices', all);
    return true;
  };

  // Record a payment against an invoice
  const recordPayment = (invoiceId, paymentData) => {
    const invoice = getInvoice(invoiceId);
    if (!invoice) return null;

    const payments = invoice.payments || [];
    const newPayment = {
      id: 'pay_' + Date.now(),
      date: paymentData.date || new Date().toISOString().split('T')[0],
      amount: parseFloat(paymentData.amount) || 0,
      method: paymentData.method || 'Bank Transfer',
      note: paymentData.note || ''
    };

    payments.push(newPayment);

    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const grandTotal = parseFloat(invoice.grandTotal) || 0;
    const balanceDue = Math.max(0, grandTotal - totalPaid);

    let newStatus = 'Unpaid';
    if (balanceDue <= 0.001) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partially Paid';
    }

    const updatedInvoice = {
      ...invoice,
      payments,
      amountPaid: totalPaid,
      balanceDue: balanceDue,
      status: newStatus,
      updatedAt: Date.now()
    };

    return saveInvoice(updatedInvoice);
  };

  // Full Database Export / Backup
  const exportFullBackup = () => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      business: getBusiness(),
      customers: getCustomers(),
      products: getProducts(),
      invoices: getInvoices()
    };
  };

  // Full Database Import / Restore
  const importFullBackup = (jsonData) => {
    try {
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid JSON structure');
      }

      if (jsonData.business) setLocal(STORAGE_KEYS.BUSINESS, jsonData.business);
      if (jsonData.customers) setLocal(STORAGE_KEYS.CUSTOMERS, jsonData.customers);
      if (jsonData.products) setLocal(STORAGE_KEYS.PRODUCTS, jsonData.products);
      if (jsonData.invoices) setLocal(STORAGE_KEYS.INVOICES, jsonData.invoices);

      const database = FirebaseManager.getDatabase();
      if (database) {
        if (jsonData.business) database.ref('business').set(jsonData.business);
        if (jsonData.customers) database.ref('customers').set(jsonData.customers);
        if (jsonData.products) database.ref('products').set(jsonData.products);
        if (jsonData.invoices) database.ref('invoices').set(jsonData.invoices);
      }

      notifySubscribers('all', jsonData);
      return { success: true };
    } catch (e) {
      console.error('Import failed', e);
      return { success: false, message: e.message };
    }
  };

  return {
    init,
    subscribe,
    setupFirebaseListeners,
    setSyncMode,
    getSyncMode,
    syncNow,
    BandwidthGuard,
    getBusiness,
    saveBusiness,
    getCustomers,
    getCustomer,
    saveCustomer,
    deleteCustomer,
    getProducts,
    getProduct,
    saveProduct,
    deleteProduct,
    getInvoices,
    getInvoice,
    saveInvoice,
    deleteInvoice,
    recordPayment,
    exportFullBackup,
    importFullBackup
  };
})();
