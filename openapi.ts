import type { CollectionMeta } from "./types.ts";
import { getSchema, getSubCollectionNames, getSubSchema } from "./utils.ts";

interface RouteData {
  tags: string[];
  summary?: string;
  description?: string;
  operationId: string;
  consumes: string[];
  parameters: ({
    in: string;
    name: string;
    description?: string;
    required?: boolean;
  } & Record<string, unknown>)[];
  responses: Record<number, { description?: string; schema?: unknown }>;
}

type RouteMethods = Record<string, RouteData>;

type Paths = Record<string, RouteMethods>;

const createPathsFromCollection = (collection: CollectionMeta): Paths => {
  const common = {
    tags: [collection.name],
    consumes: ["application/json"],
  };

  const idParam = {
    in: "path",
    name: `${collection.name}_id`,
    description: `${collection.name} id`,
    type: "string",
    required: true,
  };

  const bodyParam = {
    in: "body",
    name: "body",
    description: `${collection.name} document`,
    schema: getSchema(collection, { withoutSubCollections: true }),
  };

  const bodyParamFull = {
    in: "body",
    name: "body",
    description: `${collection.name} document`,
    schema: collection.schema,
  };

  const bodyParamPartial = {
    in: "body",
    name: "body",
    description: `${collection.name} document`,
    schema: getSchema(collection, {
      withoutSubCollections: true,
      partial: true,
    }),
  };

  const paths: Paths = {
    [`/api/${collection.name}`]: {
      get: {
        ...common,
        description: `list ${collection.name} documents`,
        operationId: `list_${collection.name}`,
        parameters: [],
        responses: {
          200: {
            schema: { type: "array", items: getSchema(collection) },
            description: "array of " + collection.name,
          },
        },
      },
      post: {
        ...common,
        description: `create ${collection.name}`,
        operationId: `create_${collection.name}`,
        parameters: [bodyParamFull],
        responses: {
          200: {
            schema: getSchema(collection, { withId: true }),
            description: "created " + collection.name,
          },
        },
      },
    },
    [`/api/${collection.name}/{${collection.name}_id}`]: {
      get: {
        ...common,
        description: `get one ${collection.name}`,
        operationId: `get_${collection.name}`,
        parameters: [idParam],
        responses: {
          200: {
            schema: getSchema(collection, {
              withoutSubCollections: true,
              withId: true,
            }),
            description: `${collection.name} document`,
          },
        },
      },
      patch: {
        ...common,
        description: `update one ${collection.name}`,
        operationId: `update_${collection.name}`,
        parameters: [idParam, bodyParamPartial],
        responses: {
          200: {
            schema: getSchema(collection, {
              withoutSubCollections: true,
              withId: true,
            }),
            description: `updated ${collection.name} document`,
          },
        },
      },
      put: {
        ...common,
        description: `replace one ${collection.name}`,
        operationId: `replace_${collection.name}`,
        parameters: [idParam, bodyParam],
        responses: {
          200: {
            schema: getSchema(collection, {
              withoutSubCollections: true,
              withId: true,
            }),
            description: `replaced ${collection.name} document`,
          },
        },
      },
      delete: {
        ...common,
        description: `delete one ${collection.name}`,
        operationId: `delete_${collection.name}`,
        parameters: [idParam],
        responses: {
          204: { description: "deleted " + collection.name },
        },
      },
    },
  };

  const subCollections = getSubCollectionNames(collection);

  subCollections.forEach((key) => {
    const schema = getSubSchema(collection, key) || {};

    const subSchemaWithId = {
      ...schema,
      properties: {
        ...(schema.properties || {}),
        _id: { type: "string" },
      },
    };

    const subBodyParam = {
      in: "body",
      name: "body",
      description: `${collection.name}.${key} document`,
      schema: schema,
    };

    const subBodyParamPartial = {
      in: "body",
      name: "body",
      description: `${collection.name}.${key} document`,
      schema: { ...schema, required: [] },
    };

    paths[`/api/${collection.name}/{${collection.name}_id}/${key}`] = {
      get: {
        ...common,
        description: `list ${collection.name}.${key} documents`,
        operationId: `list_${collection.name}_${key}`,
        parameters: [idParam],
        responses: {
          200: {
            schema: { type: "array", items: subSchemaWithId },
            description: "array of " + collection.name,
          },
        },
      },
      post: {
        ...common,
        description: `create ${collection.name} ${key}`,
        operationId: `create_${collection.name}_${key}`,
        parameters: [idParam, subBodyParam],
        responses: {
          200: {
            schema: subSchemaWithId,
            description: "created " + collection.name,
          },
        },
      },
    };

    const subIdParam = {
      in: "path",
      name: `${key}_id`,
      description: `${key} id`,
      type: "string",
      required: true,
    };

    paths[
      `/api/${collection.name}/{${collection.name}_id}/${key}/{${key}_id}`
    ] = {
      get: {
        ...common,
        description: `get one ${collection.name}.${key}`,
        operationId: `get_${collection.name}_${key}`,
        parameters: [idParam, subIdParam],
        responses: {
          200: {
            schema: subSchemaWithId,
            description: `${collection.name} document`,
          },
        },
      },
      patch: {
        ...common,
        description: `update one ${collection.name}.${key}`,
        operationId: `update_${collection.name}_${key}`,
        parameters: [idParam, subIdParam, subBodyParamPartial],
        responses: {
          200: {
            schema: subSchemaWithId,
            description: `updated ${collection.name}.${key} document`,
          },
        },
      },
      put: {
        ...common,
        description: `replace one ${collection.name}.${key}`,
        operationId: `replace_${collection.name}_${key}`,
        parameters: [idParam, subIdParam, subBodyParam],
        responses: {
          200: {
            schema: subSchemaWithId,
            description: `replaced ${collection.name}.${key} document`,
          },
        },
      },
      delete: {
        ...common,
        description: `delete one ${collection.name}.${key}`,
        operationId: `delete_${collection.name}_${key}`,
        parameters: [idParam, subIdParam],
        responses: {
          204: { description: `deleted ${collection.name}.${key}` },
        },
      },
    };
  });
  return paths;
};

export const getOpenApiSpec = (
  url: URL,
  collections: CollectionMeta[],
) => {
  const tags: { name: string; description: string }[] = [];
  const paths: Paths = {};

  for (const collection of collections) {
    const newPaths = createPathsFromCollection(collection);
    for (const [key, value] of Object.entries(newPaths)) {
      paths[key] = value;
    }
    tags.push({
      name: collection.name,
      description: `${collection.name} documents`,
    });
  }

  const spec = {
    swagger: "2.0",
    info: { title: `Tupplur ${url.hostname}`, version: "1.0" },
    host: url.host,
    schemes: [url.protocol.slice(0, -1)],
    securityDefinitions: {
      Bearer: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        description:
          'Enter the token with the "Bearer: " prefix, e.g. "Bearer abcde12345"',
      },
    },
    security: {
      Bearer: [],
    },
    tags,
    paths,
  };

  return spec;
};
