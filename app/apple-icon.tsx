import { ImageResponse } from "next/og";
import { AppIcon } from "./AppIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the artwork stays square.
export default function AppleIcon() {
  return new ImageResponse(<AppIcon size={180} rounded={false} />, size);
}
