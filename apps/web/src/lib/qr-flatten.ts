// lib/qr-flatten.ts — make a qr-code-styling SVG safe to send to a printer.
//
// The library doesn't draw dots. It paints ONE solid <rect> of the module
// colour and clips it to a <clipPath> holding every dot as its own subpath. A
// browser composites that fine. A printer's raster image processor has a
// clip-path complexity budget, and an error-correction-H code is ~2000
// subpaths in a single clipPath — past the limit it renders part of the code,
// gives up, and floods the rest with the unclipped rect. That is how the Roll
// Call sign came off the press as a solid green square.
//
// So we remove the clipping rather than hope: move the shapes out of the
// clipPath into a filled <g>, and delete the clipPath and the rect it masked.
// Identical vector artwork, nothing left to choke on.

/** Pulls the id out of `clip-path="url('#id')"` — quoted or not. */
function clipPathId(value: string | null): string | null {
  return /url\(['"]?#([^'")]+)['"]?\)/.exec(value ?? "")?.[1] ?? null;
}

/**
 * Replace every clipped fill in `svg` with directly-filled shapes, in place.
 *
 * Returns the number of regions flattened. Anything unrecognised is left
 * exactly as the library built it — a code that prints badly beats one we
 * mangled — so 0 means "nothing matched", not "failed".
 */
export function flattenClipPaths(svg: SVGElement | Element): number {
  let flattened = 0;
  const clipPaths = Array.from(svg.querySelectorAll("clipPath"));

  for (const clipped of Array.from(svg.querySelectorAll("[clip-path]"))) {
    const id = clipPathId(clipped.getAttribute("clip-path"));
    if (!id) continue;

    // Matching on .id rather than a selector keeps this off CSS.escape, which
    // isn't guaranteed everywhere this runs.
    const clipPath = clipPaths.find((c) => c.id === id);
    if (!clipPath?.firstChild) continue;

    // A gradient is resolved against the RECT's bounding box. Re-fill the dots
    // individually and each one gets its own ramp instead of one sweep across
    // the code, so leave gradients alone. Nothing here uses them yet; this is
    // a guard for whoever adds one.
    const fill = clipped.getAttribute("fill");
    if (!fill || fill.includes("url(")) continue;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("fill", fill);
    const opacity = clipped.getAttribute("opacity");
    if (opacity) group.setAttribute("opacity", opacity);

    // The shapes carry no fill of their own — they were only ever a stencil —
    // so they inherit the group's.
    while (clipPath.firstChild) group.appendChild(clipPath.firstChild);

    clipped.replaceWith(group);
    clipPath.remove();
    flattened++;
  }

  return flattened;
}
