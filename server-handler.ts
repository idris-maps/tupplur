import { CorsConfig, Endpoint, Logger, Req, router } from "./deps.ts";
import {
  validateBySchema,
  validateCollection,
  validateCollectionAccess,
} from "./validate.ts";
import { sanitizeBySchema, sanitizeCollectionAccess } from "./sanitize.ts";
import { isAuthorized, isSuperUser } from "./auth.ts";
import initDb from "./db.ts";
import { CollectionMeta } from "./types.ts";
import { getOpenApiSpec } from "./openapi.ts";
import { getSubSchema } from "./utils.ts";

const getCollectionAndCheckAuth = async (
  req: Req,
  getCollection: (name: string) => Promise<CollectionMeta | undefined>,
): Promise<[collection: CollectionMeta] | [undefined, number]> => {
  const collection = await getCollection(req.params.name);
  if (!collection) return [undefined, 404];
  if (!isAuthorized(req.method, collection.access, req.headers)) {
    return [undefined, 401];
  }
  return [collection];
};

const getRoutes = async (dbPath?: string) => {
  const db = await initDb(dbPath);

  const routes: Endpoint[] = [
    // DOCS
    {
      method: "GET",
      path: "/",
      handler: (_, res) => res.file("./swagger/index.html"),
    },
    {
      method: "GET",
      path: "/assets/:file",
      handler: (req, res) => res.file(`./swagger/${req.params.file}`),
    },
    {
      method: "GET",
      path: "/swagger",
      handler: async (req, res) => {
        const collections = await db.listCollections();
        return res.json(getOpenApiSpec(req.url, collections));
      },
    },

    // COLLECTIONS
    {
      method: "GET",
      path: "/collections",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        return res.json(await db.listCollections());
      },
    },
    {
      method: "POST",
      path: "/collections",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        const [isValid, collection] = validateCollection(req.data);
        if (!isValid) return res.json({ message: collection }, { status: 400 });

        const exists = await db.getCollection(collection.name);
        if (exists) {
          return res.json({
            message: `collection name "${collection.name}" is already used`,
          }, { status: 400 });
        }

        await db.setCollection(
          collection.name,
          collection.schema,
          (collection.access || []).map(sanitizeCollectionAccess),
        );
        return res.json({ message: `created ${collection.name}` });
      },
    },
    {
      method: "PUT",
      path: "/collections",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        const [isValid, collection] = validateCollection(req.data);
        if (!isValid) return res.json({ message: collection }, { status: 400 });

        await db.setCollection(
          collection.name,
          collection.schema,
          (collection.access || []).map(sanitizeCollectionAccess),
        );
        return res.json({ message: `created ${collection.name}` });
      },
    },
    {
      method: "GET",
      path: "/collections/:name",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        const collection = await db.getCollection(req.params.name);
        return collection ? res.json(collection) : res.status(404);
      },
    },
    {
      method: "DELETE",
      path: "/collections/:name",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        await db.deleteCollection(req.params.name);
        return res.status(204);
      },
    },
    {
      method: "POST",
      path: "/collections/:name/access",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        const [isValid, access] = validateCollectionAccess(req.data);
        if (!isValid) {
          return res.json({ message: access }, { status: 400 });
        }

        const exists = await db.addCollectionAccess(req.params.name, access);
        return res.status(exists ? 204 : 404);
      },
    },
    {
      method: "DELETE",
      path: "/collections/:name/access/:key",
      handler: async (req, res) => {
        if (!isSuperUser(req.headers)) return res.status(401);

        const exists = await db.removeCollectionAccess(
          req.params.name,
          req.params.key,
        );
        return res.status(exists ? 204 : 404);
      },
    },

    // API
    {
      method: "GET",
      path: "/api/:name",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);
        return res.json(await db.listCollectionItems(collection.name));
      },
    },
    {
      method: "POST",
      path: "/api/:name",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const [isValid, data] = validateBySchema(collection.schema, req.data);
        if (!isValid) return res.json({ message: data }, { status: 400 });

        return res.json(
          await db.addCollectionItem(
            collection,
            sanitizeBySchema(collection.schema, data),
          ),
        );
      },
    },
    {
      method: "GET",
      path: "/api/:name/:id",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        return res.json(
          await db.getCollectionItem(collection.name, req.params.id),
        );
      },
    },
    {
      method: "PUT",
      path: "/api/:name/:id",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const [isValid, data] = validateBySchema(collection.schema, req.data);
        if (!isValid) return res.json({ message: data }, { status: 400 });

        const item = await db.setCollectionItem(
          collection,
          req.params.id,
          sanitizeBySchema(collection.schema, data),
          true,
        );
        if (!item) return res.status(404);

        return res.json(item);
      },
    },
    {
      method: "GET",
      path: "/api/:name/:id",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        return res.json(
          await db.getCollectionItem(collection.name, req.params.id),
        );
      },
    },
    {
      method: "PATCH",
      path: "/api/:name/:id",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const [isValid, data] = validateBySchema(
          collection.schema,
          req.data,
          true,
        );
        if (!isValid) return res.json({ message: data }, { status: 400 });

        const item = await db.setCollectionItem(
          collection,
          req.params.id,
          sanitizeBySchema(collection.schema, data),
          true,
        );
        if (!item) return res.status(404);

        return res.json(item);
      },
    },
    {
      method: "DELETE",
      path: "/api/:name/:id",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        await db.deleteCollectionItem(collection.name, req.params.id);
        return res.status(204);
      },
    },
    {
      method: "GET",
      path: "/api/:name/:id/:key",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);
        
        return res.json(
          await db.listSubCollectionItems(
            collection,
            req.params.id,
            req.params.key,
          ),
        );
      },
    },
    {
      method: "POST",
      path: "/api/:name/:id/:key",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const schema = getSubSchema(collection, req.params.key);
        if (!schema) return res.status(404);

        const [isValid, data] = validateBySchema(schema, req.data);
        if (!isValid) {
          return res.json({ message: data }, { status: 400 });
        }

        return res.json(
          await db.addSubCollectionItem(
            collection,
            req.params.id,
            req.params.key,
            sanitizeBySchema(schema, data),
          ),
        );
      },
    },
    {
      method: "GET",
      path: "/api/:name/:id/:key/:subId",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const item = await db.getSubCollectionItem(
          collection,
          req.params.id,
          req.params.key,
          req.params.subId,
        );
        if (!item) return res.status(404);
        return res.json(item);
      },
    },
    {
      method: "PUT",
      path: "/api/:name/:id/:key/:subId",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const schema = getSubSchema(collection, req.params.key);
        if (!schema) return res.status(404);

        const [isValid, data] = validateBySchema(schema, req.data);
        if (!isValid) {
          return res.json({ message: data }, { status: 400 });
        }
        const item = await db.setSubCollectionItem(
          collection,
          req.params.id,
          req.params.key,
          req.params.subId,
          sanitizeBySchema(schema, data),
          true,
        );
        if (!item) return res.status(404);
        return res.json(item);
      },
    },
    {
      method: "PATCH",
      path: "/api/:name/:id/:key/:subId",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        const schema = getSubSchema(collection, req.params.key);
        if (!schema) return res.status(404);

        const [isValid, data] = validateBySchema(
          { ...schema, required: [] },
          req.data,
        );
        if (!isValid) {
          return res.json({ message: data }, { status: 400 });
        }
        const item = await db.setSubCollectionItem(
          collection,
          req.params.id,
          req.params.key,
          req.params.subId,
          sanitizeBySchema(schema, data),
        );
        if (!item) return res.status(404);
        return res.json(item);
      },
    },
    {
      method: "DELETE",
      path: "/api/:name/:id/:key/:subId",
      handler: async (req, res) => {
        const [collection, status] = await getCollectionAndCheckAuth(
          req,
          db.getCollection,
        );
        if (!collection) return res.status(status);

        await db.deleteSubCollectionItem(
          collection,
          req.params.id,
          req.params.key,
          req.params.subId,
        );
        return res.status(204);
      },
    },
  ];

  return routes;
};

interface ServerProps {
  cors?: CorsConfig;
  dbPath?: string;
  logger?: Logger;
}

export default async ({ cors, dbPath, logger }: ServerProps = {}) =>
  router(
    await getRoutes(dbPath),
    logger,
    cors || { allowedMethods: "*", allowedOrigins: "*", preflight: true },
  );
