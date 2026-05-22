// lib/api/reception.ts
import { get } from "../directus";
import type { Reception, Guests, Tables } from "../types";

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

export async function getGuests(): Promise<Guests[]> {
  try {
    return await get<Guests[]>("/items/guests", {
      fields: [
        "id",
        "attending",
        "person.id",
        "person.first_name",
        "person.last_name",
        "person.preferred_name",
        "table.id",
        "table.number",
        "table.name",
      ],
      filter: { attending: { _eq: true }, table: { _nnull: true } },
      sort: ["table.number", "person.last_name", "person.first_name"],
      limit: 500,
    });
  } catch {
    return [];
  }
}

// alias for backward compatibility
export { getGuests as getGuestsWithTables };

const SEATING_GUEST_FIELDS = [
  "id",
  "person.first_name",
  "person.last_name",
  "person.preferred_name",
  "table.id",
  "table.number",
  "table.name",
  "table.section",
  "table.party.name",
];

export async function searchGuestsForSeating(
  nameFilter: object,
): Promise<any[]> {
  try {
    return await get<any[]>("/items/guests", {
      filter: {
        ...nameFilter,
        attending: { _eq: true },
        table: { _nnull: true },
      },
      fields: SEATING_GUEST_FIELDS,
      limit: 10,
    });
  } catch {
    return [];
  }
}

export async function getTablemates(tableIds: string[]): Promise<any[]> {
  try {
    return await get<any[]>("/items/guests", {
      filter: { table: { _in: tableIds }, attending: { _eq: true } },
      fields: [
        "id",
        "person.first_name",
        "person.last_name",
        "person.preferred_name",
        "table.id",
      ],
      sort: ["person.last_name", "person.first_name"],
      limit: 200,
    });
  } catch {
    return [];
  }
}
