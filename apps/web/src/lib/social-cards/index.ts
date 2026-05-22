import satori from "satori";
import sharp from "sharp";
import { THEMES, FONTS, type CardData, type SocialTheme } from "./helpers";
import { buildSquare, buildDM, buildStory } from "./save-the-date";
import {
  buildSplitPanel,
  buildVignette,
  buildBordered,
  buildEngagement,
} from "./special";
import {
  buildRsvpReminder,
  buildCountdown,
  buildWeddingMorning,
  buildThankYou,
} from "./event";

export type { SocialTheme, CardData } from "./helpers";

export type SocialFormat =
  | "square"
  | "split"
  | "vignette"
  | "bordered"
  | "dm"
  | "story";

export type CardVariant =
  | "save-the-date"
  | "engagement"
  | "rsvp-reminder"
  | "countdown"
  | "wedding-morning"
  | "thank-you";

const DIMS: Record<SocialFormat, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  split: { w: 1080, h: 1080 },
  vignette: { w: 1080, h: 1080 },
  bordered: { w: 1080, h: 1080 },
  dm: { w: 1200, h: 630 },
  story: { w: 1080, h: 1920 },
};

export async function renderSocialCard(
  format: SocialFormat,
  data: CardData,
  photoSrc: string | null = null,
  theme: SocialTheme = "light",
  variant: CardVariant = "save-the-date",
): Promise<Buffer> {
  const { w, h: ht } = DIMS[format];
  const t = THEMES[theme];

  const tree =
    format === "split"
      ? buildSplitPanel(data, photoSrc, t)
      : format === "vignette"
        ? buildVignette(data, photoSrc, t)
        : format === "bordered"
          ? buildBordered(data, photoSrc, t)
          : format === "dm"
            ? buildDM(data, photoSrc, t)
            : format === "story"
              ? buildStory(data, photoSrc, t)
              : // square — variant-aware
                variant === "engagement"
                ? buildEngagement(data, photoSrc, t)
                : variant === "rsvp-reminder"
                  ? buildRsvpReminder(data, photoSrc, t)
                  : variant === "countdown"
                    ? buildCountdown(data, photoSrc, t)
                    : variant === "wedding-morning"
                      ? buildWeddingMorning(data, photoSrc, t)
                      : variant === "thank-you"
                        ? buildThankYou(data, photoSrc, t)
                        : buildSquare(data, photoSrc, t);

  const svg = await satori(tree, { width: w, height: ht, fonts: FONTS });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
