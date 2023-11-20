import { html } from "../deps.ts";
import {
  isSchemaParam,
  Schema,
  SwaggerParameter,
  SwaggerParameterSchema,
  SwaggerParameterType,
  SwaggerPath,
  TagData,
} from "../types.ts";
import { schemaToExample } from "./schema-to-example.ts";
import { curlExample, fetchExample, orderParams } from "./utils.ts";

const IconWrapper = (content: string, className = "") =>
  html`
  <svg viewBox="0 0 24 24" class="${className}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;position:relative;top:0.15em;">
    ${content}
  </svg>`;

const IconDown = IconWrapper(
  html`<polyline points="6 9 12 15 18 9"></polyline>`,
  "icon-down",
);

const IconUp = IconWrapper(
  html`<polyline points="18 15 12 9 6 15"/>`,
  "icon-up",
);

const SchemaWithExample = (d: Schema) => {
  const id = crypto.randomUUID();
  return html`
      <div style="--tabs:2">
      <input type="radio" name="${id}" id="${id}_1" checked>
      <label for="${id}_1">Example</label>
      <div>
        <pre>${JSON.stringify(schemaToExample(d), null, 2)}</pre>
      </div>
      <input type="radio" name="${id}" id="${id}_0">
      <label for="${id}_0">Schema</label>
      <div>
        <pre>${JSON.stringify(d, null, 2)}</pre>
      </div>
    </div>
  `;
};

const SchemaParameter = (d: SwaggerParameterSchema) =>
  html`
    <h4>${d.in}</h4>
    ${
    d.description && d.description !== d.name
      ? html`<div class="param-description">${d.description}</div>`
      : ""
  }
    ${SchemaWithExample(d.schema)}
  `;

const OtherParameter = (d: SwaggerParameterType) => {
  let tableData = [["in", d.in], ["type", d.type]];
  if (d.required) tableData.push(["required", "true"]);
  if (d.description) tableData = [["description", d.description], ...tableData];

  return html`
    <h4>${d.name}</h4>
    <table>
      <tbody>
        ${
    tableData.map(([key, value]) => {
      return html`
            <tr>
              <th>${key}</th>
              <td>${value}</td>
            </tr>
          `;
    })
  }
      </tbody>
    </table>
  `;
};

const Parameter = (d: SwaggerParameter) =>
  isSchemaParam(d) ? SchemaParameter(d) : OtherParameter(d);

const Parameters = (parameters: SwaggerParameter[] = []) => {
  const params = parameters.filter((d) => d.in !== "path");
  if (!params.length) return undefined;
  return html`<h3>Parameters</h3>` +
    orderParams(params).map((d) => Parameter(d)).join("");
};

const Responses = (data: SwaggerPath) => {
  const parts = Object.entries(data.responses).map((
    [status, { schema, description }],
  ) =>
    html`
      <h4>${status}</h4>
      ${description ? html`<p>${description}</p>` : ""}
      ${schema ? SchemaWithExample(schema) : ""}
    `
  );

  return parts.length
    ? html`
    <h3>Responses</h3>
    ${parts.join("")}
  `
    : "";
};

const Requests = (
  host: string,
  path: string,
  method: string,
  data: SwaggerPath,
) => {
  if (data.consumes && !data.consumes.includes("application/json")) {
    return "";
  }

  const id = crypto.randomUUID();
  return html`
    <h3>Request</h3>
    <div style="--tabs:2">
      <input type="radio" name="${id}" id="${id}_0" checked>
      <label for="${id}_0">curl</label>
      <div>
        <pre>${curlExample(host, path, method, data)}</pre>
      </div>
      <input type="radio" name="${id}" id="${id}_1">
      <label for="${id}_1">js fetch</label>
      <div>
          <pre>${fetchExample(host, path, method, data)}</pre>
      </div>
    </div>
  `;
};

export const Path = (
  host: string,
  path: string,
  method: string,
  data: SwaggerPath,
) => {
  return html`
    <details>
      <summary>
        <div class="method method-${method}">${method}</div>
        <div class="path">${path}</div>
        <div class="icon">
          ${IconDown}
          ${IconUp}
        </div>
      </summary>
      <div class="path-details">
        ${Parameters(data.parameters)}
        ${Requests(host, path, method, data)}
        ${Responses(data)}
      </div>
    </details>
  `;
};

export const Tag = ({ name, description, paths, host }: TagData) =>
  html`
    <h2>
      ${name}
      ${description ? html`<small>${description}</small>` : ""}
    </h2>
    ${
    paths.map(({ path, method, data }) => Path(host, path, method, data)).join(
      "",
    )
  }
  `;

export const PageWrapper = (main: string, css?: string) =>
  html`
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
        ${css ? html`<style>${css}</style>` : ""}
      </head>
      <body>
        <main>${main}</main>
      </body>
    </html>
  `;
