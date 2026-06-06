import { PING_NOINDEX_METADATA } from "@/lib/ping-site-seo";
import type { Metadata, Viewport } from "next";
import { StitchWaveClient } from "./stitch-wave-client";

export const metadata: Metadata = {
  ...PING_NOINDEX_METADATA,
  title: "Hologram U-Wave · Dot Field",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function StitchWavePage() {
  return <StitchWaveClient />;
}
