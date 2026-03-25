import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import GoogleMapSelector from "../../components/ui/GoogleMapSelector.jsx";
import { toast } from "../../store/toastStore.js";
import api from "../../lib/api.js";
import { requestGeolocation } from "../../lib/geolocation.js";
import { MapPin, Loader, Save, Navigation, Map, Zap, Globe } from "lucide-react";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSet, setIsSet] = useState(false);

  // Load current company location
  const loadCompanyLocation = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/company-location");
      setLatitude(res.data.latitude || "");
      setLongitude(res.data.longitude || "");
      setIsSet(res.data.isSet);
      console.log("✅ Company location loaded:", res.data);
    } catch (e) {
      console.error("❌ Failed to load company location:", e);
      toast({
        title: "Failed to load settings",
        description: e?.response?.data?.message || "Could not fetch company location",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyLocation();
  }, []);

  // Handle map location selection
  const handleMapLocationSelect = (location) => {
    console.log("📍 Location selected from map:", location);
    setLatitude(location.latitude.toString());
    setLongitude(location.longitude.toString());
    toast({
      title: "Location Updated",
      description: `Latitude: ${location.latitude.toFixed(4)}, Longitude: ${location.longitude.toFixed(4)}`,
      type: "success",
    });
  };

  // Get current GPS location and set it
  const handleGetCurrentLocation = async () => {
    try {
      console.log("📍 Requesting current GPS location...");
      const location = await requestGeolocation();
      console.log("✅ Location captured:", location);
      
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
      setCurrentLocation(location);
      
      toast({
        title: "Location Captured",
        description: `Lat: ${location.latitude}, Lon: ${location.longitude}`,
        type: "success",
      });
    } catch (error) {
      console.error("❌ Geolocation error:", error.message);
      toast({
        title: "Location Error",
        description: error.message || "Could not access your location",
        type: "error",
      });
    }
  };

  // Save company location
  const handleSaveLocation = async () => {
    if (!latitude || !longitude) {
      toast({
        title: "Missing Fields",
        description: "Please enter both latitude and longitude",
        type: "error",
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: "Invalid Input",
        description: "Latitude and longitude must be valid numbers",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      console.log("💾 Saving company location...");
      const res = await api.post("/admin/company-location", {
        latitude: lat,
        longitude: lon,
      });
      
      console.log("✅ Company location saved:", res.data);
      setIsSet(true);
      
      toast({
        title: "Location Saved Successfully",
        description: `Office location set to ${lat}, ${lon}`,
        type: "success",
      });
    } catch (e) {
      console.error("❌ Save failed:", e);
      toast({
        title: "Failed to Save",
        description: e?.response?.data?.message || "Could not save company location",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle 
        icon={MapPin}
        title="Company Settings" 
        subtitle="Manage office locations and company configuration"
      />

      {/* Office Location Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <MapPin className="w-6 h-6 text-blue-600" />
              Office Location
            </h2>
            <p className="mt-1 text-gray-600">
              Set your company's GPS coordinates for geofencing. Employees can only check in within 30m radius.
            </p>
          </div>
          {isSet && (
            <div className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">
              ✓ Set
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Google Maps Selector */}
          <div>
            <label className="block mb-3 text-sm font-semibold text-gray-700">
              🗺️ Select Location on Map
            </label>
            <GoogleMapSelector
              latitude={latitude}
              longitude={longitude}
              onLocationSelect={handleMapLocationSelect}
              markerLabel="Company Office"
            />
          </div>

          {/* Latitude Input */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Latitude
            </label>
            <Input
              type="number"
              step="0.0001"
              placeholder="e.g., 31.5204"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: 31.5204 (positive = North, negative = South)
            </p>
          </div>

          {/* Longitude Input */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Longitude
            </label>
            <Input
              type="number"
              step="0.0001"
              placeholder="e.g., 74.3587"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: 74.3587 (positive = East, negative = West)
            </p>
          </div>

          {/* Current Location Display */}
          {currentLocation && (
            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm font-medium text-blue-900">📍 Last Captured Location:</p>
              <p className="mt-1 text-sm text-blue-800">
                Lat: {currentLocation.latitude}, Lon: {currentLocation.longitude}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Accuracy: ±{currentLocation.accuracy}m
              </p>
            </div>
          )}

          {/* Geofence Info */}
          <div className="p-3 border rounded-lg bg-amber-50 border-amber-200">
            <p className="text-sm font-medium text-amber-900">🔒 Geofence Radius:</p>
            <p className="mt-1 text-sm text-amber-800">
              Employees can check in within <strong>30 meters</strong> of this office location
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleGetCurrentLocation}
              className="flex items-center justify-center flex-1 gap-2"
              variant="outline"
            >
              <Navigation className="w-4 h-4" />
              Use Current Location
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={saving}
              className="flex items-center justify-center flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Location
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Information Card */}
      <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <h3 className="mb-4 text-lg font-bold text-gray-900">How It Works</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 font-bold text-white bg-purple-600 rounded-full">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Set Office Location</p>
              <p className="text-sm text-gray-600">
                Enter your office's GPS coordinates or click "Use Current Location" to set from your device
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 font-bold text-white bg-purple-600 rounded-full">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Geofence Boundary</p>
              <p className="text-sm text-gray-600">
                30-meter radius around the office location is created automatically
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 font-bold text-white bg-purple-600 rounded-full">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Employee Check-In</p>
              <p className="text-sm text-gray-600">
                Employees can only mark attendance if they are within 30m of this location
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 font-bold text-white bg-purple-600 rounded-full">
              4
            </div>
            <div>
              <p className="font-medium text-gray-900">Audit Trail</p>
              <p className="text-sm text-gray-600">
                All check-ins store GPS coordinates for verification and compliance
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Coordinates Help Card - Premium Section */}
      <div>
        <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-gray-900">
          <Zap className="w-6 h-6 text-yellow-500" />
          Finding GPS Coordinates
        </h2>
        
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Option 1: Current Location */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-0.5">
            <div className="absolute inset-0 transition-opacity duration-300 bg-white opacity-0 group-hover:opacity-20" />
            <div className="relative flex flex-col h-full p-6 bg-white rounded-2xl">
              <div className="flex items-center justify-center w-12 h-12 mb-4 transition-all rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 group-hover:from-blue-200 group-hover:to-blue-100">
                <Navigation className="w-6 h-6 text-blue-600" />
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-gray-900">Current Location</h3>
              <p className="flex-grow mb-4 text-sm text-gray-600">
                Click the button on this page to automatically capture your device's live GPS coordinates
              </p>
              
              <div className="flex gap-2">
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
              </div>
              <p className="mt-3 text-xs font-semibold text-blue-600">⚡ Fastest Method</p>
            </div>
          </div>

          {/* Option 2: Google Maps */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-orange-600 p-0.5">
            <div className="absolute inset-0 transition-opacity duration-300 bg-white opacity-0 group-hover:opacity-20" />
            <div className="relative flex flex-col h-full p-6 bg-white rounded-2xl">
              <div className="flex items-center justify-center w-12 h-12 mb-4 transition-all rounded-xl bg-gradient-to-br from-red-100 to-orange-50 group-hover:from-red-200 group-hover:to-orange-100">
                <Map className="w-6 h-6 text-red-600" />
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-gray-900">Google Maps</h3>
              <p className="flex-grow mb-4 text-sm text-gray-600">
                Open Google Maps, search your office, right-click the marker → select "Copy coordinates"
              </p>
              
              <div className="flex gap-2">
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-red-400 to-orange-600"></div>
              </div>
              <a 
                href="https://maps.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-3 text-xs font-semibold text-red-600 transition-colors hover:text-red-700"
              >
                ↗ Open Google Maps
              </a>
            </div>
          </div>

          {/* Option 3: GPS Converter */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 p-0.5">
            <div className="absolute inset-0 transition-opacity duration-300 bg-white opacity-0 group-hover:opacity-20" />
            <div className="relative flex flex-col h-full p-6 bg-white rounded-2xl">
              <div className="flex items-center justify-center w-12 h-12 mb-4 transition-all rounded-xl bg-gradient-to-br from-purple-100 to-indigo-50 group-hover:from-purple-200 group-hover:to-indigo-100">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-gray-900">GPS Converter</h3>
              <p className="flex-grow mb-4 text-sm text-gray-600">
                Use an online GPS converter tool. Enter your office address → get latitude/longitude coordinates
              </p>
              
              <div className="flex gap-2">
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-purple-400 to-indigo-600"></div>
              </div>
              <p className="mt-3 text-xs font-semibold text-purple-600">🔗 Search "GPS Coordinates Converter"</p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
