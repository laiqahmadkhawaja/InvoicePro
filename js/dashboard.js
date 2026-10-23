/**
 * InvoicePro - Dashboard & Revenue Analytics Controller
 */

const Dashboard = (() => {

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

  const update = () => {
    const invoicesObj = DB.getInvoices();
    const invoices = Object.values(invoicesObj || {});
    const business = DB.getBusiness();
    const sym = business.currencySymbol || '$';

    let totalRevenue = 0;       // Total amount collected / paid
    let totalOutstanding = 0;   // Balance due on unpaid
    let totalPartiallyPaid = 0; // Balance due on partial
    let totalInvoiced = 0;      // Sum of all grandTotals
    let overdueCount = 0;
    let overdueAmount = 0;

    const statusCounts = {
      Paid: 0,
      'Partially Paid': 0,
      Unpaid: 0,
      Draft: 0
    };

    const now = new Date();

    invoices.forEach(inv => {
      const grandTotal = parseFloat(inv.grandTotal) || 0;
      const amountPaid = parseFloat(inv.amountPaid) || 0;
      const balanceDue = inv.balanceDue !== undefined ? parseFloat(inv.balanceDue) : (grandTotal - amountPaid);
      const isOverdue = inv.status !== 'Paid' && new Date(inv.dueDate) < now;

      totalInvoiced += grandTotal;
      totalRevenue += amountPaid;

      if (inv.status === 'Paid') {
        statusCounts.Paid++;
      } else if (inv.status === 'Partially Paid') {
        statusCounts['Partially Paid']++;
        totalPartiallyPaid += balanceDue;
      } else if (inv.status === 'Draft') {
        statusCounts.Draft++;
      } else {
        statusCounts.Unpaid++;
        totalOutstanding += balanceDue;
      }

      if (isOverdue) {
        overdueCount++;
        overdueAmount += balanceDue;
      }
    });

    // Update KPI Card DOM
    const kpiRev = document.getElementById('kpi-total-revenue');
    const kpiUnpaid = document.getElementById('kpi-total-unpaid');
    const kpiPartial = document.getElementById('kpi-total-partial');
    const kpiInvoiced = document.getElementById('kpi-total-invoiced');

    if (kpiRev) kpiRev.textContent = formatMoney(totalRevenue, sym);
    if (kpiUnpaid) kpiUnpaid.textContent = formatMoney(totalOutstanding, sym);
    if (kpiPartial) kpiPartial.textContent = formatMoney(totalPartiallyPaid, sym);
    if (kpiInvoiced) kpiInvoiced.textContent = formatMoney(totalInvoiced, sym);

    const overdueMeta = document.getElementById('kpi-unpaid-meta');
    if (overdueMeta) {
      overdueMeta.innerHTML = overdueCount > 0 
        ? `<span style="color: #ef4444; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> ${overdueCount} Overdue (${formatMoney(overdueAmount, sym)})</span>`
        : `<span style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> No overdue invoices</span>`;
    }

    // Update Status Distribution
    renderDistribution(statusCounts, invoices.length);

    // Render Monthly Revenue Chart
    renderMonthlyChart(invoices, sym);

    // Render Recent Invoices
    renderRecentInvoices(invoices, sym);
  };

  /**
   * Render Status Distribution Progress Bars
   */
  const renderDistribution = (counts, total) => {
    const container = document.getElementById('dashboard-status-distribution');
    if (!container) return;

    if (total === 0) {
      container.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">No invoices created yet.</p>`;
      return;
    }

    const items = [
      { label: 'Paid Invoices', count: counts.Paid, color: '#10b981' },
      { label: 'Partially Paid', count: counts['Partially Paid'], color: '#f59e0b' },
      { label: 'Unpaid / Pending', count: counts.Unpaid, color: '#ef4444' },
      { label: 'Drafts', count: counts.Draft, color: '#94a3b8' }
    ];

    container.innerHTML = items.map(item => {
      const pct = Math.round((item.count / total) * 100);
      return `
        <div class="dist-item">
          <div class="dist-header">
            <span>${item.label} (${item.count})</span>
            <span>${pct}%</span>
          </div>
          <div class="dist-bar-bg">
            <div class="dist-bar-fill" style="width: ${pct}%; background-color: ${item.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  };

  /**
   * Render Monthly Revenue Visual Bar Chart (last 6 months)
   */
  const renderMonthlyChart = (invoices, sym) => {
    const chartWrap = document.getElementById('dashboard-monthly-chart');
    if (!chartWrap) return;

    // Generate last 6 months buckets
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      months.push({ key, label, totalPaid: 0, totalInvoiced: 0 });
    }

    invoices.forEach(inv => {
      if (inv.issueDate) {
        const monthKey = inv.issueDate.substring(0, 7);
        const bucket = months.find(m => m.key === monthKey);
        if (bucket) {
          bucket.totalInvoiced += (parseFloat(inv.grandTotal) || 0);
          bucket.totalPaid += (parseFloat(inv.amountPaid) || 0);
        }
      }
    });

    const maxVal = Math.max(...months.map(m => Math.max(m.totalPaid, m.totalInvoiced)), 100);

    chartWrap.innerHTML = months.map(m => {
      const paidHeight = Math.max(10, Math.round((m.totalPaid / maxVal) * 150));
      return `
        <div class="chart-bar-group">
          <div class="chart-bar" style="height: ${paidHeight}px;" title="${m.label}: Collected ${formatMoney(m.totalPaid, sym)}">
            <span class="chart-tooltip">${formatMoney(m.totalPaid, sym)}</span>
          </div>
          <span class="chart-label">${m.label}</span>
        </div>
      `;
    }).join('');
  };

  /**
   * Render Recent 5 Invoices on Dashboard
   */
  const renderRecentInvoices = (invoices, sym) => {
    const tbody = document.getElementById('dashboard-recent-invoices');
    if (!tbody) return;

    // Sort by createdAt or issueDate desc
    const sorted = [...invoices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

    if (sorted.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2rem; color: #94a3b8;">
            No invoices yet. Click <strong>+ New Invoice</strong> to create your first one!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = sorted.map(inv => {
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

      return `
        <tr>
          <td><strong style="color: #4f46e5;">${inv.invoiceNumber}</strong></td>
          <td>
            <div style="font-weight: 600;">${escapeHTML(inv.customerName || 'Customer')}</div>
            <div style="font-size: 0.775rem; color: #64748b;">${escapeHTML(inv.customerCompany || '')}</div>
          </td>
          <td>${formatDate(inv.dueDate)}</td>
          <td><strong>${formatMoney(inv.grandTotal, sym)}</strong></td>
          <td><span class="badge ${badgeClass}">${statusText}</span></td>
          <td class="table-actions">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="Invoices.view('${inv.id}')" title="View & Print">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-whatsapp btn-sm btn-icon" onclick="PDFWhatsApp.openWhatsAppModal('${inv.id}')" title="Send WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="PDFWhatsApp.downloadPDF('${inv.id}')" title="Download PDF">
              <i class="fa-solid fa-file-pdf"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
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
    update
  };
})();
