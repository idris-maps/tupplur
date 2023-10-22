import { Ajv } from "./deps.ts";
import { CollectionAccess, CollectionMeta } from "./types.ts";

type Schema = Record<string, unknown>;

export type ValidationSuccess<T> = [isValid: true, data: T];

export type ValidationFail = [isValid: false, error: string];

export type Validation<T> = ValidationFail | ValidationSuccess<T>;

const isString = (d: unknown): d is string => String(d) === d;

const isRecord = (d: unknown): d is Record<string, unknown> => {
  if (!d) return false;
  return typeof d === "object" &&
    Object.keys(d).every((key) => isString(key));
};

export const validateSchema = (schema: unknown): Validation<Schema> => {
  if (!isRecord(schema)) {
    return [false, "schema must be an object"];
  }

  if (schema.type !== "object" || !schema.properties) {
    return [
      false,
      'schema must have type "object" and have a "properties" key',
    ];
  }

  const ajv = new Ajv();
  // @ts-ignore ?
  const isValid: boolean = ajv.validateSchema(schema);
  if (isValid) {
    // @ts-ignore ?
    return [isValid, schema];
  } else {
    return [isValid, ajv.errorsText(ajv.errors)];
  }
};

export const validateBySchema = <T = Record<string, unknown>>(
  schema: Schema,
  data: unknown,
  partial?: boolean,
): Validation<T> => {
  // @ts-ignore ?
  const _schema = partial && schema.required
    // @ts-ignore ?
    ? { ...schema, required: [] }
    : schema;
  const ajv = new Ajv();
  const validate = ajv.compile(_schema);
  const isValid = validate(data);
  if (isValid) {
    // @ts-ignore ?
    return [isValid, data];
  } else {
    return [isValid, ajv.errorsText(validate.errors)];
  }
};

const isValidCollectionName = (name: unknown): name is string => {
  try {
    return isString(name) &&
      encodeURIComponent(name) === name &&
      name === name.toLowerCase();
  } catch {
    return false;
  }
};

export const validateCollectionName = (name: unknown): Validation<string> => {
  if (isValidCollectionName(name)) {
    return [true, name];
  } else {
    return [false, "collection name must be a lowercase uri component"];
  }
};

const collectionAccessSchema: Schema = {
  type: "object",
  properties: {
    key: { type: "string" },
    description: { type: "string" },
    get: { type: "boolean" },
    post: { type: "boolean" },
    patch: { type: "boolean" },
    put: { type: "boolean" },
    delete: { type: "boolean" },
  },
  required: [
    "key",
  ],
};

export const validateCollectionAccess = (
  data: unknown,
): Validation<CollectionAccess> =>
  validateBySchema(collectionAccessSchema, data);

export const validateCollectionAccesses = (
  data: unknown,
): Validation<CollectionAccess[]> =>
  validateBySchema({ type: "array", items: collectionAccessSchema }, data);

export const validateCollection = (
  data: unknown,
): Validation<CollectionMeta> => {
  if (!isRecord(data)) {
    return [false, "collection metadata must be an object"];
  }
  const [isValidName, name] = validateCollectionName(data.name);
  if (!isValidName) {
    return [false, name];
  }

  const [isValidSchema, schema] = validateSchema(data.schema);
  if (!isValidSchema) {
    return [false, schema];
  }

  const [isValidAccess, access] = validateCollectionAccesses(data.access || []);
  if (!isValidAccess) {
    return [false, access];
  }

  return [true, { name, schema, access }];
};
