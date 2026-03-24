// lib/api/game.ts
import { get } from '../directus';

export interface GameSubmission {
  id: string;
  fileId: string;
  guestName: string;
  squareNumber: number;
  fileUrl: string;
  uploadedAt: string;
  title: string | null;
  description: string | null;
  approved: boolean | null;
}

type RawMemory = {
  id: string;
  title: string | null;
  description: string | null;
  date_created: string;
  approved: boolean | null;
  image: { id: string; title: string; description?: string };
  guest: { person: { first_name: string; last_name: string; preferred_name: string | null } } | null;
};

export async function getGameProofFiles(): Promise<GameSubmission[]> {
  try {
    const items = await get<RawMemory[]>('/items/memories', {
      filter: { source: { _eq: 'game' } },
      fields: [
        'id', 'title', 'description', 'date_created', 'approved',
        'image.id', 'image.title', 'image.description',
        'guest.person.first_name', 'guest.person.last_name', 'guest.person.preferred_name',
      ],
      limit: -1,
      sort: ['-date_created'],
    });
    return items.map((m) => {
      const match = m.image.title?.match(/^Game Proof — (.+?) · Square #(\d+)$/);
      const isAutoTitle = !!match;

      const fullName = m.guest?.person
        ? [m.guest.person.preferred_name ?? m.guest.person.first_name, m.guest.person.last_name]
            .filter(Boolean).join(' ')
        : (match?.[1] ?? 'Unknown');

      return {
        id:           m.id,
        fileId:       m.image?.id ?? m.id,
        guestName:    fullName,
        squareNumber: match ? parseInt(match[2]!, 10) : 0,
        fileUrl:      `/assets/${m.image?.id}`,
        uploadedAt:   m.date_created,
        title:        isAutoTitle ? null : (m.title ?? null),
        description:  m.description ?? null,
        approved:     m.approved ?? null,
      };
    });
  } catch {
    return [];
  }
}
