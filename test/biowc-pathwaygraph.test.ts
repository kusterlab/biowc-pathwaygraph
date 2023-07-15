import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';
import StoryFixtures from './fixtures/StoryFixtures.js';
import { BiowcPathwaygraph } from '../src/BiowcPathwaygraph.js';
import '../src/biowc-pathwaygraph.js';

describe('BiowcPathwaygraph', () => {
  it('passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html`<biowc-pathwaygraph
        .graphdataSkeleton=${{
          nodes: StoryFixtures.simplePTMGraphFixture.nodes,
          links: StoryFixtures.simplePTMGraphFixture.links,
        }}
        .ptmInputList=${StoryFixtures.ptmGraphWithDetailsFixture.ptmInputList}
        .fpInputList=${StoryFixtures.proteinExpressionFixture
          .fullProteomeInputList}
        .hue=${'foldchange'}
      ></biowc-pathwaygraph>`
    );

    await expect(el).shadowDom.to.be.accessible();
  });
});
