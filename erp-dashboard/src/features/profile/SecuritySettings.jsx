import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  LoaderCircle,
} from "lucide-react";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Card from "../../components/ui/Card.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import "./SecuritySettings.css";

/**
 * Security Settings Component - for 2FA Management
 * Allows users to:
 * - View 2FA status
 * - Enable 2FA
 * - Disable 2FA (with OTP verification)
 */
export default function SecuritySettings() {
  // 2FA Status States
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Enable 2FA States
  const [showEnable2FAModal, setShowEnable2FAModal] = useState(false);
  const [enabling2FA, setEnabling2FA] = useState(false);

  // Disable 2FA States
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disablePasswordError, setDisablePasswordError] = useState("");

  // Disable 2FA OTP Verification States
  const [disableOtpSent, setDisableOtpSent, ] = useState(false);
  const [disableOTP, setDisableOTP] = useState(["", "", "", "", "", ""]);
  const [disableOtpError, setDisableOtpError] = useState("");
  const [disableOtpLoading, setDisableOtpLoading] = useState(false);
  const [disableOtpCountdown, setDisableOtpCountdown] = useState(0);
  const [canResendDisableOTP, setCanResendDisableOTP] = useState(false);
  const disableOtpRefs = React.useRef([]);

  // Load initial 2FA status
  useEffect(() => {
    load2FAStatus();
  }, []);

  // Disable OTP countdown timer
  useEffect(() => {
    if (disableOtpCountdown <= 0) {
      setCanResendDisableOTP(true);
      return;
    }

    const interval = setInterval(() => {
      setDisableOtpCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [disableOtpCountdown]);

  // Load 2FA status
  const load2FAStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/2fa/status");
      setTwoFAEnabled(response.data.twoFactorEnabled || false);
    } catch (err) {
      console.error("Failed to load 2FA status:", err);
      // Don't show error toast on initial load
    } finally {
      setLoading(false);
    }
  };

  // Enable 2FA
  const handleEnable2FA = async () => {
    setEnabling2FA(true);
    try {
      const response = await api.post("/auth/2fa/enable");
      setTwoFAEnabled(true);
      setShowEnable2FAModal(false);

      toast({
        title: "2FA Enabled",
        message: response.data.message,
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Failed to enable 2FA",
        message: err?.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setEnabling2FA(false);
    }
  };

  // Request OTP for disabling 2FA
  const handleRequestDisableOTP = async () => {
    setDisablePasswordError("");

    if (!disablePassword.trim()) {
      setDisablePasswordError("Password is required");
      return;
    }

    setDisabling2FA(true);
    try {
      const response = await api.post("/auth/2fa/disable/request-otp");
      setDisableOtpSent(true);
      setDisablePassword("");
      setCanResendDisableOTP(false);
      setDisableOtpCountdown(30);
      setDisableOTP(["", "", "", "", "", ""]);
      disableOtpRefs.current[0]?.focus();

      toast({
        title: "OTP Sent",
        message: response.data.message,
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Failed to send OTP",
        message: err?.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setDisabling2FA(false);
    }
  };

  // Handle disable OTP input
  const handleDisableOtpInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...disableOTP];
    newOtp[index] = value;
    setDisableOTP(newOtp);
    setDisableOtpError("");

    // Auto-focus next input
    if (value && index < 5) {
      disableOtpRefs.current[index + 1]?.focus();
    }
    // Auto-focus prev on backspace
    if (!value && index > 0) {
      disableOtpRefs.current[index - 1]?.focus();
    }
  };

  // Verify disable OTP and disable 2FA
  const handleVerifyDisableOTP = async () => {
    setDisableOtpError("");
    const otpCode = disableOTP.join("");

    if (otpCode.length !== 6) {
      setDisableOtpError("Please enter all 6 digits");
      return;
    }

    setDisableOtpLoading(true);
    try {
      const response = await api.post("/auth/2fa/disable/verify-otp", {
        otp: otpCode,
      });

      setTwoFAEnabled(false);
      setShowDisable2FAModal(false);
      setDisableOtpSent(false);
      setDisableOTP(["", "", "", "", "", ""]);
      setDisablePassword("");

      toast({
        title: "2FA Disabled",
        message: response.data.message,
        type: "success",
      });
    } catch (err) {
      setDisableOtpError(
        err?.response?.data?.message || "Failed to verify OTP"
      );
      setDisableOTP(["", "", "", "", "", ""]);
      disableOtpRefs.current[0]?.focus();
    } finally {
      setDisableOtpLoading(false);
    }
  };

  // Resend disable OTP
  const handleResendDisableOTP = async () => {
    setDisableOtpError("");
    setDisableOtpLoading(true);

    try {
      const response = await api.post("/auth/2fa/disable/request-otp");
      setDisableOTP(["", "", "", "", "", ""]);
      setCanResendDisableOTP(false);
      setDisableOtpCountdown(30);
      disableOtpRefs.current[0]?.focus();

      toast({
        title: "OTP Resent",
        message: response.data.message,
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Failed to resend OTP",
        message: err?.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setDisableOtpLoading(false);
    }
  };

  // Close disable modal
  const handleCloseDisableModal = () => {
    setShowDisable2FAModal(false);
    setDisableOtpSent(false);
    setDisablePassword("");
    setDisableOTP(["", "", "", "", "", ""]);
    setDisablePasswordError("");
    setDisableOtpError("");
  };

  if (loading) {
    return (
      <Card className="security-settings-loading">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <LoaderCircle size={20} className="animate-spin" />
          <span>Loading security settings...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="security-settings-container">
      <Card className="security-settings-card">
        <div className="security-header">
          <div className="security-header-title">
            <Shield size={24} className="security-icon" />
            <h3>Two-Factor Authentication (2FA)</h3>
          </div>
          <p className="security-subtitle">
            Add an extra layer of security to your account with email-based OTP verification
          </p>
        </div>

        {/* 2FA Status */}
        <div className="security-status">
          {twoFAEnabled ? (
            <div className="status-badge enabled">
              <CheckCircle2 size={20} />
              <span>2FA is currently <strong>ENABLED</strong></span>
            </div>
          ) : (
            <div className="status-badge disabled">
              <AlertCircle size={20} />
              <span>2FA is currently <strong>DISABLED</strong></span>
            </div>
          )}
        </div>

        {/* 2FA Description */}
        <div className="security-description">
          <p>
            Two-Factor Authentication (2FA) requires you to verify your identity using a one-time
            password (OTP) sent to your email during login. This significantly enhances your account
            security.
          </p>
          <ul className="security-benefits">
            <li>✓ Prevents unauthorized access even if password is compromised</li>
            <li>✓ Email-based OTP for easy verification</li>
            <li>✓ 5-minute OTP validity with attempt limits</li>
            <li>✓ Full control - enable or disable anytime</li>
          </ul>
        </div>

        {/* 2FA Action Button */}
        <div className="security-actions">
          {twoFAEnabled ? (
            <Button
              onClick={() => setShowDisable2FAModal(true)}
              variant="danger"
              className="security-button danger"
            >
              <Lock size={16} />
              Disable 2FA
            </Button>
          ) : (
            <Button
              onClick={() => setShowEnable2FAModal(true)}
              className="security-button enable"
            >
              <Shield size={16} />
              Enable 2FA
            </Button>
          )}
        </div>

        {/* Additional Security Tips */}
        <div className="security-tips">
          <p className="tips-title">💡 Security Tips:</p>
          <ul>
            <li>Always verify OTP requests before entering the code</li>
            <li>Check your spam folder if you don't receive OTP emails</li>
            <li>Keep your email account secure as it's used for 2FA</li>
            <li>Never share your OTP with anyone, not even support staff</li>
          </ul>
        </div>
      </Card>

      {/* Enable 2FA Modal */}
      {showEnable2FAModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Enable Two-Factor Authentication?</h4>
            <p>
              Once enabled, you'll need to enter a 6-digit OTP sent to your email every time you
              log in. This provides enhanced security for your account.
            </p>
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setShowEnable2FAModal(false)}
                disabled={enabling2FA}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnable2FA}
                loading={enabling2FA}
              >
                Enable 2FA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisable2FAModal && (
        <div className="modal-overlay">
          <div className="modal-content disable-modal">
            <h4>Disable Two-Factor Authentication?</h4>

            {!disableOtpSent ? (
              <>
                <p>
                  To disable 2FA, please verify your identity by entering your password. We'll send
                  an OTP to your email for final confirmation.
                </p>

                <div className="modal-form">
                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-input-wrapper">
                      <Input
                        type={showDisablePassword ? "text" : "password"}
                        value={disablePassword}
                        onChange={(e) => {
                          setDisablePassword(e.target.value);
                          setDisablePasswordError("");
                        }}
                        placeholder="Enter your password"
                        disabled={disabling2FA}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDisablePassword(!showDisablePassword)}
                        className="toggle-password"
                      >
                        {showDisablePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {disablePasswordError && (
                      <div className="form-error">
                        <AlertCircle size={14} />
                        {disablePasswordError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-actions">
                  <Button
                    variant="secondary"
                    onClick={handleCloseDisableModal}
                    disabled={disabling2FA}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRequestDisableOTP}
                    loading={disabling2FA}
                  >
                    Send OTP
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Enter the 6-digit OTP sent to your email to confirm disabling 2FA.
                </p>

                <div className="modal-form">
                  <div className="otp-input-group">
                    {disableOTP.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (disableOtpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleDisableOtpInput(index, e.target.value)}
                        disabled={disableOtpLoading}
                        className="otp-digit-input"
                        placeholder="0"
                        autoComplete="off"
                      />
                    ))}
                  </div>

                  {disableOtpError && (
                    <div className="form-error">
                      <AlertCircle size={14} />
                      {disableOtpError}
                    </div>
                  )}

                  <div className="otp-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendDisableOTP}
                      disabled={!canResendDisableOTP || disableOtpLoading}
                      className="resend-button"
                    >
                      <RotateCcw size={14} />
                      {canResendDisableOTP ? "Resend OTP" : `Resend in ${disableOtpCountdown}s`}
                    </Button>
                  </div>
                </div>

                <div className="modal-actions">
                  <Button
                    variant="secondary"
                    onClick={handleCloseDisableModal}
                    disabled={disableOtpLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyDisableOTP}
                    loading={disableOtpLoading}
                    disabled={disableOTP.join("").length !== 6}
                  >
                    Verify & Disable
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
