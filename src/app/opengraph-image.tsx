import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static social-preview card, rendered at build/request time via next/og —
// same "Ascending Path" mark as the favicon/header logo (see
// src/components/Logo.tsx), just laid out for a 1200x630 link preview.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              backgroundColor: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 40 40">
              <path d="M10 16.5 L20 11 L30 16.5 L20 22 Z" fill="#ffffff" />
              <path
                d="M14 19 L14 25 Q20 29 26 25 L26 19"
                stroke="#ffffff"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M30 16.5 V23" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#0f172a" }}>
            Enrol<span style={{ color: "#4f46e5" }}>Easy</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#475569" }}>
          CRM &amp; Accounting for study-abroad consultancies
        </div>
      </div>
    ),
    { ...size }
  );
}
