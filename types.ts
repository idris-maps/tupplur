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
