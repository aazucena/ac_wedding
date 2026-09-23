// lib/constants/camera.ts — Roll Call (/camera)

/**
 * Shots per guest for the reception's disposable camera.
 *
 * Deliberately a constant rather than a Directus field: one less thing to
 * misconfigure on the night, and the number is printed on the table cards
 * anyway, so changing it live was never really an option.
 */
export const SHOT_LIMIT = 12;

/**
 * Longest caption a guest can attach to a shot. Enforced in three places: the
 * input's maxlength, the live counter beside it, and a truncate on the server —
 * the first two are courtesy, the last one is the rule.
 */
export const CAPTION_MAX = 120;

/** Value written to `memories.source` for Roll Call photos. */
export const CAMERA_SOURCE = "camera";
