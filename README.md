# biowc-pathwaygraph
[![version](https://img.shields.io/npm/v/biowc-pathwaygraph.svg?logo=npm)](https://www.npmjs.com/package/biowc-pathwaygraph)
[![Downloads](https://img.shields.io/npm/dt/biowc-pathwaygraph.svg?label=Downloads)](https://www.npmjs.com/package/biowc-pathwaygraph)
[![License](https://img.shields.io/npm/l/biowc-pathwaygraph?label=License)](https://www.apache.org/licenses/LICENSE-2.0)
[![d3_version](https://img.shields.io/npm/dependency-version/biowc-pathwaygraph/d3)](https://www.npmjs.com/package/d3/v/6.2.0)
[![lit_version](https://img.shields.io/npm/dependency-version/biowc-pathwaygraph/lit)](https://www.npmjs.com/package/lit/v/2.0.2)

`biowc-pathwaygraph` is a WebComponent for interactive visualization of signaling pathway diagrams.
In addition to rendering the genes, proteins and compounds within a pathway, PTM and expression data can be projected onto the diagram.  

<p>
<img src="demo/Screenshot.png" alt='Screenshot' width='500' >
</p>
Our `storybook` contains an overview of the features of `biowc-pathwaygraph`. Here's how to run it:  
1. Clone this repository
2. Install the dependencies: `npm install`
3. Start Storybook: `npm run storybook` 

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

## Installation

```bash
npm i biowc-pathwaygraph
```

## Usage

```html
<script type="module">
  import 'biowc-pathwaygraph/biowc-pathwaygraph.js';
</script>

<biowc-pathwaygraph></biowc-pathwaygraph>
```

## Linting and formatting

To scan the project for linting and formatting errors, run

```bash
npm run lint
```

To automatically fix linting and formatting errors, run

```bash
npm run format
```

## Testing with Web Test Runner

To execute a single test run:

```bash
npm run test
```

To run the tests in interactive watch mode run:

```bash
npm run test:watch
```

## Demoing with Storybook

To run a local instance of Storybook for your component, run

```bash
npm run storybook
```

To build a production version of Storybook, run

```bash
npm run storybook:build
```


## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm start
```

To run a local development server that serves the basic demo located in `demo/index.html`
