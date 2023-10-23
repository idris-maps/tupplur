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

export const getSubSchema = (
  collection: CollectionMeta,
  key: string,
): Record<string, unknown> | undefined =>
  // @ts-ignore ?
  ((collection.schema?.properties || {})[key] || {}).items;

const getSubCollectionNamesFromSchema = (schema: CollectionMeta["schema"]) =>
  Object.entries(schema.properties || {})
    .reduce((all: string[], [name, d]) => {
      if (d.type === "array" && d.items && d.items?.type === "object") {
        all.push(name);
      }
      return all;
    }, []);

export const getSubCollectionNames = (collection: CollectionMeta) =>
  getSubCollectionNamesFromSchema(collection.schema);

const removeSubCollectionsFromSchema = (schema: CollectionMeta["schema"]) => {
  const subCollections = getSubCollectionNamesFromSchema(schema);
  if (!subCollections.length) return schema;
  if (schema.properties) {
    return {
      ...schema,
      properties: omit(subCollections, schema.properties),
      required: Array.isArray(schema.required)
        ? schema.required.filter((d) => !subCollections.includes(d))
        : schema.required,
    };
  }
  return schema;
};

const addIdToSchema = (schema: CollectionMeta["schema"]) => {
  if (schema.properties) {
    return {
      ...schema,
      properties: {
        ...schema.properties,
        _id: { type: "string" },
      },
    };
  }
  return schema;
};

export const getSchema = (
  collection: CollectionMeta,
  config: {
    withId?: boolean;
    withoutSubCollections?: boolean;
    partial?: boolean;
  } = {},
) => {
  let schema = collection.schema;
  if (config.withId) {
    schema = addIdToSchema(schema);
  }
  if (config.withoutSubCollections) {
    schema = removeSubCollectionsFromSchema(schema);
  }
  if (config.partial) {
    schema.required = [];
  }
  return schema;
};
