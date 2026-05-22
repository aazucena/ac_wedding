import satori from "satori";
import { readFileSync } from "fs";
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

function loadFont(pkg: string, file: string): ArrayBuffer {
  const buf = readFileSync(resolve(`node_modules/${pkg}/files/${file}.woff`));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const CG = "cormorant-garamond";
const CG_ITALIC = loadFont(`@fontsource/${CG}`, `${CG}-latin-300-italic`);
const CG_NORMAL = loadFont(`@fontsource/${CG}`, `${CG}-latin-400-normal`);
const JOST_400 = loadFont("@fontsource/jost", "jost-latin-400-normal");
const JOST_600 = loadFont("@fontsource/jost", "jost-latin-600-normal");

export const FONTS: Parameters<typeof satori>[1]["fonts"] = [
  { name: "CG", data: CG_ITALIC, weight: 300, style: "italic" },
  { name: "CG", data: CG_NORMAL, weight: 400, style: "normal" },
  { name: "Jost", data: JOST_400, weight: 400, style: "normal" },
  { name: "Jost", data: JOST_600, weight: 600, style: "normal" },
];

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
