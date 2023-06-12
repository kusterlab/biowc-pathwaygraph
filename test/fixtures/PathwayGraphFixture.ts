export default {
  examplePathway1: {
    metaData: {
      identifier: 'XY001',
      org: 'Homo sapiens',
      pathwaytitle: 'Test pathway',
    },
    nodes: [
      {
        nodeId: '1', // TODO: Make optional and generate them if not present
        geneNames: ['Protein A'],
        label: null,
        type: 'gene_protein',
        x: 50,
        y: 50,
        groupId: '7',
      },
      {
        nodeId: '2',
        geneNames: ['Protein B'],
        label: 'Protein B;B',
        type: 'gene_protein',
        x: 150,
        y: 50,
        groupId: '7',
      },
      {
        nodeId: '3',
        geneNames: ['Protein C'],
        uniprotAccs: ['P12345'],
        label: 'Protein C;C;ProtC',
        type: 'gene_protein',
        x: -10,
        y: 150,
      },
      {
        nodeId: '4',
        geneNames: ['Protein D'],
        uniprotAccs: ['Q19838'],
        label: 'Protein D;D',
        type: 'gene_protein',
        x: 80,
        y: 150,
      },
      {
        nodeId: '5',
        geneNames: ['Protein E'],
        label: 'Protein E;E',
        type: 'gene_protein',
        x: 130,
        y: 100,
      },
      {
        nodeId: '6',
        geneNames: [''],
        label: 'Compound X',
        type: 'compound',
        x: -50,
        y: 75,
      },
      {
        nodeId: '7',
        type: 'group',
      },
    ],
    links: [
      {
        linkId: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: ['binding/association'],
      },
      {
        linkId: 'relation-2',
        sourceId: '1',
        targetId: '3',
        types: ['activation', 'dephosphorylation'],
        label: '-p',
      },
      {
        linkId: 'relation-3',
        sourceId: '1',
        targetId: '4',
        types: ['inhibition'],
      },
      {
        linkId: 'relation-4',
        sourceId: '7',
        targetId: '5',
        types: ['phosphorylation'],
        label: '+p',
      },
      {
        linkId: 'relation-5',
        sourceId: '6',
        targetId: '3',
        types: ['activation'],
      },
    ],
    sourceAnchor: [
      {
        linkId: 'relation-6',
        sourceId: 'relation-4',
        targetId: '3',
        types: ['activation'],
      },
    ],
    targetAnchor: [
      {
        linkId: 'relation-7',
        sourceId: '5',
        targetId: 'relation-5',
        types: ['activation'],
      },
    ],
    doubleAnchor: [
      {
        linkId: 'relation-8',
        sourceId: 'relation-4',
        targetId: 'relation-5',
        types: ['activation', 'methylation'],
        label: '+m',
      },
    ],

    ptmInputList: [
      {
        geneNames: ['D'],
        uniprotAccs: ['Q19838'],
        regulation: 'up',
        details: {
          'Modified Sequence': 'TES(ph)TPEPT(ph)IDEK',
          '-log(EC50)': 5,
          'Fold Change': 0.2,
          'R²': 0.89,
          'PhosphoSitePlus®':
            '<a href="http://www.phosphosite.org/uniprotAccAction?id=Q19838" target="_blank">T633-p</a>',
          'Experiment Name': 'My Experiment',
          curveIds: { display: false, value: 1234 },
        },
      },
      {
        uniprotAccs: ['P12345'],
        regulation: 'down',
        details: {
          'Modified Sequence': 'VNIPROT(ph)K',
        },
      },
    ],
    decryptmInputList: [
      {
        geneNames: ['Protein D'],
        regulation: 'up',
        details: {
          'Modified Sequence': 'TES(ph)TPEPT(ph)IDEK',
          '-log(EC50)': 5,
          'Fold Change': 1.2,
        },
      },
      {
        geneNames: ['Protein D'],
        regulation: 'up',
        details: {
          'Modified Sequence': 'TES(ph)TPEPT(ph)IDEK',
          '-log(EC50)': 3,
          'Fold Change': 1.2,
        },
      },
      {
        geneNames: ['Protein D'],
        regulation: 'down',
        details: {
          'Modified Sequence': 'TES(ph)TPEPT(ph)IDEK',
          '-log(EC50)': 8,
          'Fold Change': 0.1,
        },
      },
      {
        geneNames: ['Protein A'],
        regulation: 'up',
        details: {
          'Modified Sequence': 'TES(ph)TPEPT(ph)IDEK',
          '-log(EC50)': 4,
          'Fold Change': 3.1234,
        },
      },
      {
        geneNames: ['Protein C'],
        regulation: 'down',
        details: {
          'Modified Sequence': 'TES(ph)TPEPT(ph)IDEK',
          '-log(EC50)': 10,
          'Fold Change': 0.5,
        },
      },
    ],
    fpInputList: [
      {
        geneNames: ['Protein A'],
        regulation: 'down',
        details: {
          'Fold Change': 3,
        },
      },
      {
        uniprotAccs: ['P12345'],
        regulation: 'not',
        details: {},
      },
      {
        geneNames: ['Protein E'],
        regulation: 'down',
        details: {},
      },
      {
        geneNames: ['Protein E'],
        regulation: 'up',
        details: {
          Description: 'A very interesting protein.',
        },
      },
    ],
    hue: 'potency',
  },
};
