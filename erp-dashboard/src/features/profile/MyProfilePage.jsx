import React, { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import api from "../../lib/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { toast } from "../../store/toastStore.js";

import {
  Mail,
  Phone,
  Shield,
  Save,
  Sparkles,
  Camera,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Activity
} from "lucide-react";

export default function MyProfilePage() {

  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [savingTwoFA, setSavingTwoFA] = useState(false);
  const [accountActivity, setAccountActivity] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [photoPreview, setPhotoPreview] = useState(user?.profileImageUrl || "");
  const [photoFile, setPhotoFile] = useState(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [imageSrc, setImageSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Load user data and photos when user changes
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
      setPhotoPreview(user.profileImageUrl || "");
      // Clear errors when user data loads
      setErrors({});
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    }
  }, [user]);

  // Load 2FA status on component mount
  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        const res = await api.get("/users/2fa-status");
        setTwoFAEnabled(res.data?.enabled || false);
      } catch (e) {
        console.error("Error loading 2FA status:", e);
      }
    };

    const loadActivityLog = async () => {
      try {
        const res = await api.get("/users/activity-log?limit=5");
        setAccountActivity(res.data?.activities || []);
      } catch (e) {
        console.error("Error loading activity log:", e);
      }
    };

    if (user) {
      load2FAStatus();
      loadActivityLog();
    }
  }, [user]);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // VALIDATION FUNCTION
  const validateForm = () => {
    const newErrors = {};

    // Validate name - must not be empty and at least 2 chars
    const trimmedName = form.name?.trim() || "";
    if (!trimmedName || trimmedName.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Validate email (only if provided/not empty)
    const trimmedEmail = form.email?.trim() || "";
    if (trimmedEmail && trimmedEmail.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // PASSWORD VALIDATION FUNCTION
  const validatePassword = () => {
    const newErrors = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // CHANGE PASSWORD HANDLER
  const handleChangePassword = async () => {
    if (!validatePassword()) {
      toast({
        title: "Validation error",
        message: "Please check the password form for errors",
        type: "error",
      });
      return;
    }

    setSavingPassword(true);

    try {
      await api.post("/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast({
        title: "Success!",
        message: "Password changed successfully",
        type: "success",
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    } catch (e) {
      const errorMessage =
        e?.response?.data?.message ||
        "Failed to change password";

      toast({
        title: "Error",
        message: errorMessage,
        type: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // TOGGLE 2FA HANDLER
  const handleToggle2FA = async () => {
    setSavingTwoFA(true);

    try {
      const res = await api.post("/users/2fa-toggle", {
        enabled: !twoFAEnabled,
      });

      setTwoFAEnabled(res.data?.enabled || !twoFAEnabled);

      toast({
        title: "Success!",
        message: `Two-Factor Authentication ${!twoFAEnabled ? "enabled" : "disabled"}`,
        type: "success",
      });
    } catch (e) {
      const errorMessage =
        e?.response?.data?.message ||
        "Failed to update 2FA settings";

      toast({
        title: "Error",
        message: errorMessage,
        type: "error",
      });
    } finally {
      setSavingTwoFA(false);
    }
  };

  // SELECT IMAGE
  const handlePhotoChange = async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {

      if (img.width < 180 || img.height < 180) {

        toast({
          title: "Image too small",
          message: "Minimum size is 180x180",
          type: "error",
        });

        return;
      }

      setImageSrc(URL.createObjectURL(file));
      setShowCrop(true);
    };

  };

  // CROP IMAGE FUNCTION

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, crop) => {

    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {

      canvas.toBlob((blob) => {

        const file = new File([blob], "profile.jpg", {
          type: "image/jpeg",
        });

        resolve(file);

      }, "image/jpeg");

    });
  };

  const applyCrop = async () => {

    const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);

    setPhotoFile(croppedFile);
    setPhotoPreview(URL.createObjectURL(croppedFile));

    setShowCrop(false);

  };

  const save = async () => {

    // Validate form before saving
    if (!validateForm()) {
      toast({
        title: "Validation error",
        message: "Please check the form for errors",
        type: "error",
      });
      return;
    }

    // Make sure form has been loaded
    if (!form.name || form.name.trim().length === 0) {
      toast({
        title: "Loading...",
        message: "Please wait for your profile to load",
        type: "warning",
      });
      return;
    }

    setSaving(true);

    try {

      const formData = new FormData();

      // Always include name field (required)
      const trimmedName = form.name.trim();
      formData.append("name", trimmedName);

      // Only include email if it has a value
      const trimmedEmail = form.email?.trim() || "";
      if (trimmedEmail.length > 0) {
        formData.append("email", trimmedEmail);
      }

      // Only include phone if it has a value
      const trimmedPhone = form.phone?.trim() || "";
      if (trimmedPhone.length > 0) {
        formData.append("phone", trimmedPhone);
      }

      if (photoFile) {
        formData.append("profileImage", photoFile);
      }

      const res = await api.put("/users/me", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Update auth store with new user data
      if (res.data && res.data.user) {
        const raw = localStorage.getItem("erp_auth");
        const auth = raw ? JSON.parse(raw) : {};
        auth.user = res.data.user;
        localStorage.setItem("erp_auth", JSON.stringify(auth));
      } else if (res.data) {
        const raw = localStorage.getItem("erp_auth");
        const auth = raw ? JSON.parse(raw) : {};
        auth.user = res.data;
        localStorage.setItem("erp_auth", JSON.stringify(auth));
      }

      toast({
        title: "Success!",
        message: "Profile updated successfully",
        type: "success",
      });

      // Reload after short delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (e) {

      const errorMessage = e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "Failed to update profile";
      
      toast({
        title: "Update failed",
        message: errorMessage,
        type: "error",
      });

      console.error("Error updating profile:", e);

    } finally {
      setSaving(false);
    }

  };

  return (

    <div className="space-y-8">

      <PageTitle
        title="My Profile"
        subtitle="Manage your personal information"
      />

      <div className="grid gap-6 lg:grid-cols-3">

        {/* PROFILE CARD */}

        <Card className="border shadow-lg p-7 rounded-2xl">

          <div className="flex flex-col items-center">

            <div className="relative">

              <div className="overflow-hidden border-4 border-white rounded-full shadow-lg w-28 h-28">

                {photoPreview ? (

                  <img
                    src={photoPreview}
                    alt="profile"
                    className="object-cover w-full h-full"
                  />

                ) : (

                  <div className="flex items-center justify-center w-full h-full text-3xl text-white bg-slate-700">

                    {(user?.name || "U").slice(0, 1)}

                  </div>

                )}

              </div>

              <label className="absolute bottom-0 right-0 p-2 text-white rounded-full cursor-pointer bg-emerald-600">

                <Camera size={16} />

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />

              </label>

            </div>

            <h2 className="mt-4 text-xl font-bold">
              {user?.name}
            </h2>

            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Shield size={16}/>
              {user?.role}
            </div>

          </div>

        </Card>

        {/* EDIT PROFILE FORM */}

        <Card className="border shadow-lg lg:col-span-2 p-7 rounded-2xl">

          <div className="flex items-center gap-3 mb-6">

            <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl">
              <Sparkles size={18}/>
            </div>

            <h3 className="text-xl font-bold">Edit Profile</h3>

          </div>

          <div className="space-y-5">

            <div>
              <label className="block mb-2 text-sm font-semibold">
                Full Name
              </label>

              <Input
                value={form.name}
                onChange={(e)=>setForm({...form,name:e.target.value})}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Email
                </label>

                <Input
                  value={form.email}
                  onChange={(e)=>setForm({...form,email:e.target.value})}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Phone
                </label>

                <Input
                  value={form.phone}
                  onChange={(e)=>setForm({...form,phone:e.target.value})}
                />
              </div>

            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="flex items-center justify-center w-full h-12 gap-2 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
            >
              <Save size={16}/>
              {saving ? "Saving..." : "Save Changes"}
            </Button>

          </div>

        </Card>

      </div>

      {/* CHANGE PASSWORD SECTION */}

      <Card className="border shadow-lg p-7 rounded-2xl">

        <div className="flex items-center gap-3 mb-6">

          <div className="flex items-center justify-center w-10 h-10 text-blue-600 bg-blue-100 rounded-xl">
            <Lock size={18}/>
          </div>

          <h3 className="text-xl font-bold">Change Password</h3>

        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Current Password */}
          <div>
            <label className="block mb-2 text-sm font-semibold">
              Current Password
            </label>

            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                className={passwordErrors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    current: !showPasswords.current,
                  })
                }
                className="absolute text-gray-500 -translate-y-1/2 right-3 top-1/2"
              >
                {showPasswords.current ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-500">{passwordErrors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block mb-2 text-sm font-semibold">
              New Password
            </label>

            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                className={passwordErrors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    new: !showPasswords.new,
                  })
                }
                className="absolute text-gray-500 -translate-y-1/2 right-3 top-1/2"
              >
                {showPasswords.new ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-500">{passwordErrors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block mb-2 text-sm font-semibold">
              Confirm Password
            </label>

            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                className={passwordErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    confirm: !showPasswords.confirm,
                  })
                }
                className="absolute text-gray-500 -translate-y-1/2 right-3 top-1/2"
              >
                {showPasswords.confirm ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{passwordErrors.confirmPassword}</p>
            )}
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="flex items-center justify-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700"
          >
            <Lock size={16} />
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>

      </Card>

      {/* SECURITY & SETTINGS SECTION */}

      <div className="grid gap-6 md:grid-cols-2">

        {/* Two-Factor Authentication */}
        <Card className="border shadow-lg p-7 rounded-2xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex items-center justify-center w-10 h-10 text-purple-600 bg-purple-100 rounded-xl">
                <Shield size={18}/>
              </div>

              <div>
                <h3 className="text-lg font-bold">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500">
                  Add an extra layer of security
                </p>
              </div>

            </div>

            <div className="flex items-center gap-3">

              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${
                  twoFAEnabled
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {twoFAEnabled ? (
                  <>
                    <CheckCircle size={14} />
                    Enabled
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    Disabled
                  </>
                )}
              </div>

            </div>

          </div>

          <Button
            onClick={handleToggle2FA}
            disabled={savingTwoFA}
            className={`w-full mt-4 py-2 rounded-xl font-semibold ${
              twoFAEnabled
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-green-100 text-green-600 hover:bg-green-200"
            }`}
          >
            {savingTwoFA
              ? "Updating..."
              : twoFAEnabled
              ? "Disable 2FA"
              : "Enable 2FA"}
          </Button>

        </Card>

        {/* Account Activity */}
        <Card className="border shadow-lg p-7 rounded-2xl">

          <div className="flex items-center gap-3 mb-4">

            <div className="flex items-center justify-center w-10 h-10 text-green-600 bg-green-100 rounded-xl">
              <Activity size={18}/>
            </div>

            <h3 className="text-lg font-bold">Recent Activity</h3>

          </div>

          <div className="space-y-3 overflow-y-auto max-h-64">

            {accountActivity && accountActivity.length > 0 ? (
              accountActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">

                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.timestamp
                        ? new Date(activity.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                        : "N/A"}
                    </p>
                  </div>

                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      activity.status === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {activity.status}
                  </div>

                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-center text-gray-500">
                No recent activity
              </p>
            )}

          </div>

        </Card>

      </div>

      {/* CROP MODAL */}

      {showCrop && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">

          <div className="bg-white p-6 rounded-xl w-[400px]">

            <div className="relative h-80">

              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />

            </div>

            <div className="flex gap-3 mt-4">

              <Button
                className="flex-1"
                onClick={applyCrop}
              >
                Apply Crop
              </Button>

              <Button
                variant="secondary"
                onClick={()=>setShowCrop(false)}
              >
                Cancel
              </Button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}