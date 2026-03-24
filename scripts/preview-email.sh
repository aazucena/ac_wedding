#!/usr/bin/env bash
# scripts/preview-email.sh
# Renders the invitation.liquid template locally using the Directus container's
# LiquidJS install and opens the result in the browser.
# Images are base64-encoded and inlined so they display without a live server.
#
# Usage:
#   ./scripts/preview-email.sh            # renders and opens in browser
#   ./scripts/preview-email.sh --no-open  # renders only, no browser

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER="aazucena-wedding-cms"
LIQUIDJS="/directus/node_modules/.pnpm/liquidjs@10.25.0/node_modules/liquidjs"
TEMPLATES_DIR="$SCRIPT_DIR/../packages/directus/templates"
ASSETS_DIR="$SCRIPT_DIR/../apps/web/src/assets"
OUTPUT="$SCRIPT_DIR/../tmp/email-preview.html"

mkdir -p "$SCRIPT_DIR/../tmp"

# ── Copy assets into the mounted templates volume so the container can read them
cp "$ASSETS_DIR/hero_emblem.png"  "$TEMPLATES_DIR/_preview_emblem.png"
cp "$ASSETS_DIR/insignia.png" "$TEMPLATES_DIR/_preview_insignia.png"

cleanup() {
  rm -f "$TEMPLATES_DIR/_preview_emblem.png"
  rm -f "$TEMPLATES_DIR/_preview_insignia.png"
  rm -f "$TEMPLATES_DIR/_preview_output.html"
}
trap cleanup EXIT

echo "Rendering invitation.liquid..."

docker exec "$CONTAINER" node -e "
const { Liquid } = require('$LIQUIDJS');
const fs = require('fs');

const engine = new Liquid({
  root: '/directus/templates',
  extname: '',
  strictFilters: false,
  strictVariables: false,
});

// Read assets from mounted templates volume and encode as data URIs
const emblemB64   = fs.readFileSync('/directus/templates/_preview_emblem.png').toString('base64');
const insigniaB64 = fs.readFileSync('/directus/templates/_preview_insignia.png').toString('base64');
const emblemUri   = 'data:image/png;base64,' + emblemB64;
const insigniaUri = 'data:image/png;base64,' + insigniaB64;

const DIRECTUS_URL = 'http://localhost:8055';
const EMBLEM_ID    = '__EMBLEM__';
const INSIGNIA_ID  = '__INSIGNIA__';

const data = {
  read_wedding_settings: {
    color_primary:   '#A8D4B8',
    color_secondary: '#C5B8E0',
    hashtag:         'AldrinAndChristine2026',
    email:           'no-reply@aazucena.com',
    rsvp_deadline:   'August 1, 2026',
    emblem:          EMBLEM_ID,
    insignia:        INSIGNIA_ID,
    groom: { first_name: 'Eissa Aldrin',  last_name: 'Azucena' },
    bride: { first_name: 'Ma. Christine', last_name: 'Ranada'  },
    ceremony: {
      start_time: '10:00:00',
      venue: {
        name:          'St. Paul Metropolitan Cathedral',
        address_line1: 'J.P. Laurel Highway',
        city:          'Lipa City, Batangas',
        maps_url:      'https://maps.google.com',
      },
    },
    reception: {
      start_time: '18:00:00',
      venue: {
        name:          'Southseas Signature Lodge',
        address_line1: 'Lodging Road',
        city:          'Lipa City, Batangas',
      },
    },
    accomodation: {
      vendor:      { name: 'Sandman Signature Hotel' },
      booking_url: 'https://sandmansignaturehotels.com',
    },
  },
  read_guest: {
    name:       'Santos Family',
    rsvp_token: 'preview-token-1234',
    representative: {
      first_name: 'Juan',
      last_name:  'Santos',
      email:      'juan@example.com',
    },
  },
  constants: {
    public_url:   'https://wedding.aazucena.com',
    directus_url: DIRECTUS_URL,
  },
};

engine.renderFile('invitation.liquid', data)
  .then(html => {
    // Replace placeholder asset URLs with inline base64 data URIs
    html = html.replaceAll(DIRECTUS_URL + '/assets/' + EMBLEM_ID,   emblemUri);
    html = html.replaceAll(DIRECTUS_URL + '/assets/' + INSIGNIA_ID, insigniaUri);
    fs.writeFileSync('/directus/templates/_preview_output.html', html);
    console.log('OK');
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
"

cp "$TEMPLATES_DIR/_preview_output.html" "$OUTPUT"
echo "Saved → tmp/email-preview.html"

if [[ "${1:-}" != "--no-open" ]]; then
  if command -v xdg-open &>/dev/null; then
    xdg-open "$OUTPUT"
  elif command -v open &>/dev/null; then
    open "$OUTPUT"
  fi
fi
