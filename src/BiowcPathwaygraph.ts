import { html, LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
// import * as d3v6 from 'd3';
import styles from './biowc-pathwaygraph.css';

interface PathwayMetadata {
  identifier: string; // TODO: Refactor from 'id' - set if it is not set by user
  org: string;
  pathwaytitle: string; // TODO: Refactor from 'title'
}

interface PathwayGraphNode {
  nodeId: string; // TODO: Refactor from 'id'
  type: string; // TODO: Enumerate all possible types
  x: number; // Maybe exclamation mark is better here, check what it is used for
  y: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface GeneProteinNode extends PathwayGraphNode {
  geneNames: string[];
  label: string;
  groupId?: string;
  regulation?: string; // TODO: One of 'up', 'down', '-'
  details?: { [key: string]: string | number }; // TODO: Put things like logEC50 in here
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface GroupNode extends PathwayGraphNode {
  components: string[];
}

interface PTMInputEntry {
  geneName: string;
  uniprotId: string;
  regulation: string; // TODO: One of 'up', 'down', '-'
  details?: { [key: string]: string | number };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PTMNode extends PathwayGraphNode {
  proteinNode: string; // TODO: Refactor from proteinId - directly map to protein node, no need to store the id ever
  details?: { [key: string]: string | number }; // TODO: Put things like modifiedSequence &  logEC50 in here
  regulation: string; // TODO: One of 'up', 'down', '-'
  geneName: string;
  uniprotId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PTMSummaryNode extends PathwayGraphNode {
  proteinNodeId: string; // TODO: Refactor from proteinId
  label: string;
  ptmIds: string[];
  regulation: string; // TODO: One of 'up', 'down', '-'
}

interface PathwayGraphLink {
  linkId: string; // TODO: Refactor from 'id'
  sourceId: string;
  targetId: string;
  types: string[]; // TODO: Enumerate all link types
  sourceNode: PathwayGraphNode;
  targetNode: PathwayGraphNode;
}

export class BiowcPathwaygraph extends LitElement {
  static styles = styles;

  @property({ attribute: false })
  pathwayMetaData!: PathwayMetadata;

  @property({ attribute: false })
  graphdataSkeleton!: { nodes: PathwayGraphNode[]; links: PathwayGraphLink[] };

  @property({ attribute: false })
  ptmInputList?: PTMInputEntry[];

  render() {
    // eslint-disable-next-line
    console.log(this.pathwayMetaData.identifier);
    // eslint-disable-next-line
    console.log(`Question: ${JSON.stringify(this.ptmInputList?.[0])}`);

    return html`
      <div id="pathwayContainer" ref="pathwayContainer">
        <svg
          id="pathway"
          style="
        'min-width: ' +
        /*TODO: Check if this works out*/
        ${this.clientWidth} +
        'px; min-height: 1200px; display: block; margin: auto; background-color: white; border-radius: 5px'
      "
        >
          <defs>
            <marker
              id="activationMarker"
              viewBox="-0 -5 7 7"
              refX="3"
              refY="0"
              orient="auto"
              markerWidth="7"
              markerHeight="8"
              overflow="visible"
              preserveAspectRatio="none"
              pointer-events="none"
            >
              <path
                d="M 0,-2 L 4 ,0 L 0,2"
                fill="var(--link-color)"
                stroke="none"
              />
            </marker>
            <marker
              id="otherInteractionMarker"
              viewBox="-0 -5 7 7"
              refX="3"
              refY="0"
              orient="auto"
              markerWidth="7"
              markerHeight="8"
              overflow="visible"
              preserveAspectRatio="none"
              pointer-events="none"
            >
              <path
                d="M 0,-1.5 L 3.5 ,0 L 0,1.5 Z"
                fill="white"
                stroke="var(--link-color)"
                stroke-width="0.5pt"
              />
            </marker>
            <marker
              id="inhibitionMarker"
              viewBox="-0 -5 7 7"
              refX="0.55"
              refY="0"
              orient="auto"
              markerWidth="7"
              markerHeight="8"
              overflow="visible"
              preserveAspectRatio="none"
              pointer-events="none"
            >
              <path
                d="M 0,-2.5 L 1.5,-2.5 L 1.5,2.5 L 0,2.5"
                fill="var(--link-color)"
                stroke="none"
              />
            </marker>
            <pattern
              id="bidirectional_regulation_pattern"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                stroke="var(--upregulated-color)"
                stroke-width="10px"
                x1="5"
                x2="5"
                y2="10"
              />
              <line
                stroke="var(--downregulated-color)"
                stroke-width="10px"
                y2="10"
              />
            </pattern>
          </defs>
          <svg id="pathwayLegend" x="25" y="25" />
        </svg>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues) {
    // Create Skeleton Graph from User Input

    // Map PTM Input to Skeleton Nodes
    super.firstUpdated(_changedProperties);
  }
}
