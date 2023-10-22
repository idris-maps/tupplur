![tupplur](./swagger/favicon-32x32.png)

# tupplur

Create a quick rest api with
[JSON schema](https://json-schema.org/understanding-json-schema). Based on
[deno kv](https://deno.com/kv) for storage and [ajv](https://ajv.js.org/) for
validation.

## run locally

Create an `.env` file like this

```
SUPER_USER_KEY=hard_to_guess_string
DB_PATH=test.db
PORT=3333
```

- `SUPER_USER_KEY` is what you are going to use to authenticate when managing
  collections
- `DB_PATH` is where the data is going to be saved (if not defined, will use
  global deno kv store)
- `PORT` the port on which the service runs (defaults to 3333)

Start the server

```
deno run --allow-net --allow-read --allow-write --allow-env --unstable local.ts
```

Why all these permissions?

- `--allow-net` to accept incoming requests
- `--allow-read` to read the database
- `--allow-write` to write to the database
- `--allow-env` to read the `.env` file
- `--unstable` because deno kv still is

## create your first collection

Make a POST request to `/collections` with `name` (`string`) and `schema` (the
JSON schema) in the body and `Authentication: Bearer $SUPER_USER_KEY` in the
headers.

## manage access to the collection

Make a POST request to `/collections/:name/access`, with the same authentication
and a body like:

```json
{
  "key": "public",
  "get": true,
  "post": true,
  "patch": true,
  "put": true,
  "delete": true
}
```

This will allow anyone to make `get`, `post`, `patch`, `put` and `delete`
requests to `/api/:name` endpoints. Restrict by omiting methods or setting them
to `false`. By default only the super user has access to the endpoints.

The key `public` means the users do not need to be authenticated. If you want to
use it with other keys than `SUPER_USER_KEY` but still not it being public, use
whatever hard to guess string instead of `public` and use that in the
authentication header. You can have multiple keys with different access.

see [the example requests](./example.http) for more endpoints to manage
collections.

## use the api

Start the server and go to http://localhost:3333 (if you did not change the
port) to see and try the available endpoints.

# run on deno deploy

Create a project in https://dash.deno.com/projects

Add a `SUPER_USER_KEY` environment variable to manage collections.

Run:

```
deployctl deploy --project YOUR_PROJECT_NAME --token=YOUR_TOKEN deploy.ts
```
