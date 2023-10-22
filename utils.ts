import { CollectionMeta } from "./types.ts";

export const omit = <T, K extends string>(
  keys: readonly K[],
  obj: T,
): Omit<T, K> =>
  // @ts-ignore ?
  Object.entries(obj).reduce((keep: Partial<T>, [k, v]) => {
    // @ts-ignore ?
    if (!keys.includes(k)) keep[k] = v;
    return keep;
  }, {});

export const getSubCollectionNames = (collection: CollectionMeta) =>
  Object.entries(collection.schema.properties || {})
    .reduce((all: string[], [name, d]) => {
      if (d.type === "array" && d.items && d.items?.type === "object") {
        all.push(name);
      }
      return all;
    }, []);

export const getSubSchema = (
  collection: CollectionMeta,
  key: string,
): Record<string, unknown> | undefined =>
  // @ts-ignore ?
  ((collection.schema?.properties || {})[key] || {}).items;
