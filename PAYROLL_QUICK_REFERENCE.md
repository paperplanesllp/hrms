# 🚀 Payroll Management - Quick Reference

## 📦 Installation

```bash
# Install PDF libraries
npm install jspdf jspdf-autotable
```

## 🔗 URLs

| Page | URL |
|------|-----|
| **Payroll Management** | `http://localhost:5174/payroll/manage` |
| **Employee Payroll** | `http://localhost:5174/payroll` |
| **API Base** | `http://localhost:5000/api/payroll` |

---

## 🎯 API Endpoints

### Payroll CRUD Operations

```javascript
// Get all payroll (HR/Admin)
GET /api/payroll

// Get with filters
GET /api/payroll?month=2026-03&year=2026&paymentStatus=PENDING

// Get statistics
GET /api/payroll/stats/dashboard?year=2026&month=2026-03

// Get single payroll
GET /api/payroll/:id

// Get specific employee payroll
GET /api/payroll/employee/record?employeeId=xxx&month=2026-03&year=2026

// Create/Update payroll (HR/Admin)
PUT /api/payroll
{
  userId: "user_id",
  month: "2026-03",
  year: 2026,
  basicSalary: 50000,
  allowances: 10000,
  bonus: 5000,
  overtimePay: 2000,
  deductions: 3000,
  tax: 2000,
  paymentMethod: "Bank Transfer",
  customPaymentMethod: "", // if payment method is "Other"
  paymentStatus: "PENDING",
  notes: ""
}

// Update payment status
PATCH /api/payroll/:id/payment-status
{
  paymentStatus: "PAID",
  paymentDate: "2026-03-15",
  paymentMethod: "Bank Transfer",
  customPaymentMethod: ""
}

// Delete payroll
DELETE /api/payroll/:id
```

---

## 🧮 Salary Calculation

### Auto-Calculation Formula

```
Net Salary = (Basic + Allowances + Bonus + Overtime) - (Deductions + Tax)
```

### Example

```javascript
const basicSalary = 50000;
const allowances = 10000;     // HRA, DA, etc.
const bonus = 5000;
const overtimePay = 2000;
const deductions = 3000;       // PF, Insurance
const tax = 2000;              // TDS

const earnings = basicSalary + allowances + bonus + overtimePay;  // 67,000
const totalDeductions = deductions + tax;                          // 5,000
const netSalary = earnings - totalDeductions;                      // 62,000
```

---

## 💾 Database Schema

### Payroll Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                    // ref: User
  month: "2026-03",                    // YYYY-MM format
  year: 2026,
  
  // Earnings
  basicSalary: 50000,
  allowances: 10000,
  bonus: 5000,
  overtimePay: 2000,
  
  // Deductions
  deductions: 3000,
  tax: 2000,
  netSalary: 62000,                    // Auto-calculated
  
  // Payment
  paymentMethod: "Bank Transfer",      // Dropdown value
  customPaymentMethod: "",             // If "Other"
  paymentStatus: "PENDING",            // PENDING, PAID, CANCELLED
  paymentDate: null,                   // Set when marked paid
  
  // Metadata
  notes: "",
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  autoDeleteOn: null                   // 7 days after payment
}
```

### Indexes

```javascript
// Unique constraint: one payroll per employee per month/year
{ userId: 1, month: 1, year: 1 } // unique: true

// For efficient filtering
{ paymentStatus: 1, year: 1, month: 1 }
{ createdAt: -1 }
```

---

## 🔤 Payment Method Options

```javascript
const paymentMethods = [
  "Bank Transfer",      // Default, direct to bank
  "UPI",               // Unified Payments Interface
  "Cash in Hand",      // Physical cash
  "Cheque",            // Paper cheque
  "Wallet",            // Digital wallet
  "Other"              // Custom (requires customPaymentMethod)
];
```

### Using "Other" Payment Method

```javascript
{
  paymentMethod: "Other",
  customPaymentMethod: "Cryptocurrency",
  // or
  customPaymentMethod: "Stock Options"
}
```

---

## 🎨 Status Badges

### Colors in UI

```javascript
const statusColors = {
  "PENDING": "orange-50 border-orange-400 text-orange-600",
  "PAID": "green-50 border-green-500 text-green-700",
  "CANCELLED": "red-50 border-red-500 text-red-700"
};
```

---

## 📑 Component Usage

### PayrollForm Component

```jsx
import PayrollForm from '@/features/payroll/PayrollForm.jsx';

<PayrollForm
  initialData={null}           // null for create, payroll object for edit
  employees={employeesList}    // Array of employee objects
  onSubmit={handleSubmit}      // Function to call on form submit
  isSubmitting={false}         // Loading state
/>
```

### PDF Generation

```jsx
import { generatePayslipPDF, generateMonthlyPayrollReportPDF } from '@/lib/payrollPdfGenerator';

// Generate individual payslip
generatePayslipPDF(payrollData, "Company Name");

// Generate monthly report
generateMonthlyPayrollReportPDF(payrollsArray, "2026-03", 2026, "Company Name");
```

---

## 🔍 Common Queries

### Find all pending payroll for March 2026

```javascript
// Frontend
GET /api/payroll?month=2026-03&paymentStatus=PENDING

// Backend
db.payrolls.find({
  month: "2026-03",
  paymentStatus: "PENDING"
});
```

### Find all payroll for specific employee

```javascript
// Frontend
GET /api/payroll/employee/record?employeeId=...&month=2026-03&year=2026

// Backend
db.payrolls.findOne({
  userId: ObjectId("..."),
  month: "2026-03",
  year: 2026
});
```

### Find all paid payroll older than 7 days

```javascript
// For auto-delete
db.payrolls.find({
  paymentStatus: "PAID",
  autoDeleteOn: { $lte: new Date() }
});
```

---

## 🧪 Test Data

### Create Test Payroll

```javascript
const testPayroll = {
  userId: "65a1b2c3d4e5f6g7h8i9j0k1",  // Replace with real employee ID
  month: "2026-03",
  year: 2026,
  basicSalary: 50000,
  allowances: 10000,
  bonus: 5000,
  overtimePay: 2000,
  deductions: 3000,
  tax: 2000,
  paymentMethod: "Bank Transfer",
  paymentStatus: "PENDING",
  notes: "Test payroll record"
};

// POST to /api/payroll
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| jsPDF not found | `npm install jspdf jspdf-autotable` |
| 404 on /payroll/stats | Restart backend server |
| Form won't submit | Check all required fields |
| PDF is blank | Clear browser cache, reinstall jsPDF |
| Can't edit payroll | Check user role (HR/Admin only) |
| Filter not working | Ensure filters are in correct format |

---

## 👥 Access Control

```javascript
// Who can access what:

// Regular Employee (USER)
- Can view: /api/payroll/my (own payroll only)
- Cannot: Create, edit, delete

// HR
- Can view: All employees (except Admin)
- Can create/edit/delete: Payroll for non-admin employees
- Cannot: Edit admin payroll

// Admin
- Can view: All employees including other admins
- Can create/edit/delete: All payroll records
- Full unrestricted access
```

---

## 📊 Formula Reference

### Salary Slip Calculations

```
EARNINGS
--------
Basic Salary              ₹X
+ Allowances             ₹Y
+ Bonus                  ₹Z
+ Overtime Pay           ₹W
─────────────────────────────
Total Earnings           ₹(X+Y+Z+W)

DEDUCTIONS
──────────
- Deductions (PF, Ins)   ₹A
- Tax (TDS, IT)          ₹B
─────────────────────────────
Total Deductions         ₹(A+B)

NET SALARY
──────────
Total Earnings - Total Deductions = NET SALARY ✓
```

---

## 📅 Month Format

Always use YYYY-MM format:

```
2026-01  (January 2026)
2026-02  (February 2026)
2026-03  (March 2026)
...
2026-12  (December 2026)
```

---

## 🔐 Authentication

All payroll endpoints require:

```javascript
// Header
Authorization: Bearer {JWT_TOKEN}

// Token obtained after login
// Stored in localStorage under 'erp_auth'
```

---

## 📱 Responsive Breakpoints

| Screen | Cols | Visible |
|--------|------|---------|
| 📱 Mobile | 1 | Name, Salary, Status |
| 📱 Smaller Tablet | 2 | + ID, Month |
| 📱 Tablet | 3 | + Basic, Deductions |
| 🖥️ Desktop | 10 | All columns + actions |

---

## 🎯 File Locations

```
erp-project/
├── server/
│   └── src/modules/payroll/
│       ├── Payroll.model.js          (Schema)
│       ├── payroll.schemas.js        (Validation)
│       ├── payroll.controller.js     (API Handlers)
│       ├── payroll.service.js        (Business Logic)
│       └── payroll.routes.js         (Routes)
│
└── erp-dashboard/
    └── src/
        ├── features/payroll/
        │   ├── PayrollManagePage.jsx (Main Page)
        │   └── PayrollForm.jsx       (Form Component)
        └── lib/
            └── payrollPdfGenerator.js (PDF Utility)
```

---

## ⚡ Performance Tips

1. **Use filters** before downloading - reduces data
2. **Month filter** before year filter - more specific
3. **Search last** - after other filters load
4. **Batch operations** - mark multiple as paid together
5. **Archive old records** - auto-delete after 7 days
6. **Use indexes** - MongoDB has indexes on common fields

---

## 📝 Notes

- All dates in ISO format (YYYY-MM-DD)
- All amounts in Indian Rupees (₹) by default
- All calculations rounded to nearest rupee
- One payroll per employee per month (unique constraint)
- Auto-delete happens 7 days after payment status = PAID

---

**Last Updated**: March 18, 2026
**Version**: 2.0

For detailed documentation, see `PAYROLL_MANAGEMENT_GUIDE.md`
