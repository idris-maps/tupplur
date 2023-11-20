import { ulid } from "./deps.ts";
import { getSubCollectionNames, omit } from "./utils.ts";
import { CollectionAccess, CollectionMeta } from "./types.ts";

const setCollection = (kv: Deno.Kv) =>
async (
  name: string,
  schema: Record<string, unknown>,
  access: CollectionAccess[] = [],
) => {
  await kv.set(["collection-meta", name], { schema, access });
};

const getCollection = (kv: Deno.Kv) =>
async (
  name: string,
): Promise<CollectionMeta | undefined> => {
  const { key, value } = await kv.get<Omit<CollectionMeta, "name">>([
    "collection-meta",
    name,
  ]);
  if (value) {
    return { ...value, name: String(key[1]) };
  }
  return undefined;
};

const listCollections = (kv: Deno.Kv) => async () => {
  const result: CollectionMeta[] = [];
  for await (
    const item of kv.list<Omit<CollectionMeta, "name">>({
      prefix: ["collection-meta"],
    })
  ) {
    result.push({ ...item.value, name: String(item.key[1]) });
  }
  return result;
};

const deleteCollection = (kv: Deno.Kv) => async (name: string) => {
  for await (const { key } of kv.list({ prefix: ["collection", name] })) {
    await kv.delete(key);
  }
  return kv.delete(["collection-meta", name]);
};

const addCollectionAccess =
  (kv: Deno.Kv) => async (name: string, accessItem: CollectionAccess) => {
    const collection = await getCollection(kv)(name);
    if (!collection) return false;
    const access = collection.access.filter((d) => d.key !== accessItem.key);
    access.push(accessItem);
    await setCollection(kv)(name, collection.schema, access);
    return true;
  };

const removeCollectionAccess =
  (kv: Deno.Kv) => async (name: string, key: string) => {
    const collection = await getCollection(kv)(name);
    if (!collection) return false;
    const access = collection.access.filter((d) => d.key !== key);
    await setCollection(kv)(name, collection.schema, access);
    return true;
  };

const insertCollectionItem =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(
    { collection, data, id, skipSubCollections }: {
      collection: CollectionMeta;
      data: T;
      id?: string;
      skipSubCollections?: boolean;
    },
  ) => {
    const _id = id || ulid();

    const subCollections = getSubCollectionNames(collection);

    await kv.set(
      ["collection", collection.name, _id],
      omit(subCollections, data),
    );
    const result: Record<string, unknown> = {
      _id,
      ...omit(subCollections, data),
    };

    if (!skipSubCollections) {
      for await (const key of subCollections) {
        const values = [];
        // @ts-ignore ?
        const items: Record<string, unknown>[] = Array.isArray(data[key])
          // @ts-ignore ?
          ? data[key]
          : [];
        for await (const item of items) {
          const sub_id = ulid();
          await kv.set(["collection", collection.name, _id, key, sub_id], item);
          values.push({ _id: sub_id, ...item });
        }
        result[key] = values;
      }
    }
    return result;
  };

const addCollectionItem = (kv: Deno.Kv) =>
<T = Record<string, unknown>>(
  collection: CollectionMeta,
  data: T,
) => insertCollectionItem(kv)({ collection, data });

const addSubCollectionItem =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(
    collection: CollectionMeta,
    _id: string,
    key: string,
    data: T,
  ) => {
    const subCollections = getSubCollectionNames(collection);
    if (!subCollections.includes(key)) return undefined;

    const _sub_id = ulid();
    await kv.set(["collection", collection.name, _id, key, _sub_id], data);
    return { _id: _sub_id, ...data };
  };

const getCollectionItem =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(name: string, _id: string) => {
    const res = await kv.get<T>(["collection", name, _id]);
    if (res.value) {
      return { _id, ...res.value };
    }
    return undefined;
  };

const getSubCollectionItem =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(
    collection: CollectionMeta,
    _id: string,
    key: string,
    _sub_id: string,
  ) => {
    const subCollections = getSubCollectionNames(collection);
    if (!subCollections.includes(key)) {
      return undefined;
    }
    const res = await kv.get<T>([
      "collection",
      collection.name,
      _id,
      key,
      _sub_id,
    ]);
    if (res.value) {
      return { _id, ...res.value };
    }
    return undefined;
  };

const setCollectionItem = (kv: Deno.Kv) =>
async <T = Record<string, unknown>>(
  collection: CollectionMeta,
  _id: string,
  data: T,
  put?: boolean,
) => {
  const item = await getCollectionItem(kv)(collection.name, _id);
  if (!item) return undefined;

  const { _id: _, ...rest } = item;
  const toSave = put ? data : { ...rest, ...data };
  return insertCollectionItem(kv)({
    collection,
    data: toSave,
    id: _id,
    skipSubCollections: true,
  });
};

const setSubCollectionItem =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(
    collection: CollectionMeta,
    _id: string,
    key: string,
    _sub_id: string,
    data: T,
    put?: boolean,
  ) => {
    const item = await getSubCollectionItem(kv)(collection, _id, key, _sub_id);
    if (!item) return undefined;

    const { _id: _, ...rest } = item;
    const toSave = put ? data : { ...rest, ...data };
    await kv.set(
      ["collection", collection.name, _id, key, _sub_id],
      toSave,
    );
    return { _id: _sub_id, ...toSave };
  };

const deleteCollectionItem =
  (kv: Deno.Kv) => async (name: string, _id: string) => {
    for await (const item of kv.list({ prefix: ["collection", name, _id] })) {
      await kv.delete(item.key);
    }
  };

const deleteSubCollectionItem = (kv: Deno.Kv) =>
async (
  collection: CollectionMeta,
  _id: string,
  key: string,
  _sub_id: string,
) => {
  const subCollections = getSubCollectionNames(collection);
  if (!subCollections.includes(key)) {
    return undefined;
  }
  await kv.delete(["collection", collection.name, _id, key, _sub_id]);
};

const listCollectionItems =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(
    name: string,
    filter: (d: T, i: number) => boolean = () => true,
  ) => {
    const result: (T & { _id: string })[] = [];
    let i = 0;
    for await (const item of kv.list<T>({ prefix: ["collection", name] })) {
      if (filter(item.value, i) && item.key.length === 3) {
        result.push({ ...item.value, _id: String(item.key[2]) });
      }
      i++;
    }
    return result;
  };

const listSubCollectionItems =
  (kv: Deno.Kv) =>
  async <T = Record<string, unknown>>(
    collection: CollectionMeta,
    _id: string,
    key: string,
    filter: (d: T, i: number) => boolean = () => true,
  ) => {
    const subCollections = getSubCollectionNames(collection);
    if (!subCollections.includes(key)) {
      return undefined;
    }
    const result: (T & { _id: string })[] = [];
    let i = 0;
    for await (
      const item of kv.list<T>({
        prefix: ["collection", collection.name, _id, key],
      })
    ) {
      if (filter(item.value, i) && item.key.length === 5) {
        result.push({ ...item.value, _id: String(item.key[4]) });
      }
      i++;
    }
    return result;
  };

export default async (path?: string) => {
  const kv = await Deno.openKv(path);

  return {
    setCollection: setCollection(kv),
    getCollection: getCollection(kv),
    listCollections: listCollections(kv),
    deleteCollection: deleteCollection(kv),
    addCollectionAccess: addCollectionAccess(kv),
    removeCollectionAccess: removeCollectionAccess(kv),
    getCollectionItem: getCollectionItem(kv),
    getSubCollectionItem: getSubCollectionItem(kv),
    addCollectionItem: addCollectionItem(kv),
    addSubCollectionItem: addSubCollectionItem(kv),
    setCollectionItem: setCollectionItem(kv),
    setSubCollectionItem: setSubCollectionItem(kv),
    deleteCollectionItem: deleteCollectionItem(kv),
    deleteSubCollectionItem: deleteSubCollectionItem(kv),
    listCollectionItems: listCollectionItems(kv),
    listSubCollectionItems: listSubCollectionItems(kv),
  };
};
