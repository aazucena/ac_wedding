// lib/api/ceremony.ts
import { get } from '../directus';
import type { Ceremonies, Clergies, Entourage, Readings } from '../types';

export async function getCeremony(): Promise<Ceremonies> {
  try {
    return await get<Ceremonies[]>('/items/ceremonies', {
      fields: ['*', 'venue.*', 'clergy.*', 'programs.*'],
    }).then((data) => data[0] ?? { id: '1', start_time: '14:00:00', estimated_duration_minutes: 90, dress_code: 'Formal', status: 'planning' });
  } catch {
    return { id: '1', start_time: '14:00:00', estimated_duration: 90, dress_code: 'Formal', status: 'planning' } as Ceremonies;
  }
}

export async function getClergies(): Promise<Clergies[]> {
  try {
    return await get<Clergies[]>('/items/clergies', {
      fields: ['id', 'title', 'parish', 'person.id', 'person.first_name', 'person.last_name', 'person.preferred_name'],
    });
  } catch {
    return [];
  }
}

export async function getReadings(): Promise<Readings[]> {
  try {
    return await get<Readings[]>('/items/readings', {
      fields: ['id', 'label', 'type', 'book', 'chapter', 'verse_start', 'verse_end', 'reader.id', 'reader.first_name', 'reader.last_name', 'reader.preferred_name'],
      filter: { reader_confirmed: { _eq: true } },
      sort: ['type'],
    });
  } catch {
    return [];
  }
}

export async function getEntourage(): Promise<Entourage[]> {
  try {
    return await get<Entourage[]>('/items/entourage', {
      fields: ['id', 'sequence_order', 'pair_group', 'confirmed', 'person.id', 'person.first_name', 'person.last_name', 'person.preferred_name', 'person.gender', 'role.id', 'role.name'],
      sort: ['role.name', 'sequence_order'],
    });
  } catch {
    return [];
  }
}
