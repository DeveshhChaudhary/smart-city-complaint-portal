import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons for Vite/React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_LOCATION = {
  latitude: 19.076,
  longitude: 72.8777,
};

// ============================================================
// MAP CLICK HANDLER
// ============================================================

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));

      console.log("Map location selected:", {
        latitude,
        longitude,
      });

      onLocationSelect({
        latitude,
        longitude,
      });
    },
  });

  return null;
}

// ============================================================
// MAP CENTER CONTROLLER
// ============================================================

function MapCenterController({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.flyTo(
      [location.latitude, location.longitude],
      16,
      {
        animate: true,
        duration: 1,
      }
    );
  }, [location, map]);

  return null;
}

// ============================================================
// LOCATION PICKER
// ============================================================

function LocationPicker({ onLocationSelect }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [mapCenter, setMapCenter] = useState([
    DEFAULT_LOCATION.latitude,
    DEFAULT_LOCATION.longitude,
  ]);

  // ============================================================
  // SELECT LOCATION
  // ============================================================

  const selectLocation = (location) => {
    setSelectedLocation(location);
    setLocationError("");

    onLocationSelect(location);
  };

  // ============================================================
  // USE CURRENT LOCATION
  // ============================================================

  const useMyLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(
          position.coords.latitude.toFixed(6)
        );

        const longitude = Number(
          position.coords.longitude.toFixed(6)
        );

        const location = {
          latitude,
          longitude,
        };

        console.log("Current location:", location);

        setMapCenter([latitude, longitude]);

        selectLocation(location);

        setLocationLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);

        let message =
          "Unable to get your current location.";

        if (error.code === 1) {
          message =
            "Location permission was denied. Please allow location access or select a location manually on the map.";
        } else if (error.code === 2) {
          message =
            "Your current location could not be determined. Please select a location manually on the map.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Please select a location manually on the map.";
        }

        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="w-full">
      {/* Map */}
      <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-gray-300">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            onLocationSelect={selectLocation}
          />

          <MapCenterController location={selectedLocation} />

          {selectedLocation && (
            <Marker
              position={[
                selectedLocation.latitude,
                selectedLocation.longitude,
              ]}
            />
          )}
        </MapContainer>

        {/* Use My Location Button */}
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locationLoading}
            className="bg-white hover:bg-gray-50 disabled:bg-gray-100 shadow-lg border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-800 transition"
          >
            {locationLoading
              ? "Getting Location..."
              : "📍 Use My Location"}
          </button>
        </div>
      </div>

      {/* Selected Location */}
      {selectedLocation && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">
            ✓ Location Selected
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <p className="text-sm text-green-700">
              <span className="font-medium">
                Latitude:
              </span>{" "}
              {selectedLocation.latitude}
            </p>

            <p className="text-sm text-green-700">
              <span className="font-medium">
                Longitude:
              </span>{" "}
              {selectedLocation.longitude}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {locationError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">
            {locationError}
          </p>
        </div>
      )}

      {/* Instructions */}
      {!selectedLocation && !locationError && (
        <p className="text-sm text-gray-500 mt-3">
          Click anywhere on the map to select the problem
          location, or use your current location.
        </p>
      )}
    </div>
  );
}

export default LocationPicker;