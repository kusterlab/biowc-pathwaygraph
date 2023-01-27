import { html, LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import * as d3v6 from 'd3';
import {
  D3DragEvent,
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from 'd3';
import styles from './biowc-pathwaygraph.css';

type PossibleRegulationCategoriesType = 'up' | 'down' | '-';

const NODE_HEIGHT = 10;
const PTM_NODE_WIDTH = 15;
const PTM_NODE_HEIGHT = 10;

interface PathwayMetadata {
  identifier: string; // TODO: Refactor from 'id' - set if it is not set by user
  org: string;
  pathwaytitle: string; // TODO: Refactor from 'title'
}

interface PathwayGraphNode extends SimulationNodeDatum {
  nodeId: string; // TODO: Refactor from 'id' - do not require, should be set in here if not set by user
  type: string; // TODO: Enumerate all possible types
  x: number; // Maybe exclamation mark is better here, check what it is used for
  y: number;
  // All just for d3 version
  selected?: boolean;
  visible?: boolean;
  isCircle?: boolean;
  rectX?: number;
  rectWidth?: number;
  textLength?: number;
  leftX?: number;
  rightX?: number;
}

interface GeneProteinNode extends PathwayGraphNode {
  geneNames: string[];
  uniprotAccs: string[];
  label: string;
  groupId?: string;
  // Interfaces are hoisted so we can reference PTMSummaryNode before defining it
  // eslint-disable-next-line no-use-before-define
  groupNode?: GroupNode; // TODO: Only in d3 version
  details?: { [key: string]: string | number }; // TODO: Put things like modifiedSequence &  logEC50 in here
  // The following are only defined if Full Proteome Data was supplied
  nUp?: number;
  nDown?: number;
  nNot?: number;
}

interface GroupNode extends PathwayGraphNode {
  componentNodeIds: string[];
  componentNodes: GeneProteinNode[];
  // D3 Only
  polygon?: [number, number][];
  centroid?: [number, number];
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

interface PTMInputEntry {
  geneNames?: string[];
  uniprotIds?: string[];
  regulation: PossibleRegulationCategoriesType;
  details?: { [key: string]: string | number };
}

interface PTMNode extends PathwayGraphNode {
  geneProteinNodeId: string; // TODO: Split this up into two types: The D3 type exchanges the Id for the actual node
  geneProteinNode?: GeneProteinNode;
  details?: { [key: string]: string | number }; // TODO: Put things like modifiedSequence &  logEC50 in here
  regulation: PossibleRegulationCategoriesType;
  geneNames?: string[];
  uniprotIds?: string[];
  // Interfaces are hoisted so we can reference PTMSummaryNode before defining it
  // eslint-disable-next-line no-use-before-define
  summaryNode?: PTMSummaryNode; // TODO: Exists only in D3 version
  summaryNodeId?: string;
}

interface PTMSummaryNode extends PathwayGraphNode {
  geneProteinNodeId?: string; // TODO: Split this up into two types: The D3 type exchanges the Id for the actual node
  geneProteinNode?: GeneProteinNode;
  label: string;
  ptmNodeIds?: string[];
  ptmNodes?: PTMNode[]; // TODO: Exists only in D3 version
  regulation: PossibleRegulationCategoriesType;
}

interface FullProteomeInputEntry {
  geneNames?: string[];
  uniprotIds?: string[];
  regulation: PossibleRegulationCategoriesType;
  details?: { [key: string]: string | number };
}

// Link as input by user
interface PathwayGraphLinkInput {
  linkId?: string;
  sourceId: string;
  targetId: string;
  types: string[]; // TODO: Enumerate all link types
}

// Internal representation of a link
interface PathwayGraphLink
  extends SimulationLinkDatum<PathwayGraphNode | PathwayGraphLink>,
    SimulationNodeDatum {
  linkId: string; // TODO: Refactor from 'id'
  types: string[]; // TODO: Enumerate all link types
  source: PathwayGraphNode | PathwayGraphLink;
  target: PathwayGraphNode | PathwayGraphLink;
  sourceId: string;
  targetId: string;
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
  pathwayMetaData!: PathwayMetadata;

  @property({ attribute: false })
  graphdataSkeleton!: {
    nodes: PathwayGraphNode[];
    links: (PathwayGraphLinkInput | PathwayGraphLink)[];
    // A dictionary that maps gene names and Uniprot IDs to Node IDs
    // TODO: If nodes and links change, this should be updated
    geneToNodeMap?: { [key: string]: GeneProteinNode[] };
  };

  @property({ attribute: false })
  ptmInputList?: PTMInputEntry[];

  @property({ attribute: false })
  fullProteomeInputList?: FullProteomeInputEntry[];

  graphdataPTM?: {
    nodes: (PTMNode | PTMSummaryNode)[];
    links: PathwayGraphLinkInput[];
  };

  d3Nodes?: PathwayGraphNode[];

  d3Links?: PathwayGraphLink[];

  render() {
    // TODO: Make min-width depend on this.clientWidth - problem is that it is zero at this time.
    return html`
      <div id="pathwayContainer" ref="pathwayContainer">
        <svg
          id="pathwaygraph"
          style="min-width: 1200px; min-height: 1200px; display: block; margin: auto; background-color: white; border-radius: 5px"
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
    this.graphdataSkeleton.geneToNodeMap = this._createPathwayGeneToNodeMap();

    // Map PTM Input to Skeleton Nodes
    this.graphdataPTM = this._addPTMInformationToPathway();
    // console.log(this.graphdataPTM);
    // Add Full Proteome Input to Skeleton Nodes
    // console.log(`Before:`);
    // console.log(this.graphdataSkeleton.nodes);
    if (this.fullProteomeInputList) {
      this.graphdataSkeleton.nodes =
        this._addFullProteomeInformationToPathway();
    }
    // console.log('After');
    // console.log(this.graphdataSkeleton.nodes);

    this._createD3GraphObject();
    this._renderGraph();

    window.addEventListener('resize', () => {
      // console.log('resized!');
    });

    this._renderLegend();

    super.firstUpdated(_changedProperties);
  }

  private _createPathwayGeneToNodeMap(): { [key: string]: GeneProteinNode[] } {
    const result: { [key: string]: GeneProteinNode[] } = {};

    for (const node of this.graphdataSkeleton.nodes) {
      if (Object.hasOwn(node, 'uniprotAccs')) {
        for (const uniprotId of (<GeneProteinNode>node).uniprotAccs) {
          if (!Object.hasOwn(result, uniprotId)) {
            result[uniprotId] = [];
          }
          result[uniprotId].push(<GeneProteinNode>node);
        }
      }

      if (Object.hasOwn(node, 'geneNames')) {
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
      '-': {},
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
        const uniprotIdsUnique = [...new Set(ptmPeptide.uniprotIds)].sort();
        // The map of Uniprot ID to Node ID only works with canonical isoforms, so create another version with hyphens removed
        const uniprotIdsUniqueOnlyCanonical = [
          ...new Set(uniprotIdsUnique.map(entry => entry.split('-')[0])),
        ];

        // Now we map the peptide to a node in the current pathway, using gene names and canonical Uniprot IDs
        for (const gene of uniprotIdsUniqueOnlyCanonical.concat(
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
                  (geneProtein2RegulationCategory.up[geneProteinNode.nodeId]
                    ?.length || 0) +
                  (geneProtein2RegulationCategory.down[geneProteinNode.nodeId]
                    ?.length || 0) +
                  (geneProtein2RegulationCategory['-'][geneProteinNode.nodeId]
                    ?.length || 0) +
                  1
                }`;
                const ptmNode = {
                  nodeId: ptmNodeId,
                  type: 'ptm',
                  details: ptmPeptide.details,
                  geneNames: geneNamesUnique,
                  uniprotIds: uniprotIdsUnique,
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
                  case '-':
                    if (
                      !Object.hasOwn(
                        geneProtein2RegulationCategory['-'],
                        geneProteinNode.nodeId
                      )
                    ) {
                      geneProtein2RegulationCategory['-'][
                        geneProteinNode.nodeId
                      ] = [];
                    }
                    geneProtein2RegulationCategory['-'][
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
    }

    if (this.fullProteomeInputList) {
      for (const fullProteomeInputEntry of this.fullProteomeInputList) {
        // In analogy to the addPTMInformation function:
        // Keep track of the gene/protein node ids with which this gene/protein has been associated
        // In case node is represented by both Uniprot and Genename we could otherwise match it twice here
        const geneProteinNodeIdsOfEntry = new Set();
        const geneNamesUnique = [...new Set(fullProteomeInputEntry.geneNames)];
        const uniprotIdsUniqueOnlyCanonical = [
          ...new Set(
            fullProteomeInputEntry.uniprotIds?.map(entry => entry.split('-')[0])
          ),
        ];

        for (const gene of uniprotIdsUniqueOnlyCanonical.concat(
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
                  case '-':
                    nodesDictEntry.nNot = (nodesDictEntry.nNot || 0) + 1;
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

    return Object.values(nodesDict);
  }

  private _createD3GraphObject() {
    this.d3Nodes = this.graphdataSkeleton.nodes.map(node => ({
      ...node,
      selected: true,
      visible: true,
    }));
    this.d3Links = this.graphdataSkeleton.links.map(
      link => ({ ...link } as PathwayGraphLink)
    );
    if (this.graphdataPTM) {
      this.d3Nodes = this.d3Nodes.concat(
        this.graphdataPTM.nodes.map(node => ({
          ...node,
          selected: true,
          visible: true,
        }))
      );
      this.d3Links = this.d3Links.concat(
        this.graphdataPTM.links.map(link => ({ ...link } as PathwayGraphLink))
      );
    }

    // Now we need to setup some references within the D3 Graph Data
    // First we create maps of id to nodes/links for quicker access
    const nodeIdToNodeMap: { [key: string]: PathwayGraphNode } = {};
    for (const node of this.d3Nodes) {
      nodeIdToNodeMap[node.nodeId] = node;
    }

    const linkIdToLinkMap: { [key: string]: PathwayGraphLink } = {};
    for (const link of this.d3Links) {
      linkIdToLinkMap[link.linkId] = link;
    }

    for (const node of this.d3Nodes) {
      // a) For all PTM peptides: add reference to protein node
      // This goes for both individual PTMs nodes and summary nodes
      if (node.type.includes('ptm')) {
        (<PTMNode | PTMSummaryNode>node).geneProteinNode = <GeneProteinNode>(
          nodeIdToNodeMap[(<PTMNode | PTMSummaryNode>node).geneProteinNodeId!]
        );
      }
      // b) For the PTM summary nodes: add two-way references to individual PTM nodes
      if (node.type.includes('summary')) {
        (<PTMSummaryNode>node).ptmNodes = (<PTMSummaryNode>(
          node
        )).ptmNodeIds?.map(nodeid => nodeIdToNodeMap[nodeid] as PTMNode);
        for (const nodeid of (<PTMSummaryNode>node).ptmNodeIds!) {
          (<PTMNode>nodeIdToNodeMap[nodeid]).summaryNode = <PTMSummaryNode>node;
        }
      }
      // c) For Group Nodes: Add two-way references to members
      if (node.type === 'group') {
        (<GroupNode>node).componentNodes = (<GroupNode>(
          node
        )).componentNodeIds.map(
          nodeid => nodeIdToNodeMap[nodeid] as GeneProteinNode
        );
        for (const nodeid of (<GroupNode>node).componentNodeIds) {
          (<GeneProteinNode>nodeIdToNodeMap[nodeid]).groupNode = <GroupNode>(
            node
          );
        }
      }
    }

    // Connect each link with its source and target
    for (const link of this.d3Links) {
      link.source = nodeIdToNodeMap[link.sourceId];
      link.target = nodeIdToNodeMap[link.targetId];
      // If no source/target was found, the link might start/end on another link
      // Wikipathways calls this an 'anchor' node
      if (!link.source) {
        link.source = linkIdToLinkMap[link.sourceId];
        link.sourceIsAnchor = true;
      }

      if (!link.target) {
        // @ts-ignore
        link.target = linkIdToLinkMap[link.target];
        link.targetIsAnchor = true;
      }
    }
  }

  private _getMainDiv() {
    // @ts-ignore
    return d3v6.select(this.shadowRoot).select('#pathwaygraph');
  }

  private _renderGraph() {
    const mainDiv = this._getMainDiv();

    mainDiv.append('g').attr('id', 'nodeG');
    mainDiv.append('g').attr('id', 'linkG');
    // Initially draw the graph with all possible nodes present so the simulation reaches a steady state
    // After a few seconds redraw the graph filtered for summary PTM nodes
    this._drawGraph();

    // Initially, make all individual PTM nodes invisible. They should be physically present for the simulation to stabilize,
    // but visible only after the stabilization process is complete.
    mainDiv
      .selectAll('g.ptm:not(.summary):not(.legend)')
      .attr('display', 'none');

    this._addAnimation();

    setTimeout(() => {
      if (this.d3Nodes) {
        for (const node of this.d3Nodes) {
          // Set all individual PTM nodes to invisible
          if (node.type.includes('ptm') && !node.type.includes('summary')) {
            // Only summary PTM nodes are invisible at the beginning
            node.visible = false;
          }
        }
      }
      // this.refreshGraph() //TODO: Implement
      // Now make the PTM nodes visible again (in principle, in practice they are all invisible at this point
      // because 'visible' is set to false so they are not part of the graph)
      mainDiv
        .selectAll('g.ptm:not(.summary):not(.legend)')
        .attr('display', 'block');
    }, 2000);
  }

  private _drawGraph() {
    const nodeG = this._getMainDiv().select('#nodeG');
    const linkG = this._getMainDiv().select('#linkG');

    const nodesSvg = nodeG
      .selectAll('g')
      .data(
        this.d3Nodes!// Sort so that the groups come first - that way they are always drawn under the individual nodes
        .sort((nodeA, nodeB) => {
          if (nodeA.type === 'group') return -1;
          if (nodeB.type === 'group') return 1;
          return 0;
        })
          .filter(node => node.visible),
        d => (<PathwayGraphNode>d).nodeId
      )
      .join('g')
      .attr(
        'class',
        d => `node ${d.type} ${BiowcPathwaygraph._computeRegulationClass(d)} `
      )
      .attr('id', d => d.nodeId);

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
      .attr('ry', NODE_HEIGHT);

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
      .selectAll('.node-label')
      .text(d => {
        if (!Object.hasOwn(<PathwayGraphNode>d, 'label')) return '';
        const node = d as GeneProteinNode | PTMSummaryNode;
        if (node.label.startsWith('TITLE:')) {
          return node.label.substring(6).toUpperCase();
        }
        return BiowcPathwaygraph._calculateContextMenuOptions(
          node.type,
          'geneNames' in node ? node.geneNames : [],
          node.label
        )[0];
      })
      .each((d, i, nodes) => {
        // Adjust width of the node based on the length of the text
        const circleWidth = NODE_HEIGHT * 2;
        const textLength = (<SVGTextContentElement>(
          nodes[i]
        )).getComputedTextLength();
        const textWidth = textLength + NODE_HEIGHT;
        const node = d as PathwayGraphNode;
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
        (<PathwayGraphNode>d).type === 'ptm'
          ? -0.5 * PTM_NODE_WIDTH
          : (<PathwayGraphNode>d).rectX!
      )
      .attr('y', d =>
        (<PathwayGraphNode>d).type === 'ptm'
          ? -0.5 * PTM_NODE_HEIGHT
          : -NODE_HEIGHT
      )
      .attr('width', d =>
        (<PathwayGraphNode>d).type === 'ptm'
          ? PTM_NODE_WIDTH
          : (<PathwayGraphNode>d).rectWidth!
      )
      .attr('height', d =>
        (<PathwayGraphNode>d).type === 'ptm' ? PTM_NODE_HEIGHT : NODE_HEIGHT * 2
      );

    // Initialize paths for the group nodes
    // The actual polygons are drawn in the 'tick' callback of addAnimation
    // TODO: For some reason there are always two group-path objects, and a node-label group object which we don't need I think (groups have no labels)
    nodesSvg
      .filter(d => d.type === 'group')
      .append('path')
      .attr('class', 'group-path');

    // Draw links as lines with appropriate arrowheads
    linkG
      .selectAll('line')
      .data(
        this.d3Links!.filter(
          link =>
            (link.sourceIsAnchor || (<PathwayGraphNode>link.source)?.visible) &&
            (link.targetIsAnchor || (<PathwayGraphNode>link.target)?.visible)
        )
      )
      .join('line')
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
      .attr('stroke-dasharray', d =>
        d.types.includes('binding/association') ? '3 3' : null
      );

    // Add paths for the edgelabels
    linkG
      .selectAll('.edgepath')
      .data(
        this.d3Links!.filter(
          link =>
            (<PathwayGraphNode>link.source)?.visible &&
            (<PathwayGraphNode>link.target)?.visible
        )
      )
      .join('path')
      .attr('class', 'edgepath')
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0)
      .attr('id', (d, i) => `edgepath${i}`);

    // Add the actual edgelabels
    const edgelabels = linkG
      .selectAll('.edgelabel')
      .data(
        this.d3Links!.filter(
          link =>
            (<PathwayGraphNode>link.source)?.visible &&
            (<PathwayGraphNode>link.target)?.visible
        )
      )
      .join('text')
      .attr('class', 'edgelabel')
      .attr('font-size', 10)
      .attr('fill', 'var(--edge-label-color)');

    // Put the edgelabels onto the paths
    edgelabels
      .append('textPath')
      .attr('xlink:href', (d, i) => `#edgepath${i}`)
      .attr('startOffset', '50%')
      .text(d => {
        // Right now, the labels are limited to (de)phosphorylation
        // 2022-07-22: Erm, is this comment still valid?
        // 2023-01-27 I still don't know...
        if (d.types.includes('phosphorylation')) return '+p';
        if (d.types.includes('dephosphorylation')) return '-p';
        if (d.types.includes('ubiquitination')) return '+u';
        if (d.types.includes('glycosylation')) return '+g';
        if (d.types.includes('methylation')) return '+m';
        return '';
      });
  }

  private _addAnimation() {
    const PTM_LINK_FORCE_STRENGTH = 2;
    const PTM_LINK_FORCE_DISTANCE_MULTIPLIER = 1.025;
    const PTM_COLLISION_FORCE_RADIUS = 7;
    const CIRCLE_NODE_LINK_FORCE_DISTANCE = 20;

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
                (<PathwayGraphNode>link.source)!.visible &&
                (<PathwayGraphNode>link.target)!.visible
            )
          )
          .strength(link =>
            link.types && link.types.includes('ptmlink')
              ? PTM_LINK_FORCE_STRENGTH
              : 0
          )
          .distance(link => {
            if (link.types && link.types.includes('ptmlink')) {
              if ((<PathwayGraphNode>link.target).isCircle) {
                return (
                  CIRCLE_NODE_LINK_FORCE_DISTANCE *
                  PTM_LINK_FORCE_DISTANCE_MULTIPLIER
                );
              }
              return (
                ((<PathwayGraphNode>link.target).textLength || 1) *
                PTM_LINK_FORCE_DISTANCE_MULTIPLIER
              );
            }
            return 0;
          })
      )
      // Collision repulsion Force
      .force(
        'collide',
        d3v6
          .forceCollide() // TODO: The old version was .forceCollide(this.nodes.filter((node) => node.visible)) but forceCollide does not take nodes as argument, only the radius. So has this ever worked as intended?
          .radius(node =>
            (<PathwayGraphNode>node).type.includes('ptm')
              ? PTM_COLLISION_FORCE_RADIUS
              : 0
          )
      );
    // I used to have center force, many-body force and x/y positional force in here as well
    // But they messed things up quite a lot

    // Apply drag behavior to nodes and groups
    d3v6
      .select('#nodeG')
      .selectAll<SVGElement, PathwayGraphNode>('g')
      .call(BiowcPathwaygraph._dragNodes(simulation));
    d3v6
      .selectAll<SVGElement, PathwayGraphNode>('.group-path')
      .call(BiowcPathwaygraph._dragGroups(simulation));

    // Define animation
    simulation.nodes(this.d3Nodes!).on('tick', () => {
      if (this.d3Nodes) {
        for (const node of this.d3Nodes) {
          if (node.type === 'group') {
            // @ts-ignore TODO: Understand why this works - typescript is actually correct, 'node' is not the right argument type for select()
            const nodeD3 = d3v6.select(node)._groups[0][0];
            node.leftX = nodeD3.minX;
            node.rightX = nodeD3.maxX;
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
      d3v6
        .select('#nodeG')
        .selectAll('g')
        .filter(d => (<PathwayGraphNode>d).type !== 'group')
        .attr(
          'transform',
          node =>
            `translate(${(<PathwayGraphNode>node).x},${
              (<PathwayGraphNode>node).y
            })`
        );

      // Set new positions of the links
      // This mess makes the arrowheads end exactly at the rim of the target node.
      // TODO: With the whole group business, this mess should be factored out.
      function getXCoordinate(
        link: PathwayGraphLink,
        endpoint: 'source' | 'target',
        position: 'x' | 'rightX' | 'leftX'
      ): number {
        if (endpoint === 'source' && link.sourceIsAnchor) {
          return (
            (((<PathwayGraphLink>link.source).sourceX || 0) +
              ((<PathwayGraphLink>link.source).targetX || 0)) /
            2
          );
        }
        if (endpoint === 'target' && link.targetIsAnchor) {
          return (
            (((<PathwayGraphLink>link.target).sourceX || 0) +
              ((<PathwayGraphLink>link.target).targetX || 0)) /
            2
          );
        }
        return <number>(<PathwayGraphNode>link[endpoint])[position];
      }

      function getYCoordinate(
        link: PathwayGraphLink,
        endpoint: 'source' | 'target'
      ): number {
        if (endpoint === 'source' && link.sourceIsAnchor) {
          return (
            (((<PathwayGraphLink>link.source).sourceY || 0) +
              ((<PathwayGraphLink>link.source).targetY || 0)) /
            2
          );
        }
        if (endpoint === 'target' && link.targetIsAnchor) {
          return (
            (((<PathwayGraphLink>link.target).sourceY || 0) +
              ((<PathwayGraphLink>link.target).targetY || 0)) /
            2
          );
        }
        return <number>link[endpoint].y;
      }

      d3v6
        .select('#linkG')
        .selectAll<SVGElement, PathwayGraphLink>('line')
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
            (<PathwayGraphNode>link.source).type === 'group'
          ) {
            // @ts-ignore
            const sourceD3 = d3v6.select(link.source)._groups[0][0];
            if (
              !link.targetIsAnchor &&
              (<PathwayGraphNode>link.target).type === 'group'
            ) {
              // Both are groups, we need to do the whole business
              // @ts-ignore
              const targetD3 = d3v6.select(link.target)._groups[0][0];
              if (sourceD3.maxY < targetD3.minY) {
                sourceY = sourceD3.maxY;
                targetY = targetD3.minY;
              } else if (targetD3.maxY < sourceD3.minY) {
                targetY = targetD3.maxY;
                sourceY = sourceD3.minY;
              } else {
                midY =
                  (Math.min(sourceD3.minY, targetD3.minY) +
                    Math.max(sourceD3.maxY, targetD3.maxY)) /
                  2;
                if (midY > targetD3.maxY) {
                  midY = targetD3.maxY;
                } else if (midY > sourceD3.maxY) {
                  midY = sourceD3.maxY;
                } else if (midY < targetD3.minY) {
                  midY = targetD3.minY;
                } else if (midY < sourceD3.minY) {
                  midY = sourceD3.minY;
                }
                targetY = midY;
                sourceY = midY;
              }
            } else {
              // source is group, target is not
              targetY = getYCoordinate(link, 'target');
              if (sourceD3.maxY < targetY) {
                sourceY = sourceD3.maxY;
              } else if (targetY < sourceD3.minY) {
                sourceY = sourceD3.minY;
              } else {
                sourceY = targetY;
              }
            }
          } else {
            sourceY = getYCoordinate(link, 'source');
            if (
              !link.targetIsAnchor &&
              (<PathwayGraphNode>link.target).type === 'group'
            ) {
              // target is group, source is not
              // @ts-ignore
              const targetD3 = d3v6.select(link.target)._groups[0][0];
              if (sourceY < targetD3.minY) {
                targetY = targetD3.minY;
              } else if (targetD3.maxY < sourceY) {
                targetY = targetD3.maxY;
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
      d3v6
        .select('#linkG')
        .selectAll<SVGElement, PathwayGraphLink>('.edgepath')
        .attr(
          'd',
          edgepath =>
            `M ${edgepath.source.x} ${edgepath.source.y} L ${edgepath.target.x} ${edgepath.target.y}`
        );

      // Optionally rotate the edge labels, if they have been turned upside-down
      d3v6
        .select('#linkG')
        .selectAll<SVGGraphicsElement, PathwayGraphLink>('.edgelabel')
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
      function polygonGenerator(inputGroupId: string) {
        const nodeCoords = d3v6
          .select('#nodeG')
          .selectAll<SVGElement, GeneProteinNode>('g')
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
      }

      // Reshape and relocate the groups based on the updated positions of their members
      d3v6
        .select('#nodeG')
        .selectAll<SVGElement, GroupNode>('g')
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

      d3v6
        .select('#nodeG')
        .selectAll<SVGElement, GroupNode>('.group-path')
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
    });
    return simulation;
  }

  private static _calculateContextMenuOptions(
    type: string,
    geneNames: string[],
    label: string
  ) {
    let splitRegex;
    if (type.includes('compound')) {
      // Compounds may have a comma in their name, so do not split by that
      splitRegex = /;|\//;
    } else {
      splitRegex = /,|;|\//;
    }
    const allPossibleNames = (label ? label.split(splitRegex) : []).concat(
      geneNames
    );
    return [...new Set(allPossibleNames)];
  }

  private static _computeRegulationClass(node: PathwayGraphNode) {
    if (Object.hasOwn(node, 'regulation')) {
      return (<PTMNode | PTMSummaryNode>node).regulation;
    }

    if (Object.hasOwn(node, 'nUp')) {
      const geneProteinNode = node as GeneProteinNode;
      if (geneProteinNode.nUp! > 0 && geneProteinNode.nDown! > 0) return 'both';
      if (geneProteinNode.nUp! > 0) return 'up';
      if (geneProteinNode.nDown! > 0) return 'down';
      if (geneProteinNode.nNot! > 0) return '-';
    }

    return '';
  }

  // Define drag behavior
  /* eslint-disable no-param-reassign */
  private static _dragNodes(
    simulation: Simulation<
      SimulationNodeDatum,
      SimulationLinkDatum<PathwayGraphNode>
    >
  ) {
    function dragstarted(
      this: SVGElement,
      event: D3DragEvent<SVGElement, PathwayGraphNode | PathwayGraphLink, any>
    ) {
      // Disable tooltip while dragging
      d3v6
        .select('#nodetooltip')
        .style('opacity', '0')
        .attr('is-dragging', 'true');
      if (!event.active) simulation.alphaTarget(0.3).restart();
    }

    function dragged(
      this: SVGElement,
      event: D3DragEvent<SVGElement, PathwayGraphNode | PathwayGraphLink, any>,
      node: PathwayGraphNode
    ) {
      node.fx = event.x;
      node.fy = event.y;
    }

    function dragended(
      this: SVGElement,
      event: D3DragEvent<SVGElement, PathwayGraphNode | PathwayGraphLink, any>,
      node: PathwayGraphNode
    ) {
      if (!event.active) simulation.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      d3v6.select('#nodetooltip').attr('is-dragging', 'false');
    }

    return d3v6
      .drag<SVGElement, PathwayGraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  private static _dragGroups(
    simulation: Simulation<
      SimulationNodeDatum,
      SimulationLinkDatum<PathwayGraphNode>
    >
  ) {
    function dragstarted(
      this: SVGElement,
      event: D3DragEvent<SVGElement, PathwayGraphNode | PathwayGraphLink, any>
    ) {
      // Disable tooltip while dragging
      d3v6
        .select('#nodetooltip')
        .style('opacity', '0')
        .attr('is-dragging', 'true');
      if (!event.active) simulation.alphaTarget(0.3).restart();
    }

    function dragged(
      this: SVGElement,
      event: D3DragEvent<SVGElement, PathwayGraphNode | PathwayGraphLink, any>,
      group: any
    ) {
      const nodes = d3v6.select('#nodeG').selectAll('g');
      nodes
        .filter(
          d =>
            Object.hasOwn(<PathwayGraphNode>d, 'groupId') &&
            (<GeneProteinNode>d).groupId === group.id
        )
        .each(d => {
          (<PathwayGraphNode>d).x += event.dx;
          (<PathwayGraphNode>d).y += event.dy;
        });

      group.fx = event.x;
      group.fy = event.y;
    }

    function dragended(
      this: SVGElement,
      event: D3DragEvent<SVGElement, PathwayGraphNode | PathwayGraphLink, any>,
      group: any
    ) {
      if (!event.active) simulation.alphaTarget(0);
      d3v6.select('#nodetooltip').attr('is-dragging', 'false');
      group.fx = null;
      group.fy = null;
    }

    return d3v6
      .drag<SVGElement, PathwayGraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }
  /* eslint-enable no-param-reassign */

  private _renderLegend() {
    const legendSvg = this._getMainDiv().select<SVGElement>('#pathwayLegend');
    if (legendSvg.empty()) {
      return;
    }
    // Bring legend to front of the canvas
    legendSvg.node()!.parentNode!.appendChild(legendSvg.node()!);
    // Draw the frame
    legendSvg
      .append('rect')
      .attr('x', 3)
      .attr('y', 3)
      .attr('width', 265)
      .attr('height', 165)
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
      .attr('x', xOffset + 25)
      .attr(
        'y',
        yOffset * scalingFactor + 3 + lineHeight * 0 + paragraphMargin * 0
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect compound legend')
      .attr('x', xOffset + 125)
      .attr('y', yOffset + lineHeight * 0 + paragraphMargin * 0)
      .attr('rx', 10 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 35 * scalingFactor)
      .attr('height', 25 * scalingFactor);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Compound')
      .attr('x', xOffset + 150)
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
      .attr('x', xOffset + 25)
      .attr(
        'y',
        yOffset * scalingFactor + 3 + lineHeight * 1 + paragraphMargin * 0
      );

    legendSvg
      .append('rect')
      .attr('class', 'node-rect pathway legend')
      .attr('x', xOffset + 125)
      .attr('y', yOffset + lineHeight * 1 + paragraphMargin * 0)
      .attr('rx', 10 * scalingFactor)
      .attr('ry', 30 * scalingFactor)
      .attr('width', 35 * scalingFactor)
      .attr('height', 25 * scalingFactor);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Pathway')
      .attr('x', xOffset + 150)
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
      .attr('x', xOffset + 80 * scalingFactor)
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
      .attr('x', xOffset + 170)
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
      .text('Other Interaction')
      .attr('x', xOffset + 80 * scalingFactor)
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
      .attr('stroke-dasharray', '7 7')
      .style('stroke-width', 7);
    legendSvg
      .append('text')
      .attr('class', 'legend')
      .text('Binding/Association')
      .attr('x', xOffset + 80 * scalingFactor)
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
      .attr('class', 'node-rect ptm unregulated legend')
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
  }
}
