import React, { useEffect, useRef, useState } from "react";
import { Loader, Search } from "lucide-react";
import Button from "./Button.jsx";
import Input from "./Input.jsx";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDKRx-pYmMOAK5Sd51fXn_YNd3mqJCKLMg"; // Default for demo

export default function GoogleMapSelector({ latitude, longitude, onLocationSelect, markerLabel = "Company Location" }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [searching, setSearching] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    if (mapLoaded || !window) return;

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      setLoading(false);
      return;
    }

    // Load Google Maps script dynamically
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=core,maps,places,geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Maps API loaded");
      setMapLoaded(true);
      setLoading(false);
    };
    script.onerror = () => {
      console.error("❌ Failed to load Google Maps API");
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Clean up: remove script if needed (optional)
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapContainer.current || map.current) return;

    console.log("📍 Initializing Google Map");

    const mapOptions = {
      zoom: 15,
      center: {
        lat: parseFloat(latitude) || 28.7041,  // Default to Delhi, India
        lng: parseFloat(longitude) || 77.1025,
      },
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    };

    map.current = new window.google.maps.Map(mapContainer.current, mapOptions);

    // Add initial marker if coordinates exist
    if (latitude && longitude) {
      addMarker(parseFloat(latitude), parseFloat(longitude));
    }

    // Handle map click to set location
    map.current.addListener("click", (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      console.log("📍 Map clicked at:", lat, lng);
      
      addMarker(lat, lng);
      onLocationSelect({ latitude: lat, longitude: lng });
    });

    console.log("✅ Google Map initialized");
  }, [mapLoaded, latitude, longitude, onLocationSelect]);

  const addMarker = (lat, lng) => {
    // Remove existing marker
    if (marker.current) {
      marker.current.setMap(null);
    }

    // Add new marker
    marker.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: map.current,
      title: markerLabel,
      icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      draggable: true,
    });

    // Allow marker dragging to update location
    marker.current.addListener("dragend", () => {
      const pos = marker.current.getPosition();
      const newLat = pos.lat();
      const newLng = pos.lng();
      console.log("📍 Marker dragged to:", newLat, newLng);
      onLocationSelect({ latitude: newLat, longitude: newLng });
      
      // Center map on new marker position
      map.current.panTo({ lat: newLat, lng: newLng });
    });

    // Center map on marker
    map.current.panTo({ lat, lng });
  };

  const handleAddressSearch = async (e) => {
    e.preventDefault();
    if (!searchAddress.trim() || !window.google) return;

    setSearching(true);
    try {
      console.log("🔍 Searching for address:", searchAddress);

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: searchAddress }, (results, status) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          console.log("✅ Address found:", lat, lng);

          setSearchAddress(""); // Clear search input
          addMarker(lat, lng);
          onLocationSelect({ latitude: lat, longitude: lng });
        } else {
          console.error("❌ Address not found:", status);
          alert("Address not found. Please try another address.");
        }
      });
    } catch (error) {
      console.error("❌ Search error:", error);
      alert("Error searching for address");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200">
        <div className="flex flex-col items-center gap-2">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Address Search Bar */}
      <form onSubmit={handleAddressSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search for an address (e.g., Times Square, NYC or 1600 Pennsylvania Ave, Washington DC)"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          type="submit"
          disabled={searching || !searchAddress.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4"
        >
          {searching ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-xl border-2 border-slate-200 shadow-md overflow-hidden"
        style={{ minHeight: "400px" }}
      />
      <p className="text-xs text-slate-500 italic">
        💡 <strong>Click</strong> anywhere on the map to set location, <strong>drag</strong> the marker to adjust, or <strong>search</strong> for an address above
      </p>
    </div>
  );
}
