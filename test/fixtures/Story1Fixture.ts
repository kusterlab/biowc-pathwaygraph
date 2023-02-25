// TODO: Alternative names concept
export default {
  pathway1: {
    nodes: [
      {
        nodeId: '1',
        geneNames: ['PrA', 'Protein A'],
        uniprotAccs: ['Q19838'],
        label: 'Protein A',
        type: 'gene_protein',
        x: 50,
        y: 50,
      },
      {
        nodeId: '2',
        geneNames: ['PrB', 'Protein B'],
        uniprotAccs: ['P85299'],
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
        types: ['activation', 'phosphorylation'],
        label: '+p',
      },
    ],
    ptmInputList: [
      {
        uniprotAccs: ['Q19838'],
        regulation: 'down',
        details: {
          'Modified Sequence': 'VNIPROT(ph)K',
        },
      },
    ],
    fpInputList: [
      {
        geneNames: ['PrB'],
        regulation: 'up',
        details: {},
      },
    ],
  },
};
