// lib/api/settings.ts
import { get } from '../directus';
import type { WeddingSettings } from '../types';

const SETTINGS_FALLBACK: WeddingSettings = {
  id:               '1',
  wedding_date:     '2026-09-26',
  hashtag:          '#AldrinAndChristine2026',
  color_primary:    '#A8D4B8',
  color_secondary:  '#C5B8E0',
  rsvp_enabled:     true,
  overall_budget:   undefined,
  estimated_guests: undefined,
  confirmed_guests: undefined,
  bride: { id: '', first_name: 'Christine', last_name: 'Ranada' },
  groom: { id: '', first_name: 'Aldrin',    last_name: 'Plata'  },
};

export async function getSettings(): Promise<WeddingSettings> {
  try {
    return await get<WeddingSettings>('/items/wedding_settings', {
      fields: [
        '*',
        'bride.id', 'bride.first_name', 'bride.last_name', 'bride.middle_name', 'bride.preferred_name',
        'groom.id', 'groom.first_name', 'groom.last_name', 'groom.middle_name', 'groom.preferred_name',
        'story.id', 'story.title', 'story.headline', 'story.summary',
        'story.cover_image.id', 'story.cover_image.width', 'story.cover_image.height', 'story.cover_image.focal_point_x', 'story.cover_image.focal_point_y',
        'story.chapters.id', 'story.chapters.sort', 'story.chapters.headline', 'story.chapters.icon', 'story.chapters.title', 'story.chapters.content', 'story.chapters.image.id', 'story.chapters.image.width', 'story.chapters.image.height', 'story.chapters.image.focal_point_x', 'story.chapters.image.focal_point_y',
        'accomodation.id', 'accomodation.sort', 'accomodation.description', 'accomodation.price', 'accomodation.currency', 'accomodation.notes', 'accomodation.booking_url', 'accomodation.booking_deadline',
        'accomodation.vendor.name', 'accomodation.vendor.address_line1', 'accomodation.vendor.city', 'accomodation.vendor.phone', 'accomodation.vendor.website', 'accomodation.vendor.maps_url',
        'ceremony.start_time', 'ceremony.estimated_duration',
        'ceremony.venue.name', 'ceremony.venue.maps_url',
        'reception.id', 'reception.cocktail_hour_time', 'reception.start_time', 'reception.end_time',
        'reception.venue.name', 'reception.venue.maps_url',
        'return_address_line1', 'return_address_city', 'return_address_region', 'return_address_postal_code',
        'photographer.id', 'photographer.name', 'photographer.subtitle', 'photographer.website', 'photographer.logo.id',
      ],
    });
  } catch {
    return SETTINGS_FALLBACK;
  }
}

export async function getMaintenanceStatus(): Promise<boolean> {
  try {
    const data = await get<WeddingSettings>('/items/wedding_settings', { fields: ['maintenance'] });
    return data.maintenance === true;
  } catch {
    return false;
  }
}

export async function getContactDetails(): Promise<{ email?: string; phone?: string }> {
  try {
    const data = await get<WeddingSettings>('/items/wedding_settings', { fields: ['email', 'phone'] });
    return { email: data.email, phone: data.phone };
  } catch {
    return {};
  }
}

export async function getFaqs(): Promise<WeddingSettings['faqs']> {
  try {
    const setting = await getSettings();
    return setting.faqs ?? [];
  } catch {
    return [];
  }
}
