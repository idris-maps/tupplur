import { Swagger } from "../types.ts";
import { prepareData } from "./utils.ts";
import { PageWrapper, Tag } from "./components.ts";
import { default as css } from "./css.ts";

export const swaggerPage = (swagger: Swagger) => {
  const tags = prepareData(swagger);
  return PageWrapper(tags.map((d) => Tag(d)).join(""), css);
};
