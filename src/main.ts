import { Ratt, CliContext, Middleware } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
const md5 = require("md5");
import {
  prefixes,
  retrieveDatasetsQueryString,
  retrieveDatasetMetadataQueryString,
  eccbooks2edm,
  eccbooks2edmQueryString,
  eccucfix2edm,
  eccucfix2edmQueryString,
  finnabooks2edm,
  finnabooks2edmQueryString,
  ksamsok2edm,
  ksamsok2edmQueryString,
  nmvw2edm,
  nmvw2edmQueryString,
  schema2edm,
  schema2edmQueryString,
} from "./helpers/generics";
import { ensure_service, ensure_query } from "./helpers/triplydb-helpers";

import { Parser } from "n3";
export declare type CompressionType = "gz" | undefined;

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const sparqlUrl = "?sparqlUrl";
const title = "?title";
const dataserviceType = "?type";
const dataFormat = "?dataFormat";
const applicationSPARQLQuery = "application/sparql-query";
const contentLength = "content-length";

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
  pipe1.use(endpoint());
  pipe1.use(
    mw.when(
      (ctx) => ctx.getString(dataserviceType) === "extern",
      subETLSPARQL(cliContext)
    )
  );
  pipe1.use(
    mw.when(
      (ctx) => ctx.getString(dataserviceType) === "RATT",
      subETLComunica(cliContext)
    )
  );
  pipe1.use(
    mw.when(
      (ctx) => ctx.getString(dataserviceType) === "TriplyDB",
      subETLTriplyDB(cliContext)
    )
  );

  return pipe1;
}


function subETLSPARQL(cliContext: CliContext): Middleware {
  return async (ctx, next) => {
    try {
      const url = ctx.getString(sparqlUrl).replace("<", "").replace(">", "");
      const graph = ctx.getString(datasetIri).replace("<", "").replace(">", "");
      const edmGraph =
        ctx.getString(datasetIri).replace("<", "").replace(">", "") + "edm";
      const dsName = ctx
        .getString(title)
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
        .substring(0, 35); // Create a datasetName that is understandable.

      const pipe2 = new Ratt({
        defaultGraph: graph,
        cliContext: cliContext,
        prefixes: prefixes,
        sources: { ...sources },
        destinations: {
          dataset: Ratt.Destination.TriplyDb.rdf(dsName, {
            overwrite: true,
          }),
        },
      });
      // TD: https://issues.triply.cc/issues/6180
      //
      mw.loadRdf([
        Ratt.Source.url(url, {
          request: {
            headers: {
              accept: "text/tab-separated-values",
              "content-type": "application/sparql-query",
            },
            body: eccbooks2edmQueryString,
            method: "post",
          },
        }),
        Ratt.Source.url(url, {
          request: {
            headers: {
              accept: "text/tab-separated-values",
              "content-type": "application/sparql-query",
            },
            body: eccucfix2edmQueryString,
            method: "post",
          },
        }),
        Ratt.Source.url(url, {
          request: {
            headers: {
              accept: "text/tab-separated-values",
              "content-type": "application/sparql-query",
            },
            body: finnabooks2edmQueryString,
            method: "post",
          },
        }),

        Ratt.Source.url(url, {
          request: {
            headers: {
              accept: "text/tab-separated-values",
              "content-type": "application/sparql-query",
            },
            body: ksamsok2edmQueryString,
            method: "post",
          },
        }),
        Ratt.Source.url(url, {
          request: {
            headers: {
              accept: "text/tab-separated-values",
              "content-type": "application/sparql-query",
            },
            body: nmvw2edmQueryString,
            method: "post",
          },
        }),
        Ratt.Source.url(url, {
          request: {
            headers: {
              accept: "text/tab-separated-values",
              "content-type": "application/sparql-query",
            },
            body: schema2edmQueryString,
            method: "post",
          },
        }),
      ]);
      pipe2.use(
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
      try {
        const head = await fetch(
          `${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`,
          {
            method: "HEAD",
          }
        );
        const size = head.headers.get(contentLength);
        if (size && +size < 20000000) {
          ctx.record[dataserviceType] = "RATT";
          return next();
        }
      } catch (error: any) {
        console.warn(
          error.message,
          `RATT SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not be created`
        );
      }
      ctx.record[dataserviceType] = "TriplyDB";
    }
    return next();
  };
}


function subETLComunica(cliContext: CliContext): Middleware {
  return async (ctx, next) => {
    try {
      const url = ctx.getString(dataUrl).replace("<", "").replace(">", "");
      const graph = ctx.getString(datasetIri).replace("<", "").replace(">", "");
      const edmGraph =
        ctx.getString(datasetIri).replace("<", "").replace(">", "") + "edm";
      const pipe3 = new Ratt({
        defaultGraph: graph,
        cliContext: cliContext,
        prefixes: prefixes,
        sources: { ...sources, dataset: Ratt.Source.url(url) },
        destinations: {
          dataset: Ratt.Destination.TriplyDb.rdf(
            ctx
              .getString(title)
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
      pipe3.use(
        mw.loadRdf(pipe3.sources.dataset),
        mw.sparqlConstruct(
          [
            eccbooks2edmQueryString,
            eccucfix2edmQueryString,
            finnabooks2edmQueryString,
            ksamsok2edmQueryString,
            nmvw2edmQueryString,
            schema2edmQueryString,
          ],
          {
            toGraph: edmGraph,
          }
        ),
        mw.validateShacl([pipe3.sources.edmShapes], {
          graphs: [edmGraph],
          report: {
            destination: pipe3.destinations.dataset,
            graph: reportGraph,
          },
          terminateOn: false,
        }),
        mw.toRdf(pipe3.destinations.dataset)
      );

      await pipe3.run();
    } catch (error) {
      console.error(error);
      ctx.record[dataserviceType] = "TriplyDB";
    }
    return next();
  };
}

function subETLTriplyDB(cliContext: CliContext): Middleware {
  return async (ctx, next) => {
    try {
      const url = ctx.getString(dataUrl).replace("<", "").replace(">", "");
      const graph = ctx.getString(datasetIri).replace("<", "").replace(">", "");
      const edmGraph =
        ctx.getString(datasetIri).replace("<", "").replace(">", "") + "edm";
      const dsName = ctx
        .getString(title)
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
        .substring(0, 35); // Create a datasetName that is understandable.

      const pipe4 = new Ratt({
        defaultGraph: graph,
        cliContext: cliContext,
        prefixes: prefixes,
        sources: { ...sources },
        destinations: {
          dataset: Ratt.Destination.TriplyDb.rdf(dsName, {
            overwrite: true,
          }),
        },
      });
      // TD: https://issues.triply.cc/issues/6180
      pipe4.before(async () => {
        const acc = await pipe4.triplyDb.getAccount();
        const ds = await acc.ensureDataset(dsName);
        await ds.importFromUrls(url);
        await ensure_service(ds, "default");
        await ensure_query(acc, eccbooks2edm, {
          dataset: ds,
          queryString: eccbooks2edmQueryString,
        });
        await ensure_query(acc, eccucfix2edm, {
          dataset: ds,
          queryString: eccucfix2edmQueryString,
        });
        await ensure_query(acc, finnabooks2edm, {
          dataset: ds,
          queryString: finnabooks2edmQueryString,
        });
        await ensure_query(acc, ksamsok2edm, {
          dataset: ds,
          queryString: ksamsok2edmQueryString,
        });
        await ensure_query(acc, nmvw2edm, {
          dataset: ds,
          queryString: nmvw2edmQueryString,
        });
        await ensure_query(acc, schema2edm, {
          dataset: ds,
          queryString: schema2edmQueryString,
        });
      });

      pipe4.use(
        mw.loadRdf(
          [
            Ratt.Source.TriplyDb.query(eccbooks2edm),
            Ratt.Source.TriplyDb.query(eccucfix2edm),
            Ratt.Source.TriplyDb.query(finnabooks2edm),
            Ratt.Source.TriplyDb.query(ksamsok2edm),
            Ratt.Source.TriplyDb.query(nmvw2edm),
            Ratt.Source.TriplyDb.query(schema2edm),
          ],
          {
            defaultGraph: edmGraph,
          }
        ),
        mw.validateShacl([pipe4.sources.edmShapes], {
          graphs: [edmGraph],
          report: {
            destination: pipe4.destinations.dataset,
            graph: reportGraph,
          },
          terminateOn: false,
        }),
        mw.toRdf(pipe4.destinations.dataset)
      );

      await pipe4.run();
    } catch (error) {
      console.error(error);
    }
    return next();
  };
}

// Record

function endpoint(): Middleware {
  return async (ctx, next) => {
    // Ophalen endpoint als deze al aangemaakt is.
    try {
      if (ctx.getString(dataFormat) === applicationSPARQLQuery) {
        ctx.record[dataserviceType] = "extern";
        return next();
      }
    } catch (error: any) {
      console.warn(
        error.message,
        `External SPARQL endpoint from dataset ${ctx.record[datasetIri]} is not available or failed to return correct SPARQL`
      );
      return;
    }
    try {
      const head = await fetch(
        `${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`,
        {
          method: "HEAD",
        }
      );
      const size = head.headers.get(contentLength);
      if (size && +size < 20000000) {
        ctx.record[dataserviceType] = "RATT";
        return next();
      }
    } catch (error: any) {
      console.warn(
        error.message,
        `RATT SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not be created`
      );
    }
    ctx.record[dataserviceType] = "TriplyDB";
    return next();
  };
}
