// e2e/rsvp.spec.ts — RSVP critical-path test
//
// Prerequisites:
//   pnpm directus:start && pnpm seed   (Directus + seeded test fixture)
//   TEST_RSVP_TOKEN in .env.local      (set to 'playwright-e2e-test-token')
//
// The test only touches the dedicated __Playwright Test Party fixture.
// beforeAll resets it to "pending" so re-runs are safe and real guest data is untouched.

import { test, expect, type Page } from '@playwright/test';

const TEST_TOKEN   = process.env.TEST_RSVP_TOKEN ?? 'playwright-e2e-test-token';
const DIRECTUS_URL = process.env.DIRECTUS_URL     ?? 'http://localhost:8055';
// Prefer DIRECTUS_ADMIN_TOKEN (root .env.local); fall back to DIRECTUS_TOKEN (apps/web/.env.local)
const API_TOKEN    = process.env.DIRECTUS_ADMIN_TOKEN ?? process.env.DIRECTUS_TOKEN ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json', ...init?.headers },
  });
  return res.json() as Promise<{ data: unknown }>;
}

async function resetTestFixture() {
  // Find the test party by its stable rsvp_token
  const partyRes = await fetchJson(
    `${DIRECTUS_URL}/items/parties?filter[rsvp_token][_eq]=${TEST_TOKEN}&fields=id`,
  );
  const party = (partyRes.data as { id: string }[] | null)?.[0];
  if (!party) return; // fixture not seeded yet — test will fail with a clear message

  // Reset party to pending state
  await fetchJson(`${DIRECTUS_URL}/items/parties/${party.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'pending',
      hotel: false,
      transportation: false,
      song_request: null,
      message_to_couple: null,
      date_rsvp_submitted: null,
    }),
  });

  // Reset all guests in the test party
  const guestRes = await fetchJson(
    `${DIRECTUS_URL}/items/guests?filter[party][_eq]=${party.id}&fields=id`,
  );
  for (const guest of (guestRes.data as { id: string }[] | null) ?? []) {
    await fetchJson(`${DIRECTUS_URL}/items/guests/${guest.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        attending: null,
        attendance: null,
        meal_preference: 'standard',
        dietary_restrictions: null,
      }),
    });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  // Reset the fixture before the suite so repeated runs always start clean
  await resetTestFixture();
});

test('RSVP — attending happy path', async ({ page }: { page: Page }) => {
  await page.goto(`/rsvp/${TEST_TOKEN}`);

  // The party name should appear in the greeting
  await expect(page.locator('.guest-name')).toContainText('Playwright');

  // First accordion auto-opens after 200 ms
  await page.waitForTimeout(400);

  // Select "Joyfully accepts" for the first guest
  await page.locator('select[id^="response-"]').first().selectOption('attending');

  // Submit wrap becomes visible once all guests have responded
  await expect(page.locator('#submit-wrap')).toBeVisible();

  // Submit the RSVP
  await page.locator('#submit-btn').click();

  // Success state appears
  await expect(page.locator('#state-success')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.success-title')).toContainText('Thank you!');
});
