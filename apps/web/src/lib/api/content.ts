// lib/api/content.ts
import { get } from '../directus';
import type { Gallery, Sponsors, Vendors, Registries, Accomodations, Events, Memories } from '../types';

export async function getMemories(): Promise<Memories[]> {
  try {
    return await get<Memories[]>('/items/memories', {
      fields: ['id', 'title', 'description', 'image.id', 'date_created'],
      filter: { approved: { _eq: true } },
      sort: ['-date_created'],
      limit: 200,
    });
  } catch {
    return [];
  }
}

export async function getGallery(): Promise<Gallery[]> {
  try {
    return await get<Gallery[]>('/items/gallery', {
      fields: ['id', 'title', 'description', 'image.id', 'sort', 'status'],
      filter: { status: { _eq: 'published' } },
      sort: ['sort', 'date_created'],
      limit: 50,
    });
  } catch {
    return [];
  }
}

// alias for backward compat
export { getGallery as getGalleryPhotos };

export async function getSponsors(): Promise<Sponsors[]> {
  try {
    return await get<Sponsors[]>('/items/sponsors', {
      fields: ['id', 'role', 'confirmed', 'person.id', 'person.first_name', 'person.last_name', 'person.middle_name', 'person.preferred_name', 'partner.id'],
      filter: { confirmed: { _eq: true } },
      sort: ['role'],
    });
  } catch {
    return [];
  }
}

export async function getSponsorsFull(): Promise<Sponsors[]> {
  try {
    return await get<Sponsors[]>('/items/sponsors', {
      fields: [
        'id', 'sort', 'role', 'confirmed',
        'person.id', 'person.first_name', 'person.last_name', 'person.preferred_name',
        'partner.id',
        'partner.person.id', 'partner.person.first_name',
        'partner.person.last_name', 'partner.person.preferred_name',
      ],
      filter: { confirmed: { _eq: true } },
      sort: ['role', 'sort'],
    });
  } catch {
    return [];
  }
}

export async function getVendors(): Promise<Vendors[]> {
  try {
    return await get<Vendors[]>('/items/vendors', {
      fields: ['id', 'name', 'subtitle', 'category', 'sort', 'featured', 'website', 'status', 'maps_url', 'email', 'phone', 'address_line1', 'city', 'image.id', 'logo.id', 'contacts.first_name', 'contacts.last_name', 'contacts.preferred_name', 'contacts.email', 'contacts.phone', 'social_media'],
      filter: { status: { _eq: 'booked' } },
      sort: ['-featured', 'sort', 'name'],
    });
  } catch {
    return [];
  }
}

export async function getRegistries(): Promise<Registries[]> {
  try {
    return await get<Registries[]>('/items/registries', {
      fields: ['id', 'name', 'url', 'notes', 'sort'],
      filter: { status: { _neq: 'archived' } },
      sort: ['sort'],
    });
  } catch {
    return [];
  }
}

export async function getAccommodations(): Promise<Accomodations[]> {
  try {
    return await get<Accomodations[]>('/items/accomodations', {
      fields: ['id', 'sort', 'status', 'description', 'price', 'currency', 'notes', 'booking_url', 'booking_deadline', 'vendor.name', 'vendor.address_line1', 'vendor.city', 'vendor.phone', 'vendor.website', 'vendor.maps_url'],
      filter: { status: { _eq: 'confirmed' } },
      sort: ['sort'],
    });
  } catch {
    return [];
  }
}

export async function getEvents(): Promise<Events[]> {
  try {
    return await get<Events[]>('/items/events', {
      fields: ['id', 'name', 'date', 'start_time', 'end_time', 'status', 'notes', 'venue.name', 'venue.maps_url', 'host.first_name', 'host.last_name'],
      filter: { public: { _eq: true } },
      sort: ['date', 'start_time'],
    });
  } catch {
    return [];
  }
}
