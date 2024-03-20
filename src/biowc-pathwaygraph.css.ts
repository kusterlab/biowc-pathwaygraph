import { css } from 'lit';

export default css`
  :host {
    --upregulated-color: #ea0000;
    --downregulated-color: #2571ff;
    --unregulated-color: #a4a4a4;
    --pathway-color: #89b9ce;
    --gene-protein-color: #efefef;
    --compound-color: #e7d190;
    --group-fill-color: #6c7a74;
    --group-stroke-color: #3b423f;
    --link-color: #999999;
    --link-color-highlight: #3d3d3d;
    --edge-label-color: #4e4e4e;
    --legend-frame-color: #a9a9a9;
    --font-stack: 'Roboto Light', 'Helvetica Neue', 'Verdana', sans-serif;
    --color-range-slider-fill-color: #606060;
    /*This cryptic variable controls how selected context menu items look like. If we omit it they become black.*/
    --dark-divider-opacity: 0.12;
    /*And this one is for the intransparency of the whole context menu*/
    --primary-background-color: #ffffff;
    /*This is for the styling of the context menu border*/
    --context-menu-border-radius: 4px;
    --context-menu-shadow: 0 0 1px 1px;
    --context-menu-background-color: #f9f9fb;
  }

  .link {
    stroke: var(--link-color);
    stroke-opacity: 0.6;
    stroke-width: 3;
  }

  .link.highlight {
    stroke: var(--link-color-highlight);
  }

  .link.ptmlink {
    visibility: hidden;
  }

  .link.maplink {
    stroke-dasharray: '5 2';
  }

  .node {
    pointer-events: fill;
  }

  .node-rect {
    stroke: black;
    stroke-width: 1.5;
    cursor: move;
  }

  .node-rect.pathway {
    fill: var(--pathway-color);
  }

  .node-rect.misc {
    fill: var(--pathway-color);
  }

  .node-rect.gene_protein {
    fill: var(--gene-protein-color);
  }

  .node-rect.group {
    opacity: 0.25;
  }

  .node-rect.ptm {
    opacity: 1;
  }

  .node-rect.ptm.down {
    fill: var(--downregulated-color);
  }

  .node-rect.ptm.up {
    fill: var(--upregulated-color);
  }

  .node-rect.ptm.not {
    fill: var(--unregulated-color);
  }

  .node-rect.gene_protein.down {
    fill: var(--downregulated-color);
  }

  .node-rect.gene_protein.up {
    fill: var(--upregulated-color);
  }

  .node-rect.gene_protein.not {
    fill: var(--unregulated-color);
  }

  .node-rect.gene_protein.both {
    fill: url(#bidirectional_regulation_pattern);
  }

  .node-rect.compound {
    fill: var(--compound-color);
  }

  .node-rect.highlight {
    stroke-width: 3;
  }

  strong {
    display: inline-block;
    text-align: left;
  }

  .form-wrapper {
    display: block;
    text-align: right;
    line-height: 2;
    font-family: var(--font-stack);

    select {
      width: 209px;
    }

    input {
      width: 200px;
    }

    textarea {
      width: 200px;
      vertical-align: top;
      resize: none;
    }
  }

  .form-element {
    margin-left: 10px;
  }

  .legend {
    pointer-events: none;
    dominant-baseline: central;
    font-size: 11pt;
    stroke-width: 2.5;
    font-family: var(--font-stack);
    user-select: none;
  }

  .legend.link {
    stroke-width: 2.5px;
  }

  .legend.group-path {
    stroke-width: 3px;
  }

  .node-label {
    stroke-width: 0;
    font-family: var(--font-stack);
    font-size: 8px;
    font-weight: normal;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  .node-label.ptm.summary {
    font-size: 10px;
    font-weight: bold;
  }

  .edgelabel {
    font-size: 10px;
    font-family: var(--font-stack);
    font-weight: bold;
  }

  .tooltip {
    position: absolute;
    background-color: white;
    border: 1px solid;
    border-radius: 5px;
    padding: 5px 8px;
    pointer-events: none;
    font-size: 12pt;
    font-family: var(--font-stack);
  }

  .group-path {
    fill: var(--group-fill-color);
    stroke-width: 1px;
    stroke: var(--group-stroke-color);
  }

  .group-path.highlight {
    stroke-width: 3px;
  }

  #pathwayContainer {
    position: relative;
  }

  #pathwaygraph {
    background-color: #ffffff;
  }

  #pathwaygraph.editing {
    background-color: #ffffff;
    border-color: #3e4349;
    border-style: dashed;
  }

  #potencyRangeSlider {
    position: absolute;
    top: 210px;
    left: 40px;
    font-size: 11pt;
    font-family: var(--font-stack);
    display: flex;
    flex-direction: column;
    width: 150px;
    height: 50px;
    margin: 100px auto;
    background: white;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    pointer-events: all;
    width: 10px;
    height: 10px;
    background-color: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px #c6c6c6;
    cursor: pointer;
  }

  input[type='range']::-moz-range-thumb {
    -webkit-appearance: none;
    pointer-events: all;
    width: 10px;
    height: 10px;
    background-color: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px #c6c6c6;
    cursor: pointer;
  }

  input[type='range']::-webkit-slider-thumb:hover {
    background: #f7f7f7;
  }

  input[type='range']::-webkit-slider-thumb:active {
    box-shadow: inset 0 0 3px #387bbe, 0 0 9px #387bbe;
    -webkit-box-shadow: inset 0 0 3px #387bbe, 0 0 9px #387bbe;
  }

  input[type='range'] {
    height: 2px;
    width: 100%;
    position: absolute;
    background-color: #c6c6c6;
    pointer-events: none;
  }

  #fromSlider {
    z-index: 1;
    background-color: transparent;
  }

  .sliders_control {
    position: relative;
    min-height: 50px;
  }

  output {
    position: relative;
    top: 15px;
    z-index: 1;
  }

  dialog {
    border-radius: var(--context-menu-border-radius);
    border-color: var(--context-menu-background-color);
    box-shadow: var(--context-menu-shadow);
  }

  ::backdrop {
    background: #d2d2d2;
    opacity: 0.5;
  }
`;
