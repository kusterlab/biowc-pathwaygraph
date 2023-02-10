import { css } from 'lit';

export default css`
  :host {
    --upregulated-color: #ea0000;
    --downregulated-color: #2571ff;
    --unregulated-color: #a4a4a4;
    --pathway-color: #89b9ce;
    --gene-protein-color: #efefef;
    --compound-color: #e7d190;
    --group-fill-color: #60bdbd;
    --group-stroke-color: #468989;
    --link-color: #999999;
    --edge-label-color: #4e4e4e;
    --legend-frame-color: #a9a9a9;
    --font-stack: 'Roboto Light', 'Helvetica Neue', 'Verdana', sans-serif;
  }

  .link {
    stroke: var(--link-color);
    stroke-opacity: 0.6;
    stroke-width: 3;
  }

  .link.ptmlink {
    visibility: hidden;
  }

  //TODO: Maplinks are not yet rendered
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

  .node-rect.pathway,
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

  strong {
    display: inline-block;
    text-align: left;
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

  .legend.node-rect {
    transform: translate(0px, -15px);
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

  .node-label.ptm {
    font-size: 7px;
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

  .contextMenu {
    position: absolute;
    border: 1px solid;
  }

  .contextMenuEntry {
    cursor: pointer;
    text-align: center;
    background-color: white;
    border: 1px solid;
    padding: 2px 5px;
  }

  .contextMenuEntry text {
    font-family: var(--font-stack);
    font-size: 14px;
  }
`;
