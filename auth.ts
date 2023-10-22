import { CollectionAccess } from "./types.ts";

export const isSuperUser = (headers: Headers) => {
  const authorizationHeader = headers.get("authorization");
  if (!authorizationHeader) return false;
  if (!authorizationHeader.startsWith("Bearer")) return false;
  const token = authorizationHeader.slice(7);
  const SUPER_USER_KEY = Deno.env.get("SUPER_USER_KEY");
  if (!SUPER_USER_KEY) return false;
  return token === SUPER_USER_KEY;
};

export const isAuthorized = (
  method: string,
  access: CollectionAccess[] = [],
  headers: Headers,
) => {
  const authorizationHeader = headers.get("authorization");
  if (isSuperUser(headers)) return true;
  const token = authorizationHeader ? authorizationHeader.slice(7) : undefined;
  const accesses = access.filter((d) =>
    d.key === "public" || token && d.key === token
  );

  const _method = method.toLowerCase();
  let res = false;
  for (const a of accesses) {
    // @ts-ignore ?
    if (a[_method]) res = true;
  }
  return res;
};
