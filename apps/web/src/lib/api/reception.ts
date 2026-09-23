// lib/api/reception.ts
import { get } from "../directus";
import type { Reception, Persons, Tables } from "../types";

export async function getReception(): Promise<Reception> {
  try {
    return await get<Reception[]>("/items/reception", {
      fields: ["*", "venue.*", "tables.*", "programs.*"],
    }).then(
      (data) =>
        data[0] ?? { id: "1", start_time: "18:00:00", status: "planning" },
    );
  } catch {
    return { id: "1", start_time: "18:00:00", status: "planning" } as Reception;
  }
}

export async function getTables(): Promise<Tables[]> {
  try {
    return await get<Tables[]>("/items/tables", {
      fields: ["id", "number", "name", "capacity", "section"],
      filter: { status: { _neq: "inactive" } },
      sort: ["reception_sort", "number"],
      limit: 100,
    });
  } catch {
    return [];
  }
}

/**
 * Person IDs whose guest record isn't a confirmed "attending". Seating lives on
 * persons.table, but only guests carry `attending` — non-guests (parents,
 * vendor staff) have no guest record and are always considered seated.
 */
async function getNonAttendingPersonIds(): Promise<Set<string>> {
  const rows = await get<{ person: string | null }[]>("/items/guests", {
    filter: {
      _or: [{ attending: { _eq: false } }, { attending: { _null: true } }],
    },
    fields: ["person"],
    limit: -1,
  });
  return new Set(rows.map((r) => r.person).filter((id): id is string => !!id));
}

async function withoutNonAttending<T extends { id: string }>(
  rows: T[],
): Promise<T[]> {
  const excluded = await getNonAttendingPersonIds();
  return rows.filter((r) => !excluded.has(r.id));
}

export async function getSeatedPersons(): Promise<Persons[]> {
  try {
    const persons = await get<Persons[]>("/items/persons", {
      fields: [
        "id",
        "first_name",
        "last_name",
        "preferred_name",
        "table.id",
        "table.number",
        "table.name",
      ],
      filter: { table: { _nnull: true } },
      sort: ["table.number", "table_sort", "last_name", "first_name"],
      limit: 500,
    });
    return await withoutNonAttending(persons);
  } catch {
    return [];
  }
}

const SEATING_PERSON_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "preferred_name",
  "table.id",
  "table.number",
  "table.name",
  "table.section",
  "table.party.name",
];

/**
 * Name search over seated people, for the seat finder and the Roll Call gate.
 *
 * Vendors are excluded here but NOT in getSeatedPersons: the photographer and
 * coordinator still need a place card at their seat, they just shouldn't turn
 * up when a guest searches for themselves.
 */
export async function searchSeatedPersons(nameFilter: object): Promise<any[]> {
  try {
    const persons = await get<any[]>("/items/persons", {
      filter: {
        ...nameFilter,
        table: { _nnull: true },
        vendor: { _null: true },
      },
      fields: SEATING_PERSON_FIELDS,
      // Over-fetch so non-attendees filtered below don't eat result slots
      limit: 25,
    });
    return (await withoutNonAttending(persons)).slice(0, 10);
  } catch {
    return [];
  }
}

export async function getTablemates(tableIds: string[]): Promise<any[]> {
  try {
    const persons = await get<any[]>("/items/persons", {
      filter: { table: { _in: tableIds } },
      fields: ["id", "first_name", "last_name", "preferred_name", "table.id"],
      sort: ["table_sort", "last_name", "first_name"],
      limit: 200,
    });
    return await withoutNonAttending(persons);
  } catch {
    return [];
  }
}
