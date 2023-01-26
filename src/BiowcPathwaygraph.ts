import { html, LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
// import * as d3v6 from 'd3';
import styles from './biowc-pathwaygraph.css';

type PossibleRegulationCategoriesType = 'up' | 'down' | '-';

interface PathwayMetadata {
  identifier: string; // TODO: Refactor from 'id' - set if it is not set by user
  org: string;
  pathwaytitle: string; // TODO: Refactor from 'title'
}

interface PathwayGraphNode {
  nodeId: string; // TODO: Refactor from 'id' - do not require, should be set in here if not set by user
  type: string; // TODO: Enumerate all possible types
  x: number; // Maybe exclamation mark is better here, check what it is used for
  y: number;
}

interface GeneProteinNode extends PathwayGraphNode {
  geneNames: string[];
  uniprotAccs: string[];
  label: string;
  groupId?: string;
  regulation?: PossibleRegulationCategoriesType;
  details?: { [key: string]: string | number }; // TODO: Put things like modifiedSequence &  logEC50 in here
  // The following are only defined if Full Proteome Data was supplied
  nUp?: number;
  nDown?: number;
  nNot?: number;
}

// eslint-disable-next-line
interface GroupNode extends PathwayGraphNode {
  components: string[];
}

// TODO: There could also be ProteinInputEntry for FullProt Data
interface PTMInputEntry {
  geneNames?: string[];
  uniprotIds?: string[];
  regulation: PossibleRegulationCategoriesType;
  details?: { [key: string]: string | number };
}

interface PTMNode extends PathwayGraphNode {
  geneProteinNode: GeneProteinNode;
  details?: { [key: string]: string | number }; // TODO: Put things like modifiedSequence &  logEC50 in here
  regulation: PossibleRegulationCategoriesType;
  geneNames?: string[];
  uniprotIds?: string[];
  // Interfaces are hoisted so we can reference PTMSummaryNode before defining it
  // eslint-disable-next-line no-use-before-define
  summaryNode?: PTMSummaryNode;
}

interface PTMSummaryNode extends PathwayGraphNode {
  geneProteinNode: GeneProteinNode;
  label: string;
  ptmNodes: PTMNode[];
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
  sourceId: string;
  targetId: string;
  types: string[]; // TODO: Enumerate all link types
}

// Internal representation of a link
interface PathwayGraphLink {
  linkId: string; // TODO: Refactor from 'id'
  types: string[]; // TODO: Enumerate all link types
  sourceNode: PathwayGraphNode;
  targetNode: PathwayGraphNode;
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
    links: PathwayGraphLink[];
  };

  render() {
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
    links: PathwayGraphLink[];
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
      links: PathwayGraphLink[];
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
                  geneProteinNode,
                  x: geneProteinNode.x,
                  y: geneProteinNode.y,
                };
                graphdataPTM.nodes.push(ptmNode);
                graphdataPTM.links.push({
                  linkId: `ptmlink-${ptmNodeId}`,
                  sourceNode: ptmNode,
                  targetNode: geneProteinNode,
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
        const { geneProteinNode } = ptmNodeList[0];
        const summaryNode: PTMSummaryNode = {
          nodeId: `ptm-summary-${regulationCategory}-${geneProteinNode.nodeId}`,
          type: 'ptm summary',
          label: `${ptmNodeList.length}`,
          geneProteinNode,
          ptmNodes: ptmNodeList,
          regulation: regulationCategory as PossibleRegulationCategoriesType,
          x: geneProteinNode.x,
          y: geneProteinNode.y,
        };
        graphdataPTM.nodes.push(summaryNode);
        // Add reference of ptmNode to its summary node
        for (const ptmNode of ptmNodeList) {
          ptmNode.summaryNode = summaryNode;
        }
        graphdataPTM.links.push({
          linkId: `ptm-summary-${regulationCategory}-${geneProteinNode.nodeId}`,
          types: ['ptmlink', 'summary'],
          sourceNode: summaryNode,
          targetNode: geneProteinNode,
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
}
