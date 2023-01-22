export default {
  examplePathway1: {
    metaData: {
      identifier: 'XY001',
      org: 'Homo sapiens',
      pathwaytitle: 'Test pathway',
    },
    nodes: [
      {
        id: '1', // TODO: Make optional and generate them if not present
        geneNames: ['Protein A'],
        label: 'A',
        type: 'gene_protein',
        x: 50,
        y: 50,
        groupId: '7',
      },
      {
        id: '2',
        geneNames: ['Protein B'],
        label: 'B',
        type: 'gene_protein',
        x: 150,
        y: 50,
        groupId: '7',
      },
      {
        id: '3',
        geneNames: ['Protein C'],
        label: 'C',
        type: 'gene_protein',
        x: -10,
        y: 150,
      },
      {
        id: '4',
        geneNames: ['Protein D'],
        label: 'D',
        type: 'gene_protein',
        x: 80,
        y: 150,
      },
      {
        id: '5',
        geneNames: ['Protein E'],
        label: 'E',
        type: 'gene_protein',
        x: 130,
        y: 100,
      },
      {
        id: '6',
        geneNames: [''],
        label: 'Compound X',
        type: 'compound',
        x: -50,
        y: 75,
      },
      {
        id: '7',
        type: 'group',
        components: ['1', '2'],
      },
    ],
    links: [
      {
        id: 'relation-1',
        sourceId: '1',
        targetId: '2',
        types: ['binding/association'],
      },
      {
        id: 'relation-2',
        sourceId: '1',
        targetId: '3',
        types: ['activation', 'dephosphorylation'],
      },
      {
        id: 'relation-3',
        sourceId: '1',
        targetId: '4',
        types: ['inhibition'],
      },
      {
        id: 'relation-4',
        sourceId: '7',
        targetId: '5',
        types: ['phosphorylation'],
      },
      {
        id: 'relation-5',
        sourceId: '6',
        targetId: '3',
        types: ['activation'],
      },
    ],

    ptmInputList: [
      {
        geneName: 'D',
        uniprotId: 'Q19838',
        regulation: 'up',
        details: {
          modifiedSequence: 'KIMAKEMI',
          logEC50: 5,
          mod_rsd: 'ABCDEF_p350',
          acc_id: 'Q19838',
          foldChange: 0.2,
          r2: 0.89,
          logPValue: 8,
          experiment: 'My Experiment',
          curveIds: 1234,
        },
      },
    ],
  },
  // DEPRECATED
  graphdataPTM: {
    nodes: [
      {
        id: 'ptm-0',
        type: 'ptm',
        label: 'Do I need to have a label?', // Should probably be forced to be 0 or just omitted
        modifiedSequence: 'KIMAKEMI',
        logEC50: 5,
        mod_rsd: 'ABCDEF_p350',
        acc_id: 'Q19838',
        foldChange: 0.2,
        r2: 0.89,
        logPValue: 8,
        experiment: 'My Experiment',
        geneName: 'This genename is actually irrelevant',
        proteinId: '4', // Do we need this?
        uniprotId: 'Q19838', // ACC_ID AND Uniprot ID?
        regulation: 'up',
        curveIds: 1234,
      },
      {
        id: `ptm-summary-up-0`,
        type: 'ptm summary', // TODO: Why is this a whitespace-separated string and for the links it is an actual list?
        label: `1`,
        proteinId: '4',
        ptmIds: ['ptm-0'],
        regulation: 'up',
      },
    ],
    links: [
      {
        id: 'ptmlink-ptm-0', // TODO: Do these IDs have any meaning, e.g. does the suffix of this HAVE to be the id of its ptm? If it does: It shouldn't!
        sourceId: 'ptm-0',
        targetId: '4', // This is duplication from the proteinId above
        types: ['ptmlink'],
      },
      {
        id: 'pptm-summary-up-4', // TODO: Do these IDs have any meaning, e.g. does the suffix of this HAVE to be the id of its ptm? If it does: It shouldn't!
        sourceId: 'ptm-summary-up-0',
        targetId: '4', // This is duplication from the proteinId above
        types: ['ptmlink', 'summary'],
      },
    ],
  },
};
