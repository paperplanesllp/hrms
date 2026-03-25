import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api.js";
import Input from "../../components/ui/Input.jsx";
import { toast } from "../../store/toastStore.js";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({ title: "Invalid reset link", type: "error" });
      navigate("/login");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", type: "error" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", type: "error" });
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      toast({ title: "Password must contain uppercase, lowercase, number and special character", type: "error" });
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", { token, password });
      toast({
        title: "Password reset successful",
        message: "You can now login with your new password",
        type: "success",
      });
      navigate("/login");
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to reset password",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#F6FAFD] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-[#0A1931] mb-2">Reset Password</h2>
          <p className="text-[#4A7FA7]">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, uppercase, lowercase, number, special"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button disabled={loading} className="w-full h-12">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#4A7FA7] hover:text-[#1A3D63] transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}