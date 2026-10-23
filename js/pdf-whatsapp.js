/**
 * InvoicePro - PDF Generation & WhatsApp Integration Engine
 */

const PDFWhatsApp = (() => {

  // Helper to format currency
  const formatMoney = (amount, symbol = '$') => {
    const num = parseFloat(amount) || 0;
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to format date
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
   * Render the invoice template into the printable container
   */
  const renderPrintableInvoice = (invoiceId) => {
    const invoice = DB.getInvoice(invoiceId);
    const business = DB.getBusiness();
    const target = document.getElementById('printable-invoice');

    if (!invoice || !target) return null;

    const sym = business.currencySymbol || '$';
    const isOverdue = invoice.status !== 'Paid' && new Date(invoice.dueDate) < new Date();
    const displayStatus = isOverdue ? 'Overdue' : (invoice.status || 'Unpaid');

    let statusStampClass = 'stamp-unpaid';
    if (displayStatus === 'Paid') statusStampClass = 'stamp-paid';
    if (displayStatus === 'Partially Paid') statusStampClass = 'stamp-partial';

    // Build line items rows
    const itemsHtml = (invoice.items || []).map((item, index) => {
      return `
        <tr>
          <td style="width: 5%; color: #94a3b8; font-weight: 600;">${index + 1}</td>
          <td style="width: 45%;">
            <div class="item-title">${escapeHTML(item.name || 'Item')}</div>
            ${item.description ? `<div class="item-desc">${escapeHTML(item.description)}</div>` : ''}
          </td>
          <td class="text-center" style="width: 12%;">${item.quantity || 1}</td>
          <td class="text-right" style="width: 18%;">${formatMoney(item.unitPrice, sym)}</td>
          <td class="text-right" style="width: 20%; font-weight: 700;">${formatMoney(item.subtotal, sym)}</td>
        </tr>
      `;
    }).join('');

    // Bank Details HTML
    const bank = business.bankDetails || {};
    const bankHtml = (bank.bankName || bank.accountNumber) ? `
      <div class="bank-info-box">
        <strong style="display: block; margin-bottom: 4px; color: #0f172a;">Bank & Wire Transfer Details</strong>
        ${bank.bankName ? `<div><strong>Bank:</strong> ${escapeHTML(bank.bankName)}</div>` : ''}
        ${bank.accountTitle ? `<div><strong>Title:</strong> ${escapeHTML(bank.accountTitle)}</div>` : ''}
        ${bank.accountNumber ? `<div><strong>Account / IBAN:</strong> ${escapeHTML(bank.accountNumber)}</div>` : ''}
        ${bank.routingOrSwift ? `<div><strong>SWIFT / Routing:</strong> ${escapeHTML(bank.routingOrSwift)}</div>` : ''}
        ${bank.notes ? `<div style="margin-top: 4px; font-style: italic; color: #64748b;">${escapeHTML(bank.notes)}</div>` : ''}
      </div>
    ` : '';

    const logoHtml = business.logo 
      ? `<img src="${business.logo}" alt="Logo" class="invoice-print-logo" />` 
      : `<div style="font-size: 28px; font-weight: 900; color: #4f46e5; letter-spacing: -0.03em;">${escapeHTML(business.name || 'InvoicePro')}</div>`;

    target.innerHTML = `
      <div class="invoice-print-header">
        <div class="invoice-brand-info">
          ${logoHtml}
          <div class="invoice-company-details">
            ${business.logo ? `<h1>${escapeHTML(business.name || '')}</h1>` : ''}
            ${business.tagline ? `<p style="font-style: italic; margin-bottom: 4px;">${escapeHTML(business.tagline)}</p>` : ''}
            ${business.address ? `<p>${escapeHTML(business.address)}</p>` : ''}
            ${business.email || business.phone ? `<p>${escapeHTML(business.email || '')} ${business.phone ? '• ' + escapeHTML(business.phone) : ''}</p>` : ''}
            ${business.taxId ? `<p><strong>Tax ID:</strong> ${escapeHTML(business.taxId)}</p>` : ''}
          </div>
        </div>

        <div class="invoice-meta-info">
          <div class="invoice-heading">INVOICE</div>
          <table>
            <tr>
              <td>Invoice #:</td>
              <td>${escapeHTML(invoice.invoiceNumber || 'INV-0000')}</td>
            </tr>
            <tr>
              <td>Issue Date:</td>
              <td>${formatDate(invoice.issueDate)}</td>
            </tr>
            <tr>
              <td>Due Date:</td>
              <td>${formatDate(invoice.dueDate)}</td>
            </tr>
            <tr>
              <td>Status:</td>
              <td><span class="invoice-status-stamp ${statusStampClass}">${displayStatus}</span></td>
            </tr>
          </table>
        </div>
      </div>

      <div class="invoice-billing-grid">
        <div class="billing-block">
          <h4>Billed To</h4>
          <div class="client-name">${escapeHTML(invoice.customerName || 'Valued Customer')}</div>
          ${invoice.customerCompany ? `<p><strong>${escapeHTML(invoice.customerCompany)}</strong></p>` : ''}
          ${invoice.customerAddress ? `<p>${escapeHTML(invoice.customerAddress)}</p>` : ''}
          ${invoice.customerEmail ? `<p>${escapeHTML(invoice.customerEmail)}</p>` : ''}
          ${invoice.customerPhone ? `<p>${escapeHTML(invoice.customerPhone)}</p>` : ''}
        </div>
        <div class="billing-block" style="text-align: right;">
          <h4>Payment Summary</h4>
          <p><strong>Grand Total:</strong> ${formatMoney(invoice.grandTotal, sym)}</p>
          <p><strong>Amount Paid:</strong> ${formatMoney(invoice.amountPaid || 0, sym)}</p>
          <p style="font-size: 15px; font-weight: 800; color: #b91c1c;">
            <strong>Balance Due:</strong> ${formatMoney(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.grandTotal, sym)}
          </p>
        </div>
      </div>

      <table class="print-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="invoice-footer-grid">
        <div class="invoice-notes-terms">
          ${invoice.notes ? `
            <div style="margin-bottom: 16px;">
              <h4>Notes & Instructions</h4>
              <p>${escapeHTML(invoice.notes)}</p>
            </div>
          ` : ''}

          ${invoice.terms ? `
            <div style="margin-bottom: 16px;">
              <h4>Terms & Conditions</h4>
              <p>${escapeHTML(invoice.terms)}</p>
            </div>
          ` : ''}

          ${bankHtml}
        </div>

        <div>
          <table class="invoice-summary-table">
            <tr>
              <td>Subtotal</td>
              <td>${formatMoney(invoice.subtotal, sym)}</td>
            </tr>
            ${(parseFloat(invoice.discountAmount) > 0) ? `
              <tr>
                <td>Discount ${invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}</td>
                <td>-${formatMoney(invoice.discountAmount, sym)}</td>
              </tr>
            ` : ''}
            ${(parseFloat(invoice.taxTotal) > 0) ? `
              <tr>
                <td>Tax Total</td>
                <td>${formatMoney(invoice.taxTotal, sym)}</td>
              </tr>
            ` : ''}
            ${(parseFloat(invoice.shippingFee) > 0) ? `
              <tr>
                <td>Shipping / Extra</td>
                <td>${formatMoney(invoice.shippingFee, sym)}</td>
              </tr>
            ` : ''}
            <tr class="grand-total-row">
              <td>Total Due</td>
              <td>${formatMoney(invoice.grandTotal, sym)}</td>
            </tr>
            ${(parseFloat(invoice.amountPaid) > 0) ? `
              <tr>
                <td>Amount Paid</td>
                <td style="color: #10b981;">-${formatMoney(invoice.amountPaid, sym)}</td>
              </tr>
            ` : ''}
            <tr class="balance-due-row">
              <td>Remaining Balance</td>
              <td>${formatMoney(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.grandTotal, sym)}</td>
            </tr>
          </table>
        </div>
      </div>
    `;

    // Also populate dedicated #print-section so print preview and window.print() render cleanly
    const printSection = document.getElementById('print-section');
    if (printSection) {
      printSection.innerHTML = target.innerHTML;
    }

    return invoice;
  };

  /**
   * Client-side PDF Generation with html2pdf.js
   */
  const downloadPDF = async (invoiceId) => {
    const invoice = renderPrintableInvoice(invoiceId);
    if (!invoice) {
      App.showToast('Invoice not found', 'error');
      return;
    }

    const element = document.getElementById('printable-invoice');
    const safeCustomer = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${invoice.invoiceNumber || 'Invoice'}_${safeCustomer}.pdf`;

    App.showToast('Generating high-resolution PDF...', 'info');

    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      if (window.html2pdf) {
        await html2pdf().set(opt).from(element).save();
        App.showToast('PDF downloaded successfully!', 'success');
      } else {
        // Fallback to window.print if library not loaded
        window.print();
      }
    } catch (err) {
      console.error('PDF generation error', err);
      App.showToast('Could not compile PDF. Triggering print dialog instead.', 'warning');
      window.print();
    }
  };

  /**
   * Direct Print Trigger
   */
  const printInvoice = (invoiceId) => {
    renderPrintableInvoice(invoiceId);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  /**
   * Generate formatted WhatsApp text message
   */
  const generateWhatsAppMessage = (invoice, business) => {
    const sym = business.currencySymbol || '$';
    const isOverdue = invoice.status !== 'Paid' && new Date(invoice.dueDate) < new Date();
    const statusText = isOverdue ? '⚠️ Overdue' : (invoice.status || 'Unpaid');
    const balance = invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.grandTotal;

    const bank = business.bankDetails || {};
    let paymentInstructions = '';
    if (bank.bankName || bank.accountNumber) {
      paymentInstructions = `
💳 *Payment Details:*
• Bank: ${bank.bankName || 'Bank'}
• Account: ${bank.accountNumber || ''}
• Title: ${bank.accountTitle || business.name || ''}
${bank.routingOrSwift ? `• SWIFT/Routing: ${bank.routingOrSwift}` : ''}`;
    }

    return `Hello *${invoice.customerName || 'Valued Customer'}*,

Here is your invoice *${invoice.invoiceNumber || ''}* from *${business.name || 'Our Company'}*.

📄 *Invoice Details:*
• Invoice #: ${invoice.invoiceNumber || ''}
• Issue Date: ${formatDate(invoice.issueDate)}
• Due Date: ${formatDate(invoice.dueDate)}
• Total Amount: ${formatMoney(invoice.grandTotal, sym)}
• Amount Paid: ${formatMoney(invoice.amountPaid || 0, sym)}
• *Balance Due: ${formatMoney(balance, sym)}*
• Status: ${statusText}
${paymentInstructions}

${invoice.notes ? `📝 *Note:* ${invoice.notes}\n` : ''}
Thank you for your business! If you have any questions, feel free to reply directly here.`;
  };

  /**
   * Open the WhatsApp Share Modal
   */
  const openWhatsAppModal = (invoiceId) => {
    const invoice = DB.getInvoice(invoiceId);
    const business = DB.getBusiness();
    if (!invoice) {
      App.showToast('Invoice not found', 'error');
      return;
    }

    // Prepare printable template in the background
    renderPrintableInvoice(invoiceId);

    // Format phone: strip spaces, dashes, parentheses
    let rawPhone = invoice.customerPhone || '';
    let cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const message = generateWhatsAppMessage(invoice, business);

    // Populate modal fields
    const modal = document.getElementById('modal-whatsapp-share');
    const phoneInput = document.getElementById('whatsapp-phone-input');
    const msgInput = document.getElementById('whatsapp-message-input');
    const previewBox = document.getElementById('whatsapp-preview-content');

    if (phoneInput) phoneInput.value = cleanPhone;
    if (msgInput) msgInput.value = message;
    if (previewBox) previewBox.textContent = message;

    // Set invoiceId on the send button
    const sendBtn = document.getElementById('btn-send-whatsapp-direct');
    if (sendBtn) {
      sendBtn.dataset.invoiceId = invoiceId;
    }

    App.openModal('modal-whatsapp-share');
  };

  /**
   * Send WhatsApp Message via Direct wa.me URI
   */
  const triggerWhatsAppSend = () => {
    const phoneInput = document.getElementById('whatsapp-phone-input');
    const msgInput = document.getElementById('whatsapp-message-input');
    
    let phone = phoneInput ? phoneInput.value.trim().replace(/[^0-9]/g, '') : '';
    const message = msgInput ? msgInput.value.trim() : '';

    if (!message) {
      App.showToast('Message cannot be empty', 'warning');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    let waUrl = '';

    if (phone && phone.length >= 7) {
      waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    } else {
      // If no valid phone number is supplied, open WhatsApp contact picker with pre-filled message
      waUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    }

    window.open(waUrl, '_blank');
    App.closeModal('modal-whatsapp-share');
    App.showToast('Opening WhatsApp...', 'success');
  };

  /**
   * Share via Native Web Share API if supported
   */
  const triggerWebShare = async (invoiceId) => {
    const invoice = DB.getInvoice(invoiceId);
    const business = DB.getBusiness();
    if (!invoice) return;

    const message = generateWhatsAppMessage(invoice, business);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber} - ${business.name}`,
          text: message
        });
        App.showToast('Shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error', err);
        }
      }
    } else {
      App.showToast('Native share not supported on this device. Use Direct WhatsApp link.', 'info');
    }
  };

  // Helper escape
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
    renderPrintableInvoice,
    downloadPDF,
    printInvoice,
    openWhatsAppModal,
    triggerWhatsAppSend,
    triggerWebShare,
    generateWhatsAppMessage
  };
})();
