import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PreMayeso";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background:
            "linear-gradient(135deg, #fff7ef 0%, #fffdf8 55%, #eff8f7 100%)",
          color: "#132033",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 74,
              height: 74,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              background: "#0f766e",
              color: "white",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            PM
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700 }}>PreMayeso</div>
            <div style={{ fontSize: 18, color: "#4b5563" }}>
              Malawi MANEB exam preparation
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.05 }}>
            JCE is live first.
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.3, color: "#334155" }}>
            Learn with lessons, revision guidance, and published paper support built
            for Malawi learners.
          </div>
        </div>
      </div>
    ),
    size
  );
}
