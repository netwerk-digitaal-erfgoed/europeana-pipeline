import { Ratt, CliContext, Middleware } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import {
  prefixes,
  retrieveDatasetsQueryString,
  retrieveDatasetMetadataQueryString,
  eccbooks2edmQueryString,
  eccucfix2edmQueryString,
  finnabooks2edmQueryString,
  ksamsok2edmQueryString,
  nmvw2edmQueryString,
  schema2edmQueryString,
} from "./helpers/generics";

import { Parser } from "n3";
export declare type CompressionType = "gz" | undefined;

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const title = "?title";
// Misc

const datasetRegisterValue =
  "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry";
// sources
const reportGraph = prefixes.defaultGraph("violationReport");
const sources = {
  datasetCatalog: Ratt.Source.url(datasetRegisterValue, {
    request: {
      headers: {
        accept: "text/tab-separated-values",
        "content-type": "application/sparql-query",
      },
      body: retrieveDatasetsQueryString,
      method: "post",
    },
  }),
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

  // Inladen van de datasets die in de dataset catalogus van NDE beschikbaar zijn. Data die bijvoorbeeld wordt opgehaald is:
  // {
  //    datasetIri: <http://data.bibliotheken.nl/id/dataset/rise-centsprenten>,
  //    dataUrl: 'http://data.bibliotheken.nl/sparql',
  //    dataFormat: 'application/sparql-query',
  // }
  //
  // TD:  fromRDF https://issues.triply.cc/issues/6179

  pipe1.use(
    mw.fromCsv(pipe1.sources.datasetCatalog, { delimiter: "\t", quote: "`" })
  );
  pipe1.use(async (ctx, next) => {
    const parser = new Parser();
    const query = retrieveDatasetMetadataQueryString.replace(
      "?dataset",
      ctx.getString(datasetIri)
    );
    const response = await fetch(`${datasetRegisterValue}`, {
      headers: {
        accept: "text/turtle",
        "content-type": "application/sparql-query",
      },
      body: query,
      method: "POST",
    });
    const text = await response.text();
    ctx.store.addQuads(parser.parse(text));
    return next();
  });
  //

  // validatie van de metadata van de datasets
  pipe1.use(
    mw.validateShacl([pipe1.sources.dcatShapes, pipe1.sources.schemaShapes], {
      report: { destination: pipe1.destinations.report, graph: reportGraph },
      terminateOn: false,
    })
  );

  pipe1.use(subETL(cliContext));

  return pipe1;
}

function subETL(cliContext: CliContext): Middleware {
  return async (ctx, next) => {
    try {
      const url = ctx.getString(dataUrl).replace("<", "").replace(">", "");
      const graph = ctx.getString(datasetIri).replace("<", "").replace(">", "");
      const edmGraph =
        ctx.getString(datasetIri).replace("<", "").replace(">", "") + "edm";
      const pipe2 = new Ratt({
        defaultGraph: graph,
        cliContext: cliContext,
        prefixes: prefixes,
        sources: { ...sources, dataset: Ratt.Source.url(url) },
        destinations: {
          dataset: Ratt.Destination.TriplyDb.rdf(
            ctx.getString(title)
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
