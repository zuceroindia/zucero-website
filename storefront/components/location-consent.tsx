"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";

export function LocationConsent() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    queueMicrotask(() => setVisible(localStorage.getItem("zucero-location-choice") === null));
  }, []);

  function dismiss(choice: "later" | "allowed") {
    localStorage.setItem("zucero-location-choice", choice);
    setVisible(false);
  }

  function requestLocation() {
    if (!navigator.geolocation) return dismiss("later");
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        sessionStorage.setItem("zucero-location", JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }));
        setStatus("done");
        window.setTimeout(() => dismiss("allowed"), 500);
      },
      () => dismiss("later"),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 900000 }
    );
  }

  if (!visible) return null;
  return (
    <aside className="location-card" role="dialog" aria-label="Location preference" aria-live="polite">
      <button className="icon-button close" aria-label="Close location prompt" onClick={() => dismiss("later")}><X size={18} /></button>
      <MapPin className="location-icon" aria-hidden="true" />
      <div>
        <h2>Allow location access?</h2>
        <div className="button-row">
          <button className="button button-solid" onClick={requestLocation} disabled={status === "loading"}>
            {status === "loading" ? "Locating…" : status === "done" ? "Allowed" : "Allow"}
          </button>
          <button className="text-button" onClick={() => dismiss("later")}>Not now</button>
        </div>
      </div>
    </aside>
  );
}
