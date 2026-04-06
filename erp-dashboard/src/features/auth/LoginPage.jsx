import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import { isAuthed, setSession } from "../../store/authStore.js";
import { toast } from "../../store/toastStore.js";

// Video Import
import videoBg from "../../../../assets/Videos/video.mp4";

export default function LoginPage() {
  const authed = isAuthed();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  if (authed) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      setSession(res.data);

      toast({
        title: `Welcome back, ${res.data?.user?.name || "User"}!`,
        type: "success",
      });

      navigate("/");
    } catch (err) {
      if (err.code === "ERR_NETWORK" || err.message.includes("Network Error")) {
        toast({
          title: "Backend server not running",
          message: "Please start your backend server at http://localhost:5000",
          type: "error",
        });
      } else {
        toast({
          title: err?.response?.data?.message || "Invalid credentials",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      await api.post("/auth/forgot-password", { email: resetEmail });
      toast({
        title: "Reset link sent",
        message: "Check your email for password reset instructions",
        type: "success",
      });
      setShowForgot(false);
      setResetEmail("");
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to send reset email",
        type: "error",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 dark:bg-[#061014]">
      {/* Background blobs */}
      <div className="absolute rounded-full pointer-events-none -top-20 -left-20 h-72 w-72 bg-cyan-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 rounded-full pointer-events-none h-96 w-96 bg-emerald-500/10 blur-3xl" />

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Side - Premium Video Section */}
        <div className="relative hidden overflow-hidden lg:flex">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 object-cover w-full h-full"
          >
            <source src={videoBg} type="video/mp4" />
          </video>

          {/* Premium layered overlay */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#001f24]/80 via-[#00363c]/55 to-[#021014]/85" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,255,200,0.12),transparent_30%)]" />

          {/* Decorative glass card */}
          <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
            <div>
              
            </div>

            <div className="max-w-xl">
              <h1 className="mb-5 text-5xl font-bold leading-tight tracking-tight text-white xl:text-6xl">
                Step into to your digital workspace
              </h1>
              <p className="max-w-lg text-lg leading-8 text-white/75">
                Access your dashboard, manage operations, and continue your work
                with a clean and secure sign-in experience.
              </p>

              <div className="grid grid-cols-3 gap-4 mt-10">
                <div className="p-4 border rounded-2xl border-white/15 bg-white/10 backdrop-blur-md">
                  <p className="text-2xl font-semibold text-white">24/7</p>
                  <p className="mt-1 text-sm text-white/65">Secure access</p>
                </div>
                <div className="p-4 border rounded-2xl border-white/15 bg-white/10 backdrop-blur-md">
                  <p className="text-2xl font-semibold text-white">Fast</p>
                  <p className="mt-1 text-sm text-white/65">Reliable login</p>
                </div>
                <div className="p-4 border rounded-2xl border-white/15 bg-white/10 backdrop-blur-md">
                  <p className="text-2xl font-semibold text-white">Smart</p>
                  <p className="mt-1 text-sm text-white/65">User management</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            {/* Mobile top header */}
            <div className="mb-8 lg:hidden">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                Secure Workspace Portal
              </div>
            </div>

            {/* Glass card */}
            <div className="rounded-3xl border border-white/40 bg-white/75 p-7 shadow-[0_20px_80px_rgba(15,23,42,0.15)] backdrop-blur-2xl sm:p-8 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <div className="mb-8">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Sign In
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Enter your credentials to continue to your account dashboard.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    required
                  />

                  <div>
                    <Input
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-sm font-medium transition text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                      >
                        {showPassword ? "Hide password" : "Show password"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-sm font-medium transition text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-base font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:scale-[1.01] hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99]"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="pt-5 mt-6 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs leading-5 text-center text-slate-500 dark:text-slate-400">
                  Protected access for authorized users only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0b1418] sm:p-7">
            <div className="absolute rounded-full -right-10 -top-10 h-28 w-28 bg-emerald-500/10 blur-2xl" />
            <div className="absolute bottom-0 w-24 h-24 rounded-full -left-8 bg-cyan-500/10 blur-2xl" />

            <div className="relative">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Reset Password
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enter your registered email and we’ll send you a password reset
                link.
              </p>

              <form onSubmit={handleForgotPassword} className="mt-6 space-y-5">
                <Input
                  label="Email Address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowForgot(false);
                      setResetEmail("");
                    }}
                    className="flex-1 border rounded-xl border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Cancel
                  </Button>

                  <Button
                    disabled={resetLoading}
                    className="flex-1 text-white rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600"
                  >
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
