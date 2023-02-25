import { html, TemplateResult } from 'lit';
import '../src/biowc-pathwaygraph.js';
import Story1Fixture from '../test/fixtures/Story1Fixture.js';

export default {
  title: 'BiowcPathwaygraph',
  component: 'biowc-pathwaygraph',
  argTypes: {
    pathwayMetaData: { control: 'object' },
    graphdataSkeleton: { control: 'object' },
    ptmInputList: { control: 'object' },
    fullProteomeInputList: { control: 'object' },
  },
};

interface Story<T> {
  (args: T): TemplateResult;
  args?: Partial<T>;
  argTypes?: Record<string, unknown>;
}

interface ArgTypes {
  pathwayMetaData?: object;
  graphdataSkeleton?: object;
  ptmInputList?: object;
  fullProteomeInputList?: object;
}

const Template: Story<ArgTypes> = (args: ArgTypes) => html`
  <biowc-pathwaygraph
    .pathwayMetaData=${args.pathwayMetaData}
    .graphdataSkeleton=${args.graphdataSkeleton}
    .ptmInputList=${args.ptmInputList}
    .fullProteomeInputList=${args.fullProteomeInputList}
  >
  </biowc-pathwaygraph>
`;

export const MinimalSkeletonGraph = Template.bind({});
MinimalSkeletonGraph.args = {};
MinimalSkeletonGraph.args.graphdataSkeleton = {
  nodes: Story1Fixture.pathway1.nodes,
  links: Story1Fixture.pathway1.links,
};

export const MinimalPTMGraph = Template.bind({});
MinimalPTMGraph.args = {
  ...MinimalSkeletonGraph.args,
  ptmInputList: Story1Fixture.pathway1.ptmInputList,
};
