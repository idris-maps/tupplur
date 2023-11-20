import {
  isArraySchema,
  isRefSchema,
  isSchemaParam,
  isSimpleSchema,
  Schema,
  Swagger,
  SwaggerParameter,
  SwaggerPath,
  TagData,
} from "../types.ts";
import { schemaToExample } from "./schema-to-example.ts";

const paramOrder = {
  "path": 0,
  "query": 1,
  "body": 2,
};

export const orderParams = (parameters: SwaggerParameter[]) =>
  parameters.sort(
    (a, b) => (paramOrder[a.in] || 10) > (paramOrder[b.in] || 10) ? -1 : 1,
  );

const getBodyExample = (data: SwaggerPath) => {
  const found = data.parameters?.find((d) => d.in === "body");
  return found && isSchemaParam(found)
    ? schemaToExample(found.schema)
    : undefined;
};

export const curlExample = (
  host: string,
  path: string,
  method: string,
  data: SwaggerPath,
) => {
  const example = getBodyExample(data);
  const bodyData = example
    ? [
      `  -H "Content-Type: application/json"`,
      `  -d '${JSON.stringify(example)}'`,
    ]
    : [];
  return [
    `curl -X ${method.toUpperCase()}`,
    ...bodyData,
    "  " + host + path,
  ].join(" \\\n");
};

export const fetchExample = (
  host: string,
  path: string,
  method: string,
  data: SwaggerPath,
) => {
  const url = host + path;
  const config: Record<string, unknown> = { method: method.toUpperCase() };
  const example = getBodyExample(data);
  if (example) {
    config.headers = {
      "Content-Type": "application/json",
    };
    config.body = JSON.stringify(example);
  }
  const configString = JSON.stringify(config, null, 2).split("\n").map((d) =>
    "  " + d
  );
  return [
    "await fetch(",
    `  "${url}",`,
    ...configString,
    ")",
  ].join(`\n`);
};

export const prepareData = (swagger: Swagger) => {
  const tagDescriptions = new Map<string, string>();

  if (swagger.tags) {
    swagger.tags.forEach(({ name, description }) => {
      if (name && description) {
        tagDescriptions.set(name, description);
      }
    });
  }

  const tagPaths = new Map<
    string,
    [path: string, method: string, data: SwaggerPath][]
  >();

  const definitions = new Map<string, Schema>();
  Object.entries(swagger.definitions || {}).forEach(([name, schema]) => {
    definitions.set(`#/definitions/${name}`, schema);
  });

  const fixSchema = (schema: Schema): Schema => {
    if (isSimpleSchema(schema)) {
      return schema;
    }
    if (isRefSchema(schema)) {
      const s = definitions.get(schema.$ref);
      return s ? fixSchema(s) : schema;
    }
    if (isArraySchema(schema)) {
      if (isRefSchema(schema.items)) {
        return { ...schema, items: fixSchema(schema.items) };
      }
      return schema;
    }
    Object.entries(schema.properties || {}).forEach(([key, s]) => {
      schema.properties[key] = fixSchema(s);
    });
    return schema;
  };

  const fixRef = (data: SwaggerPath) => {
    (data.parameters || []).forEach((param) => {
      if (isSchemaParam(param)) {
        param.schema = fixSchema(param.schema);
      }
    });

    Object.entries(data.responses).forEach(([key, value]) => {
      if (data.responses[key].schema) {
        data.responses[key].schema = fixSchema(value.schema);
      }
    });

    return data;
  };

  Object.entries(swagger.paths)
    .map(([path, o]) =>
      Object.entries(o).forEach(([method, data]) => {
        (data.tags || ["No tags"]).forEach((tagName) => {
          const paths = tagPaths.get(tagName) || [];
          paths.push([path, method, fixRef(data)]);
          tagPaths.set(tagName, paths);
        });
      })
    );

  const data: TagData[] = [];
  for (const [tagName, paths] of tagPaths) {
    data.push({
      name: tagName,
      description: tagDescriptions.get(tagName),
      paths: paths.map(([path, method, data]) => ({ path, method, data })),
      host: swagger.host,
    });
  }

  return data;
};
