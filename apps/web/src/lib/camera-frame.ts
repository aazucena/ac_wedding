// lib/camera-frame.ts — what the viewfinder shows vs. what we capture.
//
// The viewfinder renders the stream with `object-fit: cover`, so the video is
// centre-cropped to the screen's aspect ratio. Capturing the whole video frame
// therefore saves MORE than the guest framed — the edges they never saw. This
// works out the source rectangle that matches the preview, and applies zoom on
// top of it.
//
// With one deliberate exception: the crop is capped at 16:9 either way up, so a
// photo's shape never becomes a function of the phone's shape. See the comment
// on the cap below.
//
// Pure and DOM-free on purpose: this is the maths that quietly ruins every
// photo if it's wrong, so it's unit-tested without a browser.

export interface SourceRectInput {
  /** Intrinsic video dimensions (videoWidth / videoHeight). */
  videoW: number;
  videoH: number;
  /** Displayed viewfinder box, in CSS pixels. */
  viewW: number;
  viewH: number;
  /** Digital zoom, 1 = no zoom. */
  zoom?: number;
  /**
   * Widest shape the crop is allowed to take, as a ratio (default 16:9).
   * Applied symmetrically, so portrait is capped at 9:16.
   */
  maxAspect?: number;
}

/** 16:9 — the shape of the stream we ask for, so this cap never crops a shot
 *  that already fits. See MAX_ASPECT's use below for why it exists. */
export const MAX_ASPECT = 16 / 9;

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * The region of the video that is actually visible in a `cover` viewfinder,
 * narrowed by `zoom` and centred.
 *
 * Degenerate inputs (a zero dimension, a video that hasn't loaded yet) fall
 * back to the full frame rather than throwing — a slightly wrong crop beats a
 * lost photo.
 */
export function coverSourceRect({
  videoW,
  videoH,
  viewW,
  viewH,
  zoom = 1,
  maxAspect = MAX_ASPECT,
}: SourceRectInput): SourceRect {
  const full = { sx: 0, sy: 0, sw: videoW, sh: videoH };
  if (!(videoW > 0 && videoH > 0)) return full;
  if (!(viewW > 0 && viewH > 0)) return full;

  const z = Math.max(1, zoom);
  const videoAspect = videoW / videoH;

  // A phone in landscape is about 2.2:1, and the address bar can push it past
  // 2.5:1 — but the sensor is 16:9. Cropping strictly to the screen would throw
  // away a third of the frame's height and save a letterbox sliver, which is
  // what "the photo looks skinny in landscape" actually is. Cap the shape here:
  // the preview stays full-bleed, and the saved photo keeps a little top and
  // bottom the guest couldn't see. Generous beats lossy — a shot can be cropped
  // later, but the pixels we never kept are gone.
  const cap = Math.max(1, maxAspect);
  const viewAspect = Math.min(Math.max(viewW / viewH, 1 / cap), cap);

  // `cover`: match that aspect ratio by trimming the longer axis.
  let sw = videoW;
  let sh = videoH;
  if (videoAspect > viewAspect) {
    sw = videoH * viewAspect; // video is wider — trim the sides
  } else if (videoAspect < viewAspect) {
    sh = videoW / viewAspect; // video is taller — trim top and bottom
  }

  // Zoom narrows the window further, around the same centre.
  sw /= z;
  sh /= z;

  return {
    sx: (videoW - sw) / 2,
    sy: (videoH - sh) / 2,
    sw,
    sh,
  };
}
