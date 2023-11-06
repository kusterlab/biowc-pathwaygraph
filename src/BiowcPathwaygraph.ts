import { html, LitElement, PropertyDeclaration, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import * as d3v6 from 'd3';
import {
  D3DragEvent,
  Selection,
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
  ValueFn,
  ZoomTransform,
} from 'd3';
import styles from './biowc-pathwaygraph.css';

type PossibleRegulationCategoriesType = 'up' | 'down' | 'not';

type PossibleHueType = 'direction' | 'foldchange' | 'potency';

const NODE_HEIGHT = 10;
const PTM_NODE_WIDTH = 15;
const PTM_NODE_HEIGHT = 10;
const DBL_CLICK_TIMEOUT = 200;

interface PathwayGraphNode extends SimulationNodeDatum {
  nodeId: string;
  type: string; // TODO: Enumerate all possible types
  x: number; // Maybe exclamation mark is better here, check what it is used for
  y: number;
}

interface GeneProteinNode extends PathwayGraphNode {
  geneNames: string[];
  uniprotAccs: string[];
  defaultName?: string;
  label?: string;
  groupId?: string;
  // Interfaces are hoisted so we can reference PTMSummaryNode before defining it
  // eslint-disable-next-line no-use-before-define
  details?: {
    [key: string]:
      | string
      | number
      | { display: boolean; value: string | number };
  };
  // The following are only defined if Full Proteome Data was supplied
  nUp?: number;
  nDown?: number;
  nNot?: number;
}

interface PTMInputEntry {
  geneNames?: string[];
  uniprotAccs?: string[];
  regulation: PossibleRegulationCategoriesType;
  details?: {
    [key: string]:
      | string
      | number
      | { display: boolean; value: string | number };
  };
}

interface PTMNode extends PathwayGraphNode {
  geneProteinNodeId: string;
  details?: {
    [key: string]:
      | string
      | number
      | { display: boolean; value: string | number };
  };
  regulation: PossibleRegulationCategoriesType;
  geneNames?: string[];
  uniprotAccs?: string[];
  summaryNodeId?: string;
}

interface PTMSummaryNode extends PathwayGraphNode {
  geneProteinNodeId?: string;
  label: string;
  ptmNodeIds?: string[];
  regulation: PossibleRegulationCategoriesType;
}

interface FullProteomeInputEntry {
  geneNames?: string[];
  uniprotAccs?: string[];
  regulation: PossibleRegulationCategoriesType;
  details?: {
    [key: string]:
      | string
      | number
      | { display: boolean; value: string | number };
  };
}

interface PathwayGraphLinkInput {
  linkId?: string;
  sourceId: string;
  targetId: string;
  types: string[]; // TODO: Enumerate all link types
  label?: string;
}

interface PathwayGraphLink
  extends SimulationLinkDatum<PathwayGraphNode | PathwayGraphLink>,
    SimulationNodeDatum {
  linkId: string;
  types: string[]; // TODO: Enumerate all link types
  sourceId: string;
  targetId: string;
  label?: string;
}

// The nodes and links in the D3 graph have additional properties
interface PathwayGraphNodeD3 extends PathwayGraphNode {
  selected?: boolean;
  visible?: boolean;
  isCircle?: boolean;
  rectX?: number;
  rectWidth?: number;
  textLength?: number;
  leftX?: number;
  rightX?: number;
  currentDisplayedLabel?: string;
}

interface GeneProteinNodeD3 extends GeneProteinNode, PathwayGraphNodeD3 {
  // Interfaces are hoisted so we can reference GroupNodeD3 before defining it
  // eslint-disable-next-line no-use-before-define
  groupNode?: GroupNodeD3;
}

interface GroupNodeD3 extends PathwayGraphNodeD3 {
  componentNodes: GeneProteinNodeD3[];
  polygon?: [number, number][];
  centroid?: [number, number];
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

interface PTMNodeD3 extends PTMNode, PathwayGraphNodeD3 {
  geneProteinNode?: GeneProteinNodeD3;
  // Interfaces are hoisted so we can reference PTMSummaryNode before defining it
  // eslint-disable-next-line no-use-before-define
  summaryNode?: PTMSummaryNodeD3;
}

interface PTMSummaryNodeD3 extends PTMSummaryNode, PathwayGraphNodeD3 {
  geneProteinNode?: GeneProteinNodeD3;
  ptmNodes?: PTMNodeD3[];
}

interface PathwayGraphLinkD3 extends PathwayGraphLink {
  source: PathwayGraphNode | PathwayGraphLink;
  target: PathwayGraphNode | PathwayGraphLink;
  sourceIsAnchor?: boolean;
  targetIsAnchor?: boolean;
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
}

export class BiowcPathwaygraph extends LitElement {
  static styles = styles;

  @property({ attribute: false })
  graphWidth: number = document.body.clientWidth;

  @property({ attribute: false })
  tooltipVerticalOffset: number = 0;

  @property({ attribute: false })
  tooltipHorizontalOffset: number = 0;

  @property({ attribute: false })
  graphdataSkeleton!: {
    nodes: PathwayGraphNode[];
    links: (PathwayGraphLinkInput | PathwayGraphLink)[];
    // A dictionary that maps gene names and Uniprot IDs to Node IDs
    geneToNodeMap?: { [key: string]: GeneProteinNode[] };
  };

  @property({ attribute: false })
  ptmInputList?: PTMInputEntry[];

  @property({ attribute: false })
  fullProteomeInputList?: FullProteomeInputEntry[];

  @property({ attribute: false })
  hue!: PossibleHueType;

  graphdataPTM?: {
    nodes: (PTMNode | PTMSummaryNode)[];
    links: PathwayGraphLinkInput[];
  };

  d3Nodes?: PathwayGraphNodeD3[];

  d3Links?: PathwayGraphLinkD3[];

  // Can be 0, 1 or 2, to distinguish single- from double-click events
  recentClicks = 0;

  maxPosFoldChange?: number;

  maxNegFoldChange?: number;

  maxPotency?: number;

  minPotency?: number;

  colorRangeMin?: number;

  colorRangeMax?: number;

  anyDowngoingPTMs?: boolean;

  anyUpgoingPTMs?: boolean;

  allDowngoingLessThan0?: boolean;

  allUpgoingGreaterThan1?: boolean;

  isNodeExpandAndCollapseAllowed: boolean = false;

  currentTimeoutId?: NodeJS.Timeout;

  potencyColorScale: string[] = [
    '#ffffff',
    '#FED702',
    '#6C8C54',
    '#0065bd',
    '#FF0080',
  ];

  render() {
    return html`
      <div id="pathwayContainer">
        <svg
          id="pathwaygraph"
          style="min-width: ${this.graphWidth}px;
          min-height: 1500px;
           display: block;
            margin: auto;
             background-color: white;
             border-radius: 5px"
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
            <linearGradient id="potency-linear-gradient"></linearGradient>
          </defs>
          <svg id="pathwayLegend" x="25" y="25" />
        </svg>
      </div>
      <canvas id="canvasId" style="display: none"></canvas>
    `;
  }

  requestUpdate(
    name?: PropertyKey,
    oldValue?: unknown,
    options?: PropertyDeclaration
  ) {
    super.requestUpdate(name, oldValue, options);
  }

  protected firstUpdated(_changedProperties: PropertyValues) {
    this.d3Nodes = [];
    this.d3Links = [];
    this._getMainDiv().append('g').attr('id', 'linkG');
    this._getMainDiv().append('g').attr('id', 'nodeG');
    this._enableZoomingAndPanning();
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues) {
    this.graphdataSkeleton.geneToNodeMap = this._createPathwayGeneToNodeMap();

    // Map PTM Input to Skeleton Nodes
    this.graphdataPTM = this._addPTMInformationToPathway();
    // Add Full Proteome Input to Skeleton Nodes
    if (this.fullProteomeInputList) {
      this.graphdataSkeleton.nodes =
        this._addFullProteomeInformationToPathway();
    }

    this._createD3GraphObject();
    this._calculateHueRange();
    this._renderLegend();
    this._renderGraph();

    super.updated(_changedProperties);
  }

  private _createPathwayGeneToNodeMap(): { [key: string]: GeneProteinNode[] } {
    const result: { [key: string]: GeneProteinNode[] } = {};

    for (const node of this.graphdataSkeleton.nodes) {
      if (
        Object.hasOwn(node, 'uniprotAccs') &&
        !!(<GeneProteinNode>node).uniprotAccs
      ) {
        for (const uniprotAcc of (<GeneProteinNode>node).uniprotAccs) {
          if (!Object.hasOwn(result, uniprotAcc)) {
            result[uniprotAcc] = [];
          }
          result[uniprotAcc].push(<GeneProteinNode>node);
        }
      }

      if (
        Object.hasOwn(node, 'geneNames') &&
        !!(<GeneProteinNode>node).geneNames
      ) {
        for (const geneName of (<GeneProteinNode>node).geneNames) {
          if (!Object.hasOwn(result, geneName)) {
            result[geneName] = [];
          }
          result[geneName].push(<GeneProteinNode>node);
        }
      }
    }
    return result;
  }

  private _addPTMInformationToPathway(): {
    nodes: (PTMNode | PTMSummaryNode)[];
    links: PathwayGraphLinkInput[];
  } {
    /**
     * This function combines a Pathway Object with a list of PTM peptides.
     * Each PTM peptide is added as a node to the pathway graph and is linked
     * to the protein it sits on.
     * Additionally, summary nodes are generated, showing the count of up/down/unregulated peptides
     * that were measured for a protein
     */

    // For each gene/protein, we keep score of how many peptides were mapped for each category
    // At the end this will be turned into the summary nodes
    // ESLint complains that 'K' is never used in the next line, but I couldn't find another way to enforce the key to be
    // one of the possible regulation categories.
    // eslint-disable-next-line no-unused-vars
    const geneProtein2RegulationCategory: {
      [K in PossibleRegulationCategoriesType]: { [key: string]: PTMNode[] };
    } = {
      up: {},
      down: {},
      not: {},
    };

    const graphdataPTM: {
      nodes: (PTMNode | PTMSummaryNode)[];
      links: PathwayGraphLinkInput[];
    } = { nodes: [], links: [] };

    if (this.ptmInputList) {
      for (const ptmPeptide of this.ptmInputList) {
        // Keep track of the protein node ids with which this peptide has been associated
        // Because the mappings are not guaranteed to be injective, we need to prevent a PTM from appearing twice on the same node
        const geneProteinNodeIdsOfPeptide = new Set();

        // Eliminate possible duplicates from the peptides' gene names and uniprot accessions
        const geneNamesUnique = [...new Set(ptmPeptide.geneNames)].sort();
        const uniprotAccsUnique = [...new Set(ptmPeptide.uniprotAccs)].sort();
        // The map of Uniprot ID to Node ID only works with canonical isoforms, so create another version with hyphens removed
        const uniprotAccsUniqueOnlyCanonical = [
          ...new Set(uniprotAccsUnique.map(entry => entry.split('-')[0])),
        ];

        // Now we map the peptide to a node in the current pathway, using gene names and canonical Uniprot IDs
        for (const gene of uniprotAccsUniqueOnlyCanonical.concat(
          geneNamesUnique
        )) {
          if (
            this.graphdataSkeleton.geneToNodeMap &&
            Object.hasOwn(this.graphdataSkeleton.geneToNodeMap, gene)
          ) {
            for (const geneProteinNode of this.graphdataSkeleton.geneToNodeMap[
              gene
            ]) {
              // Only proceed if the node has not yet been associated with this peptide
              if (!geneProteinNodeIdsOfPeptide.has(geneProteinNode.nodeId)) {
                geneProteinNodeIdsOfPeptide.add(geneProteinNode.nodeId);
                const ptmNodeId = `ptm-${geneProteinNode.nodeId}_${
                  crypto.getRandomValues(new Uint32Array(1))[0]
                }`;
                const ptmNode = {
                  nodeId: ptmNodeId,
                  type: 'ptm',
                  details: ptmPeptide.details,
                  geneNames: geneNamesUnique,
                  uniprotAccs: uniprotAccsUnique,
                  regulation: ptmPeptide.regulation,
                  geneProteinNodeId: geneProteinNode.nodeId,
                  x: geneProteinNode.x,
                  y: geneProteinNode.y,
                };
                graphdataPTM.nodes.push(ptmNode);
                graphdataPTM.links.push({
                  linkId: `ptmlink-${ptmNodeId}`,
                  sourceId: ptmNode.nodeId,
                  targetId: geneProteinNode.nodeId,
                  types: ['ptmlink'],
                });
                // Increase the summary counter
                switch (ptmPeptide.regulation) {
                  case 'up':
                    if (
                      !Object.hasOwn(
                        geneProtein2RegulationCategory.up,
                        geneProteinNode.nodeId
                      )
                    ) {
                      geneProtein2RegulationCategory.up[
                        geneProteinNode.nodeId
                      ] = [];
                    }
                    geneProtein2RegulationCategory.up[
                      geneProteinNode.nodeId
                    ].push(ptmNode);
                    break;
                  case 'down':
                    if (
                      !Object.hasOwn(
                        geneProtein2RegulationCategory.down,
                        geneProteinNode.nodeId
                      )
                    ) {
                      geneProtein2RegulationCategory.down[
                        geneProteinNode.nodeId
                      ] = [];
                    }
                    geneProtein2RegulationCategory.down[
                      geneProteinNode.nodeId
                    ].push(ptmNode);
                    break;
                  case 'not':
                    if (
                      !Object.hasOwn(
                        geneProtein2RegulationCategory.not,
                        geneProteinNode.nodeId
                      )
                    ) {
                      geneProtein2RegulationCategory.not[
                        geneProteinNode.nodeId
                      ] = [];
                    }
                    geneProtein2RegulationCategory.not[
                      geneProteinNode.nodeId
                    ].push(ptmNode);
                    break;
                  default:
                    break;
                }
              }
            }
          }
        }
      }
    }

    // After looping, we can add a node and a link for each summary node
    for (const [regulationCategory, dict] of Object.entries(
      geneProtein2RegulationCategory
    )) {
      for (const ptmNodeList of Object.values(dict)) {
        // We want to get the gene/protein node that these ptmNodes map to
        // The keys of geneProtein2Upregulated are only the IDs of these nodes, so we use a trick:
        // Each ptmNode holds the protein node as a property
        // They are all the same, so we just use the first one
        // And the list cannot be empty because of the way we constructed it above
        const firstPTM = ptmNodeList[0];
        const summaryNode: PTMSummaryNode = {
          nodeId: `ptm-summary-${regulationCategory}-${firstPTM.geneProteinNodeId}`,
          type: 'ptm summary',
          label: `${ptmNodeList.length}`,
          geneProteinNodeId: firstPTM.geneProteinNodeId,
          ptmNodeIds: ptmNodeList.map(ptmnode => ptmnode.nodeId),
          regulation: regulationCategory as PossibleRegulationCategoriesType,
          x: firstPTM.x,
          y: firstPTM.y,
        };
        graphdataPTM.nodes.push(summaryNode);
        // Add reference of ptmNode to its summary node
        for (const ptmNode of ptmNodeList) {
          ptmNode.summaryNodeId = summaryNode.nodeId;
        }
        graphdataPTM.links.push({
          linkId: `ptm-summary-${regulationCategory}-${firstPTM.geneProteinNodeId}`,
          types: ['ptmlink', 'summary'],
          sourceId: summaryNode.nodeId,
          targetId: firstPTM.geneProteinNodeId,
        });
      }
    }

    return graphdataPTM;
  }

  private _addFullProteomeInformationToPathway(): PathwayGraphNode[] {
    // Create a dictionary out of the nodes of the skeleton graph, for quick access
    const nodesDict: { [key: string]: PathwayGraphNode } = {};
    for (const node of this.graphdataSkeleton.nodes) {
      nodesDict[node.nodeId] = node;
      (<GeneProteinNode>node).nDown = 0;
      (<GeneProteinNode>node).nUp = 0;
      (<GeneProteinNode>node).nNot = 0;
    }

    if (this.fullProteomeInputList) {
      for (const fullProteomeInputEntry of this.fullProteomeInputList) {
        // In analogy to the addPTMInformation function:
        // Keep track of the gene/protein node ids with which this gene/protein has been associated
        // In case node is represented by both Uniprot and Genename we could otherwise match it twice here
        const geneProteinNodeIdsOfEntry = new Set();
        const geneNamesUnique = [...new Set(fullProteomeInputEntry.geneNames)];
        const uniprotAccsUniqueOnlyCanonical = [
          ...new Set(
            fullProteomeInputEntry.uniprotAccs?.map(
              entry => entry.split('-')[0]
            )
          ),
        ];

        for (const gene of uniprotAccsUniqueOnlyCanonical.concat(
          geneNamesUnique
        )) {
          if (
            this.graphdataSkeleton.geneToNodeMap &&
            Object.hasOwn(this.graphdataSkeleton.geneToNodeMap, gene)
          ) {
            for (const geneProteinNode of this.graphdataSkeleton.geneToNodeMap[
              gene
            ]) {
              const nodesDictEntry = <GeneProteinNode>(
                nodesDict[geneProteinNode.nodeId]
              );
              // Only proceed if the node has not yet been associated with this protein
              if (!geneProteinNodeIdsOfEntry.has(geneProteinNode.nodeId)) {
                geneProteinNodeIdsOfEntry.add(geneProteinNode.nodeId);
                switch (fullProteomeInputEntry.regulation) {
                  case 'down':
                    nodesDictEntry.nDown = (nodesDictEntry.nDown || 0) + 1;
                    break;
                  case 'up':
                    nodesDictEntry.nUp = (nodesDictEntry.nUp || 0) + 1;
                    break;
                  case 'not':
                    nodesDictEntry.nNot = (nodesDictEntry.nNot || 0) + 1;
                    break;
                  default:
                    break;
                }

                // Concatenate the details
                if (fullProteomeInputEntry.details) {
                  nodesDictEntry.details = nodesDictEntry.details || {};
                  Object.keys(fullProteomeInputEntry.details)
                    .filter(
                      detailKey => fullProteomeInputEntry.details![detailKey]
                    )
                    .forEach(detailKey => {
                      if (Object.hasOwn(nodesDictEntry.details!, detailKey)) {
                        nodesDictEntry.details![detailKey] = `${String(
                          nodesDictEntry.details![detailKey]
                        )},${String(
                          fullProteomeInputEntry.details![detailKey]
                        )}`;
                      } else {
                        nodesDictEntry.details![detailKey] =
                          fullProteomeInputEntry.details![detailKey];
                      }
                    });
                }
              }
            }
          }
        }
      }
    }

    return Object.values(nodesDict);
  }

  private _createD3GraphObject() {
    // Essentially, the d3Nodes and d3Links objects consist of all nodes and links
    // from the skeleton and the ptm objects. So in principle we could recreate them
    // from the concatenation of skeleton and ptm every time.
    // Problem is: d3 would then redraw the whole graph, resetting everything to
    // its original position and so on. The user might not want that. So, instead:
    // 1. Remove all ptm summary nodes and links - their ptm lists might be outdated
    // 2. Add all nodes and links from graphdata that are not yet part of the d3 objects
    // 3. Then remove all from the d3 objects that are not anymore part of the graphdata
    this.d3Nodes = this.d3Nodes!.filter(node => node.type !== 'ptm summary');
    this.d3Links = this.d3Links!.filter(
      link => !link.types.includes('summary')
    );

    const d3NodesDict: { [key: string]: PathwayGraphNodeD3 } = {};
    for (const node of this.d3Nodes) {
      d3NodesDict[node.nodeId] = node;
    }

    const d3LinkIds = new Set(this.d3Links!.map(link => link.linkId));
    const graphdataNodeIds = new Set(
      this.graphdataSkeleton.nodes
        .map(node => node.nodeId)
        .concat(this.graphdataPTM!.nodes.map(node => node.nodeId))
    );
    const graphdataLinkIds = new Set(
      this.graphdataSkeleton.links
        .map(link => link.linkId)
        .concat(this.graphdataPTM!.links.map(link => link.linkId))
    );

    this.graphdataSkeleton.nodes
      .concat(this.graphdataPTM!.nodes)
      .forEach(node => {
        if (!(node.nodeId in d3NodesDict)) {
          const newNode = {
            ...node,
            selected: true,
            visible: true,
          } as PathwayGraphNodeD3;
          // Set initial label by calculating all alternatives and choosing the first one
          // The linter forces me to use array destructuring here, i.e. instead of
          // x = y[0] I have to write [x] = y. I think this is very hard to read, but well...
          // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
          [newNode.currentDisplayedLabel] =
            BiowcPathwaygraph._calcPossibleLabels(<GeneProteinNodeD3>newNode);

          this.d3Nodes!.push(newNode);
        } else {
          // If it exists already, still update nDown, nUp and nNot
          const existingNode = d3NodesDict[node.nodeId] as GeneProteinNodeD3;
          existingNode.nUp = (<GeneProteinNode>node).nUp;
          existingNode.nDown = (<GeneProteinNode>node).nDown;
          existingNode.nNot = (<GeneProteinNode>node).nNot;
        }
      });

    this.d3Nodes = this.d3Nodes!.filter(node =>
      graphdataNodeIds.has(node.nodeId)
    );

    this.graphdataSkeleton.links
      .concat(this.graphdataPTM!.links)
      .forEach(link => {
        if (!d3LinkIds.has(link.linkId!)) {
          this.d3Links!.push({ ...link } as PathwayGraphLinkD3);
        }
      });

    this.d3Links = this.d3Links!.filter(link =>
      graphdataLinkIds.has(link.linkId)
    );

    // Now we need to setup some references within the D3 Graph Data
    // First we create maps of id to nodes/links for quicker access
    const nodeIdToNodeMap: { [key: string]: PathwayGraphNodeD3 } = {};
    for (const node of this.d3Nodes!) {
      nodeIdToNodeMap[node.nodeId] = node;
    }

    const linkIdToLinkMap: { [key: string]: PathwayGraphLinkD3 } = {};
    for (const link of this.d3Links!) {
      linkIdToLinkMap[link.linkId] = link;
    }

    for (const node of this.d3Nodes!) {
      // a) For all PTM peptides: add reference to protein node
      // This goes for both individual PTMs nodes and summary nodes
      if (node.type.includes('ptm')) {
        (<PTMNodeD3 | PTMSummaryNodeD3>node).geneProteinNode = <
          GeneProteinNodeD3
        >nodeIdToNodeMap[
          (<PTMNodeD3 | PTMSummaryNodeD3>node).geneProteinNodeId!
        ];
      }
      // b) For the PTM summary nodes: add two-way references to individual PTM nodes
      if (node.type.includes('summary')) {
        (<PTMSummaryNodeD3>node).ptmNodes = (<PTMSummaryNodeD3>(
          node
        )).ptmNodeIds?.map(nodeid => nodeIdToNodeMap[nodeid] as PTMNode);
        for (const nodeid of (<PTMSummaryNodeD3>node).ptmNodeIds!) {
          (<PTMNodeD3>nodeIdToNodeMap[nodeid]).summaryNode = <PTMSummaryNodeD3>(
            node
          );
        }
      }
      // c) For Group Nodes: Fetch members and add references in both directions
      if (node.type === 'group') {
        const groupNode = <GroupNodeD3>node;
        groupNode.componentNodes = [];
        for (const otherNode of this.d3Nodes!) {
          if (
            Object.hasOwn(otherNode, 'groupId') &&
            (<GeneProteinNodeD3>otherNode).groupId === groupNode.nodeId
          ) {
            groupNode.componentNodes.push(<GeneProteinNodeD3>otherNode);
            (<GeneProteinNodeD3>otherNode).groupNode = groupNode;
          }
        }
      }
    }

    // Connect each link with its source and target
    for (const link of this.d3Links!) {
      link.source = nodeIdToNodeMap[link.sourceId];
      link.target = nodeIdToNodeMap[link.targetId];
      // If no source/target was found, the link might start/end on another link
      // Wikipathways calls this an 'anchor' node
      if (!link.source) {
        link.source = linkIdToLinkMap[link.sourceId];
        link.sourceIsAnchor = true;
      }

      if (!link.target) {
        link.target = linkIdToLinkMap[link.targetId];
        link.targetIsAnchor = true;
      }
    }

    // Clear selection
    this.d3Nodes!.forEach(node => {
      /* eslint-disable-next-line no-param-reassign */
      node.selected = true;
    });
  }

  private _getMainDiv() {
    // @ts-ignore
    return d3v6.select(this.shadowRoot).select<SVGElement>('#pathwaygraph');
  }

  private _renderGraph() {
    const mainDiv = this._getMainDiv();
    this.isNodeExpandAndCollapseAllowed = false;

    // Initially draw the graph with all possible nodes present so the simulation reaches a steady state
    // After a few seconds redraw the graph filtered for summary PTM nodes
    this._refreshGraph(false);

    // Initially, make all individual PTM nodes invisible. They should be physically present for the simulation to stabilize,
    // but visible only after the stabilization process is complete.
    const allPTMNodes = mainDiv.selectAll('g.ptm:not(.summary):not(.legend)');
    allPTMNodes.attr('display', 'none');

    // PTMLinks should never be visible
    this._getMainDiv()
      .selectAll<SVGLineElement, PathwayGraphLinkD3>('.linkgroup.ptmlink')
      .attr('display', 'none');

    // If a timeout is already running, cancel it (can happen if user clicks too fast)
    if (this.currentTimeoutId) clearTimeout(this.currentTimeoutId);

    this.currentTimeoutId = setTimeout(() => {
      if (this.d3Nodes) {
        for (const node of this.d3Nodes) {
          // Set all individual PTM nodes to invisible
          if (node.type.includes('ptm') && !node.type.includes('summary')) {
            // Only summary PTM nodes are invisible at the beginning
            node.visible = false;
          }
        }
      }
      this._refreshGraph(true);
      // Now make the PTM nodes visible again (in principle, in practice they are all invisible at this point
      // because 'visible' is set to false so they are not part of the graph)
      allPTMNodes.attr('display', 'block');

      // Now we can set the permission flag for the 'expandAll' and 'collapseAll' functions to true
      this.isNodeExpandAndCollapseAllowed = true;
    }, 2000);
  }

  private _drawGraph() {
    const nodeG = this._getMainDiv().select('#nodeG');
    const linkG = this._getMainDiv().select('#linkG');

    const nodesSvg = nodeG
      .selectAll<SVGGElement, PathwayGraphNodeD3>('g')
      .data(
        this.d3Nodes! // Sort so that the groups come first - that way they are always drawn under the individual nodes
          .sort((nodeA, nodeB) => {
            if (nodeA.type === 'group') return -1;
            if (nodeB.type === 'group') return 1;
            return 0;
          })
          .filter(node => node.visible),
        d => (<PathwayGraphNodeD3>d).nodeId
      )
      .join('g')
      .attr(
        'class',
        d => `node ${d.type} ${BiowcPathwaygraph._computeRegulationClass(d)} `
      )
      .attr('id', d => `node-${d.nodeId}`);

    // Draw each node as a rectangle - except for groups
    nodesSvg.selectAll('.node-rect').remove(); // TODO: Check if we actually need to do this
    nodesSvg
      .filter(d => d.type !== 'group')
      .append('rect')
      .attr(
        'class',
        d =>
          `node-rect ${d.type} ${BiowcPathwaygraph._computeRegulationClass(d)}`
      )
      .attr('rx', NODE_HEIGHT)
      .attr('ry', NODE_HEIGHT)
      .style('fill', d => this._computeNodeColor(d));

    // Add labels to the nodes
    nodesSvg.selectAll('.node-label').remove();
    nodesSvg
      .append('text')
      .attr(
        'class',
        d =>
          `node-label ${d.type} ${BiowcPathwaygraph._computeRegulationClass(
            d
          )} `
      );
    nodesSvg
      .selectAll<SVGTextContentElement, PathwayGraphNodeD3>('.node-label')
      .text(d => d.currentDisplayedLabel || '')
      .each((d, i, nodes) => {
        // Adjust width of the node based on the length of the text
        const circleWidth = NODE_HEIGHT * 2;
        const textLength = (<SVGTextContentElement>(
          nodes[i]
        )).getComputedTextLength();
        const textWidth = textLength + NODE_HEIGHT;
        const node = d as PathwayGraphNodeD3;
        if (circleWidth > textWidth) {
          node.isCircle = true;
          node.rectX = -NODE_HEIGHT;
          node.rectWidth = circleWidth;
        } else {
          node.isCircle = false;
          node.rectX = -(textLength + NODE_HEIGHT) / 2;
          node.rectWidth = textWidth;
        }
        node.textLength = textLength;
      });

    // Position the nodes within their 'g' elements
    nodesSvg
      .selectAll('.node-rect')
      .attr('x', d =>
        (<PathwayGraphNodeD3>d).type === 'ptm'
          ? -0.5 * PTM_NODE_WIDTH
          : (<PathwayGraphNodeD3>d).rectX!
      )
      .attr('y', d =>
        (<PathwayGraphNodeD3>d).type === 'ptm'
          ? -0.5 * PTM_NODE_HEIGHT
          : -NODE_HEIGHT
      )
      .attr('width', d =>
        (<PathwayGraphNodeD3>d).type === 'ptm'
          ? PTM_NODE_WIDTH
          : (<PathwayGraphNodeD3>d).rectWidth!
      )
      .attr('height', d =>
        (<PathwayGraphNodeD3>d).type === 'ptm'
          ? PTM_NODE_HEIGHT
          : NODE_HEIGHT * 2
      );

    // Initialize paths for the group nodes
    // The actual polygons are drawn in the 'tick' callback of addAnimation
    nodesSvg
      .filter(
        d =>
          d.type === 'group' &&
          // Check that the group has not been drawn yet
          this._getMainDiv()
            .select<SVGGElement>(`#node-${d.nodeId}`)
            .select('.group-path')
            .empty()
      )
      .append('path')
      .attr('class', 'group-path');

    // Draw links as lines with appropriate arrowheads
    const linksSvg = linkG
      .selectAll('.linkgroup')
      .data(
        this.d3Links!.filter(
          link =>
            (link.sourceIsAnchor ||
              (<PathwayGraphNodeD3>link.source)?.visible) &&
            (link.targetIsAnchor || (<PathwayGraphNodeD3>link.target)?.visible)
        )
      )
      .join('g')
      .attr('class', d => `linkgroup ${d.types.join(' ')}`);

    linksSvg.selectAll('.link').remove(); // TODO: Check if we actually need to do this
    linksSvg
      .append('line')
      .attr('class', d => `link ${d.types.join(' ')}`)
      .attr('marker-end', d => {
        if (d.types.includes('inhibition')) {
          return 'url(#inhibitionMarker)';
        }
        if (d.types.includes('binding/association')) return '';
        if (d.types.includes('activation')) {
          return 'url(#activationMarker)';
        }
        return 'url(#otherInteractionMarker)';
      })
      .attr('stroke-dasharray', d => {
        if (d.types.includes('binding/association')) return '3 3';
        if (d.types.includes('indirect')) return '7 2';
        return null;
      });

    // Add paths for the edgelabels
    const linkLabelPaths = linkG
      .selectAll('.linklabelpathgroup')
      .data(
        this.d3Links!.filter(
          link =>
            (link.sourceIsAnchor ||
              (<PathwayGraphNodeD3>link.source)?.visible) &&
            (link.targetIsAnchor ||
              (<PathwayGraphNodeD3>link.target)?.visible) &&
            link.label &&
            link.label !== ''
        )
      )
      .join('g')
      .attr('class', 'linklabelpathgroup');

    linkLabelPaths.selectAll('.edgepath').remove(); // TODO: Check if we actually need to do this
    linkLabelPaths
      .append('path')
      .attr('class', 'edgepath')
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0)
      .attr('id', (d, i) => `edgepath-${i}`);

    // Add the actual edgelabels
    const edgelabels = linkG
      .selectAll('.edgelabel')
      .data(
        this.d3Links!.filter(
          link =>
            (link.sourceIsAnchor ||
              (<PathwayGraphNodeD3>link.source)?.visible) &&
            (link.targetIsAnchor ||
              (<PathwayGraphNodeD3>link.target)?.visible) &&
            link.label &&
            link.label !== ''
        )
      )
      .join('text')
      .attr('class', 'edgelabel')
      .attr('fill', 'var(--edge-label-color)')
      .attr('id', (d, i) => `edgelabel-${i}`);

    // Put the edgelabels onto the paths
    edgelabels
      // Filter for paths that do not have a label yet
      .filter((edgepath, i) =>
        this._getMainDiv()
          .select('#linkG')
          .select(`#edgelabel-${i}`)
          .select('textPath')
          .empty()
      )
      .append('textPath')
      .attr('xlink:href', (d, i) => `#edgepath-${i}`)
      .attr('startOffset', '50%')
      .text(link => link.label || '');
  }

  private _addAnimation() {
    // Add forces to the PTM nodes and links
    const simulation = d3v6
      .forceSimulation()
      // Link Force
      .force(
        'link',
        d3v6
          .forceLink(
            this.d3Links?.filter(
              link =>
                !link.sourceIsAnchor &&
                (<PathwayGraphNodeD3>link.source)!.visible &&
                !link.targetIsAnchor &&
                (<PathwayGraphNodeD3>link.target)!.visible
            )
          )
          .strength(link =>
            link.types && link.types.includes('ptmlink') ? 2 : 0
          )
          .distance(link => {
            if (link.types && link.types.includes('ptmlink')) {
              if (
                Object.hasOwn(link.target, 'isCircle') &&
                (<PathwayGraphNodeD3>link.target).isCircle
              ) {
                return 20;
              }
              if (Object.hasOwn(link.target, 'textLength')) {
                const nodeTextLength =
                  (<PathwayGraphNodeD3>link.target).textLength || 1;

                // This is the result of some playing around with text lengths and forces
                // (as are most of the hard-coded numbers in here)
                if (nodeTextLength > 75) {
                  return Math.sqrt(nodeTextLength) * 7;
                }
                return Math.sqrt(nodeTextLength) * 6;
              }
              return 0;
            }
            return 0;
          })
      )
      // Collision repulsion Force
      .force(
        'collide',
        d3v6
          .forceCollide()
          .radius(node =>
            (<PathwayGraphNodeD3>node).type.includes('ptm') ? 7 : 0
          )
      );
    // I used to have center force, many-body force and x/y positional force in here as well
    // But they messed things up quite a lot

    // Apply drag behavior to nodes and groups
    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGElement, PathwayGraphNodeD3>('g')
      .call(this._dragNodes(simulation));
    this._getMainDiv()
      .selectAll<SVGElement, PathwayGraphNodeD3>('.group-path')
      .call(this._dragGroups(simulation));

    // Define animation
    simulation.nodes(this.d3Nodes!).on('tick', () => {
      if (this.d3Nodes) {
        for (const node of this.d3Nodes) {
          if (node.type === 'group') {
            node.leftX = (<GroupNodeD3>node).minX || 0;
            node.rightX = (<GroupNodeD3>node).maxX || 0;
          } else if (node.isCircle) {
            node.leftX = node.x;
            node.rightX = node.x;
          } else {
            node.leftX = node.x - node.textLength! / 2 + NODE_HEIGHT / 2;
            node.rightX = node.x + node.textLength! / 2 - NODE_HEIGHT / 2;
          }
        }
      }

      // Set new positions of the nodes
      this._getMainDiv()
        .select('#nodeG')
        .selectAll('g')
        .filter(d => (<PathwayGraphNodeD3>d).type !== 'group')
        .attr(
          'transform',
          node =>
            `translate(${(<PathwayGraphNodeD3>node).x},${
              (<PathwayGraphNodeD3>node).y
            })`
        );

      // Set new positions of the links
      // This mess makes the arrowheads end exactly at the rim of the target node.
      function getXCoordinate(
        link: PathwayGraphLinkD3,
        endpoint: 'source' | 'target',
        position: 'x' | 'rightX' | 'leftX'
      ): number {
        if (endpoint === 'source' && link.sourceIsAnchor) {
          return (
            (((<PathwayGraphLinkD3>link.source).sourceX || 0) +
              ((<PathwayGraphLinkD3>link.source).targetX || 0)) /
            2
          );
        }
        if (endpoint === 'target' && link.targetIsAnchor) {
          return (
            (((<PathwayGraphLinkD3>link.target).sourceX || 0) +
              ((<PathwayGraphLinkD3>link.target).targetX || 0)) /
            2
          );
        }
        return <number>(<PathwayGraphNodeD3>link[endpoint])[position];
      }

      function getYCoordinate(
        link: PathwayGraphLinkD3,
        endpoint: 'source' | 'target'
      ): number {
        if (endpoint === 'source' && link.sourceIsAnchor) {
          return (
            (((<PathwayGraphLinkD3>link.source).sourceY || 0) +
              ((<PathwayGraphLinkD3>link.source).targetY || 0)) /
            2
          );
        }
        if (endpoint === 'target' && link.targetIsAnchor) {
          return (
            (((<PathwayGraphLinkD3>link.target).sourceY || 0) +
              ((<PathwayGraphLinkD3>link.target).targetY || 0)) /
            2
          );
        }
        return <number>link[endpoint].y;
      }

      this._getMainDiv()
        .select('#linkG')
        .selectAll<SVGElement, PathwayGraphLinkD3>('line')
        /* eslint-disable no-param-reassign */
        .each(link => {
          let sourceX;
          let targetX;
          let midX;
          if (
            getXCoordinate(link, 'source', 'rightX') <
            getXCoordinate(link, 'target', 'leftX')
          ) {
            sourceX = getXCoordinate(link, 'source', 'rightX');
            targetX = getXCoordinate(link, 'target', 'leftX');
          } else if (
            getXCoordinate(link, 'target', 'rightX') <
            getXCoordinate(link, 'source', 'leftX')
          ) {
            targetX = getXCoordinate(link, 'target', 'rightX');
            sourceX = getXCoordinate(link, 'source', 'leftX');
          } else {
            midX =
              (getXCoordinate(link, 'source', 'x') +
                getXCoordinate(link, 'target', 'x')) /
              2;
            if (midX > getXCoordinate(link, 'target', 'rightX')) {
              midX = getXCoordinate(link, 'target', 'rightX');
            } else if (midX > getXCoordinate(link, 'source', 'rightX')) {
              midX = getXCoordinate(link, 'source', 'rightX');
            } else if (midX < getXCoordinate(link, 'target', 'leftX')) {
              midX = getXCoordinate(link, 'target', 'leftX');
            } else if (midX < getXCoordinate(link, 'source', 'leftX')) {
              midX = getXCoordinate(link, 'source', 'leftX');
            }
            targetX = midX;
            sourceX = midX;
          }
          const dx = targetX - sourceX;
          let sourceY;
          let targetY;
          let midY;
          if (
            !link.sourceIsAnchor &&
            (<PathwayGraphNodeD3>link.source).type === 'group'
          ) {
            const sourceGroupNode = <GroupNodeD3>link.source;
            sourceGroupNode.maxY ??= 0;
            sourceGroupNode.minY ??= 0;
            sourceGroupNode.maxX ??= 0;
            sourceGroupNode.minX ??= 0;
            if (
              !link.targetIsAnchor &&
              (<PathwayGraphNodeD3>link.target).type === 'group'
            ) {
              // Both are groups, we need to do the whole business
              const targetGroupNode = <GroupNodeD3>link.target;
              targetGroupNode.maxY ??= 0;
              targetGroupNode.minY ??= 0;
              targetGroupNode.maxX ??= 0;
              targetGroupNode.minX ??= 0;
              if (sourceGroupNode.maxY < targetGroupNode.minY) {
                sourceY = sourceGroupNode.maxY;
                targetY = targetGroupNode.minY;
              } else if (targetGroupNode.maxY < sourceGroupNode.minY) {
                targetY = targetGroupNode.maxY;
                sourceY = sourceGroupNode.minY;
              } else {
                midY =
                  (Math.min(sourceGroupNode.minY, targetGroupNode.minY) +
                    Math.max(sourceGroupNode.maxY, targetGroupNode.maxY)) /
                  2;
                if (midY > targetGroupNode.maxY) {
                  midY = targetGroupNode.maxY;
                } else if (midY > sourceGroupNode.maxY) {
                  midY = sourceGroupNode.maxY;
                } else if (midY < targetGroupNode.minY) {
                  midY = targetGroupNode.minY;
                } else if (midY < sourceGroupNode.minY) {
                  midY = sourceGroupNode.minY;
                }
                targetY = midY;
                sourceY = midY;
              }
            } else {
              // source is group, target is not
              targetY = getYCoordinate(link, 'target');
              if (sourceGroupNode.maxY < targetY) {
                sourceY = sourceGroupNode.maxY;
              } else if (targetY < sourceGroupNode.minY) {
                sourceY = sourceGroupNode.minY;
              } else {
                sourceY = targetY;
              }
            }
          } else {
            sourceY = getYCoordinate(link, 'source');
            if (
              !link.targetIsAnchor &&
              (<PathwayGraphNodeD3>link.target).type === 'group'
            ) {
              // target is group, source is not
              const targetGroupNode = <GroupNodeD3>link.target;
              targetGroupNode.maxY = targetGroupNode.maxY || 0;
              targetGroupNode.minY = targetGroupNode.minY || 0;
              targetGroupNode.maxX = targetGroupNode.maxX || 0;
              targetGroupNode.minX = targetGroupNode.minX || 0;
              if (sourceY < targetGroupNode.minY) {
                targetY = targetGroupNode.minY;
              } else if (targetGroupNode.maxY < sourceY) {
                targetY = targetGroupNode.maxY;
              } else {
                targetY = sourceY;
              }
            } else {
              // both are not group
              targetY = getYCoordinate(link, 'target');
            }
          }

          const dy = targetY - sourceY;
          const angle = Math.atan2(dx, dy);
          // 'binding/association' links need an offset
          const targetOffset = link.types.includes('binding/association')
            ? 0
            : 3.5;
          link.sourceX = sourceX + Math.sin(angle) * NODE_HEIGHT;
          link.targetX =
            targetX - Math.sin(angle) * (NODE_HEIGHT + targetOffset);
          link.sourceY = sourceY + Math.cos(angle) * NODE_HEIGHT;
          link.targetY =
            targetY - Math.cos(angle) * (NODE_HEIGHT + targetOffset);
        })
        /* eslint-enable no-param-reassign */
        // Now the new start and end coordinates of the link have been calculated and can be set
        .attr('x1', link => link.sourceX!)
        .attr('y1', link => link.sourceY!)
        .attr('x2', link => link.targetX!)
        .attr('y2', link => link.targetY!);

      // Set the new positions of the edge paths
      this._getMainDiv()
        .select('#linkG')
        .selectAll<SVGElement, PathwayGraphLinkD3>('.edgepath')
        .attr(
          'd',
          edgepath =>
            `M ${edgepath.sourceX} ${edgepath.sourceY} L ${edgepath.targetX} ${edgepath.targetY}`
        );

      // Optionally rotate the edge labels, if they have been turned upside-down
      this._getMainDiv()
        .select('#linkG')
        .selectAll<SVGGraphicsElement, PathwayGraphLinkD3>('.edgelabel')
        .attr('transform', (link, i, nodes) => {
          if (
            getXCoordinate(link, 'target', 'x') <
            getXCoordinate(link, 'source', 'x')
          ) {
            const bbox = nodes[i].getBBox();
            const rx = bbox.x + bbox.width / 2;
            const ry = bbox.y + bbox.height / 2;
            return `rotate(180 ${rx} ${ry})`;
          }
          return 'rotate(0)';
        });
      // Logic to update node groups
      // Helper function for the group polygons
      const polygonGenerator = (inputGroupId: string) => {
        const nodeCoords = (<
          Selection<SVGElement, GeneProteinNodeD3, HTMLElement, null>
        >this._getMainDiv())
          .select('#nodeG')
          .selectAll<SVGElement, GeneProteinNodeD3>('g')
          .filter(d => d.groupId === inputGroupId)
          .data()
          .reduce<[number, number][]>(
            (res, d) =>
              res.concat([
                [d.leftX!, d.y! - NODE_HEIGHT / 2],
                [d.leftX!, d.y! + NODE_HEIGHT / 2],
                [d.rightX!, d.y! - NODE_HEIGHT / 2],
                [d.rightX!, d.y! + NODE_HEIGHT / 2],
              ]),
            []
          );
        return d3v6.polygonHull(nodeCoords);
      };

      // Reshape and relocate the groups based on the updated positions of their members
      this._getMainDiv()
        .select('#nodeG')
        .selectAll<SVGElement, GroupNodeD3>('g')
        .filter(d => d.type === 'group')
        /* eslint-disable no-param-reassign */
        .each(group => {
          group.polygon = <[number, number][]>polygonGenerator(group.nodeId);
          group.centroid = d3v6.polygonCentroid(group.polygon);
          group.minX = Math.min(...group.polygon.map(point => point[0]));
          group.maxX = Math.max(...group.polygon.map(point => point[0]));
          group.minY = Math.min(...group.polygon.map(point => point[1]));
          group.maxY = Math.max(...group.polygon.map(point => point[1]));
          // Now set fx and fy to the means of the components
          // This is actually only relevant for the positioning of the links, the dynamic positions
          // of the groups are handled via transform-translate
          const xs = group.componentNodes.map(comp => comp.x);
          group.fx = xs.reduce((sum, elem) => sum + elem, 0) / xs.length;
          const ys = group.componentNodes.map(comp => comp.y);
          group.fy = ys.reduce((sum, elem) => sum + elem, 0) / ys.length;
        })
        /* eslint-enable no-param-reassign */
        .attr('transform', group =>
          group.centroid
            ? `translate(${group.centroid[0]},${group.centroid[1]}) scale(1.33)`
            : 'scale(1) translate(0,0)'
        );
      const valueline = d3v6
        .line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3v6.curveCatmullRomClosed);

      this._getMainDiv()
        .select('#nodeG')
        .selectAll<SVGElement, GroupNodeD3>('.group-path')
        .attr('d', group =>
          group.centroid
            ? valueline(
                group.polygon!.map(point => [
                  point[0] - group.centroid![0],
                  point[1] - group.centroid![1],
                ])
              )
            : null
        );

      // const myGroup = this._getMainDiv().select('#nodeG').select('.group')
      // if(myGroup.attr('transform')) {
      //
      //   const myGroupPath =
      //     myGroup
      //       .select<SVGPathElement>('.group-path');
      //
      //   const myLink = this._getMainDiv()
      //     .select('#linkG')
      //     .select<SVGLineElement>('.phosphorylation');
      //
      //   const translateValues = myGroup.attr('transform').split('(')[1].split(')')[0].split(',')
      //   const translateX = Number(translateValues[0])
      //   const translateY = Number(translateValues[1])
      //   const scale = Number(myGroup.attr('transform').split('(')[2].split(')')[0])
      //
      //   // console.log(`Group transform: x=${translateX} y=${translateY}`)
      //   const myIntersection = pathLineIntersection(myGroupPath.node()!, translateX, translateY, scale, myLink)
      //
      //   // console.log(`Intersections: ${JSON.stringify(myIntersection[0])}`)
      //
      //
      //   myLink
      //     .attr('x1',  myIntersection[0].x)
      //     .attr('y1', myIntersection[0].y)
      //
      //   // console.log(`Link Dimensions: x1=${myLink.attr('x1')}`)
      //   // console.dir(myLink.node())
      // }
    });
    return simulation;
  }

  private _addTooltips() {
    // Remove tooltip if present
    // @ts-ignore
    d3v6.select(this.shadowRoot).select('#nodetooltip').remove();

    const tooltip = d3v6
      // @ts-ignore
      .select(this.shadowRoot)
      .select('#pathwayContainer')
      .append('div')
      .attr('class', 'tooltip')
      .attr('id', 'nodetooltip')
      .attr('is-dragging', 'false')
      // Hide the tooltip initially
      .style('opacity', '0');

    const mouseenter = (
      e: MouseEvent,
      nodeOrLink: PathwayGraphNodeD3 | PathwayGraphLinkD3
    ) => {
      const classesOfTarget = (<HTMLElement>e.target)?.classList;
      if (tooltip.attr('is-dragging') === 'false') {
        if (classesOfTarget.contains('link')) {
          const link = nodeOrLink as PathwayGraphLinkD3;
          if (link.types && link.types.length > 0) {
            tooltip.html(`<strong>Type(s):</strong> ${link.types.join(', ')}`);
            tooltip.transition().duration(0).style('opacity', '1');
          }
        } else {
          const node = nodeOrLink as PathwayGraphNodeD3;
          if (node.type === 'ptm') {
            tooltip.html(
              BiowcPathwaygraph._getPTMTooltipText(node as PTMNodeD3)
            );
          } else if (node.type === 'gene_protein') {
            tooltip.html(
              BiowcPathwaygraph._getGeneProteinTooltipText(
                node as GeneProteinNodeD3
              )
            );
          } else if (classesOfTarget.contains('summary')) {
            let regulationLabel;
            switch ((<PTMSummaryNodeD3>node).regulation) {
              case 'up': {
                regulationLabel = 'Upregulated';
                break;
              }
              case 'down': {
                regulationLabel = 'Downregulated';
                break;
              }
              case 'not': {
                regulationLabel = 'Unregulated';
                break;
              }
              default: {
                regulationLabel = '';
                break;
              }
            }
            tooltip.html(
              `${(<PTMSummaryNodeD3>node).label} ${regulationLabel} ${
                +(<PTMSummaryNodeD3>node).label > 1 ? 'Peptides' : 'Peptide'
              }`
            );
          } else {
            tooltip.html((<GeneProteinNodeD3>node).label || '');
          }
          // All nodes get a tooltip, except for group nodes
          if (node.type !== 'group') {
            tooltip.transition().duration(0).style('opacity', '1');
          }
        }
      }
    };

    const mousemove = (e: MouseEvent) => {
      tooltip
        // The offset is trial and error, I could not figure this out programmatically
        .style('top', `${e.pageY + this.tooltipVerticalOffset}px`)
        .style('left', `${e.pageX + this.tooltipHorizontalOffset + 15}px`);
    };

    const mouseleave = () => {
      tooltip.transition().duration(0).style('opacity', '0');
    };

    // // Apply this functionality to the nodes and links of the graph
    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGElement, PathwayGraphNodeD3>('g')
      .on('mouseenter', mouseenter)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave);

    this._getMainDiv()
      .select('#linkG')
      .selectAll<SVGElement, PathwayGraphLinkD3>('line')
      .on('mouseenter', mouseenter);

    this._getMainDiv()
      .select('#linkG')
      .selectAll<SVGElement, PathwayGraphLinkD3>('line')
      .on('mouseenter', mouseenter)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave);
  }

  private _addContextMenu() {
    // The context menu should be created when a node is right-clicked
    const onrightclick = (
      rightClickEvent: MouseEvent,
      node: GeneProteinNodeD3 | PTMSummaryNodeD3
    ) => {
      // Remove a possible previously existing context menu

      // @ts-ignore
      d3v6.select(this.shadowRoot).selectAll('.contextMenu').remove();
      // Do not show the regular context menu of the browser
      rightClickEvent.preventDefault();

      // Hide the tooltip when the context menu is shown
      this._getMainDiv().select('#nodetooltip').style('opacity', '0');
      const contextMenu = d3v6
        // @ts-ignore
        .select(this.shadowRoot)
        .select('#pathwayContainer')
        .append('div')
        .attr('class', 'contextMenu')
        .attr('id', 'nodeContextMenu');

      // Before we add the entries, add a title to the menu
      contextMenu
        .append('div')
        .attr('class', 'contextMenuTitle')
        .append('text')
        .text('Alternative Names');

      contextMenu
        .selectAll('.contextMenuEntry')
        .data(BiowcPathwaygraph._calcPossibleLabels(<GeneProteinNodeD3>node))
        .join('div')
        .attr('class', 'contextMenuEntry')
        .style('cursor', 'pointer');

      contextMenu
        .style('top', `${rightClickEvent.pageY + this.tooltipVerticalOffset}px`)
        .style(
          'left',
          `${rightClickEvent.pageX + this.tooltipHorizontalOffset + 15}px`
        );

      const contextMenuEntry = contextMenu.selectAll('.contextMenuEntry');

      contextMenuEntry
        .append('text')
        .text((entry => entry) as ValueFn<SVGTextElement, unknown, string>);

      contextMenuEntry.on('click', (contextMenuEntryClickEvent, d) => {
        // Set the text to the user's choice
        // const parentNodeId = (<PathwayGraphNodeD3>rightClickEvent.target?.parentNode)

        /* eslint-disable-next-line no-param-reassign */
        node.currentDisplayedLabel = <string>d;

        // @ts-ignore
        d3v6.select(this.shadowRoot).select('#nodeContextMenu').remove();

        this._refreshGraph(true);
      });
    };

    // Equip all nodes with the feature we just defined
    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGElement, GeneProteinNodeD3 | PTMSummaryNodeD3>(
        '.gene_protein,.compound'
      )
      // .selectAll('g')
      .on('contextmenu', onrightclick);
  }

  private static _calcPossibleLabels(node: GeneProteinNodeD3) {
    let splitRegex;
    // Individual PTM nodes cannot have a label
    if (node.type === 'ptm') return [];
    if (node.type.includes('compound')) {
      // Compounds may have a comma in their name, so do not split by that
      // We used to also split by '/' here, but that had unwanted side-effects (e.g. when a gene name was 'PKCI+/-').
      splitRegex = /;/;
    } else {
      splitRegex = /,|;/;
    }
    const allPossibleNames = (
      node.label ? node.label.split(splitRegex) : []
    ).concat(node.geneNames || []);
    return [
      ...new Set(allPossibleNames.filter(name => !!name && name !== '')),
    ].sort((a, b) => {
      // Sort alphabetically, except if the node has a default name, this one always goes first
      if (!!node.defaultName && a === node.defaultName) return -1;
      if (!!node.defaultName && b === node.defaultName) return 1;
      return a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
    });
  }

  private static _computeRegulationClass(node: PathwayGraphNode) {
    if (
      Object.hasOwn(node, 'regulation') &&
      !!(<PTMNode | PTMSummaryNode>node).regulation
    ) {
      return (<PTMNode | PTMSummaryNode>node).regulation;
    }

    const geneProteinNode = node as GeneProteinNode;
    if (geneProteinNode.nUp! > 0 && geneProteinNode.nDown! > 0) return 'both';
    if (geneProteinNode.nUp! > 0) return 'up';
    if (geneProteinNode.nDown! > 0) return 'down';
    if (geneProteinNode.nNot! > 0) return 'not';

    return '';
  }

  private static _getNodeFoldChange(node: PathwayGraphNodeD3) {
    return (
      Number((<PTMNodeD3>node).details!['Fold Change']) ||
      Number((<PTMNodeD3>node).details!['Log Fold Change'])
    );
  }

  private _computeNodeColor(node: PathwayGraphNodeD3) {
    if (node.type !== 'ptm') {
      // Default to whatever is in the css
      return '';
    }
    const upregulatedColor = getComputedStyle(this).getPropertyValue(
      '--upregulated-color'
    );
    const downregulatedColor = getComputedStyle(this).getPropertyValue(
      '--downregulated-color'
    );
    const unregulatedColor = getComputedStyle(this).getPropertyValue(
      '--unregulated-color'
    );
    switch (this.hue) {
      case 'direction': {
        switch ((<PTMNodeD3>node).regulation) {
          case 'up':
            return upregulatedColor;
          case 'down':
            return downregulatedColor;
          case 'not':
            return unregulatedColor;
          default:
            return '';
        }
      }
      case 'foldchange': {
        // Interpolate between up and not or down and not, depending on direction
        // The center of interpolation is 0 for log fold change and 1 for fold change
        const isLogFoldChange =
          this.allDowngoingLessThan0 ||
          (!this.anyDowngoingPTMs && !this.allUpgoingGreaterThan1);
        const interpolationCenter = isLogFoldChange ? 0 : 1;

        switch ((<PTMNodeD3>node).regulation) {
          case 'up':
            return d3v6.interpolate(
              unregulatedColor,
              upregulatedColor
            )(
              (BiowcPathwaygraph._getNodeFoldChange(node) -
                interpolationCenter) /
                (this.maxPosFoldChange! - interpolationCenter)
            );
          case 'down':
            return d3v6.interpolate(
              unregulatedColor,
              downregulatedColor
            )(
              (BiowcPathwaygraph._getNodeFoldChange(node) -
                interpolationCenter) /
                (this.maxNegFoldChange! - interpolationCenter)
            );
          case 'not':
            return 'var(--unregulated-color)';
          default:
            return '';
        }
      }
      case 'potency': {
        return d3v6.interpolateRgbBasis(this.potencyColorScale)(
          (Number((<PTMNodeD3>node).details!['-log(EC50)']) -
            this.colorRangeMin!) /
            (this.colorRangeMax! - this.colorRangeMin!)
        );
      }
      default:
        return '';
    }
  }

  private _calculateHueRange() {
    const downNodes = this.d3Nodes?.filter(
      node => node.type === 'ptm' && (<PTMNodeD3>node).regulation === 'down'
    );
    this.anyDowngoingPTMs = !!downNodes && downNodes.length > 0;
    const upNodes = this.d3Nodes?.filter(
      node => node.type === 'ptm' && (<PTMNodeD3>node).regulation === 'up'
    );
    this.anyUpgoingPTMs = !!upNodes && upNodes.length > 0;

    switch (this.hue) {
      case 'direction':
        break;
      case 'foldchange':
        /* eslint-disable no-case-declarations */

        this.maxPosFoldChange = upNodes?.reduce(
          (currentMax: number, currentNode: PathwayGraphNodeD3) => {
            // Check if the node has a fold change in its details
            if (
              Object.hasOwn(currentNode, 'details') &&
              (Object.hasOwn(
                (<PTMNodeD3>currentNode).details!,
                'Fold Change'
              ) ||
                Object.hasOwn(
                  (<PTMNodeD3>currentNode).details!,
                  'Log Fold Change'
                ))
            ) {
              // Compare it with the currentMax
              return Math.max(
                BiowcPathwaygraph._getNodeFoldChange(currentNode),
                currentMax
              );
            }
            return currentMax;
          },
          0
        );

        this.allUpgoingGreaterThan1 = upNodes?.every(
          currentNode => BiowcPathwaygraph._getNodeFoldChange(currentNode) >= 1
        );

        this.maxNegFoldChange = downNodes?.reduce(
          (currentMax: number, currentNode: PathwayGraphNodeD3) => {
            // Check if the node has a fold change in its details
            if (
              Object.hasOwn(currentNode, 'details') &&
              (Object.hasOwn(
                (<PTMNodeD3>currentNode).details!,
                'Fold Change'
              ) ||
                Object.hasOwn(
                  (<PTMNodeD3>currentNode).details!,
                  'Log Fold Change'
                ))
            ) {
              // If yes, compare it with the currentMax (which is a min for negative fold change)
              return Math.min(
                BiowcPathwaygraph._getNodeFoldChange(currentNode),
                currentMax
              );
            }
            return currentMax;
          },
          0
        );

        this.allDowngoingLessThan0 = downNodes?.every(
          currentNode => BiowcPathwaygraph._getNodeFoldChange(currentNode) < 0
        );
        break;
      /* eslint-enable no-case-declarations */
      case 'potency':
        this.maxPotency = this.d3Nodes
          ?.filter(node => node.type === 'ptm')
          .reduce((currentMax: number, currentNode: PathwayGraphNodeD3) => {
            // Check if the node has details and if they includes a fold change
            if (
              Object.hasOwn(currentNode, 'details') &&
              Object.hasOwn(
                (<GeneProteinNodeD3 | PTMNodeD3>currentNode).details!,
                '-log(EC50)'
              )
            ) {
              // If yes, compare it with the currentMax
              return Math.max(
                Number(
                  (<GeneProteinNodeD3 | PTMNodeD3>currentNode).details![
                    '-log(EC50)'
                  ]
                ),
                currentMax
              );
            }

            return currentMax;
          }, 0);
        this.minPotency = this.d3Nodes
          ?.filter(node => node.type === 'ptm')
          .reduce((currentMin: number, currentNode: PathwayGraphNodeD3) => {
            // Check if the node has details and if they includes a fold change
            if (
              Object.hasOwn(currentNode, 'details') &&
              Object.hasOwn(
                (<GeneProteinNodeD3 | PTMNodeD3>currentNode).details!,
                '-log(EC50)'
              )
            ) {
              // If yes, compare it with the currentMin
              return Math.min(
                Number(
                  (<GeneProteinNodeD3 | PTMNodeD3>currentNode).details![
                    '-log(EC50)'
                  ]
                ),
                currentMin
              );
            }

            return currentMin;
          }, this.maxPotency!);

        // Set min and max values to min and max potency (the user may change this later):
        this.colorRangeMin = this.minPotency;
        this.colorRangeMax = this.maxPotency;
        this.dispatchEvent(
          new CustomEvent('initializeColorRange', {
            bubbles: true,
            cancelable: true,
            detail: [this.colorRangeMin, this.colorRangeMax],
          })
        );
        break;
      default:
        break;
    }
  }

  // Define drag behavior
  /* eslint-disable no-param-reassign */
  private _dragNodes(
    simulation: Simulation<
      SimulationNodeDatum,
      SimulationLinkDatum<PathwayGraphNodeD3>
    >
  ) {
    const dragstarted = (
      event: D3DragEvent<
        SVGElement,
        PathwayGraphNodeD3 | PathwayGraphLinkD3,
        any
      >
    ) => {
      d3v6
        // Disable tooltip while dragging
        // @ts-ignore
        .select(this.shadowRoot)
        .select('#nodetooltip')
        .style('opacity', '0')
        .attr('is-dragging', 'true');
      if (!event.active) simulation.alphaTarget(0.3).restart();
    };

    const dragged = (
      event: D3DragEvent<
        SVGElement,
        PathwayGraphNodeD3 | PathwayGraphLinkD3,
        any
      >,
      node: PathwayGraphNodeD3
    ) => {
      node.fx = event.x;
      node.fy = event.y;
    };

    const dragended = (
      event: D3DragEvent<
        SVGElement,
        PathwayGraphNodeD3 | PathwayGraphLinkD3,
        any
      >,
      node: PathwayGraphNodeD3
    ) => {
      if (!event.active) simulation.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      d3v6
        // @ts-ignore
        .select(this.shadowRoot)
        .select('#nodetooltip')
        .attr('is-dragging', 'false');
    };

    return d3v6
      .drag<SVGElement, PathwayGraphNodeD3>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  private _dragGroups(
    simulation: Simulation<
      SimulationNodeDatum,
      SimulationLinkDatum<PathwayGraphNodeD3>
    >
  ) {
    const dragstarted = (
      event: D3DragEvent<
        SVGElement,
        PathwayGraphNodeD3 | PathwayGraphLinkD3,
        any
      >
    ) => {
      d3v6
        // Disable tooltip while dragging
        // @ts-ignore
        .select(this.shadowRoot)
        .select('#nodetooltip')
        .style('opacity', '0')
        .attr('is-dragging', 'true');
      if (!event.active) simulation.alphaTarget(0.3).restart();
    };

    const dragged = (
      event: D3DragEvent<
        SVGElement,
        PathwayGraphNodeD3 | PathwayGraphLinkD3,
        any
      >,
      group: any
    ) => {
      const nodes = this._getMainDiv().select('#nodeG').selectAll('g');
      nodes
        .filter(
          d =>
            Object.hasOwn(<PathwayGraphNodeD3>d, 'groupId') &&
            !!(<GeneProteinNodeD3>d).groupId &&
            (<GeneProteinNodeD3>d).groupId === (<GroupNodeD3>group).nodeId
        )
        .each(d => {
          (<PathwayGraphNodeD3>d).x += event.dx;
          (<PathwayGraphNodeD3>d).y += event.dy;
        });

      group.fx = event.x;
      group.fy = event.y;
    };

    const dragended = (
      event: D3DragEvent<
        SVGElement,
        PathwayGraphNodeD3 | PathwayGraphLinkD3,
        any
      >,
      group: any
    ) => {
      if (!event.active) simulation.alphaTarget(0);
      d3v6
        // @ts-ignore
        .select(this.shadowRoot)
        .select('#nodetooltip')
        .attr('is-dragging', 'false');
      group.fx = null;
      group.fy = null;
    };

    return d3v6
      .drag<SVGElement, PathwayGraphNodeD3>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  /* eslint-enable no-param-reassign */

  private _renderLegend() {
    const legendSvg = this._getMainDiv().select<SVGElement>('#pathwayLegend');
    // If the selector does not exist yet we are too early and need to come back later
    if (legendSvg.empty()) {
      return;
    }

    // If the selector already has children, the legend has been drawn already - remove it!
    legendSvg.selectAll('*').remove();

    // Bring legend to front of the canvas
    legendSvg.node()!.parentNode!.appendChild(legendSvg.node()!);

    // We will draw a color legend if
    // a) We have regulated curves AND
    // b) The hue is either potency or fold change
    const drawColorLegend =
      (this.anyUpgoingPTMs || this.anyDowngoingPTMs) &&
      (this.hue === 'potency' || this.hue === 'foldchange');

    // Determine width and height of the legend.
    // Width is constant, height is larger if the legend contains a color scale
    const legendWidth = 265;
    const legendHeight = drawColorLegend ? 255 : 180;

    // Draw the frame
    legendSvg
      .append('rect')
      .attr('x', 3)
      .attr('y', 3)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'white')
      .style('stroke-width', '1.5')
      .style('stroke', 'var(--legend-frame-color)');

    const scalingFactor = 0.5;
    const xOffset = 20 * scalingFactor;
    const yOffset = 50 * scalingFactor;
    const lineHeight = 50 * scalingFactor;
    const paragraphMargin = 15 * scalingFactor;

    legendSvg
      .append('rect')
      .attr('class', 'node-rect gene_protein legend')
      .attr('x', xOffset)
      .attr('y', yOffset + lineHeight * 0 + paragraphMargin * 0)
      .attr('rx', 10 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 35 * scalingFactor)
      .attr('height', 25 * scalingFactor);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Gene/Protein')
      .attr('x', xOffset + 22)
      .attr(
        'y',
        yOffset * scalingFactor + 3 + lineHeight * 0 + paragraphMargin * 0
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect pathway legend')
      .attr('x', xOffset + 120)
      .attr('y', yOffset + lineHeight * 0 + paragraphMargin * 0)
      .attr('rx', 10 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 35 * scalingFactor)
      .attr('height', 25 * scalingFactor);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Pathway')
      .attr('x', xOffset + 142)
      .attr(
        'y',
        yOffset * scalingFactor + 3 + lineHeight * 0 + paragraphMargin * 0
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect group-path legend')
      .attr('x', xOffset)
      .attr('y', yOffset + lineHeight * 1 + paragraphMargin * 0)
      .attr('rx', 10 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 35 * scalingFactor)
      .attr('height', 25 * scalingFactor);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Group')
      .attr('x', xOffset + 22)
      .attr(
        'y',
        yOffset * scalingFactor + 3 + lineHeight * 1 + paragraphMargin * 0
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect compound legend')
      .attr('x', xOffset + 75)
      .attr('y', yOffset + lineHeight * 1 + paragraphMargin * 0)
      .attr('rx', 10 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 35 * scalingFactor)
      .attr('height', 25 * scalingFactor);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Metabolite/Compound')
      .attr('x', xOffset + 97)
      .attr(
        'y',
        yOffset * scalingFactor + 3 + lineHeight * 1 + paragraphMargin * 0
      );

    legendSvg
      .append('line')
      .attr('class', 'link legend')
      .attr('x1', xOffset)
      .attr(
        'y1',
        yOffset * scalingFactor + lineHeight * 2 + paragraphMargin * 1
      )
      .attr('x2', xOffset + 32)
      .attr(
        'y2',
        yOffset * scalingFactor + lineHeight * 2 + paragraphMargin * 1
      )
      .attr('marker-end', 'url(#activationMarker)');
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Activation')
      .attr('x', xOffset + 38)
      .attr(
        'y',
        yOffset * scalingFactor + lineHeight * 2 + paragraphMargin * 1
      );

    legendSvg
      .append('line')
      .attr('class', 'link legend')
      .attr('x1', xOffset + 125)
      .attr(
        'y1',
        yOffset * scalingFactor + lineHeight * 2 + paragraphMargin * 1
      )
      .attr('x2', xOffset + 160)
      .attr(
        'y2',
        yOffset * scalingFactor + lineHeight * 2 + paragraphMargin * 1
      )
      .attr('marker-end', 'url(#inhibitionMarker)');
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Inhibition')
      .attr('x', xOffset + 168)
      .attr(
        'y',
        yOffset * scalingFactor + lineHeight * 2 + paragraphMargin * 1
      );

    legendSvg
      .append('line')
      .attr('class', 'link legend')
      .attr('x1', xOffset)
      .attr(
        'y1',
        yOffset * scalingFactor + lineHeight * 3 + paragraphMargin * 1
      )
      .attr('x2', xOffset + 32)
      .attr(
        'y2',
        yOffset * scalingFactor + lineHeight * 3 + paragraphMargin * 1
      )
      .attr('marker-end', 'url(#otherInteractionMarker)');
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Other')
      .attr('x', xOffset + 38)
      .attr(
        'y',
        yOffset * scalingFactor + lineHeight * 3 + paragraphMargin * 1
      );

    legendSvg
      .append('line')
      .attr('class', 'link legend')
      .attr('x1', xOffset + 92)
      .attr(
        'y1',
        yOffset * scalingFactor + lineHeight * 3 + paragraphMargin * 1
      )
      .attr('x2', xOffset + 132)
      .attr(
        'y2',
        yOffset * scalingFactor + lineHeight * 3 + paragraphMargin * 1
      )
      .attr('stroke-dasharray', '12 3')
      .style('stroke-width', 7);

    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Indirect')
      .attr('x', xOffset + 136)
      .attr(
        'y',
        yOffset * scalingFactor + lineHeight * 3 + paragraphMargin * 1
      );

    legendSvg
      .append('line')
      .attr('class', 'link legend')
      .attr('x1', xOffset)
      .attr(
        'y1',
        yOffset * scalingFactor + lineHeight * 4 + paragraphMargin * 1
      )
      .attr('x2', xOffset + 32)
      .attr(
        'y2',
        yOffset * scalingFactor + lineHeight * 4 + paragraphMargin * 1
      )
      .attr('stroke-dasharray', '6 3')
      .style('stroke-width', 7);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Binding/Association')
      .attr('x', xOffset + 38)
      .attr(
        'y',
        yOffset * scalingFactor + lineHeight * 4 + paragraphMargin * 1
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect ptm up legend')
      .attr('x', xOffset)
      .attr('y', yOffset * scalingFactor + lineHeight * 5 + paragraphMargin * 2)
      .attr('rx', 30 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 30 * scalingFactor)
      .attr('height', 30 * scalingFactor);

    // svg.append("text").attr("class", "legend")
    //     .text("/")
    //     .style("font-size", "26pt")
    //     .attr("x", xOffset + 28).attr("y", yOffset + lineHeight * 5 + paragraphMargin * 2 + 1);

    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Up-')
      .attr('x', xOffset + 20)
      .attr(
        'y',
        yOffset * scalingFactor - 8 + lineHeight * 5 + paragraphMargin * 2
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect ptm down legend')
      .attr('x', xOffset + 55)
      .attr('y', yOffset * scalingFactor + lineHeight * 5 + paragraphMargin * 2)
      .attr('rx', 30 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 30 * scalingFactor)
      .attr('height', 30 * scalingFactor);

    // svg.append("text").attr("class", "legend")
    //     .text("/")
    //     .style("font-size", "26pt")
    //     .attr("x", xOffset + 68).attr("y", yOffset + lineHeight * 5 + paragraphMargin * 2 + 1);

    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Down-')
      .attr('x', xOffset + 75)
      .attr(
        'y',
        yOffset * scalingFactor - 8 + lineHeight * 5 + paragraphMargin * 2
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect ptm not legend')
      .attr('x', xOffset + 130)
      .attr('y', yOffset * scalingFactor + lineHeight * 5 + paragraphMargin * 2)
      .attr('rx', 30 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 30 * scalingFactor)
      .attr('height', 30 * scalingFactor);

    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Not regulated')
      .attr('x', xOffset + 150)
      .attr(
        'y',
        yOffset * scalingFactor - 8 + lineHeight * 5 + paragraphMargin * 2
      );

    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('+p/-p')
      .attr('x', xOffset)
      .attr(
        'y',
        yOffset * scalingFactor - 8 + lineHeight * 6 + paragraphMargin * 2
      )
      .style('font-family', 'Roboto')
      .style('font-size', '12pt');

    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('(De-)Phosphorylation')
      .attr('x', xOffset + 50)
      .attr(
        'y',
        yOffset * scalingFactor - 8 + lineHeight * 6 + paragraphMargin * 2
      );

    if (drawColorLegend) {
      const colorLegendGroupPosition = [
        xOffset + 5,
        yOffset * scalingFactor + lineHeight * 7 + paragraphMargin * 2 + 10,
      ];
      const colorLegendGroup = legendSvg
        .append('g')
        .attr(
          'transform',
          `translate(${colorLegendGroupPosition[0]},${colorLegendGroupPosition[1]})`
        );

      const colorLegendTitle = legendSvg
        .append('text')
        .attr('class', 'legend')
        .attr('x', colorLegendGroupPosition[0] - 5)
        .attr('y', colorLegendGroupPosition[1] - lineHeight / 2);

      // Generate the linear gradient for the color legend
      // (https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient/)
      const linearGradient = this._getMainDiv().select<SVGElement>(
        '#potency-linear-gradient'
      );

      // In case the legend is being redrawn, we need to clear the gradient's stops
      linearGradient.selectAll('*').remove();

      linearGradient!.attr('x1', '0%').attr('x2', '100%');

      colorLegendGroup
        .append('rect')
        .attr('width', legendWidth - 25)
        .attr('height', 20)
        .style('fill', 'url(#potency-linear-gradient)');

      const steps = 100;
      const gradientRange = Array.from({ length: steps }, (_, i) => i / steps);

      let colorLegendXAxisScale;
      let colorLegendXAxis: d3v6.Axis<d3v6.NumberValue> | d3v6.Axis<string>;

      if (this.hue === 'potency') {
        colorLegendTitle.text('pEC50:');
        colorLegendXAxisScale = d3v6.scaleLinear();
        colorLegendXAxis = d3v6.axisBottom(colorLegendXAxisScale);

        linearGradient
          .selectAll('stop')
          .data(gradientRange)
          .enter()
          .append('stop')
          .attr('offset', d => d)
          .attr('stop-color', d =>
            d3v6.interpolateRgbBasis(this.potencyColorScale)(d)
          );
        colorLegendXAxisScale
          .domain([this.colorRangeMin!, this.colorRangeMax!])
          .range([0, legendWidth - 25]);

        colorLegendXAxis.ticks(4);
      }

      if (this.hue === 'foldchange') {
        colorLegendTitle.text('Fold Change:');
        colorLegendXAxisScale = d3v6.scalePoint();
        colorLegendXAxis = d3v6.axisBottom(colorLegendXAxisScale);

        const upregulatedColor = getComputedStyle(this).getPropertyValue(
          '--upregulated-color'
        );
        const downregulatedColor = getComputedStyle(this).getPropertyValue(
          '--downregulated-color'
        );
        const unregulatedColor = getComputedStyle(this).getPropertyValue(
          '--unregulated-color'
        );

        linearGradient
          .selectAll('stop')
          .data(gradientRange)
          .enter()
          .append('stop')
          .attr('offset', d => d)
          .attr('stop-color', d => {
            if (!this.anyDowngoingPTMs) {
              return d3v6.interpolate(unregulatedColor, upregulatedColor)(d);
            }
            if (!this.anyUpgoingPTMs) {
              return d3v6.interpolate(downregulatedColor, unregulatedColor)(d);
            }
            if (d < 0.5) {
              return d3v6.interpolate(
                downregulatedColor,
                unregulatedColor
              )(d / 0.5);
            }
            return d3v6.interpolate(
              unregulatedColor,
              upregulatedColor
            )((d - 0.5) / 0.5);
          });

        const isLogFoldChange =
          this.allDowngoingLessThan0 ||
          (!this.anyDowngoingPTMs && !this.allUpgoingGreaterThan1);

        // The domain of the x axis depends on whether the fold change is log transformed
        // Log FC goes from -inf to +inf, with 0 in the center
        // Non-log FC goes from 0 to +inf, with 1 in the center
        const domain: string[] = [];
        if (isLogFoldChange) {
          if (this.anyDowngoingPTMs) {
            domain.push(
              ...[
                `${this.maxNegFoldChange!.toPrecision(2)}`,
                `${(this.maxNegFoldChange! / 2).toPrecision(2)}`,
              ]
            );
          }
          domain.push('0');
          if (this.anyUpgoingPTMs) {
            domain.push(
              ...[
                `${(this.maxPosFoldChange! / 2).toPrecision(2)}`,
                `${this.maxPosFoldChange!.toPrecision(2)}`,
              ]
            );
          }
        } else {
          if (this.anyDowngoingPTMs) {
            domain.push(...['0', '0.5']);
          }
          domain.push('1');
          if (this.anyUpgoingPTMs) {
            domain.push(
              ...[
                `${(this.maxPosFoldChange! / 2).toPrecision(2)}`,
                `${this.maxPosFoldChange!.toPrecision(2)}`,
              ]
            );
          }
        }

        colorLegendXAxisScale
          .domain(<Iterable<string>>domain)
          .range([0, legendWidth - 25]);
      }

      colorLegendGroup
        .append('g')
        .attr('transform', 'translate(0,25)')
        .call(colorLegendXAxis!);
    }
  }

  private _enableZoomingAndPanning() {
    const zoomed = ({ transform }: { transform: ZoomTransform }) => {
      // Geometric zooms
      this._getMainDiv()
        .select('#nodeG')
        .attr('transform', transform.toString());
      this._getMainDiv()
        .select('#linkG')
        .attr('transform', transform.toString());

      // Semantic zooms, right now this just hides/shows the edgelabels
      this._getMainDiv()
        .selectAll('.edgelabel:not(.legend)')
        .attr('visibility', transform.k < 1 ? 'hidden' : 'visible');
    };

    const zoom = d3v6
      .zoom<SVGElement, unknown>()
      .scaleExtent([0.1, 25])
      .on('zoom', zoomed);

    this._getMainDiv().call(zoom);

    // Translate the view so that its not stuck to the top left corner
    // This is only done the first time we render, so we check if there already exists a transform
    if (!this._getMainDiv().select('#nodeG').attr('transform')) {
      this._getMainDiv().call(zoom.translateBy, 500, 0);
    }
  }

  // Helper function for the two tooltip text functions
  private static _formatTextIfValuePresent(
    text: string,
    value: any,
    strongWidth: number
  ) {
    return value
      ? `<li class='tooltip-list-item' style='margin: 5px 0;
font-size: 12pt;
font-family: "Roboto Light", "Helvetica Neue", "Verdana", sans-serif'><strong style='width: ${strongWidth}px'>${text}:</strong> ${value}</li>`
      : '';
  }

  private static _getPTMTooltipText(node: PTMNodeD3) {
    // Estimate required width of the tooltip
    const minTooltipStrongWidth = 150;
    let tooltipStrongWidth = minTooltipStrongWidth;
    if (node.details) {
      const maxKeyLength = Object.keys(node.details!).reduce(
        (currentMax, currentKey) =>
          currentKey.length > currentMax ? currentKey.length : currentMax,
        minTooltipStrongWidth / 12
      );
      tooltipStrongWidth = maxKeyLength * 12;
    }

    return `<ul class='tooltip-list' style='list-style-type: none; padding: 0;margin: 0;'>${this._formatTextIfValuePresent(
      'Regulation',
      node.regulation,
      tooltipStrongWidth
    )}${Object.entries(node.details!)
      .map(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          value?.display
        ) {
          return BiowcPathwaygraph._formatTextIfValuePresent(
            key,
            value,
            tooltipStrongWidth
          );
        }
        return null;
      })
      .join('')}</ul>`;
  }

  private static _getGeneProteinTooltipText(node: GeneProteinNodeD3) {
    // Estimate required width of the tooltip
    const minGeneProteinTooltipStrongWidth = 150;
    let tooltipStrongWidth = minGeneProteinTooltipStrongWidth;
    if (node.details) {
      const maxKeyLength = Object.keys(node.details!).reduce(
        (currentMax, currentKey) =>
          currentKey.length > currentMax ? currentKey.length : currentMax,
        minGeneProteinTooltipStrongWidth / 12
      );
      tooltipStrongWidth = maxKeyLength * 12;
    }

    return `<ul class='tooltip-list' style='list-style-type: none; padding: 0;margin: 0;'>${BiowcPathwaygraph._formatTextIfValuePresent(
      'Gene Name(s)',
      node.geneNames ? node.geneNames.join(',') : node.label,
      tooltipStrongWidth
    )}${
      node.nUp && node.nUp > 0
        ? BiowcPathwaygraph._formatTextIfValuePresent(
            'Upregulated',
            node.nUp,
            tooltipStrongWidth
          )
        : ''
    }${
      node.nDown && node.nDown > 0
        ? BiowcPathwaygraph._formatTextIfValuePresent(
            'Downregulated',
            node.nDown,
            tooltipStrongWidth
          )
        : ''
    }${
      node.nNot && node.nNot > 0
        ? BiowcPathwaygraph._formatTextIfValuePresent(
            'Unregulated',
            node.nNot,
            tooltipStrongWidth
          )
        : ''
    }
    ${
      node.details
        ? Object.entries(node.details)
            .map(([key, value]) =>
              BiowcPathwaygraph._formatTextIfValuePresent(
                key,
                value,
                tooltipStrongWidth
              )
            )
            .join('')
        : ''
    }</ul>`;
  }

  private _enableNodeSelection() {
    let dblClickTimer: NodeJS.Timeout;

    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGGElement, PathwayGraphNodeD3>('g')
      .on('click', (e, node) => {
        // Do not propagate event to canvas, because that would remove the highlighting
        e.stopPropagation();
        // Check if it is a doubleclick
        this.recentClicks += 1;
        if (this.recentClicks === 1) {
          // Wait for a possible doubleclick using a timeout
          // If a doubleclick happens within DBL_CLICK_TIMEOUT milliseconds,
          // the event is canceled using clearTimeout below
          dblClickTimer = setTimeout(() => {
            this.recentClicks = 0;
            // Unless the CTRL key is pressed, unselect everything first
            if (!e.ctrlKey) {
              this._getMainDiv()
                .select('#nodeG')
                .selectAll<SVGGElement, PathwayGraphNodeD3>('g')
                .each(d => {
                  /* eslint-disable no-param-reassign */
                  d.selected = false;
                  /* eslint-enable no-param-reassign */
                });
            }
            // CTRL + Click on a selected node deselects the node, otherwise the node becomes selected
            const isSelected = !(e.ctrlKey && node.selected);
            // Apply this new value to the node itself and all attached ptm nodes
            /* eslint-disable no-param-reassign */
            node.selected = isSelected;
            /* eslint-enable no-param-reassign */
            this._getMainDiv()
              .selectAll<SVGLineElement, PathwayGraphLinkD3>(
                '.ptmlink:not(.legend)'
              )
              .each(l => {
                /* eslint-disable no-param-reassign */
                // If clicked node is a protein, select all its PTM nodes
                if (l.target === node)
                  (<PTMNodeD3>l.source).selected = isSelected;
                // If clicked node is a PTM and it was a selection (not a deselection), we also want to select the protein
                // We don't want the opposite, so if it is a deselection, don't deselect the protein as well
                if (l.source === node && isSelected) {
                  (<GeneProteinNodeD3>l.target).selected = true;
                }
                /* eslint-enable no-param-reassign */
              });
            // If the node is a PTM summary node, apply its selection status to its individual PTM nodes
            if (node.type.includes('summary')) {
              (<PTMSummaryNodeD3>node).ptmNodes!.forEach(d => {
                /* eslint-disable no-param-reassign */
                d.selected = isSelected;
                /* eslint-enable no-param-reassign */
              });
            }

            // If the node is either a Gene/Protein node or a  (non-summary) PTM node
            // and it's a non-CTRL selection event,
            // throw an event to display the tooltip information permanently in the parent
            if (
              node.type.includes('ptm') &&
              !node.type.includes('summary') &&
              !e.ctrlKey
            ) {
              this.dispatchEvent(
                new CustomEvent('selectedNodeTooltip', {
                  bubbles: true,
                  cancelable: true,
                  detail: BiowcPathwaygraph._getPTMTooltipText(
                    node as PTMNodeD3
                  ),
                })
              );
            } else if (node.type.includes('gene_protein') && !e.ctrlKey) {
              this.dispatchEvent(
                new CustomEvent('selectedNodeTooltip', {
                  bubbles: true,
                  cancelable: true,
                  detail: BiowcPathwaygraph._getGeneProteinTooltipText(
                    node as GeneProteinNodeD3
                  ),
                })
              );
            } else {
              this.dispatchEvent(
                new CustomEvent('selectedNodeTooltip', {
                  bubbles: true,
                  cancelable: true,
                  detail: undefined,
                })
              );
            }

            // If the node is a group, select all its members
            if (node.type === 'group') {
              (<GroupNodeD3>node).componentNodes.forEach(comp => {
                /* eslint-disable no-param-reassign */
                comp.selected = isSelected;
                /* eslint-enable no-param-reassign */
              });
            }

            this._onSelectedNodesChanged();
          }, DBL_CLICK_TIMEOUT);
        } else {
          // If it is a doubleclick, the above code wrapped in the timeout should not be executed
          clearTimeout(dblClickTimer);
          this.recentClicks = 0;
        }
      });

    // Handle click on canvas
    this._getMainDiv().on('click', () => {
      const maybeContextMenu = d3v6
        // Remove a possible context menu
        // @ts-ignore
        .select(this.shadowRoot)
        .selectAll('.contextMenu');

      if (maybeContextMenu.size() > 0) {
        // Don't do anything else in that case
        maybeContextMenu.remove();
      } else {
        // Remove all highlighting by setting every node to "selected" (i.e. all opacities go back to 1)
        this._getMainDiv()
          .select('#nodeG')
          .selectAll<SVGGElement, PathwayGraphNodeD3>('g')
          .each(d => {
            /* eslint-disable no-param-reassign */
            d.selected = true;
            /* eslint-enable no-param-reassign */
          });

        // If there's a parent listening for details, tell it to clear that
        this.dispatchEvent(
          new CustomEvent('selectedNodeTooltip', {
            bubbles: true,
            cancelable: true,
            detail: undefined,
          })
        );

        this._onSelectedNodesChanged();
      }
    });
  }

  private _onSelectedNodesChanged() {
    this._highlightSelectedNodes();
    this._sendSelectionDetailsToParent();
  }

  private _enableNodeExpandAndCollapse() {
    // Dblclick on summary nodes should expand them into their individual ptm nodes
    this._getMainDiv()
      .selectAll<SVGGElement, PTMSummaryNodeD3>('g.ptm.summary:not(.legend)')
      .on('dblclick', (e, d) => {
        // If recentClicks has not been reset, a single click event has already been fired. Abort in that case.
        if (this.recentClicks === 0) {
          /* eslint-disable no-param-reassign */
          e.stopPropagation(); // Prevent zooming on doubleclick
          // Show all individual PTM Nodes of this summary node
          d.ptmNodes!.forEach(ptmnode => {
            ptmnode.visible = true;
            ptmnode.selected = ptmnode.summaryNode?.selected;
          });
          // Hide the summary node
          d.visible = false;
          this._refreshGraph(true);
          /* eslint-enable no-param-reassign */
        }
      });

    // Dblclick on ptm nodes should collapse them into their summary node
    this._getMainDiv()
      .selectAll<SVGGElement, PTMNodeD3>('g.ptm:not(.summary):not(.legend)')
      .on('dblclick', (e, d: PTMNodeD3) => {
        /* eslint-disable no-param-reassign */
        if (this.recentClicks === 0) {
          e.stopPropagation(); // Prevent zooming on doubleclick
          // Show the summary node of this PTM node
          d.summaryNode!.visible = true;
          d.summaryNode!.selected = d.selected;
          // Hide all sibling PTM nodes (all PTM nodes of the summary node)
          d.summaryNode!.ptmNodes!.forEach(ptmnode => {
            ptmnode.visible = false;
          });
          this._refreshGraph(true);
        }
        /* eslint-enable no-param-reassign */
      });
  }

  private _refreshGraph(doEnableNodeExpandAndCollapse: boolean) {
    this._drawGraph();
    this._addAnimation();
    this._addTooltips();
    this._addContextMenu();
    this._enableNodeSelection();
    if (doEnableNodeExpandAndCollapse) {
      this._enableNodeExpandAndCollapse();
    }
    this._highlightSelectedNodes();
  }

  private _highlightSelectedNodes() {
    // What we actually do is 'un-highlight' the NOT selected nodes by reducing their opacity
    const opacityOfUnselected = 0.125;
    const opacityOfUnselectedPTM = 0.25;
    // Set opacity of all nodes which are selected to 1
    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGGElement, PathwayGraphNodeD3>('g:not(.ptm)')
      .filter(node => node.selected!)
      .style('opacity', 1);

    // Reduce opacity of all nodes which are not selected (or hide them completely if they are PTM nodes)
    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGGElement, PathwayGraphNodeD3>('g:not(.ptm)')
      .filter(node => !node.selected)
      .style('opacity', opacityOfUnselected);

    // For the links, set the opacity to 1 only if both source and target are selected
    // ...accounting for the possibility that source and target might be links
    // Define a helper function to figure out if a link is selected
    function isLinkSelected(link: PathwayGraphLinkD3) {
      return <boolean>(
        (((Object.hasOwn(link.source, 'selected') &&
          (<PathwayGraphNodeD3>link.source).selected) ||
          (link.sourceIsAnchor &&
            (<PathwayGraphNodeD3>(<PathwayGraphLinkD3>link.source).source)
              .selected &&
            (<PathwayGraphNodeD3>(<PathwayGraphLinkD3>link.source).target)
              .selected)) &&
          ((Object.hasOwn(link.target, 'selected') &&
            (<PathwayGraphNodeD3>link.target).selected) ||
            (link.targetIsAnchor &&
              (<PathwayGraphNodeD3>(<PathwayGraphLinkD3>link.target).source)
                .selected &&
              (<PathwayGraphNodeD3>(<PathwayGraphLinkD3>link.target).target)
                .selected)))
      );
    }

    // Use the above function to filter links and link labels
    this._getMainDiv()
      .select('#linkG')
      .selectAll<SVGLineElement, PathwayGraphLinkD3>('line')
      .filter(link => isLinkSelected(link))
      .style('opacity', 1);

    this._getMainDiv()
      .select('#linkG')
      .selectAll<SVGLineElement, PathwayGraphLinkD3>('line')
      .filter(link => !isLinkSelected(link))
      .style('opacity', opacityOfUnselected);

    this._getMainDiv()
      .selectAll<SVGTextElement, PathwayGraphLinkD3>('.edgelabel:not(.legend)')
      .filter(link => isLinkSelected(link))
      .style('opacity', 1);

    this._getMainDiv()
      .selectAll<SVGTextElement, PathwayGraphLinkD3>('.edgelabel:not(.legend)')
      .filter(link => !isLinkSelected(link))
      .style('opacity', opacityOfUnselected);

    // PTM nodes might not yet have a 'selected' property - in that case, initialize them with that of their parent
    // Then apply opacity
    /* eslint-disable no-param-reassign */
    this._getMainDiv()
      .selectAll<SVGGElement, PTMNodeD3 | PTMSummaryNodeD3>('.ptm:not(.legend)')
      .filter(ptmNode => {
        if (typeof ptmNode.selected === 'undefined') {
          ptmNode.selected = ptmNode.geneProteinNode!.selected!;
        }
        return ptmNode.selected;
      })
      .style('opacity', 1);

    this._getMainDiv()
      .selectAll<SVGGElement, PTMNodeD3 | PTMSummaryNodeD3>('.ptm:not(.legend)')
      .filter(ptmNode => {
        if (typeof ptmNode.selected === 'undefined') {
          ptmNode.selected = ptmNode.geneProteinNode!.selected!;
        }
        return !ptmNode.selected;
      })
      .style('opacity', opacityOfUnselectedPTM);
    /* eslint-enable no-param-reassign */
  }

  private _sendSelectionDetailsToParent() {
    let selectedNodes: PathwayGraphNodeD3[] = [];

    // We cannot display PTM and FP curves at the same time right now
    // So if there are PTM selections we only show that
    // FP selections are only shown if there are not also PTM selections
    let hasPTMCurves = false;
    this.d3Nodes!.forEach(node => {
      if (node.type === 'ptm') {
        const ptmNode = node as PTMNodeD3;
        // A PTM node counts as selected if either itself is visible and selected, or its summary node is.
        if (
          (ptmNode.visible && ptmNode.selected) ||
          (ptmNode.summaryNode &&
            ptmNode.summaryNode.visible &&
            ptmNode.summaryNode.selected)
        ) {
          hasPTMCurves = true;
          selectedNodes.push(ptmNode);
        }
      } else if (node.type === 'gene_protein') {
        if (node.selected) {
          selectedNodes.push(node);
        }
      }
    });

    // If we have selected ptmNodes, remove all FP nodes from the list
    if (hasPTMCurves) {
      selectedNodes = selectedNodes.filter(n => n.type === 'ptm');
    }

    this.dispatchEvent(
      new CustomEvent('selectionDetails', {
        bubbles: true,
        cancelable: true,
        detail: {
          isFullProteome: !hasPTMCurves,
          selection: selectedNodes
            .filter(
              node =>
                Object.hasOwn(node, 'details') &&
                !!(<GeneProteinNodeD3 | PTMNodeD3>node).details
            )
            .map(node => {
              const nodeDetails = (<GeneProteinNodeD3 | PTMNodeD3>node)
                .details!;
              // If a detail has format { display: boolean; value: string | number }, only pass the value
              const detailsFlattened: { [key: string]: string | number } = {};
              Object.keys(nodeDetails).forEach(detailKey => {
                const nodeDetailValue = nodeDetails[detailKey] as {
                  display: boolean;
                  value: string | number;
                };
                if (
                  !!nodeDetailValue &&
                  Object.hasOwn(nodeDetailValue, 'value')
                ) {
                  detailsFlattened[detailKey] = nodeDetailValue.value;
                } else {
                  detailsFlattened[detailKey] = <string | number>(
                    nodeDetails[detailKey]
                  );
                }
              });
              return detailsFlattened;
            }),
        },
      })
    );
  }

  private static _getCoordinatesFromTranslate(
    elem: Selection<SVGElement, unknown, any, undefined>,
    withScale: Boolean
  ) {
    const transformString = elem.attr('transform');
    const transformMatch = transformString.match(/\(([0-9.-]+),([0-9.-]+)\)/);
    // transformMatch has three entries: The entire match as string, the first group (the x coord), and the second group (the y coord)
    if (!transformMatch) {
      return [0, 0];
    }
    const transformXCoordinate = parseFloat(transformMatch[1]);
    const transformYCoordinate = parseFloat(transformMatch[2]);
    const res = [transformXCoordinate, transformYCoordinate];

    if (withScale) {
      const scale = parseFloat(
        transformString.split(' ')[1].match(/[0-9.-]+/)![0]
      );
      res.push(scale);
    }

    return res;
  }

  private _prepareForExport() {
    // We need to inject the css custom properties (the '--<name>:' variables at the top of the stylesheet)
    // into the svg and the rest of the stylesheet.
    // I only have a clumsy solution for that: extract the css rule into a key-value pair and
    // going over the whole svg+css and replacing every occurrence one by one
    const hostRule = styles.styleSheet?.cssRules[0].cssText!;

    const svg = this.shadowRoot?.querySelector('svg') as SVGSVGElement;

    // To calculate the size of the exported svg, get the current x and y translate of the canvas
    // and add the largest x/y coordinates across all nodes
    const [nodeGTransformX, nodeGTransformY, scale] =
      BiowcPathwaygraph._getCoordinatesFromTranslate(
        this._getMainDiv().select('#nodeG'),
        true
      );

    // Set the maximum values initially to the size of the legend, this should be the minimal frame for the exported plot
    const legendSVG = this._getMainDiv()
      .select<SVGElement>('#pathwayLegend')
      .select('rect');
    let [maxNodeX, maxNodeY] = [
      Number(legendSVG.attr('width')),
      Number(legendSVG.attr('height')),
    ];
    this._getMainDiv()
      .select('#nodeG')
      .selectAll<SVGElement, PathwayGraphNodeD3>('.node')
      .each(function () {
        const [currentNodeX, currentNodeY] =
          BiowcPathwaygraph._getCoordinatesFromTranslate(
            d3v6.select(this),
            false
          );
        maxNodeX = Math.max(currentNodeX, maxNodeX);
        maxNodeY = Math.max(currentNodeY, maxNodeY);
      });

    svg.setAttribute(
      'width',
      (nodeGTransformX + maxNodeX * scale + 25).toString()
    );
    svg.setAttribute(
      'height',
      (nodeGTransformY + maxNodeY * scale + 25).toString()
    );

    let serializedSVG = svg.outerHTML!;
    let cssRules = styles.cssText;
    // Trim away the hostRule from the remaining rules - if they are part of the style, some SVG viewers may have rendering issues
    cssRules = cssRules
      .slice(cssRules.indexOf('}') + 1)
      .replace(/\r?\n|\r/g, '');

    hostRule
      .slice(8, -2)
      .split(';')
      .forEach(prop => {
        const propertySplit = prop.split(':');
        if (propertySplit.length > 1) {
          const key = `var(${propertySplit[0].trim()})`;
          const value = propertySplit[1].trim();
          serializedSVG = serializedSVG.replaceAll(key, value);
          cssRules = cssRules.replaceAll(key, value);
        }
      });

    // Inject the styles into the svg
    serializedSVG = `${serializedSVG.slice(
      0,
      -6
    )}<style>${cssRules}</style>${serializedSVG.slice(-6)}`;

    // Load xmlns
    if (
      !serializedSVG.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    ) {
      serializedSVG = serializedSVG.replace(
        /^<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }
    if (
      !serializedSVG.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)
    ) {
      serializedSVG = serializedSVG.replace(
        /^<svg/,
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
      );
    }

    return serializedSVG;
  }

  public downloadSvg() {
    // Make sure ptmlinks are invisible (they should be already
    // but due to some bug they sometimes aren't)
    this._getMainDiv()
      .selectAll<SVGLineElement, PathwayGraphLinkD3>('.linkgroup.ptmlink')
      .attr('display', 'none');

    const serializedSVG = this._prepareForExport();
    const blob = new Blob([serializedSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.download = 'pathwaygraph.svg';
    a.href = url;
    a.click();
  }

  public selectNodesDownstreamOfSelection() {
    this.d3Nodes!.filter(node => node.selected).forEach(node =>
      this._selectDownstreamNodesWorker(node)
    );
    this._onSelectedNodesChanged();
  }

  // Helper that recursively select all nodes downstream of a node
  private _selectDownstreamNodesWorker(node: PathwayGraphNodeD3) {
    /* eslint-disable no-param-reassign */
    // Select the node itself
    node.selected = true;
    // Select all PTM nodes attached to this node
    // (the node would be the target of the respective PTM link)
    this._getMainDiv()
      .selectAll<SVGLineElement, PathwayGraphLinkD3>('.ptmlink:not(.legend)')
      .each((l: PathwayGraphLinkD3) => {
        if (l.target === node) (<PathwayGraphNodeD3>l.source).selected = true;
      });

    // If the node is a group, select all its members
    if (node.type === 'group') {
      (<GroupNodeD3>node).componentNodes.forEach(d => {
        d.selected = true;
      });
    }

    // Iterate over links and recurse on all target nodes of this node that have not yet been selected
    // The second criterion prevents endless recursion on circular paths
    this._getMainDiv()
      .select('#linkG')
      .selectAll<SVGLineElement, PathwayGraphLinkD3>('line')
      .each(l => {
        if (l.source === node && !(<PathwayGraphNodeD3>l.target).selected) {
          if (l.targetIsAnchor)
            this._selectDownstreamNodesWorker(
              <PathwayGraphNodeD3>(<PathwayGraphLinkD3>l.target).source
            );
          else this._selectDownstreamNodesWorker(<PathwayGraphNodeD3>l.target);
        } else if (
          // In the case of binding/association relations, we treat the edge as undirected,
          // i.e. the node could also be the target
          l.types.includes('binding/association') &&
          l.target === node &&
          !(<PathwayGraphNodeD3>l.source).selected
        ) {
          if (l.sourceIsAnchor)
            this._selectDownstreamNodesWorker(
              <PathwayGraphNodeD3>(<PathwayGraphLinkD3>l.source).source
            );
          else this._selectDownstreamNodesWorker(<PathwayGraphNodeD3>l.source);
        }
      });

    // After selecting downstream nodes, multiple PTMs are selected so the infobox needs to be disabled
    this.dispatchEvent(
      new CustomEvent('selectedNodeTooltip', {
        bubbles: true,
        cancelable: true,
        detail: undefined,
      })
    );
    /* eslint-enable no-param-reassign */
  }

  public collapseAllPTMNodes() {
    if (!this.isNodeExpandAndCollapseAllowed) return;

    this._getMainDiv()
      .selectAll<SVGGElement, PTMNodeD3>('g.ptm:not(.summary):not(.legend)')
      .each((ptmNode: PTMNodeD3) => {
        /* eslint-disable no-param-reassign */
        ptmNode.visible = false;
        ptmNode.summaryNode!.visible = true;
        /* eslint-enable no-param-reassign */
      });
    this._refreshGraph(true);
  }

  public expandAllPTMNodes() {
    if (!this.isNodeExpandAndCollapseAllowed) return;

    this._getMainDiv()
      .selectAll<SVGGElement, PTMSummaryNodeD3>('g.ptm.summary:not(.legend)')
      .each((ptmSummaryNode: PTMSummaryNodeD3) => {
        /* eslint-disable no-param-reassign */
        ptmSummaryNode.visible = false;
        ptmSummaryNode.ptmNodes?.forEach(n => {
          n.visible = true;
        });
        /* eslint-enable no-param-reassign */
      });
    this._refreshGraph(true);
  }

  public setColorRange(range: [number, number]) {
    [this.colorRangeMin, this.colorRangeMax] = range;
    this._refreshGraph(true);
    this._renderLegend();
  }
}
