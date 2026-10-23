/**
 * InvoicePro - Customers Controller
 */

const Customers = (() => {
  let searchQuery = '';

  const formatMoney = (amount, sym = '$') => {
    const num = parseFloat(amount) || 0;
    return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Render Customers Table
   */
  const renderList = () => {
    const customersObj = DB.getCustomers();
    const customers = Object.values(customersObj || {});
    const invoicesObj = DB.getInvoices();
    const invoices = Object.values(invoicesObj || {});
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';

    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    let filtered = customers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 3rem; color: #94a3b8;">
            <i class="fa-solid fa-users" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; opacity: 0.4;"></i>
            No customers found. Click <strong>+ Add Customer</strong> to create one!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      // Aggregate client financial metrics
      const clientInvoices = invoices.filter(inv => inv.customerId === c.id || inv.customerName === c.name);
      const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);
      const totalPaid = clientInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amountPaid) || 0), 0);
      const balanceDue = Math.max(0, totalInvoiced - totalPaid);

      // Clean phone for WhatsApp
      let cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(c.name)}</div>
            ${c.taxId ? `<div style="font-size: 0.75rem; color: #94a3b8;">Tax ID: ${escapeHTML(c.taxId)}</div>` : ''}
          </td>
          <td>${escapeHTML(c.company || '-')}</td>
          <td>
            ${c.email ? `<a href="mailto:${escapeHTML(c.email)}" style="color: #4f46e5; text-decoration: none;">${escapeHTML(c.email)}</a>` : '-'}
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span>${escapeHTML(c.phone || '-')}</span>
              ${cleanPhone ? `
                <a href="https://api.whatsapp.com/send?phone=${cleanPhone}" target="_blank" class="btn btn-whatsapp btn-sm btn-icon" style="width: 26px; height: 26px; font-size: 0.75rem;" title="Chat on WhatsApp">
                  <i class="fa-brands fa-whatsapp"></i>
                </a>
              ` : ''}
            </div>
          </td>
          <td><strong>${formatMoney(totalInvoiced, sym)}</strong></td>
          <td style="color: ${balanceDue > 0 ? '#ef4444' : '#10b981'}; font-weight: 700;">
            ${formatMoney(balanceDue, sym)}
          </td>
          <td class="table-actions">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Customers.openModal('${c.id}')" title="Edit Customer">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="Customers.remove('${c.id}')" title="Delete Customer">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  /**
   * Set Search Query
   */
  const setSearch = (query) => {
    searchQuery = query;
    renderList();
  };

  /**
   * Open Customer Modal (Create or Edit)
   */
  const openModal = (customerId = null) => {
    const modalTitle = document.getElementById('modal-customer-title');
    const form = document.getElementById('form-customer');

    if (customerId) {
      const cust = DB.getCustomer(customerId);
      if (!cust) return;

      modalTitle.textContent = 'Edit Customer';
      document.getElementById('cust-id').value = cust.id;
      document.getElementById('cust-name').value = cust.name || '';
      document.getElementById('cust-company').value = cust.company || '';
      document.getElementById('cust-email').value = cust.email || '';
      document.getElementById('cust-phone').value = cust.phone || '';
      document.getElementById('cust-address').value = cust.address || '';
      document.getElementById('cust-tax-id').value = cust.taxId || '';
    } else {
      modalTitle.textContent = 'Add New Customer';
      form.reset();
      document.getElementById('cust-id').value = '';
    }

    App.openModal('modal-customer');
  };

  /**
   * Save Customer
   */
  const save = () => {
    const name = document.getElementById('cust-name')?.value.trim();
    if (!name) {
      App.showToast('Customer name is required', 'warning');
      return;
    }

    const id = document.getElementById('cust-id')?.value;
    const customerData = {
      id: id || undefined,
      name: name,
      company: document.getElementById('cust-company')?.value.trim() || '',
      email: document.getElementById('cust-email')?.value.trim() || '',
      phone: document.getElementById('cust-phone')?.value.trim() || '',
      address: document.getElementById('cust-address')?.value.trim() || '',
      taxId: document.getElementById('cust-tax-id')?.value.trim() || ''
    };

    const saved = DB.saveCustomer(customerData);
    App.closeModal('modal-customer');
    App.showToast(`Customer ${saved.name} saved successfully!`, 'success');

    renderList();
  };

  /**
   * Delete Customer
   */
  const remove = (customerId) => {
    const cust = DB.getCustomer(customerId);
    if (!cust) return;

    if (confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
      DB.deleteCustomer(customerId);
      App.showToast(`Customer ${cust.name} deleted`, 'info');
      renderList();
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
    setSearch,
    openModal,
    save,
    remove
  };
})();
