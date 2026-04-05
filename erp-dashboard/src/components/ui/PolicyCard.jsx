import React, { useEffect, useState } from "react";
import api from "../../lib/api.js";

export default function PolicyCard() {
  const [policyData, setPolicyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await api.get("/policies");
        setPolicyData(res.data);
      } catch (err) {
        console.error("Error loading policies:", err);
        // Fallback to default policies if API not available yet
        setPolicyData([
          {
            category: "Operational Shift",
            standard: "09:30 AM – 06:30 PM",
            description: "Monday – Friday (Workweek)",
            status: "primary",
            icon: "🏢"
          },
          {
            category: "Punctuality",
            standard: "Elite Status (On-Time)",
            description: "✓ Green: Logged in by 09:30 AM",
            status: "success",
            icon: "⭐"
          },
          {
            category: "Grace Period",
            standard: "Short Hours / Late",
            description: "⚠ Light Orange: Logged after shift start OR left before shift end",
            status: "warning",
            icon: "⏰"
          },
          {
            category: "Half Day",
            standard: "First Half / Second Half",
            description: "◐ Indigo: Worked only one half (e.g., out by ~1 PM or in from ~2 PM)",
            status: "warning",
            icon: "◐"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  const getStatusStyles = (status) => {
    switch (status) {
      case "success":
        return "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800";
      case "warning":
        return "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-800";
      case "admin":
        return "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-800";
      default:
        return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-t-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-8 right-8 w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full"></div>
          <div className="absolute bottom-12 right-6 w-2 h-2 bg-white rounded-full"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">The "Premium Suite" Attendance Policy</h1>
                <p className="text-blue-200 text-lg">Corporate Punctuality Standards</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-center text-lg font-medium">
              Official Workplace Constitution • System Logic & Color Standards
            </p>
          </div>
        </div>
      </div>

      {/* Policy Cards */}
      <div className="bg-white rounded-b-3xl shadow-2xl border border-gray-100">
        <div className="p-8 space-y-6">
          {policyData.map((policy, index) => (
            <div
              key={index}
              className={`${getStatusStyles(policy.status)} rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl">{policy.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold">{policy.category}</h3>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          policy.status === 'success' ? 'bg-emerald-500' :
                          policy.status === 'warning' ? 'bg-orange-500' :
                          policy.status === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}></div>
                        <span className="text-sm font-medium opacity-75">
                          {policy.status === 'success' ? 'COMPLIANT' :
                           policy.status === 'warning' ? 'MONITORED' :
                           policy.status === 'admin' ? 'AUTHORITY' : 'STANDARD'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">{policy.standard}</p>
                      <p className="text-base opacity-80">{policy.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-3xl p-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Policy Enforcement Active</p>
                <p className="text-sm text-gray-600">Real-time monitoring & validation system</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-semibold text-gray-800">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}