import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { isAuthed } from "../../store/authStore.js";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const authed = isAuthed();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  if (authed) return <Navigate to="/" replace />;

  const validatePassword = (pwd) => {
    if (!pwd) return "";
    const hasCapital = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    if (!hasCapital) return "Missing capital letter";
    if (!hasNumber) return "Missing number";
    if (!hasSpecial) return "Missing special character";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    
    const pwdError = validatePassword(form.password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }
    
    setLoading(true);
    try {
      await api.post("/auth/signup", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast({
        title: "Registration successful",
        message: "Your account is ready. Please sign in.",
        type: "success",
      });
      window.location.href = "/auth/login";
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        toast({
          title: "Backend server not running",
          message: "Please start your backend server at http://localhost:5000",
          type: "error",
        });
      } else {
        toast({
          title: "Registration failed",
          message: err?.response?.data?.message || "Please verify your details",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle input changes clearly
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    if (name === "password") {
      setPasswordError(validatePassword(value));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-[#F6FAFD]">
      {/* Left Side - Abstract Wave Graphic */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-[#0A1931] via-[#1A3D63] to-[#4A7FA7] relative overflow-hidden">
        <div className="absolute inset-0">
          <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 400C240 300 480 500 720 400C960 300 1200 500 1440 400V800H0V400Z" fill="#1A3D63" fillOpacity="0.3"/>
            <path d="M0 500C240 400 480 600 720 500C960 400 1200 600 1440 500V800H0V500Z" fill="#4A7FA7" fillOpacity="0.2"/>
          </svg>
        </div>
        <div className="relative z-10 text-center px-12">
          <h1 className="text-5xl font-semibold text-white mb-4">Join Us Today</h1>
          <p className="text-xl text-[#B3CFE5]">Create your account and get started</p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fadeIn">
          <div className="mb-10">
            <h2 className="text-4xl font-semibold text-[#0A1931] mb-2">Create Account</h2>
            <p className="text-base text-[#4A7FA7]">Enter your details to get started</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <Input
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />

            <Input
              label="Work Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              autoComplete="email"
              required
            />

            <Input
              label="Phone Number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1..."
            />

            <div>
              <label className="block text-sm font-medium text-[#0A1931] mb-2">Password</label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`pr-10 ${passwordError ? "border-red-500 focus:border-red-500" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70757A] hover:text-[#0A1931] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError ? (
                <p className="text-xs text-red-600 mt-1 font-medium">{passwordError}</p>
              ) : (
                <p className="text-xs text-[#70757A] mt-1">Must contain 1 capital letter, 1 number, and 1 special character</p>
              )}
            </div>

            <Button 
              disabled={loading} 
              className="w-full h-12 text-base mt-6"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#B3CFE5] text-center">
            <p className="text-sm text-[#4A7FA7]">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-[#1A3D63] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}