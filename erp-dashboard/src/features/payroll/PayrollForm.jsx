import React, { useState, useEffect, useMemo } from "react";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { DollarSign } from "lucide-react";

export default function PayrollForm({
  initialData = null,
  employees = [],
  onSubmit,
  isSubmitting = false
}) {
  // Default form state - memoized to prevent recreation
  const defaultForm = useMemo(() => ({
    userId: "",
    month: `${new Date().getFullYear()}-01`,  // Format as YYYY-MM
    year: new Date().getFullYear(),
    basicSalary: 0,
    allowances: 0,
    bonus: 0,
    overtimePay: 0,
    netSalary: 0,
    paymentMethod: "Bank Transfer",
    customPaymentMethod: "",
    paymentStatus: "PENDING",
    paymentDate: "",
    notes: ""
  }), []);

  // Initialize form state
  const [form, setForm] = useState(() => {
    if (initialData) {
      const monthStr = initialData.month?.includes("-") ? initialData.month : `${initialData.year || new Date().getFullYear()}-${(initialData.month?.padStart ? initialData.month.padStart(2, "0") : "01")}`;
      return {
        ...defaultForm,
        userId: initialData.userId?._id || initialData.userId || "",
        month: monthStr,
        year: initialData.year || new Date().getFullYear(),
        basicSalary: initialData.basicSalary || 0,
        allowances: initialData.allowances || 0,
        bonus: initialData.bonus || 0,
        overtimePay: initialData.overtimePay || 0,
        netSalary: initialData.netSalary || 0,
        paymentMethod: initialData.paymentMethod || "Bank Transfer",
        customPaymentMethod: initialData.customPaymentMethod || "",
        paymentStatus: initialData.paymentStatus || "PENDING",
        paymentDate: initialData.paymentDate ? initialData.paymentDate.split("T")[0] : "",
        notes: initialData.notes || ""
      };
    }
    return defaultForm;
  });

  const [errors, setErrors] = useState({});

  // Re-initialize form with existing data when it changes
  useEffect(() => {
    if (initialData) {
      const monthStr = initialData.month?.includes("-") ? initialData.month : `${initialData.year || new Date().getFullYear()}-${(initialData.month?.padStart ? initialData.month.padStart(2, "0") : "01")}`;
      setForm({
        ...defaultForm,
        userId: initialData.userId?._id || initialData.userId || "",
        month: monthStr,
        year: initialData.year || new Date().getFullYear(),
        basicSalary: initialData.basicSalary || 0,
        allowances: initialData.allowances || 0,
        bonus: initialData.bonus || 0,
        overtimePay: initialData.overtimePay || 0,
        netSalary: initialData.netSalary || 0,
        paymentMethod: initialData.paymentMethod || "Bank Transfer",
        customPaymentMethod: initialData.customPaymentMethod || "",
        paymentStatus: initialData.paymentStatus || "PENDING",
        paymentDate: initialData.paymentDate ? initialData.paymentDate.split("T")[0] : "",
        notes: initialData.notes || ""
      });
    }
  }, [initialData, defaultForm]);

  // Strip leading zeros from numeric values
  const stripLeadingZeros = (value) => {
    if (typeof value !== "string") return value;
    return value.replace(/^0+(?=\d)/, "");
  };

  // Auto-calculate net salary when form values change
  useEffect(() => {
    const updateCalculations = () => {
      const earnings = parseFloat(form.basicSalary || 0) + parseFloat(form.allowances || 0) + 
                       parseFloat(form.bonus || 0) + parseFloat(form.overtimePay || 0);
      
      setForm(prev => {
        const newNetSalary = Math.max(0, earnings);
        // Only update if values actually changed
        if (prev.netSalary !== newNetSalary) {
          return { 
            ...prev, 
            netSalary: newNetSalary
          };
        }
        return prev;
      });
    };
    
    updateCalculations();
  }, [form.basicSalary, form.allowances, form.bonus, form.overtimePay]);

  const handleChange = (field, value) => {
    let processedValue = value;
    
    // Strip leading zeros for numeric fields
    if (["basicSalary", "allowances", "bonus", "overtimePay"].includes(field)) {
      processedValue = stripLeadingZeros(String(value));
      if (processedValue === "" || parseFloat(processedValue) === 0) {
        processedValue = "0";
      }
    }
    
    setForm(prev => ({
      ...prev,
      [field]: processedValue
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.userId) newErrors.userId = "Employee is required";
    if (!form.month) newErrors.month = "Month is required";
    if (!form.year) newErrors.year = "Year is required";
    if (form.basicSalary <= 0) newErrors.basicSalary = "Basic salary must be greater than 0";
    if (form.paymentMethod === "Other" && !form.customPaymentMethod) {
      newErrors.customPaymentMethod = "Please specify custom payment method";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const payloadData = {
      ...form,
      basicSalary: parseFloat(form.basicSalary),
      allowances: parseFloat(form.allowances),
      bonus: parseFloat(form.bonus),
      overtimePay: parseFloat(form.overtimePay),
      deductions: 0,  // Default to 0 as per backend requirements
      tax: 0,         // Default to 0 as per backend requirements
      netSalary: parseFloat(form.netSalary),
      year: parseInt(form.year),
      month: form.month.includes("-") ? form.month : `${form.year}-${form.month.padStart(2, "0")}`,
      paymentDate: form.paymentDate && form.paymentStatus === "PAID" ? form.paymentDate : undefined
    };

    // Remove null/undefined fields
    Object.keys(payloadData).forEach(key => 
      payloadData[key] === undefined && delete payloadData[key]
    );

    await onSubmit(payloadData);
  };

  const paymentMethods = [
    "Bank Transfer",
    "UPI",
    "Cash in Hand",
    "Cheque",
    "Wallet",
    "Other"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
      {/* Employee Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[#0A1931] mb-2">
            Employee <span className="text-red-500">*</span>
          </label>
          <select
            value={form.userId}
            onChange={(e) => handleChange("userId", e.target.value)}
            disabled={!!initialData}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333] ${
              errors.userId ? "border-red-500" : "border-[#B3CFE5]"
            }`}
          >
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeId || emp.email})
              </option>
            ))}
          </select>
          {errors.userId && <p className="mt-1 text-xs text-red-500">{errors.userId}</p>}
        </div>

        {/* Month and Year */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">
              Month <span className="text-red-500">*</span>
            </label>
            <select
              value={form.month}
              onChange={(e) => handleChange("month", `${form.year}-${e.target.value}`)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333] ${
                errors.month ? "border-red-500" : "border-[#B3CFE5]"
              }`}
            >
              <option value="">Month</option>
              {months.map(m => (
                <option key={m.value} value={`${form.year}-${m.value}`}>
                  {m.label}
                </option>
              ))}
            </select>
            {errors.month && <p className="mt-1 text-xs text-red-500">{errors.month}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">
              Year <span className="text-red-500">*</span>
            </label>
            <select
              value={form.year}
              onChange={(e) => {
                const newYear = parseInt(e.target.value);
                const monthPart = form.month?.split("-")[1] || "01";
                handleChange("year", newYear);
                handleChange("month", `${newYear}-${monthPart}`);
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333] ${
                errors.year ? "border-red-500" : "border-[#B3CFE5]"
              }`}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {errors.year && <p className="mt-1 text-xs text-red-500">{errors.year}</p>}
          </div>
        </div>
      </div>

      {/* Salary Components - Earnings Section */}
      <div className="bg-gradient-to-r from-[#E6F4EA] to-white p-4 rounded-lg border border-[#B3CFE5]">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-[#137333]" />
          <h3 className="font-bold text-[#137333] text-lg">Earnings</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-1">
              Basic Salary <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#70757A]">₹</span>
              <input
                type="number"
                value={form.basicSalary}
                onChange={(e) => handleChange("basicSalary", e.target.value)}
                className={`w-full pl-6 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333] ${
                  errors.basicSalary ? "border-red-500" : "border-[#B3CFE5]"
                }`}
                placeholder="0"
                step="100"
              />
            </div>
            {errors.basicSalary && <p className="mt-1 text-xs text-red-500">{errors.basicSalary}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-1">
              Allowances (HRA, DA, etc.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#70757A]">₹</span>
              <input
                type="number"
                value={form.allowances}
                onChange={(e) => handleChange("allowances", e.target.value)}
                className="w-full pl-6 pr-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333]"
                placeholder="0"
                step="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-1">
              Bonus
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#70757A]">₹</span>
              <input
                type="number"
                value={form.bonus}
                onChange={(e) => handleChange("bonus", e.target.value)}
                className="w-full pl-6 pr-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333]"
                placeholder="0"
                step="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-1">
              Overtime Pay
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#70757A]">₹</span>
              <input
                type="number"
                value={form.overtimePay}
                onChange={(e) => handleChange("overtimePay", e.target.value)}
                className="w-full pl-6 pr-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333]"
                placeholder="0"
                step="100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Net Salary Display */}
      <div className="bg-[#137333] text-white p-4 rounded-lg flex justify-between items-center">
        <span className="text-lg font-semibold">Net Salary</span>
        <span className="text-3xl font-bold">
          ₹{parseFloat(form.netSalary).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Payment Details */}
      <div className="bg-gray-50 p-4 rounded-lg border border-[#B3CFE5]">
        <h3 className="font-bold text-[#0A1931] mb-4">Payment Details</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">
              Payment Method
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) => handleChange("paymentMethod", e.target.value)}
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333]"
            >
              {paymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            {errors.customPaymentMethod && <p className="mt-1 text-xs text-red-500">{errors.customPaymentMethod}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">
              Payment Status
            </label>
            <select
              value={form.paymentStatus}
              onChange={(e) => handleChange("paymentStatus", e.target.value)}
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333]"
            >
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Custom Payment Method */}
        {form.paymentMethod === "Other" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#0A1931] mb-2">
              Specify Payment Method <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.customPaymentMethod}
              onChange={(e) => handleChange("customPaymentMethod", e.target.value)}
              placeholder="e.g., Cryptocurrency, Stock Options, etc."
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333] ${
                errors.customPaymentMethod ? "border-red-500" : "border-[#B3CFE5]"
              }`}
            />
          </div>
        )}

        {/* Payment Date */}
        {form.paymentStatus === "PAID" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#0A1931] mb-2">
              Payment Date
            </label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => handleChange("paymentDate", e.target.value)}
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333]"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#0A1931] mb-2">
          Notes / Remarks
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Add any additional notes or remarks..."
          rows="3"
          className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137333] resize-none"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#B3CFE5]">
        <Button
          type="button"
          onClick={() => setForm(defaultForm)}
          variant="ghost"
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button
          type="submit"
          className="bg-[#137333] hover:bg-[#0d5628] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : initialData ? "Update Payroll" : "Create Payroll"}
        </Button>
      </div>
    </form>
  );
}
