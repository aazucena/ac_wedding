// utils/group.ts — collection utilities via lodash-es
import { groupBy as _groupBy, sortBy as _sortBy, orderBy as _orderBy } from 'lodash-es';

/**
 * Group an array of objects by a key.
 * e.g. groupBy(entourage, 'role.name')
 */
export function groupBy<T>(arr: T[], key: string): Record<string, T[]> {
  return _groupBy(arr, key) as Record<string, T[]>;
}

/**
 * Sort an array of objects by one or more keys.
 * e.g. sortBy(guests, ['table.number', 'person.last_name'])
 */
export function sortBy<T>(arr: T[], keys: string | string[]): T[] {
  return _sortBy(arr, Array.isArray(keys) ? keys : [keys]);
}

/**
 * Order an array with explicit direction per key.
 * e.g. orderBy(vendors, ['category', 'name'], ['asc', 'asc'])
 */
export function orderBy<T>(arr: T[], keys: string[], orders: Array<'asc' | 'desc'> = []): T[] {
  return _orderBy(arr, keys, orders);
}
