import satori from "satori";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve } from "path";

export const MINT = "#A8D4B8";
export const LAVENDER = "#C5B8E0";

export type SocialTheme = "light" | "dark";

export interface Theme {
  bg: string;
  bgGrad: string;
  bgGradLeft: string;
  text: string;
  text85: string;
  text55: string;
  eyebrow: string;
  scrimStart: string;
  scrimMid: string;
  scrimEnd: string;
}

export const THEMES: Record<SocialTheme, Theme> = {
  light: {
    bg: "#c5ded1",
    bgGrad: "linear-gradient(145deg, #c5ded1 0%, #b8d4c6 100%)",
    bgGradLeft: "linear-gradient(155deg, #b8d4c6, #c5ded1)",
    text: "#1a1a2e",
    text85: "rgba(26,26,46,0.85)",
    text55: "rgba(26,26,46,0.50)",
    eyebrow: "rgba(26,26,46,0.55)",
    scrimStart: "rgba(197,222,209,0.92)",
    scrimMid: "rgba(197,222,209,0.60)",
    scrimEnd: "rgba(197,222,209,0.05)",
  },
  dark: {
    bg: "#1a1a2e",
    bgGrad: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f1f2e 100%)",
    bgGradLeft: "linear-gradient(155deg, #16213e, #1a1a2e)",
    text: "#c5ded1",
    text85: "rgba(197,222,209,0.85)",
    text55: "rgba(197,222,209,0.55)",
    eyebrow: "#A8D4B8",
    scrimStart: "rgba(26,26,46,0.80)",
    scrimMid: "rgba(26,26,46,0.40)",
    scrimEnd: "rgba(26,26,46,0.10)",
  },
};

// Satori needs the font bytes, so these are read from disk rather than linked.
// They used to come from node_modules/@fontsource/... at module scope, which
// broke on Vercel: the tracer only bundles files it can see statically, so the
// .woff never shipped and the read threw during module import — taking the
// whole /api/social route down with a 500 (every request since 2026-06-18).
//
// Now the files are vendored in src/assets/fonts and force-copied into the
// function by `includeFiles` in astro.config.mjs. Their path relative to the
// function's cwd depends on the monorepo layout, so try each plausible root
// instead of betting on one.
const FONT_DIRS = [
  resolve("apps/web/src/assets/fonts"),
  resolve("src/assets/fonts"),
  // Relative to this module: src/lib/social-cards/ in dev, dist/server/chunks/
  // once bundled.
  fileURLToPath(new URL("../../assets/fonts", import.meta.url)),
  fileURLToPath(new URL("../../../src/assets/fonts", import.meta.url)),
];

function loadFont(file: string): ArrayBuffer {
  const tried: string[] = [];
  for (const dir of FONT_DIRS) {
    const path = `${dir}/${file}.woff`;
    try {
      const buf = readFileSync(path);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch {
      tried.push(path);
    }
  }
  throw new Error(
    `[social-cards] font ${file}.woff not found — looked in: ${tried.join(", ")}`,
  );
}

const CG = "cormorant-garamond";

let cached: Parameters<typeof satori>[1]["fonts"] | null = null;

/**
 * Loaded on first render, not at import. A missing font then fails the one
 * request with a real error instead of breaking the whole route on startup.
 */
export function getFonts(): Parameters<typeof satori>[1]["fonts"] {
  if (!cached) {
    cached = [
      {
        name: "CG",
        data: loadFont(`${CG}-latin-300-italic`),
        weight: 300,
        style: "italic",
      },
      {
        name: "CG",
        data: loadFont(`${CG}-latin-400-normal`),
        weight: 400,
        style: "normal",
      },
      {
        name: "Jost",
        data: loadFont("jost-latin-400-normal"),
        weight: 400,
        style: "normal",
      },
      {
        name: "Jost",
        data: loadFont("jost-latin-600-normal"),
        weight: 600,
        style: "normal",
      },
    ];
  }
  return cached;
}

export type El = Record<string, any>;
export type Child = El | string | null | undefined | false;

export function h(
  tag: string,
  style: Record<string, any> = {},
  ...children: Child[]
): El {
  const valid = children.filter(Boolean) as (El | string)[];
  return {
    type: tag,
    props: {
      style,
      children:
        valid.length === 0 ? undefined : valid.length === 1 ? valid[0] : valid,
    },
  };
}

export function gradBar(w: number, h_: number = 6): El {
  return h("div", {
    width: w,
    height: h_,
    flexShrink: 0,
    backgroundImage: `linear-gradient(90deg, ${MINT}, ${LAVENDER}, ${MINT})`,
  });
}

export function diamondRule(width: number): El {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: 12, width },
    h("div", {
      flex: 1,
      height: 1,
      backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER})`,
    }),
    h(
      "div",
      { fontFamily: "CG", fontStyle: "italic", fontSize: 9, color: LAVENDER },
      "◆",
    ),
    h("div", {
      flex: 1,
      height: 1,
      backgroundImage: `linear-gradient(90deg, ${LAVENDER}, transparent)`,
    }),
  );
}

export function andRow(width: number, fontSize = 22): El {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: 20, width },
    h("div", {
      flex: 1,
      height: 1,
      backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER})`,
    }),
    h(
      "span",
      {
        fontFamily: "CG",
        fontStyle: "italic",
        fontSize,
        color: LAVENDER,
        fontWeight: 300,
      },
      "and",
    ),
    h("div", {
      flex: 1,
      height: 1,
      backgroundImage: `linear-gradient(90deg, ${LAVENDER}, transparent)`,
    }),
  );
}

export function photoScrim(
  w: number,
  h_: number,
  photoSrc: string,
  t: Theme,
  scrimDir = "to top",
): El[] {
  return [
    {
      type: "img",
      props: {
        src: photoSrc,
        width: w,
        height: h_,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          objectFit: "cover",
          objectPosition: "center center",
        },
      },
    },
    h("div", {
      position: "absolute",
      top: 0,
      left: 0,
      width: w,
      height: h_,
      backgroundImage: `linear-gradient(${scrimDir}, ${t.scrimStart} 0%, ${t.scrimMid} 55%, ${t.scrimEnd} 100%)`,
    }),
  ];
}

export interface CardData {
  groom: string;
  bride: string;
  date: string;
  day: string;
  location: string;
  hashtag: string;
  ceremonyVenue: string;
  ceremonyTime: string;
  receptionVenue: string;
  receptionTime: string;
  rsvpDeadline: string;
  siteUrl: string;
  daysTo?: number;
}
