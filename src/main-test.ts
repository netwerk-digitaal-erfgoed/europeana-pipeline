import { Ratt, CliContext, Middleware } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import {
  prefixes,
  eccbooks2edmQueryString,
  eccucfix2edmQueryString,
  finnabooks2edmQueryString,
  ksamsok2edmQueryString,
  nmvw2edmQueryString,
  schema2edmQueryString,
} from "./helpers/generics";

export declare type CompressionType = "gz" | undefined;

// sources
const reportGraph = prefixes.defaultGraph("violationReport");
const sources = {
  dcatShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_dcat.ttl"
  ),
  schemaShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_schema.ttl"
  ),
  edmShapes: Ratt.Source.file("./rdf/informatieModellen/shacl_edm.ttl"),
};

const destinations = {
  report: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
    truncateGraphs: true,
    synchronizeServices: true,
  }),
  dataset: Ratt.Destination.TriplyDb.rdf("dataset", {
    truncateGraphs: true,
    synchronizeServices: true,
  }),
};

export default async function (cliContext: CliContext): Promise<Ratt> {
  // RATT context
  const pipe1 = new Ratt({
    defaultGraph: prefixes.defaultGraph,
    cliContext: cliContext,
    prefixes: prefixes,
    sources: sources,
    destinations: destinations,
  });

  pipe1.use(
    mw.fromJson([
      {
        dsName: "EKT-ecc-books",
        datasetIri:
          "http://semantics.gr/authorities/vocabularies/ecc-books-dataset",
        dataFile: "./data/tmp/ecc-books.nt.gz",
      },
      {
        dsName: "EKT-ecc-sculptures",
        datasetIri:
          "http://semantics.gr/authorities/vocabularies/ecc-sculptures-dataset",
        dataFile: "./data/tmp/ecc-sculptures.nt.gz",
      },
      {
        dsName: "EKT-ecc-photographes",
        datasetIri:
          "http://semantics.gr/authorities/vocabularies/ecc-paintings-dataset",
        dataFile: "./data/tmp/ecc-photographs.nt.gz",
      },
      {
        dsName: "EKT-ecc-paintings",
        datasetIri:
          "http://semantics.gr/authorities/vocabularies/ecc-photographs-dataset",
        dataFile: "./data/tmp/ecc-paintings.nt.gz",
      },
      {
        dsName: "NDE-kb-centsprenten",
        datasetIri: "http://data.bibliotheken.nl/id/dataset/rise-centsprenten",
        dataFile: "./data/tmp/centsprenten.nt.gz",
      },
      {
        dsName: "SOCH-LSH",
        datasetIri: "http://cclod.netwerkdigitaalerfgoed.nl/soch_lsh",
        dataFile: "./data/tmp/soch_lsh.ttl",
      },
    ])
  );
  pipe1.use(mw.logRecord())

  pipe1.use(subETL(cliContext));

  return pipe1;
}

const dsName = "dsName";
const datasetIri = "datasetIri";
const dataFile = "dataFile";

function subETL(cliContext: CliContext): Middleware {
  return async (ctx, next) => {
    try {
      const file = ctx.getString(dataFile);
      const graph = ctx.getString(datasetIri)
      const edmGraph =
        ctx.getString(datasetIri) + "edm";
      const pipe2 = new Ratt({
        defaultGraph: graph,
        cliContext: cliContext,
        prefixes: prefixes,
        sources: { ...sources, dataset: Ratt.Source.file(file) },
        destinations: {
          dataset: Ratt.Destination.TriplyDb.rdf(
            ctx
              .getString(dsName)
              .toLowerCase()
              .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
              .substring(0, 35), // Create a datasetName that is understandable.
            {
              overwrite: true,
            }
          ),
        },
      });
      // TD: https://issues.triply.cc/issues/6180
      //
      pipe2.use(
        mw.loadRdf(pipe2.sources.dataset),
        mw.sparqlConstruct(eccbooks2edmQueryString, {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct(eccucfix2edmQueryString, {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct(finnabooks2edmQueryString, {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct(ksamsok2edmQueryString, {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct(nmvw2edmQueryString, {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct(schema2edmQueryString, {
          toGraph: edmGraph,
        }),
        mw.validateShacl([pipe2.sources.edmShapes], {
          graphs: [edmGraph],
          report: {
            destination: pipe2.destinations.dataset,
            graph: reportGraph,
          },
          terminateOn: false,
        }),
        mw.toRdf(pipe2.destinations.dataset)
      );

      await pipe2.run();
    } catch (error) {
      console.error(error);
    }
    return next();
  };
}
