import {
  isArraySchema,
  isRefSchema,
  isSimpleSchema,
  Schema,
  SchemaArray,
  SchemaObject,
  SchemaSimple,
} from "../types.ts";

function simpleSchemaToExample(schema: SchemaSimple) {
  switch (schema.type) {
    case "string":
      return "string";
    case "number":
      return 1;
    case "integer":
      return 1;
    case "boolean":
      return true;
    default:
      return schema.type;
  }
}

function objectSchemaToExample(schema: SchemaObject) {
  return Object.entries(schema.properties || {}).reduce(
    (o: Record<string, unknown>, [key, s]) => {
      o[key] = schemaToExample(s);
      return o;
    },
    {},
  );
}

function arraySchemaToExample(schema: SchemaArray) {
  return [schemaToExample(schema.items)];
}

export function schemaToExample(schema: Schema): unknown {
  if (isRefSchema(schema)) return {};
  if (isArraySchema(schema)) return arraySchemaToExample(schema);
  if (isSimpleSchema(schema)) return simpleSchemaToExample(schema);
  return objectSchemaToExample(schema);
}
