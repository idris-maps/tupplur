import { CollectionAccess } from "./types.ts";

type Schema = Record<string, unknown>;

export const sanitizeCollectionAccess = (
  data: CollectionAccess,
): CollectionAccess => {
  const booleanKeys = ["get", "post", "patch", "put", "delete"];
  const stringKeys = ["key", "description"];
  // @ts-ignore ?
  return Object.entries(data).reduce((r, [key, value]) => {
    if (booleanKeys.includes(key)) {
      // @ts-ignore ?
      r[key] = value === true;
    }
    if (stringKeys.includes(key)) {
      // @ts-ignore ?
      r[key] = String(value);
    }
    return r;
  }, {});
};

export const sanitizeBySchema = <T = Record<string, unknown>>(
  schema: Schema,
  data: T,
): T => {
  // @ts-ignore ?
  const allowedKeys: string = Object.keys(schema.properties || {});
  // @ts-ignore ?
  return Object.entries(data).reduce((r, [key, value]) => {
    if (allowedKeys.includes(key)) {
      // @ts-ignore ?
      r[key] = value;
    }
    return r;
  }, {});
};
