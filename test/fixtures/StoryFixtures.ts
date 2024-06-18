export default {
  simpleSkeletonFixture: {
    nodes: [
      {
        nodeId: '1',
        label: 'Protein A',
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        label: 'Protein B',
        type: 'gene_protein',
        x: 175,
        y: 50,
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: [],
      },
    ],
  },
  nodeTypesFixture: {
    nodes: [
      {
        nodeId: '1',
        label: 'Protein A',
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        label: 'Compound X',
        type: 'compound',
        x: 175,
        y: 50,
      },
      {
        nodeId: '3',
        label: 'Protein B2',
        type: 'gene_protein',
        groupId: '5',
        x: 175,
        y: 100,
      },
      {
        nodeId: '4',
        label: 'Protein B1',
        type: 'gene_protein',
        groupId: '5',
        x: 100,
        y: 100,
      },
      {
        nodeId: '5',
        type: 'group',
      },
      {
        nodeId: '6',
        label: 'Some Other Pathway',
        type: 'pathway',
        x: 125,
        y: 150,
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: [],
      },
      {
        linkId: 'relation-2',
        sourceId: '2',
        targetId: '5',
        types: [],
      },
      {
        linkId: 'relation-3',
        sourceId: '1',
        targetId: '4',
        types: [],
      },
      {
        linkId: 'relation-4',
        sourceId: '5',
        targetId: '6',
        types: [],
      },
    ],
  },
  alternativeNamesFixture: {
    nodes: [
      {
        nodeId: '1',
        label: 'Protein A,ProtA',
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        label: 'Compound X1;Compound X2',
        type: 'compound',
        x: 175,
        y: 50,
      },
      {
        nodeId: '3',
        label: 'GeneB',
        geneNames: ['GeneName1', 'GeneName2'],
        type: 'gene_protein',
        x: 175,
        y: 100,
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: [],
      },
      {
        linkId: 'relation-2',
        sourceId: '2',
        targetId: '3',
        types: [],
      },
    ],
  },
  linkTypesFixture: {
    nodes: [
      {
        nodeId: '1',
        geneNames: ['Protein A'],
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        geneNames: ['Protein B'],
        type: 'gene_protein',
        x: 175,
        y: 50,
      },
      {
        nodeId: '3',
        geneNames: ['Protein C'],
        type: 'gene_protein',
        x: 175,
        y: 100,
      },

      {
        nodeId: '4',
        geneNames: ['Protein D'],
        type: 'gene_protein',
        x: 100,
        y: 100,
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: ['activation'],
      },
      {
        linkId: 'relation-2',
        sourceId: '2',
        targetId: '3',
        types: ['binding/association'],
      },
      {
        linkId: 'relation-3',
        sourceId: '3',
        targetId: '4',
        types: ['inhibition'],
      },
      {
        linkId: 'relation-4',
        sourceId: '4',
        targetId: '1',
        types: ['indirect effect'],
      },
      {
        linkId: 'relation-5',
        sourceId: 'relation-1',
        targetId: 'relation-3',
        types: [],
      },
    ],
  },
  simplePTMGraphFixture: {
    nodes: [
      {
        nodeId: '1',
        geneNames: ['Protein A', 'GeneA'],
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        geneNames: ['Protein B'],
        uniprotAccs: ['P12345'],
        type: 'gene_protein',
        x: 175,
        y: 50,
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: [],
      },
    ],
    ptmInputList: [
      {
        geneNames: ['GeneA'],
        regulation: 'down',
      },
      {
        geneNames: ['Protein A'],
        regulation: 'down',
      },
      {
        geneNames: ['Protein B'],
        regulation: 'not',
      },
      {
        uniprotAccs: ['P12345'],
        regulation: 'up',
      },
    ],
  },
  ptmGraphWithDetailsFixture: {
    ptmInputList: [
      {
        geneNames: ['GeneA'],
        regulation: 'down',
        details: {
          Sequence: 'TESTPEPT(ph)IDEK',
          'Fold Change': 0.5,
          'p Value': 0.0001,
          '-log(EC50)': 7,
        },
      },
      {
        geneNames: ['Protein A'],
        regulation: 'down',
        details: {
          Sequence: 'TRY(ph)AGAINK',
          Site: { text: 'S42' },
          'Fold Change': 0.1,
          'p Value': 0.0002,
          '-log(EC50)': 9,
          'Upstream Kinase(s)': {
            display: true,
            indentKey: true,
            text: 'GeneA, Protein D',
          },
        },
      },
      {
        geneNames: ['Protein B'],
        regulation: 'not',
        details: {
          Sequence: 'GILGVIVT(ph)LK',
          Site: { text: 'Y512' },
          'Fold Change': 2.5,
          'p Value': 0.0003,
          '-log(EC50)': 6,
          MyUmbrellaTerm: ' ',
          Subterm1: { text: 'Neque porro', display: true, indentKey: true },
          Subterm2: { text: 'quisquam est', display: true, indentKey: true },
          Subterm3: {
            text: 'qui dolorem ipsum',
            display: true,
            indentKey: true,
          },
          'Something else': 'Hello!',
          'Upstream Kinase(s)': {
            display: true,
            indentKey: true,
            text: 'Protein B, Protein C',
          },
        },
      },
      {
        uniprotAccs: ['P12345'],
        regulation: 'up',
        details: {
          Sequence: 'VNIPRVT(ph)K',

          'Fold Change': 4,
          'p Value': 0.0004,
          '-log(EC50)': 10,
        },
      },
      {
        geneNames: ['Protein B'],
        regulation: 'up',
        details: {
          Sequence: 'GENENAMES(ph)K',
          Site: { text: 'T90' },
          'Fold Change': 1.2,
          'p Value': 0.001,
          '-log(EC50)': 8,
        },
      },
    ],
  },
  proteinExpressionFixture: {
    nodes: [
      {
        nodeId: '1',
        geneNames: ['Protein A'],
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        geneNames: ['Protein B'],
        type: 'gene_protein',
        x: 175,
        y: 50,
      },
      {
        nodeId: '3',
        geneNames: ['Protein C'],
        type: 'gene_protein',
        x: 175,
        y: 100,
      },

      {
        nodeId: '4',
        geneNames: ['Protein D'],
        type: 'gene_protein',
        x: 100,
        y: 100,
      },
      {
        nodeId: '5',
        geneNames: ['Protein E'],
        type: 'gene_protein',
        x: 30,
        y: 100,
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: ['activation'],
      },
      {
        linkId: 'relation-2',
        sourceId: '2',
        targetId: '3',
        types: ['binding/association'],
      },
      {
        linkId: 'relation-3',
        sourceId: '3',
        targetId: '4',
        types: ['inhibition'],
      },
      {
        linkId: 'relation-4',
        sourceId: '4',
        targetId: '1',
        types: ['indirect effect'],
      },
      {
        linkId: 'relation-5',
        sourceId: 'relation-1',
        targetId: 'relation-3',
        types: [],
      },
      {
        linkId: 'relation-6',
        sourceId: '5',
        targetId: '4',
        types: [],
      },
    ],
    fullProteomeInputList: [
      {
        geneNames: ['Protein A'],
        regulation: 'down',
        details: {
          'Fold Change': 0.1,
        },
      },
      {
        geneNames: ['Protein B'],
        regulation: 'up',
        details: {
          'Fold Change': 2.5,
        },
      },
      {
        geneNames: ['Protein B'],
        regulation: 'up',
        details: {
          'Fold Change': 3.0,
        },
      },
      {
        geneNames: ['Protein D'],
        regulation: 'down',
        details: {
          'Fold Change': 0.25,
        },
      },
      {
        geneNames: ['Protein D'],
        regulation: 'up',
        details: {
          'Fold Change': 1.5,
        },
      },
      {
        geneNames: ['Protein C'],
        regulation: 'not',
        details: {
          'Fold Change': 1.01,
        },
      },
    ],
  },
};
