/**
 * InvoicePro - Products & Services Catalog Controller
 */

const Products = (() => {
  let searchQuery = '';

  const formatMoney = (amount, sym = '$') => {
    const num = parseFloat(amount) || 0;
    return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Render Products Table
   */
  const renderList = () => {
    const productsObj = DB.getProducts();
    const products = Object.values(productsObj || {});
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';

    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    let filtered = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 3rem; color: #94a3b8;">
            <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; opacity: 0.4;"></i>
            No products or services found. Click <strong>+ Add Product</strong> to add one!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(p.name)}</div>
            ${p.description ? `<div style="font-size: 0.775rem; color: #64748b;">${escapeHTML(p.description)}</div>` : ''}
          </td>
          <td><span style="font-family: monospace; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${escapeHTML(p.sku || '-')}</span></td>
          <td><span class="badge" style="background: #eef2ff; color: #4338ca;">${escapeHTML(p.unit || 'unit')}</span></td>
          <td><strong>${formatMoney(p.price, sym)}</strong></td>
          <td>${p.taxRate || 0}%</td>
          <td class="table-actions">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Products.openModal('${p.id}')" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="Products.remove('${p.id}')" title="Delete Product">
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
   * Open Product Modal (Create or Edit)
   */
  const openModal = (productId = null) => {
    const modalTitle = document.getElementById('modal-product-title');
    const form = document.getElementById('form-product');

    if (productId) {
      const prod = DB.getProduct(productId);
      if (!prod) return;

      modalTitle.textContent = 'Edit Product / Service';
      document.getElementById('prod-id').value = prod.id;
      document.getElementById('prod-name').value = prod.name || '';
      document.getElementById('prod-sku').value = prod.sku || '';
      document.getElementById('prod-unit').value = prod.unit || 'unit';
      document.getElementById('prod-price').value = prod.price !== undefined ? prod.price : 0;
      document.getElementById('prod-tax-rate').value = prod.taxRate !== undefined ? prod.taxRate : 0;
      document.getElementById('prod-description').value = prod.description || '';
    } else {
      modalTitle.textContent = 'Add New Product / Service';
      form.reset();
      document.getElementById('prod-id').value = '';
      document.getElementById('prod-unit').value = 'unit';
      document.getElementById('prod-price').value = '0.00';
      document.getElementById('prod-tax-rate').value = '0';
    }

    App.openModal('modal-product');
  };

  /**
   * Save Product
   */
  const save = () => {
    const name = document.getElementById('prod-name')?.value.trim();
    if (!name) {
      App.showToast('Product name is required', 'warning');
      return;
    }

    const id = document.getElementById('prod-id')?.value;
    const productData = {
      id: id || undefined,
      name: name,
      sku: document.getElementById('prod-sku')?.value.trim() || '',
      unit: document.getElementById('prod-unit')?.value.trim() || 'unit',
      price: parseFloat(document.getElementById('prod-price')?.value) || 0,
      taxRate: parseFloat(document.getElementById('prod-tax-rate')?.value) || 0,
      description: document.getElementById('prod-description')?.value.trim() || ''
    };

    const saved = DB.saveProduct(productData);
    App.closeModal('modal-product');
    App.showToast(`Product "${saved.name}" saved!`, 'success');

    renderList();
  };

  /**
   * Delete Product
   */
  const remove = (productId) => {
    const prod = DB.getProduct(productId);
    if (!prod) return;

    if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
      DB.deleteProduct(productId);
      App.showToast(`Product "${prod.name}" deleted`, 'info');
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
