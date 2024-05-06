import { html, TemplateResult } from 'lit';
import '../src/biowc-pathwaygraph.js';
import StoryFixtures from '../test/fixtures/StoryFixtures.js';

export default {
  title: 'BiowcPathwaygraph',
  component: 'biowc-pathwaygraph',
  argTypes: {
    storyTitle: { control: 'null' },
    pathwayMetaData: { control: 'object' },
    graphdataSkeleton: { control: 'object' },
    ptmInputList: { control: 'array' },
    fullProteomeInputList: { control: 'object' },
    hue: { control: 'text' },
    applicationMode: { control: 'text' },
  },
};

interface Story<T> {
  (args: T): TemplateResult;
  args?: Partial<T>;
  argTypes?: Record<string, unknown>;
}

interface ArgTypes {
  storyTitle: string;
  storyDescription: string;
  pathwayMetaData?: object;
  graphdataSkeleton?: object;
  ptmInputList?: object;
  fullProteomeInputList?: object;
  hue: string;
  applicationMode: string;
}

const Template: Story<ArgTypes> = (args: ArgTypes) => html`
  <div>${args.storyTitle}</div>
  <div>${args.storyDescription}</div>
  <biowc-pathwaygraph
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
    .hue=${args.hue}
  >
  </biowc-pathwaygraph>
`;

// Simple Skeleton Graph
// 2 Nodes, one edge
export const SimpleSkeletonGraph = Template.bind({});
SimpleSkeletonGraph.args = {
  graphdataSkeleton: {
    nodes: StoryFixtures.simpleSkeletonFixture.nodes,
    links: StoryFixtures.simpleSkeletonFixture.links,
  },
  storyTitle: 'A Simple Skeleton Graph',
  storyDescription:
    'The skeleton of a graph consists of:' +
    '- A list of nodes, including their coordinates' +
    '- A list of links that connect the nodes' +
    "These two parts of the skeleton are defined under the 'nodes' and 'links' properties of a biowc-pathwaygraph component instance. " +
    'The graph is then automatically rendered. ' +
    'The graph is interactive: You can drag the nodes around and the edges will follow.' +
    'Click on a node to select it. Press CTRL to select multiple nodes. Click the canvas to clear the selection. ' +
    "If a single node is selected, `biowc-pathwaygraph` dispatches a `selectedNodeTooltip` event containing the node's tooltip text. ",
};

// Node types
export const NodeTypes = Template.bind({});
NodeTypes.args = {
  graphdataSkeleton: {
    nodes: StoryFixtures.nodeTypesFixture.nodes,
    links: StoryFixtures.nodeTypesFixture.links,
  },
  storyTitle: 'Node types',
  storyDescription:
    "The type of a node is set using the 'type' property. Possible types are: " +
    '- gene_protein' +
    '- compound' +
    '- pathway' +
    '- group' +
    'Group nodes are part of the node list, but they do not have coordinates. ' +
    'They are drawn as a hull around their members and updated when their members change position.' +
    "Any node can become part of a group by setting its 'groupId' property to the group's 'nodeId'." +
    'A link can go directly to a group as well as to its individual members.',
};

// Alternative names
export const AlternativeNames = Template.bind({});
AlternativeNames.args = {
  graphdataSkeleton: {
    nodes: StoryFixtures.alternativeNamesFixture.nodes,
    links: StoryFixtures.alternativeNamesFixture.links,
  },
  storyTitle: 'Alternative Names',
  storyDescription:
    "A node of type 'gene_protein' or 'compound' can have alternative names. The name can be changed by right-clicking the node." +
    "Alternative Names are defined in the 'label' property of a node. They are supplied as a single string, the different names need to be separated by ',' or by ';'." +
    "For 'gene_protein' nodes, additional alternative names can be supplied as a list of strings in the 'geneNames' property.",
};

// Edge types
// Edges on edges
export const LinkTypes = Template.bind({});
LinkTypes.args = {
  graphdataSkeleton: {
    nodes: StoryFixtures.linkTypesFixture.nodes,
    links: StoryFixtures.linkTypesFixture.links,
  },
  storyTitle: 'Link Types',
  storyDescription:
    'Links can also have different types:' +
    "- 'activation'" +
    "- 'binding/association'" +
    "- 'inhibition'" +
    "- 'indirect effect' " +
    "Links without a type are automatically classified as 'other'. " +
    "The type of a link is defined in its 'types' property (for compatibility reasons this is a list, " +
    'but you will usually only supply a single type there). ' +
    'A link can also start or end on another link. Just specify the id of the other link as sourceId or targetId.',
};

// Simple PTM Graph
export const SimplePTMGraph = Template.bind({});
SimplePTMGraph.args = {
  graphdataSkeleton: {
    nodes: StoryFixtures.simplePTMGraphFixture.nodes,
    links: StoryFixtures.simplePTMGraphFixture.links,
  },
  ptmInputList: StoryFixtures.simplePTMGraphFixture.ptmInputList,
  storyTitle: 'Simple PTM Graph',
  storyDescription:
    "PTMs are added to the skeleton graph using the 'ptmInputList' property " +
    "of a 'biowc-pathwaygraph' component instance. " +
    "An entry of the 'ptmInputList' must contain a 'geneNames' or a 'uniprotAccs' property," +
    'by which it can be matched to a node in the skeleton graph. Additionally it must ' +
    "contain a 'regulation' property (possible values are 'up', 'down', 'not'). " +
    'The regulations of a node are initially summarized by node category. You can expand each category by double-clicking it. ' +
    "PTM Nodes have two simulated forces. One keeps them close to their 'gene_protein' node, the other keeps them from overlapping with one another. " +
    'Try dragging them around!',
};

// PTM Graph with more Details (Tooltip - it only appears when there are details but that is ok)
export const PTMGraphWithDetails = Template.bind({});
PTMGraphWithDetails.args = {
  ...SimplePTMGraph.args,
  ptmInputList: StoryFixtures.ptmGraphWithDetailsFixture.ptmInputList,
  storyTitle: 'PTM Graph with Details',
  storyDescription:
    "In the `details` property of `ptmInputList`'s elements, " +
    'you can but arbitrary key-value pairs with information.' +
    'This information is then displayed as a tooltip. ' +
    'Expand one of the PTM nodes and hover over it to see it! ' +
    'Same as for other nodes, if a single PTM node is selected, its tooltip text is ' +
    'emitted as a `selectedNodeTooltip` event that a parent component may listen to. ' +
    'Additionally, a `selectionDetails` event is emitted which contains the ' +
    'details dictionary for every selected node.',
};

// PTM Graph with FPs
export const ProteinExpressionGraph = Template.bind({});
ProteinExpressionGraph.args = {
  graphdataSkeleton: {
    nodes: StoryFixtures.proteinExpressionFixture.nodes,
    links: StoryFixtures.proteinExpressionFixture.links,
  },
  fullProteomeInputList:
    StoryFixtures.proteinExpressionFixture.fullProteomeInputList,
  storyTitle: 'Protein Expression Graph',
  storyDescription:
    "You can also supply protein expression ('full proteome') data " +
    'using the `fullProteomeInputList` property. ' +
    "The 'gene_protein' nodes will be colored accordingly. " +
    "Note that nodes with a 'not' regulation (e.g. Protein C) are distinguished from nodes with no regulation (e.g. Protein E). " +
    'If multiple entries map to the same node, their details are concatenated. ' +
    'If both up- and down-regulations map to the same node, the node will be streaked red and blue. ',
};

// PTM Graph with Fold Change
export const ColoringNodesByFoldChange = Template.bind({});
ColoringNodesByFoldChange.args = {
  ...PTMGraphWithDetails.args,
  hue: 'foldchange',
  storyTitle: 'Coloring Nodes By Fold Change',
  storyDescription:
    'If the details of the `ptmInputList` contain fold changes or log fold changes, ' +
    "you can change the color scheme of the graph by setting the `hue` property to 'foldchange'. " +
    'The legend will then be extended by a dynamic color bar that ranges from the smallest ' +
    'to the largest value, and each PTM node will be colored accordingly. ' +
    '(This also works for log fold changes, where downregulations would be negative.) ' +
    'Since the color-coding only works for individual nodes, not for summary nodes, the nodes are automatically expanded when this color scheme is selected. ' +
    'Be aware that it always takes a short time until the simulation stabilizes, therefore the automatic expansion of nodes only becomes visible after 2 seconds.',
};

// DecryptM Graph with Potency Hue
export const ColoringNodesByPotency = Template.bind({});
ColoringNodesByPotency.args = {
  ...PTMGraphWithDetails.args,
  hue: 'potency',
  storyTitle: 'Coloring Nodes By Potency (decryptM Data)',
  storyDescription:
    'If you have decryptM data, each peptide of the `ptmInputList` ' +
    "has a '-log(EC50)' value in its details. For this type of data, a third color scheme exists, which " +
    "you can activate by setting `hue` to 'potency'. The dynamic color bar will then " +
    'use a different color scale and will range from the lowest to the highest potency ' +
    '(negative log EC50 value). ' +
    'Since the color-coding only works for individual nodes, not for summary nodes, the nodes are automatically expanded when this color scheme is selected. ' +
    'Be aware that it always takes a short time until the simulation stabilizes, therefore the automatic expansion of nodes only becomes visible after 2 seconds.',
};

// Demo Public methods (download, collapse (in same story as expand), select downstream)
// Couldn't figure out how to hand method calls over as arguments, so I had to write an
// Individual Template for each function. If anyone knows this feel free to write a pull request
const ExpandAndCollapseAllButtonTemplate: Story<ArgTypes> = (
  args: ArgTypes
) => html`
  <div>${args.storyTitle}</div>
  <div>${args.storyDescription}</div>
  <button onclick="document.getElementById('pathwaygraph').expandAllPTMNodes()">
    Expand All
  </button>
  <button
    onclick="document.getElementById('pathwaygraph').collapseAllPTMNodes()"
  >
    Collapse All
  </button>
  <biowc-pathwaygraph
    id="pathwaygraph"
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
    .hue=${args.hue}
  >
  </biowc-pathwaygraph>
`;
export const ExpandAndCollapseAll = ExpandAndCollapseAllButtonTemplate.bind({});
ExpandAndCollapseAll.args = {
  ...PTMGraphWithDetails.args,
  hue: 'potency',
  storyTitle: 'Expand and collapse all',
  storyDescription:
    'biowc-pathwaygraph has a couple of public functions that can be used to interface it with parent components. ' +
    'The first two are `expandAllPTMNodes` and `collapseAllPTMNodes`. Click the buttons to see how they work!',
};

const SelectDownstreamButtonTemplate: Story<ArgTypes> = (
  args: ArgTypes
) => html`
  <div>${args.storyTitle}</div>
  <div>${args.storyDescription}</div>
  <button
    onclick="document.getElementById('pathwaygraph').selectNodesDownstreamOfSelection()"
  >
    Select Downstream Subgraph
  </button>
  <biowc-pathwaygraph
    id="pathwaygraph"
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
    .hue=${args.hue}
  >
  </biowc-pathwaygraph>
`;
export const SelectDownstreamSubgraph = SelectDownstreamButtonTemplate.bind({});
SelectDownstreamSubgraph.args = {
  ...NodeTypes.args,
  hue: 'potency',
  storyTitle: 'Select Downstream Subgraph',
  storyDescription:
    'The `selectNodesDownstreamOfSelection` method traverses the graph ' +
    'and highlights every node that is downstream of the current selection. Try it out by first selecting ' +
    'a node in the graph and then clicking the button.',
};

const DownloadSVGTemplate: Story<ArgTypes> = (args: ArgTypes) => html`
  <div>${args.storyTitle}</div>
  <div>${args.storyDescription}</div>
  <button onclick="document.getElementById('pathwaygraph').downloadSvg()">
    Download
  </button>
  <biowc-pathwaygraph
    id="pathwaygraph"
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
    .hue=${args.hue}
  >
  </biowc-pathwaygraph>
`;

export const DownloadGraphAsSVG = DownloadSVGTemplate.bind({});
DownloadGraphAsSVG.args = {
  ...ColoringNodesByPotency.args,
  hue: 'potency',
  storyTitle: 'Download Graph as SVG',
  storyDescription:
    'Finally, there is the `downloadSvg`, which downloads the current canvas ' +
    'in Scalable Vector Graphics format, including PTM nodes, selections, and rearrangements made ' +
    'by the user.',
};

const DownloadCSVTemplate: Story<ArgTypes> = (args: ArgTypes) => html`
  <div>${args.storyTitle}</div>
  <div>${args.storyDescription}</div>
  <button
    onclick="document.getElementById('pathwaygraph').downloadPeptidesCSV()"
  >
    Download
  </button>
  <biowc-pathwaygraph
    id="pathwaygraph"
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
    .hue=${args.hue}
  >
  </biowc-pathwaygraph>
`;

export const DownloadMappedPeptidesCSV = DownloadCSVTemplate.bind({});
DownloadMappedPeptidesCSV.args = {
  ...ColoringNodesByPotency.args,
  hue: 'direction',
  storyTitle: 'Download Mapped Peptides as CSV',
  storyDescription: 'TODO: Change the finally in the previous story ;-)',
};

const EditingModeTemplate: Story<ArgTypes> = (args: ArgTypes) => html`
  <div>${args.storyTitle}</div>
  <div>${args.storyDescription}</div>
  <input
    type="radio"
    name="modeswitch"
    id="viewing"
    onclick="document.getElementById('pathwaygraph').switchApplicationMode(this.id);"
    checked
  /><label for="viewing">Viewing Mode</label>
  <input
    type="radio"
    name="modeswitch"
    id="editing"
    onclick="document.getElementById('pathwaygraph').switchApplicationMode(this.id);"
  /><label for="editing">Editing Mode</label>
  <button
    onclick="document.getElementById('pathwaygraph').exportSkeleton('custompathway1', 'My Pathway')"
  >
    Export
  </button>
  <button onclick="console.log('Should Import')">Import</button>
  <biowc-pathwaygraph
    id="pathwaygraph"
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
    .hue=${args.hue}
    .applicationMode=${args.applicationMode}
  >
  </biowc-pathwaygraph>
`;

export const EditingMode = EditingModeTemplate.bind({});
EditingMode.args = {
  ...ColoringNodesByPotency.args,
  hue: 'potency',
  storyTitle: 'Editing Mode',
  storyDescription: 'TODO',
  applicationMode: 'viewing',
};

// TODO: Events: selectedNodeTooltip and selectionDetails are dispatched when?
