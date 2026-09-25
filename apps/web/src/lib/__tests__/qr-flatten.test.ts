// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import QRCodeStyling from "qr-code-styling";
import { flattenClipPaths } from "../qr-flatten";

const COLOR = "#1a1a2e";
const URL = "https://wedding.aazucena.com/camera";

/** Build a real code the way QRCode.astro does, and hand back its <svg>. */
function buildQR(errorCorrectionLevel: "M" | "H" = "M"): SVGElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new QRCodeStyling({
    type: "svg",
    width: 260,
    height: 260,
    data: URL,
    margin: 0,
    qrOptions: { errorCorrectionLevel },
    dotsOptions: { type: "dots", color: COLOR },
    cornersSquareOptions: { type: "extra-rounded", color: COLOR },
    cornersDotOptions: { type: "dot", color: COLOR },
    backgroundOptions: { color: "transparent" },
  }).append(host);
  const svg = host.querySelector("svg");
  if (!svg) throw new Error("qr-code-styling produced no <svg>");
  return svg;
}

describe("flattenClipPaths", () => {
  let svg: SVGElement;

  /** The rect carrying the module dots, as opposed to the background or a corner. */
  const dotsRect = () => {
    const el = svg.querySelector('[clip-path*="clip-path-dot-color"]');
    if (!el) throw new Error("no dots rect — library structure changed");
    return el;
  };
  const dotsClipPath = () => {
    const el = svg.querySelector('clipPath[id*="clip-path-dot-color"]');
    if (!el) throw new Error("no dots clipPath — library structure changed");
    return el;
  };
  /** Every shape held in a clipPath, across all regions. */
  const stencilShapes = () => svg.querySelectorAll("clipPath > *").length;

  beforeEach(() => {
    document.body.innerHTML = "";
    svg = buildQR();
  });

  it("confirms the library really does ship a clipped solid rect", () => {
    // If this ever fails the library changed shape and the rest of this file
    // is testing a problem that no longer exists.
    //
    // Ground truth for this version: 8 clipped rects — one transparent
    // background, one for the dots, and six for the three corner markers
    // (square + centre dot each).
    const dots = dotsRect();
    expect(dots.tagName.toLowerCase()).toBe("rect");
    expect(dots.getAttribute("fill")).toBe(COLOR);

    // The reason this breaks printers: one clipPath, hundreds of subpaths.
    expect(dotsClipPath().children.length).toBeGreaterThan(300);
  });

  it("leaves no clip-path anywhere — the whole point", () => {
    expect(flattenClipPaths(svg)).toBeGreaterThan(0);
    expect(svg.querySelectorAll("clipPath")).toHaveLength(0);
    expect(svg.querySelectorAll("[clip-path]")).toHaveLength(0);
  });

  it("keeps every shape, now carrying the colour itself", () => {
    const before = stencilShapes();
    expect(before).toBeGreaterThan(300); // a real code, not a stub

    flattenClipPaths(svg);

    // Every stencil shape should have moved into a filled group, none dropped.
    const groups = Array.from(svg.querySelectorAll("g[fill]"));
    const moved = groups.reduce((n, g) => n + g.children.length, 0);
    expect(moved).toBe(before);

    // And the colour ones account for all but the transparent background rect.
    const inked = groups
      .filter((g) => g.getAttribute("fill") === COLOR)
      .reduce((n, g) => n + g.children.length, 0);
    expect(inked).toBe(before - 1);
  });

  it("drops the solid rect that caused the square", () => {
    // The rect is the thing that printed as a flat block. After flattening no
    // element should be painting the module colour across the whole canvas.
    flattenClipPaths(svg);
    const fullBleed = Array.from(svg.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("fill") === COLOR,
    );
    expect(fullBleed).toHaveLength(0);
  });

  it("holds at error-correction H, the densest case", () => {
    const before = stencilShapes();
    const dense = buildQR("H");
    // H is why the sign failed: materially more subpaths in that one clipPath.
    expect(dense.querySelectorAll("clipPath > *").length).toBeGreaterThan(
      before,
    );
    expect(flattenClipPaths(dense)).toBeGreaterThan(0);
    expect(dense.querySelectorAll("[clip-path]")).toHaveLength(0);
    expect(dense.querySelectorAll("clipPath")).toHaveLength(0);
  });

  it("is safe to run twice", () => {
    flattenClipPaths(svg);
    const after = svg.innerHTML;
    expect(flattenClipPaths(svg)).toBe(0);
    expect(svg.innerHTML).toBe(after);
  });

  it("leaves gradient fills alone", () => {
    // Re-filling each dot from a gradient would give every dot its own ramp
    // instead of one sweep across the code, so those regions are skipped.
    const dots = dotsRect();
    dots.setAttribute("fill", "url('#some-gradient')");

    flattenClipPaths(svg);

    expect(dots.getAttribute("clip-path")).toBeTruthy();
    expect(dotsClipPath().children.length).toBeGreaterThan(300);
    // The corners are solid, so those still flatten.
    expect(svg.querySelectorAll("[clip-path]")).toHaveLength(1);
  });
});
