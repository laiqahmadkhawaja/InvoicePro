# InvoicePro - Invoicing & Revenue Management Web Application

A modern, responsive Invoicing Web Application built purely in **HTML5, CSS3, and Vanilla JavaScript (ES6+)**, powered by **Firebase Realtime Database** with high-speed local caching.

---

## 🌟 Key Features

### 1. 📊 Executive Revenue Dashboard
- **Financial KPIs**: Total Revenue (Collected), Outstanding Receivables (Unpaid), Partially Paid Balances, and Total Cumulative Invoiced volume.
- **Overdue Detection**: Automatically highlights overdue invoices with alerts.
- **Visual Analytics**: Interactive 6-month revenue trend chart and status breakdown distribution.
- **Recent Invoices**: Quick access table with direct View, WhatsApp, and PDF actions.

### 2. 🧾 Invoice Management (CRUD & Lifecycle)
- **Create & Edit Invoices**:
  - Auto-generated sequence numbering (e.g., `INV-1001`, `INV-1002`).
  - Customer selection with auto-fill and "+ Quick Add Customer" modal.
  - Dynamic Line Items table: Add, edit, or remove rows with auto-calculated subtotals.
  - Product Catalog picker that auto-fills unit price and tax rate.
  - Flexible Discounts (Percentage `%` or Fixed amount `$`).
  - Shipping and extra fees calculation.
- **Statuses**: `Draft`, `Unpaid`, `Partially Paid`, `Paid`, and `Overdue`.
- **Partial Payment Recording**: Add one or multiple payments to any invoice with date, payment method, and reference notes. The status transitions dynamically based on remaining balance.

### 3. 👥 Customer Management
- Full Customer Directory (Name, Company, Email, Phone/WhatsApp, Address, Tax ID).
- Aggregated financial metrics per customer: **Total Invoiced**, **Total Paid**, and **Outstanding Balance**.
- One-click WhatsApp direct chat button for every client.

### 4. 📦 Products & Services Catalog
- Manage inventory and service rates (Name, SKU, Unit, Unit Price, Default Tax %).
- One-click insertion into the invoice builder.

### 5. 📄 Client-Side PDF Generation & 💬 Direct WhatsApp Integration
- **High-Resolution A4 PDF**: Clean printable invoice template rendered and exported via `html2pdf.js`.
- **Direct WhatsApp Messaging**:
  - 1-click "Send to WhatsApp" button on every invoice.
  - Auto-formats message with invoice number, amount, balance due, due date, and wire transfer bank details.
  - Opens WhatsApp Web or WhatsApp Mobile App with pre-filled text.
  - Web Share API support for native mobile sharing.

### 6. 🏢 Business Profile & Bank Details
- Custom company logo upload (with instant image preview).
- Business Name, Tagline, Email, Phone, Address, Tax ID / VAT / GST.
- Currency customization (`$`, `€`, `£`, `Rs`, `₹`, etc.).
- Bank details for wire transfer (Bank Name, Account Title, Account Number/IBAN, SWIFT/IFSC, payment instructions).
- Full JSON Data Backup (Export) & Restore (Import).

### 7. 🔥 Firebase Realtime Database Cloud Sync
- Built with Firebase Realtime Database SDK (v10 compat CDN).
- Live two-way synchronization across multiple tabs and devices.
- Built-in connection tester and settings modal.
- **Offline / LocalStorage Fallback**: Works immediately out-of-the-box even before entering Firebase credentials!

---

## 🚀 How to Run the App

### Option 1: Direct Browser Launch
Simply double-click [`index.html`](file:///C:/Users/Laiq%20Ahmad%20Khawaja/Desktop/Desktop/InvoicePro/index.html) or right-click $\rightarrow$ **Open with Chrome / Edge / Firefox**.

### Option 2: Local HTTP Server (Recommended)
You can serve the directory using Python or Node:

```bash
# Using Python
python -m http.server 8080

# Or using npx serve
npx serve .
```
Then visit `http://localhost:8080` in your browser.

---

## ☁️ Connecting Your Firebase Realtime Database

1. Open **InvoicePro** in your browser.
2. Click the **Firebase** button in the top navigation bar or the status card at the bottom of the sidebar.
3. Paste your Firebase project credentials:
   - **Database URL**: `https://<your-project-id>-default-rtdb.firebaseio.com`
   - **API Key**: `AIzaSy...`
   - **Project ID**: `your-project-id`
4. Click **Test Connection** to verify your setup, then click **Save & Connect**.
5. The status badge will turn green (**Firebase Cloud: Realtime Sync Active**) and automatically sync data across all connected devices!
