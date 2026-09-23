// lib/device.ts — server-side device sniffing for /camera.
//
// User-agent parsing is a heuristic, not a fact: it's here to get the FIRST
// PAINT right, so a phone never flashes a "scan this QR code" panel. The client
// pass in camera.astro is what makes the decision correct — most importantly
// for iPadOS 13+, which reports a desktop Mac user-agent and can only be told
// apart by navigator.maxTouchPoints.

/**
 * True when the user-agent looks like a phone or tablet.
 *
 * Known to return false for an iPad on iPadOS 13+ (it claims to be a Mac) —
 * the client-side touch check corrects that case.
 */
export function isHandheldUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return (
    // phones and most tablets announce one of these outright
    /Android|iPhone|iPod|iPad|Windows Phone|IEMobile|Opera Mini/i.test(ua) ||
    // generic tokens: Mobile Safari, Firefox "Tablet", Kindle/Silk, BlackBerry
    /Mobile|Tablet|Silk|Kindle|PlayBook|BB10|webOS/i.test(ua)
  );
}
