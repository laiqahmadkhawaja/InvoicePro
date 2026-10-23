/**
 * InvoicePro - Invoices Controller & Calculation Engine
 */

const Invoices = (() => {
  let currentFilter = 'all';
  let searchQuery = '';
  let activeInvoiceId = null; // currently editing or viewing

  const formatMoney = (amount, sym = '$') => {
    const num = parseFloat(amount) || 0;
    return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  /**
   * Render Invoices Table with Search and Filter
   */
  const renderList = () => {
    const invoicesObj = DB.getInvoices();
    const invoices = Object.values(invoicesObj || {});
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    // Filter by tab
    let filtered = invoices.filter(inv => {
      const isOverdue = inv.status !== 'Paid' && new Date(inv.dueDate) < new Date();
      if (currentFilter === 'all') return true;
      if (currentFilter === 'paid') return inv.status === 'Paid';
      if (currentFilter === 'partial') return inv.status === 'Partially Paid';
      if (currentFilter === 'unpaid') return inv.status === 'Unpaid';
      if (currentFilter === 'overdue') return isOverdue;
      if (currentFilter === 'draft') return inv.status === 'Draft';
      return true;
    });

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerCompany && inv.customerCompany.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt desc
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Update tab counts
    updateTabCounts(invoices);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: 3rem; color: #94a3b8;">
            <i class="fa-solid fa-file-invoice" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; opacity: 0.4;"></i>
            No invoices found matching your filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(inv => {
      const isOverdue = inv.status !== 'Paid' && new Date(inv.dueDate) < new Date();
      let badgeClass = 'badge-unpaid';
      let statusText = inv.status || 'Unpaid';

      if (statusText === 'Paid') badgeClass = 'badge-paid';
      else if (statusText === 'Partially Paid') badgeClass = 'badge-partial';
      else if (statusText === 'Draft') badgeClass = 'badge-draft';

      if (isOverdue) {
        badgeClass = 'badge-overdue';
        statusText = 'Overdue';
      }

      const balance = inv.balanceDue !== undefined ? inv.balanceDue : inv.grandTotal;

      return `
        <tr>
          <td><strong style="color: #4f46e5; cursor: pointer;" onclick="Invoices.view('${inv.id}')">${inv.invoiceNumber}</strong></td>
          <td>
            <div style="font-weight: 600;">${escapeHTML(inv.customerName || 'Customer')}</div>
            ${inv.customerCompany ? `<div style="font-size: 0.775rem; color: #64748b;">${escapeHTML(inv.customerCompany)}</div>` : ''}
          </td>
          <td>${formatDate(inv.issueDate)}</td>
          <td>${formatDate(inv.dueDate)}</td>
          <td><strong>${formatMoney(inv.grandTotal, sym)}</strong></td>
          <td style="color: ${balance > 0 ? '#ef4444' : '#10b981'}; font-weight: 600;">
            ${formatMoney(balance, sym)}
          </td>
          <td><span class="badge ${badgeClass}">${statusText}</span></td>
          <td class="table-actions">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Invoices.view('${inv.id}')" title="View & Print">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-whatsapp btn-sm btn-icon" onclick="PDFWhatsApp.openWhatsAppModal('${inv.id}')" title="Share via WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="PDFWhatsApp.downloadPDF('${inv.id}')" title="Download PDF">
              <i class="fa-solid fa-file-pdf"></i>
            </button>
            <button class="btn btn-success btn-sm btn-icon" onclick="Invoices.openPaymentModal('${inv.id}')" title="Record Payment">
              <i class="fa-solid fa-money-bill-wave"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Invoices.edit('${inv.id}')" title="Edit Invoice">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="Invoices.remove('${inv.id}')" title="Delete Invoice">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  /**
   * Update Badges on Filter Tabs
   */
  const updateTabCounts = (invoices) => {
    const counts = { all: invoices.length, paid: 0, partial: 0, unpaid: 0, overdue: 0, draft: 0 };
    const now = new Date();

    invoices.forEach(inv => {
      const isOverdue = inv.status !== 'Paid' && new Date(inv.dueDate) < now;
      if (inv.status === 'Paid') counts.paid++;
      else if (inv.status === 'Partially Paid') counts.partial++;
      else if (inv.status === 'Draft') counts.draft++;
      else counts.unpaid++;

      if (isOverdue) counts.overdue++;
    });

    Object.keys(counts).forEach(key => {
      const el = document.getElementById(`count-filter-${key}`);
      if (el) el.textContent = counts[key];
    });
  };

  /**
   * Set Active Tab Filter
   */
  const setFilter = (filterName) => {
    currentFilter = filterName;
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filterName);
    });
    renderList();
  };

  /**
   * Set Search Query
   */
  const setSearch = (query) => {
    searchQuery = query;
    renderList();
  };

  /**
   * Open Invoice Builder Modal (Create or Edit)
   */
  const openBuilder = (invoiceId = null) => {
    activeInvoiceId = invoiceId;
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';
    const modalTitle = document.getElementById('modal-invoice-builder-title');
    const form = document.getElementById('form-invoice-builder');
    
    // Populate customer select options
    populateCustomerDropdown();

    if (invoiceId) {
      const invoice = DB.getInvoice(invoiceId);
      if (!invoice) return;

      modalTitle.textContent = `Edit Invoice ${invoice.invoiceNumber}`;
      document.getElementById('inv-builder-id').value = invoice.id;
      document.getElementById('inv-number').value = invoice.invoiceNumber;
      document.getElementById('inv-customer-select').value = invoice.customerId || '';
      document.getElementById('inv-customer-name').value = invoice.customerName || '';
      document.getElementById('inv-customer-email').value = invoice.customerEmail || '';
      document.getElementById('inv-customer-phone').value = invoice.customerPhone || '';
      document.getElementById('inv-customer-address').value = invoice.customerAddress || '';
      document.getElementById('inv-issue-date').value = invoice.issueDate || '';
      document.getElementById('inv-due-date').value = invoice.dueDate || '';
      document.getElementById('inv-discount-type').value = invoice.discountType || 'percentage';
      document.getElementById('inv-discount-value').value = invoice.discountValue || 0;
      document.getElementById('inv-shipping-fee').value = invoice.shippingFee || 0;
      document.getElementById('inv-notes').value = invoice.notes || '';
      document.getElementById('inv-terms').value = invoice.terms || '';

      renderLineItemRows(invoice.items || []);
    } else {
      // New Invoice defaults
      modalTitle.textContent = 'Create New Invoice';
      form.reset();

      const nextNum = business.invoiceSettings?.nextNumber || 1001;
      const prefix = business.invoiceSettings?.prefix || 'INV-';
      document.getElementById('inv-builder-id').value = '';
      document.getElementById('inv-number').value = `${prefix}${nextNum}`;

      const today = new Date().toISOString().split('T')[0];
      const dueDays = business.invoiceSettings?.defaultDueDays || 14;
      const due = new Date(Date.now() + 86400000 * dueDays).toISOString().split('T')[0];

      document.getElementById('inv-issue-date').value = today;
      document.getElementById('inv-due-date').value = due;
      document.getElementById('inv-notes').value = business.invoiceSettings?.defaultNotes || '';
      document.getElementById('inv-terms').value = business.invoiceSettings?.defaultTerms || '';

      // Initialize with one blank row
      renderLineItemRows([
        { name: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, subtotal: 0 }
      ]);
    }

    recalculateTotals();
    App.openModal('modal-invoice-builder');
  };

  /**
   * Populate Customer dropdown inside Invoice Builder
   */
  const populateCustomerDropdown = () => {
    const select = document.getElementById('inv-customer-select');
    if (!select) return;

    const customers = Object.values(DB.getCustomers());
    select.innerHTML = '<option value="">-- Select Customer (or enter below) --</option>';

    customers.forEach(cust => {
      const opt = document.createElement('option');
      opt.value = cust.id;
      opt.textContent = `${cust.name} ${cust.company ? `(${cust.company})` : ''}`;
      select.appendChild(opt);
    });
  };

  /**
   * On Customer Selected in Dropdown
   */
  const onCustomerSelected = (customerId) => {
    if (!customerId) return;
    const cust = DB.getCustomer(customerId);
    if (!cust) return;

    document.getElementById('inv-customer-name').value = cust.name || '';
    document.getElementById('inv-customer-email').value = cust.email || '';
    document.getElementById('inv-customer-phone').value = cust.phone || '';
    document.getElementById('inv-customer-address').value = cust.address || '';
  };

  /**
   * Render Line Item Rows in Invoice Builder
   */
  const renderLineItemRows = (items = []) => {
    const tbody = document.getElementById('inv-items-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const products = Object.values(DB.getProducts());

    items.forEach((item, index) => {
      addLineItemRow(item, index, products);
    });
  };

  /**
   * Add a single line item row
   */
  const addLineItemRow = (item = {}, index = null, products = null) => {
    const tbody = document.getElementById('inv-items-table-body');
    if (!tbody) return;

    if (!products) {
      products = Object.values(DB.getProducts());
    }

    const rowIndex = index !== null ? index : tbody.children.length;
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.dataset.index = rowIndex;

    const productOptions = products.map(p => 
      `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${escapeHTML(p.name)} (${formatMoney(p.price)})</option>`
    ).join('');

    tr.innerHTML = `
      <td style="width: 38%;">
        <select class="form-control item-product-picker" onchange="Invoices.onProductPicked(this, ${rowIndex})" style="margin-bottom: 0.35rem;">
          <option value="">-- Choose from Catalog or Type Below --</option>
          ${productOptions}
        </select>
        <input type="text" class="form-control item-name" placeholder="Item/Service name" value="${escapeHTML(item.name || '')}" required />
        <input type="text" class="form-control item-desc" placeholder="Description (optional)" value="${escapeHTML(item.description || '')}" style="margin-top: 0.35rem; font-size: 0.775rem;" />
      </td>
      <td style="width: 14%;">
        <input type="number" class="form-control item-qty" min="0.01" step="any" value="${item.quantity || 1}" oninput="Invoices.recalculateTotals()" required />
      </td>
      <td style="width: 18%;">
        <input type="number" class="form-control item-price" min="0" step="0.01" value="${item.unitPrice !== undefined ? item.unitPrice : 0}" oninput="Invoices.recalculateTotals()" required />
      </td>
      <td style="width: 14%;">
        <input type="number" class="form-control item-tax" min="0" max="100" step="0.1" value="${item.taxRate !== undefined ? item.taxRate : 0}" oninput="Invoices.recalculateTotals()" />
      </td>
      <td style="width: 12%; vertical-align: middle; text-align: right; font-weight: 700;">
        <span class="item-line-total">$0.00</span>
      </td>
      <td style="width: 4%; vertical-align: middle; text-align: center;">
        <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="Invoices.removeLineItemRow(this)" style="color: #ef4444;" title="Remove Item">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
    recalculateTotals();
  };

  /**
   * On Product Picked from Catalog Dropdown
   */
  const onProductPicked = (selectEl, rowIndex) => {
    const prodId = selectEl.value;
    const row = selectEl.closest('tr');
    if (!row) return;

    if (prodId) {
      const prod = DB.getProduct(prodId);
      if (prod) {
        row.querySelector('.item-name').value = prod.name || '';
        row.querySelector('.item-desc').value = prod.description || '';
        row.querySelector('.item-price').value = prod.price || 0;
        row.querySelector('.item-tax').value = prod.taxRate || 0;
      }
    }
    recalculateTotals();
  };

  /**
   * Remove Line Item Row
   */
  const removeLineItemRow = (btn) => {
    const tbody = document.getElementById('inv-items-table-body');
    if (!tbody) return;

    if (tbody.children.length <= 1) {
      App.showToast('At least one item is required', 'warning');
      return;
    }

    const row = btn.closest('tr');
    if (row) {
      row.remove();
      recalculateTotals();
    }
  };

  /**
   * Recalculate Totals in Real-Time
   */
  const recalculateTotals = () => {
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';
    const rows = document.querySelectorAll('#inv-items-table-body tr.item-row');

    let subtotal = 0;
    let taxTotal = 0;

    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
      const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
      const taxRate = parseFloat(row.querySelector('.item-tax')?.value) || 0;

      const lineNet = qty * price;
      const lineTax = lineNet * (taxRate / 100);
      const lineSubtotal = lineNet + lineTax;

      subtotal += lineNet;
      taxTotal += lineTax;

      const lineTotalSpan = row.querySelector('.item-line-total');
      if (lineTotalSpan) {
        lineTotalSpan.textContent = formatMoney(lineSubtotal, sym);
      }
    });

    // Discount
    const discountType = document.getElementById('inv-discount-type')?.value || 'percentage';
    const discountVal = parseFloat(document.getElementById('inv-discount-value')?.value) || 0;
    let discountAmount = 0;

    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountVal / 100);
    } else {
      discountAmount = discountVal;
    }
    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

    // Shipping / Extra
    const shippingFee = parseFloat(document.getElementById('inv-shipping-fee')?.value) || 0;

    // Grand Total
    const grandTotal = Math.max(0, subtotal - discountAmount + taxTotal + shippingFee);

    // Update DOM summary
    const subtotalEl = document.getElementById('inv-summary-subtotal');
    const discountEl = document.getElementById('inv-summary-discount');
    const taxEl = document.getElementById('inv-summary-tax');
    const shippingEl = document.getElementById('inv-summary-shipping');
    const grandTotalEl = document.getElementById('inv-summary-grandtotal');

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal, sym);
    if (discountEl) discountEl.textContent = `-${formatMoney(discountAmount, sym)}`;
    if (taxEl) taxEl.textContent = formatMoney(taxTotal, sym);
    if (shippingEl) shippingEl.textContent = formatMoney(shippingFee, sym);
    if (grandTotalEl) grandTotalEl.textContent = formatMoney(grandTotal, sym);

    return {
      subtotal,
      taxTotal,
      discountType,
      discountValue: discountVal,
      discountAmount,
      shippingFee,
      grandTotal
    };
  };

  /**
   * Save Invoice (Draft or Final)
   */
  const saveInvoice = (isDraft = false) => {
    const calc = recalculateTotals();
    const rows = document.querySelectorAll('#inv-items-table-body tr.item-row');

    const customerName = document.getElementById('inv-customer-name')?.value.trim();
    if (!customerName) {
      App.showToast('Please provide a customer name', 'warning');
      document.getElementById('inv-customer-name')?.focus();
      return;
    }

    const items = [];
    rows.forEach(row => {
      const name = row.querySelector('.item-name')?.value.trim();
      if (name) {
        const qty = parseFloat(row.querySelector('.item-qty')?.value) || 1;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const taxRate = parseFloat(row.querySelector('.item-tax')?.value) || 0;
        const lineNet = qty * price;
        const lineTax = lineNet * (taxRate / 100);

        items.push({
          name,
          description: row.querySelector('.item-desc')?.value.trim() || '',
          quantity: qty,
          unitPrice: price,
          taxRate,
          taxAmount: lineTax,
          subtotal: lineNet + lineTax
        });
      }
    });

    if (items.length === 0) {
      App.showToast('Please add at least one line item', 'warning');
      return;
    }

    const existingId = document.getElementById('inv-builder-id')?.value;
    const existing = existingId ? DB.getInvoice(existingId) : null;

    const amountPaid = existing ? (existing.amountPaid || 0) : 0;
    const balanceDue = Math.max(0, calc.grandTotal - amountPaid);

    let status = isDraft ? 'Draft' : 'Unpaid';
    if (!isDraft) {
      if (balanceDue <= 0.001) status = 'Paid';
      else if (amountPaid > 0) status = 'Partially Paid';
    }

    const invoiceData = {
      id: existingId || undefined,
      invoiceNumber: document.getElementById('inv-number')?.value.trim() || 'INV-0000',
      customerId: document.getElementById('inv-customer-select')?.value || '',
      customerName: customerName,
      customerEmail: document.getElementById('inv-customer-email')?.value.trim() || '',
      customerPhone: document.getElementById('inv-customer-phone')?.value.trim() || '',
      customerAddress: document.getElementById('inv-customer-address')?.value.trim() || '',
      issueDate: document.getElementById('inv-issue-date')?.value || new Date().toISOString().split('T')[0],
      dueDate: document.getElementById('inv-due-date')?.value || new Date().toISOString().split('T')[0],
      status: status,
      items: items,
      subtotal: calc.subtotal,
      taxTotal: calc.taxTotal,
      discountType: calc.discountType,
      discountValue: calc.discountValue,
      discountAmount: calc.discountAmount,
      shippingFee: calc.shippingFee,
      grandTotal: calc.grandTotal,
      amountPaid: amountPaid,
      balanceDue: balanceDue,
      payments: existing ? (existing.payments || []) : [],
      notes: document.getElementById('inv-notes')?.value.trim() || '',
      terms: document.getElementById('inv-terms')?.value.trim() || ''
    };

    const saved = DB.saveInvoice(invoiceData);
    App.closeModal('modal-invoice-builder');
    App.showToast(`Invoice ${saved.invoiceNumber} saved successfully!`, 'success');

    renderList();
    Dashboard.update();
  };

  /**
   * View Invoice Detail Modal
   */
  const view = (invoiceId) => {
    activeInvoiceId = invoiceId;
    const invoice = DB.getInvoice(invoiceId);
    if (!invoice) return;

    PDFWhatsApp.renderPrintableInvoice(invoiceId);

    // Populate Payment History table in View Modal
    renderPaymentsHistory(invoice);

    // Set buttons target
    const btnPdf = document.getElementById('btn-modal-view-pdf');
    const btnPrint = document.getElementById('btn-modal-view-print');
    const btnWa = document.getElementById('btn-modal-view-wa');
    const btnPay = document.getElementById('btn-modal-view-pay');

    if (btnPdf) btnPdf.onclick = () => PDFWhatsApp.downloadPDF(invoiceId);
    if (btnPrint) btnPrint.onclick = () => PDFWhatsApp.printInvoice(invoiceId);
    if (btnWa) btnWa.onclick = () => PDFWhatsApp.openWhatsAppModal(invoiceId);
    if (btnPay) btnPay.onclick = () => openPaymentModal(invoiceId);

    App.openModal('modal-invoice-view');
  };

  /**
   * Render Payment History in View Modal
   */
  const renderPaymentsHistory = (invoice) => {
    const tbody = document.getElementById('inv-view-payments-body');
    if (!tbody) return;

    const payments = invoice.payments || [];
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';

    if (payments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="padding: 1.5rem; color: #94a3b8;">
            No payments recorded yet. Click <strong>+ Record Payment</strong> to log one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td>${formatDate(p.date)}</td>
        <td><strong>${formatMoney(p.amount, sym)}</strong></td>
        <td><span class="badge badge-paid">${escapeHTML(p.method || 'Transfer')}</span></td>
        <td style="color: #64748b;">${escapeHTML(p.note || '-')}</td>
      </tr>
    `).join('');
  };

  /**
   * Open Payment Recording Modal
   */
  const openPaymentModal = (invoiceId) => {
    const invoice = DB.getInvoice(invoiceId);
    if (!invoice) return;

    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';

    document.getElementById('payment-invoice-id').value = invoice.id;
    document.getElementById('payment-modal-inv-num').textContent = invoice.invoiceNumber;
    document.getElementById('payment-modal-grandtotal').textContent = formatMoney(invoice.grandTotal, sym);
    document.getElementById('payment-modal-paid').textContent = formatMoney(invoice.amountPaid || 0, sym);
    
    const balance = invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.grandTotal;
    document.getElementById('payment-modal-balance').textContent = formatMoney(balance, sym);

    // Pre-fill amount with remaining balance
    document.getElementById('payment-amount-input').value = balance > 0 ? balance.toFixed(2) : '0.00';
    document.getElementById('payment-date-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-method-input').value = 'Bank Transfer';
    document.getElementById('payment-notes-input').value = '';

    App.openModal('modal-record-payment');
  };

  /**
   * Submit Recorded Payment
   */
  const submitPayment = () => {
    const invoiceId = document.getElementById('payment-invoice-id')?.value;
    const amount = parseFloat(document.getElementById('payment-amount-input')?.value) || 0;
    const date = document.getElementById('payment-date-input')?.value;
    const method = document.getElementById('payment-method-input')?.value;
    const note = document.getElementById('payment-notes-input')?.value.trim();

    if (amount <= 0) {
      App.showToast('Please enter a valid payment amount greater than 0', 'warning');
      return;
    }

    const updated = DB.recordPayment(invoiceId, { amount, date, method, note });
    if (updated) {
      App.closeModal('modal-record-payment');
      App.showToast(`Payment recorded. Invoice status: ${updated.status}`, 'success');
      
      // If view modal was open, refresh it
      if (activeInvoiceId === invoiceId) {
        view(invoiceId);
      }
      renderList();
      Dashboard.update();
    }
  };

  /**
   * Edit Invoice shortcut
   */
  const edit = (invoiceId) => {
    openBuilder(invoiceId);
  };

  /**
   * Delete Invoice
   */
  const remove = (invoiceId) => {
    const invoice = DB.getInvoice(invoiceId);
    if (!invoice) return;

    if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      DB.deleteInvoice(invoiceId);
      App.showToast(`Invoice ${invoice.invoiceNumber} deleted`, 'info');
      renderList();
      Dashboard.update();
    }
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
    renderList,
    setFilter,
    setSearch,
    openBuilder,
    addLineItemRow,
    removeLineItemRow,
    onProductPicked,
    onCustomerSelected,
    recalculateTotals,
    saveInvoice,
    view,
    edit,
    remove,
    openPaymentModal,
    submitPayment
  };
})();
