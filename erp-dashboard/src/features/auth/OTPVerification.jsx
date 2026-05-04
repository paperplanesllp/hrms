import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import "./OTPVerification.css";

/**
 * OTP Verification Component for 2FA Login
 * Displays OTP input form with countdown timer and resend functionality
 * 
 * Props:
 * - userId: User ID from login attempt
 * - tempToken: Temporary token from login response
 * - userEmail: Email to show in UI
 * - expiresInSeconds: OTP expiry time
 * - onOTPVerified: Callback when OTP is successfully verified
 * - onCancel: Callback to go back to login
 * - onResendOTP: Callback to resend OTP
 */
export default function OTPVerification({
  userId,
  tempToken,
  userEmail,
  expiresInSeconds = 300,
  onOTPVerified,
  onCancel,
  onResendOTP,
}) {
  const [otp, setOtp] = useState("");
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef([]);

  // Timer for OTP expiry
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // Timer for resend OTP
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle OTP input change
  const handleOTPInputChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtpInputs = [...otpInputs];
    newOtpInputs[index] = value;
    setOtpInputs(newOtpInputs);
    setError("");

    // Auto-focus to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-focus to previous on backspace
    if (!value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste event
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);

    if (!/^\d+$/.test(pastedData)) {
      setError("Please paste only digits");
      return;
    }

    const newOtpInputs = pastedData.split("").concat(Array(6 - pastedData.length).fill(""));
    setOtpInputs(newOtpInputs);

    // Focus last filled input
    const lastFilledIndex = Math.min(pastedData.length, 5);
    otpRefs.current[lastFilledIndex]?.focus();
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const otpCode = otpInputs.join("");
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/2fa/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          otp: otpCode,
          rememberMe: localStorage.getItem("rememberMe") === "true",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid OTP");
        setOtpInputs(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
        return;
      }

      setSuccess("✓ OTP verified! Logging you in...");
      
      // Call the success callback with tokens and user info
      setTimeout(() => {
        onOTPVerified(data);
      }, 800);
    } catch (err) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/2fa/login/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to resend OTP");
        return;
      }

      setSuccess("✓ OTP resent to your email");
      setTimeLeft(expiresInSeconds);
      setOtpInputs(["", "", "", "", "", ""]);
      setCanResend(false);
      setResendCountdown(30);
      otpRefs.current[0]?.focus();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    }
  };

  const isExpired = timeLeft === 0;
  const isTimeLow = timeLeft <= 60;

  return (
    <div className="otp-verification-container">
      <div className="otp-card">
        {/* Header */}
        <div className="otp-header">
          <h2>Verify Your Identity</h2>
          <p className="otp-subtitle">
            Enter the 6-digit code sent to {userEmail}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerifyOTP}>
          {/* OTP Input Fields */}
          <div className="otp-input-container">
            {otpInputs.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOTPInputChange(index, e.target.value)}
                onPaste={handlePaste}
                disabled={isExpired || loading}
                className={`otp-input ${
                  digit ? "filled" : ""
                } ${isExpired ? "expired" : ""}`}
                placeholder="0"
                autoComplete="off"
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="message-box error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="message-box success-message">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          {/* Timer Section */}
          <div className={`timer-section ${isTimeLow ? "warning" : ""} ${isExpired ? "expired" : ""}`}>
            <Clock size={16} />
            <span>
              {isExpired ? (
                <span className="expired-text">OTP Expired</span>
              ) : (
                <>
                  <span>Expires in: </span>
                  <strong>{formatTime(timeLeft)}</strong>
                </>
              )}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="otp-button-group">
            <Button
              type="submit"
              disabled={loading || isExpired || otpInputs.join("").length !== 6}
              loading={loading}
              className="otp-verify-button"
            >
              Verify OTP
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleResendOTP}
              disabled={!canResend || loading}
              className="otp-resend-button"
            >
              {resendCountdown > 0 ? (
                <>
                  <RotateCcw size={16} />
                  Resend in {resendCountdown}s
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Resend OTP
                </>
              )}
            </Button>
          </div>

          {/* Back Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="otp-back-button"
            disabled={loading}
          >
            ← Back to Login
          </Button>
        </form>

        {/* Info Box */}
        <div className="otp-info-box">
          <p>
            💡 <strong>Tip:</strong> Check your spam folder if you don't see the email within a minute.
          </p>
        </div>
      </div>
    </div>
  );
}
