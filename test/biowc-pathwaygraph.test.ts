import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';
import PathwayGraphFixture from './fixtures/PathwayGraphFixture.js';
import { BiowcPathwaygraph } from '../src/BiowcPathwaygraph.js';
import '../src/biowc-pathwaygraph.js';

describe('BiowcPathwaygraph', () => {
  it('passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html`<biowc-pathwaygraph
        .pathwayMetaData=${PathwayGraphFixture.examplePathway1.metaData}
        .graphdataSkeleton=${{
          nodes: PathwayGraphFixture.examplePathway1.nodes,
          links: PathwayGraphFixture.examplePathway1.links,
        }}
        .ptmInputList=${PathwayGraphFixture.examplePathway1.ptmInputList}
      ></biowc-pathwaygraph>`
    );

    await expect(el).shadowDom.to.be.accessible();
  });
});
