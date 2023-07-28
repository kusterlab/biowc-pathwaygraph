import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';
import StoryFixtures from './fixtures/StoryFixtures.js';
import { BiowcPathwaygraph } from '../src/BiowcPathwaygraph.js';
import '../src/biowc-pathwaygraph.js';

// TODO: a11y audit as separate test, needs to wait for the rendering to finish

describe('Simple Skeleton Graph', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.simpleSkeletonFixture.nodes,
          links: StoryFixtures.simpleSkeletonFixture.links,
        }}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Graph with Different Node Types', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.nodeTypesFixture.nodes,
          links: StoryFixtures.nodeTypesFixture.links,
        }}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Graph with Alternative Node Names', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.alternativeNamesFixture.nodes,
          links: StoryFixtures.alternativeNamesFixture.links,
        }}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Graph with Different Link Types', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.linkTypesFixture.nodes,
          links: StoryFixtures.linkTypesFixture.links,
        }}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Simple PTM Graph', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.simplePTMGraphFixture.nodes,
          links: StoryFixtures.simplePTMGraphFixture.links,
        }}"
        .ptmInputList="${StoryFixtures.simplePTMGraphFixture.ptmInputList}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('PTM Graph with Details', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.simplePTMGraphFixture.nodes,
          links: StoryFixtures.simplePTMGraphFixture.links,
        }}"
        .ptmInputList="${StoryFixtures.ptmGraphWithDetailsFixture.ptmInputList}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Protein Expression Graph', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.proteinExpressionFixture.nodes,
          links: StoryFixtures.proteinExpressionFixture.links,
        }}"
        .fullProteomeInputList="${StoryFixtures.proteinExpressionFixture
          .fullProteomeInputList}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Graph Colored by Fold Change', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.simplePTMGraphFixture.nodes,
          links: StoryFixtures.simplePTMGraphFixture.links,
        }}"
        .fullProteomeInputList="${StoryFixtures.ptmGraphWithDetailsFixture
          .ptmInputList}"
        .hue="foldchange"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('Graph Colored by Potency', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.simplePTMGraphFixture.nodes,
          links: StoryFixtures.simplePTMGraphFixture.links,
        }}"
        .fullProteomeInputList="${StoryFixtures.ptmGraphWithDetailsFixture
          .ptmInputList}"
        .hue="potency"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});

describe('BiowcPathwaygraph', () => {
  it('can be rendered and passes the a11y audit', async () => {
    const el = await fixture<BiowcPathwaygraph>(
      html` <biowc-pathwaygraph
        .graphdataSkeleton="${{
          nodes: StoryFixtures.simplePTMGraphFixture.nodes,
          links: StoryFixtures.simplePTMGraphFixture.links,
        }}"
        .ptmInputList="${StoryFixtures.ptmGraphWithDetailsFixture.ptmInputList}"
        .fpInputList="${StoryFixtures.proteinExpressionFixture
          .fullProteomeInputList}"
        .hue="${'foldchange'}"
      ></biowc-pathwaygraph>`
    );
    await expect(el).shadowDom.to.be.accessible();
  });
});
