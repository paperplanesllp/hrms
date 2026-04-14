import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import GoogleMapSelector from "../../components/ui/GoogleMapSelector.jsx";
import { toast } from "../../store/toastStore.js";
import api from "../../lib/api.js";
import { requestGeolocation } from "../../lib/geolocation.js";
import {
  MapPin,
  Loader2,
  Save,
  Navigation,
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

// ─── Reusable: SettingsLayout ─────────────────────────────────────────────────
function SettingsLayout({ children }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {children}
    </div>
  );
}

// ─── Reusable: SectionCard ────────────────────────────────────────────────────
function SectionCard({ icon, iconColor = "text-blue-600", iconBg = "bg-blue-50", title, description, badge, children }) {
  const Icon = icon;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {badge}
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  );
}

// ─── Reusable: InputField ─────────────────────────────────────────────────────
function InputField({ label, hint, id, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        className={`w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed transition-shadow
          ${props.className || ""}`}
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Reusable: SaveButton ─────────────────────────────────────────────────────
function SaveButton({ loading, onClick, label = "Save Changes" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed
        text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}

// ─── Reusable: StatusBadge ────────────────────────────────────────────────────
function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Not configured" }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {activeLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
      {inactiveLabel}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSet, setIsSet] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]);
  const [savingWorkingDays, setSavingWorkingDays] = useState(false);

  const [shiftStart, setShiftStart] = useState("09:30");
  const [shiftEnd, setShiftEnd] = useState("18:30");
  const [savingTiming, setSavingTiming] = useState(false);

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const loadCompanySettings = async () => {
    setLoading(true);
    try {
      const [locationRes, workingDaysRes, timingRes] = await Promise.all([
        api.get("/admin/company-location"),
        api.get("/admin/working-days"),
        api.get("/admin/company-timing"),
      ]);
      setLatitude(locationRes.data.latitude || "");
      setLongitude(locationRes.data.longitude || "");
      setIsSet(locationRes.data.isSet);
      setWorkingDays(workingDaysRes.data.workingDays || [1, 2, 3, 4, 5]);
      setShiftStart(timingRes.data.shiftStart || "09:30");
      setShiftEnd(timingRes.data.shiftEnd || "18:30");
    } catch (e) {
      toast({ title: "Failed to load settings", description: e?.response?.data?.message || "Could not fetch company settings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCompanySettings(); }, []);

  const handleMapLocationSelect = (location) => {
    setLatitude(location.latitude.toString());
    setLongitude(location.longitude.toString());
    toast({ title: "Pin moved", description: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`, type: "success" });
  };

  const handleGetCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const location = await requestGeolocation();
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
      setCurrentLocation(location);
      toast({ title: "GPS captured", description: `Accuracy +/-${location.accuracy}m`, type: "success" });
    } catch (error) {
      toast({ title: "Location Error", description: error.message || "Could not access your location", type: "error" });
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!latitude || !longitude) {
      toast({ title: "Missing Fields", description: "Please enter both latitude and longitude", type: "error" });
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      toast({ title: "Invalid Input", description: "Latitude and longitude must be valid numbers", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/company-location", { latitude: lat, longitude: lon });
      setIsSet(true);
      toast({ title: "Location saved", description: `Office set to ${lat.toFixed(5)}, ${lon.toFixed(5)}`, type: "success" });
    } catch (e) {
      toast({ title: "Failed to Save", description: e?.response?.data?.message || "Could not save company location", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (dayOfWeek) => {
    setWorkingDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((d) => d !== dayOfWeek)
        : [...prev, dayOfWeek].sort((a, b) => a - b)
    );
  };

  const handleSaveWorkingDays = async () => {
    if (workingDays.length === 0) {
      toast({ title: "Invalid Configuration", description: "At least one working day must be selected", type: "error" });
      return;
    }
    setSavingWorkingDays(true);
    try {
      await api.post("/admin/working-days", { workingDays });
      toast({ title: "Working days updated", description: workingDays.map((d) => DAY_FULL[d]).join(", "), type: "success" });
    } catch (e) {
      toast({ title: "Failed to Save", description: e?.response?.data?.message || "Could not save working days", type: "error" });
    } finally {
      setSavingWorkingDays(false);
    }
  };

  const handleSaveCompanyTiming = async () => {
    if (!shiftStart || !shiftEnd) {
      toast({ title: "Missing Fields", description: "Please set both shift start and end time", type: "error" });
      return;
    }
    setSavingTiming(true);
    try {
      const res = await api.post("/admin/company-timing", { shiftStart, shiftEnd });
      toast({
        title: "Shift timing updated",
        description: `${res.data?.data?.shiftStart || shiftStart} - ${res.data?.data?.shiftEnd || shiftEnd}`,
        type: "success",
      });
    } catch (e) {
      toast({ title: "Failed to Save", description: e?.response?.data?.message || "Could not update company timing", type: "error" });
    } finally {
      setSavingTiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        icon={Building2}
        title="Company Settings"
        subtitle="Configure office location, working hours, and attendance rules"
      />

      <SettingsLayout>
        {/* Section 1: Office Location */}
        <SectionCard
          icon={MapPin}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          title="Office Location"
          description="Set GPS coordinates for geofencing. Employees must be within 30 m to check in."
          badge={<StatusBadge active={isSet} activeLabel="Location set" />}
        >
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Pin on map</p>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <GoogleMapSelector
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={handleMapLocationSelect}
                markerLabel="Company Office"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <InputField
              id="latitude"
              label="Latitude"
              type="number"
              step="0.00001"
              placeholder="e.g. 28.6139"
              value={latitude}
              hint="Positive = North, Negative = South"
              onChange={(e) => setLatitude(e.target.value)}
            />
            <InputField
              id="longitude"
              label="Longitude"
              type="number"
              step="0.00001"
              placeholder="e.g. 77.2090"
              value={longitude}
              hint="Positive = East, Negative = West"
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>

          {currentLocation && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mb-4">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              GPS captured - accuracy +/-{currentLocation.accuracy}m
            </div>
          )}

          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Geofence radius is <strong className="mx-1">30 metres</strong>. Employees outside this range cannot check in.
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Use my GPS
            </button>
            <SaveButton loading={saving} onClick={handleSaveLocation} label="Save Location" />
          </div>
        </SectionCard>

        {/* Section 2: Shift Timing */}
        <SectionCard
          icon={Clock}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          title="Shift Timing"
          description="Default office hours applied when no date-specific shift is configured."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <InputField
              id="shiftStart"
              label="Shift start"
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
            />
            <InputField
              id="shiftEnd"
              label="Shift end"
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
            />
          </div>

          <div className="inline-flex items-center gap-2 text-sm text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-5">
            <Clock className="w-3.5 h-3.5" />
            Current shift: <strong className="ml-1">{shiftStart} - {shiftEnd}</strong>
          </div>

          <div className="flex pt-4 border-t border-gray-100">
            <SaveButton loading={savingTiming} onClick={handleSaveCompanyTiming} label="Save Timing" />
          </div>
        </SectionCard>

        {/* Section 3: Working Days */}
        <SectionCard
          icon={Calendar}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          title="Working Days"
          description="Select which days of the week employees are expected to work."
        >
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
            {DAY_LABELS.map((label, dayNum) => {
              const active = workingDays.includes(dayNum);
              return (
                <button
                  key={dayNum}
                  onClick={() => toggleWorkingDay(dayNum)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border text-xs font-semibold transition-all
                    ${active
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Working days</p>
              <p className="text-sm text-gray-800 font-medium">
                {workingDays.length > 0 ? workingDays.map((d) => DAY_FULL[d]).join(", ") : "None selected"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Week-off days</p>
              <p className="text-sm text-gray-800 font-medium">
                {[0, 1, 2, 3, 4, 5, 6]
                  .filter((d) => !workingDays.includes(d))
                  .map((d) => DAY_FULL[d])
                  .join(", ") || "None"}
              </p>
            </div>
          </div>

          <div className="flex pt-4 border-t border-gray-100">
            <SaveButton loading={savingWorkingDays} onClick={handleSaveWorkingDays} label="Save Working Days" />
          </div>
        </SectionCard>
      </SettingsLayout>
    </div>
  );
}
