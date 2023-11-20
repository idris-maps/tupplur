export interface CollectionAccess {
  key: string;
  description?: string;
  get?: boolean;
  post?: boolean;
  patch?: boolean;
  put?: boolean;
  delete?: boolean;
}

export interface CollectionMeta {
  name: string;
  schema: Record<string, unknown>;
  access: CollectionAccess[];
}

export interface SchemaSimple extends Record<string, unknown> {
  type: string;
}

export interface SchemaObject {
  type: "object";
  properties: Record<string, Schema>;
  required?: string[];
}

export interface SchemaArray {
  type: "array";
  items: Schema;
}

export interface SchemaRef {
  $ref: string;
}

export type SchemaNotRef = SchemaArray | SchemaObject | SchemaSimple;
export type Schema = SchemaNotRef | SchemaRef;

export const isNotRefSchema = (d: Schema): d is SchemaNotRef =>
  Boolean(d) && Object.keys(d).includes("type");
export const isRefSchema = (d: Schema): d is SchemaRef =>
  Boolean(d) && Object.keys(d).includes("$ref");
export const isArraySchema = (d: Schema): d is SchemaArray =>
  isNotRefSchema(d) && d.type === "array";
export const isSimpleSchema = (d: Schema): d is SchemaSimple =>
  isNotRefSchema(d) && d.type !== "object" && d.type !== "array";

export interface SwaggerParameterCommon {
  in: "path" | "body" | "query";
  name: string;
  description?: string;
  required?: boolean;
}

export interface SwaggerParameterType extends SwaggerParameterCommon {
  type: string;
}

export interface SwaggerParameterSchema extends SwaggerParameterCommon {
  schema: Schema;
}

export const isSchemaParam = (
  d: SwaggerParameter,
): d is SwaggerParameterSchema => Object.keys(d).includes("schema");

export type SwaggerParameter = SwaggerParameterSchema | SwaggerParameterType;

export interface SwaggerPath {
  tags?: string[];
  consumes?: string[];
  description?: string;
  parameters?: SwaggerParameter[];
  responses: Record<string, { schema: Schema; description?: string }>;
  operationId?: string;
}

export interface Swagger {
  swagger: "2.0";
  info?: { title?: string; version?: string } & Record<string, unknown>;
  host: string;
  schemes?: string[];
  securityDefinitions: Record<string, unknown>;
  security: Record<string, unknown>;
  tags: { name?: string; description?: string }[];
  paths: {
    [path: string]: {
      [method: string]: SwaggerPath;
    };
  };
  definitions?: Record<string, Schema>;
}

export interface TagData {
  name: string;
  description?: string;
  paths: {
    path: string;
    method: string;
    data: SwaggerPath;
  }[];
  host: string;
}
