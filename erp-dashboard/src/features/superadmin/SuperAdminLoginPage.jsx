import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import { setSession } from "../../store/authStore.js";
import { toast } from "../../store/toastStore.js";

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/superadmin/login", {
        email,
        password,
        rememberMe,
      });

      setSession(res.data);
      toast({
        title: "Super Admin signed in",
        type: "success",
      });
      navigate("/superadmin/dashboard");
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Invalid credentials",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Super Admin</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to manage companies.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
