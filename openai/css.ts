export default `
:root {
  --black: #242933;
  --black2: #3b4252;
  --white: #eceff4;
  --white2: #e5e9f0;
  --blue: #2f5686;
  --lightblue: #81a1c1;
  --green-blue: #8fbcbb;
  --red: #bf616a;
  --orange: #d08770;
  --yellow: #ebcb8b;
  --green: #a3be8c;
  --purple: #b48ead;

  --color: var(--black);
  --color-bg: var(--white);
  --primary: var(--blue);

  --font-size: 20px;
  --font: ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif;;
  --font-monospace: 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color: var(--white);
    --color-bg: var(--black);
    --primary: var(--green-blue);
  }
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font);
  font-size: var(--font-size);
  width: 100%;
  color: var(--color);
  background-color: var(--color-bg);
}

main {
  width: 90%;
  max-width: 1200px;
  margin: auto;
  margin-top: 2em;
  margin-bottom: 3em;
}

h2 small {
  margin-left: 1em;
  font-size: 0.6em;
}

summary {
  display: grid;
  grid-template-columns: 5em auto 1.5em;
  column-gap: 2em;
  padding: 0.5em;
  border-bottom: 1px dotted;
}

summary .method,
summary .path {
  display: inline-block;
  cursor: pointer;
  padding: .3em 0;
}

summary .method {
  background-color: var(--white2);
  color: var(--black);
  text-align: center;
  max-height: 1.1em;
}

summary .method-get {
  background-color: var(--lightblue);
}

summary .method-post {
  background-color: var(--green);
}

summary .method-put {
  background-color: var(--orange);
}

summary .method-patch {
  background-color: var(--yellow);
}

summary .method-delete {
  background-color: var(--red);
}

.icon-down,
.icon-up {
  cursor: pointer;
}

details .icon-down {
  display: block;
}

details .icon-up {
  display: none;
}

details[open] .icon-down {
  display: none;
}

details[open] .icon-up {
  display: block;
}

.path-details {
  margin-left: 1em;
}

.path-details > * {
  margin-left: 1em;
  font-size: 0.7em;
}

.path-details h3 {
  font-size: 1em;
  margin-left: 0;
}

.path-details h4 {
  font-size: 0.8em;
  margin: 1em;
}

.path-details [style*="tabs:"] {
  margin-top: 1em;
}

.path-details table {
  margin-left: 2em;
  border-left: dotted 1px var(--color);
  padding: 0.2em;
}

.path-details th {
  text-align: left;
  padding: 0 0.5em;
}

pre {
  color: var(--white2);
  background-color: var(--black2);
  padding: 1em;
  font-size: inherit;
  overflow-x: auto;
  font-family: var(--font-monospace);
  font-size: 0.8em;
}

/** TABS **/

[style*="tabs:"] {
  display: grid;
  grid-template-columns: repeat(var(--tabs), 1fr);
  grid-template-rows: 1fr auto;
  margin-bottom: 3em;
}

[style*="tabs:"] input[type="radio"] { display: none; }

[style*="tabs:"] input[type="radio"] + label {
  display: inline-block;
  cursor: pointer;
  padding: 1em;
  border-radius: .5em .5em 0 0;
  border: dotted .5px;
  border-bottom: solid 1px;
}

[style*="tabs:"] input[type="radio"]:checked + label {
  cursor: default;
  border: solid 1px;
  border-bottom: none;
}

[style*="tabs:"] input[type="radio"] + label + div {
  display: none;
  grid-column: 1 / calc(var(--tabs) + 1);
  grid-row: 2;
  padding: 1em;
  border-radius: 0 0 .5em .5em;
  border: solid 1px;
  border-top: none;
}

[style*="tabs:"] input[type="radio"]:checked + label + div {
  display: block;
}

@media (max-width: 800px) {
  body {
    font-size: calc(var(--font-size) * .8);
  }
}

@media (max-width: 500px) {
  body {
    font-size: calc(var(--font-size) * .6);
  }

  summary {
    grid-template-columns: 3em auto 1.5em;
  }
}
`;
