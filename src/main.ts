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
const size = "?size";
const dataFormat = "?dataFormat";
const applicationSPARQLQuery = "application/sparql-query";
const contentLength = "content-length";
const ratt = "RATT";
const rattS = "RATT_succeeded";
const error_ratt = "error_RATT";
const extern = "extern";
const extS = "extern_succeeded";
const error_extern = "error_extern";
const triplyDb = "triplyDb";
const triplyDBS = "triplyDb_succeeded";
const error_triplyDB = "error_triplyDB";
const ds = "ds"
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
  dataset: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
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
  pipe1.use(endpoint());
  pipe1.use(mw.when((ctx) => ctx.getBoolean(extern), subETLSPARQL(cliContext)));
  pipe1.use(
    mw.when(
      (ctx) => ctx.getBoolean(ratt) && !ctx.get(extS),
      subETLComunica(cliContext)
    )
  );
  pipe1.use(
    mw.when(
      (ctx) => ctx.getBoolean(triplyDb) && !ctx.get(rattS),
      subETLTriplyDB(cliContext)
    )
  );
  pipe1.use(async (ctx, next) => {
    const externError = ctx.get(error_extern)?.message
    const externElem = ctx.getBoolean(extern) ? `extern Endpoint: ${ctx.getString(sparqlUrl).replace("<", "").replace(">", "")} \nExtern ophalen mogelijk: ${ctx.get(extern)} \n${externError ? externError+"\n" : ''}` : ''
    const localError = ctx.get(error_ratt)?.message
    const localElem = ctx.getBoolean(ratt) ? `Ratt geslaagd: ${ctx.get(rattS)} \n${localError ? localError+"\n" : ''}` : ''
    const triplyError = ctx.get(error_triplyDB)?.message
    const triplyDBElem = (!ctx.get(rattS) && ctx.getBoolean(triplyDb)) ? `TriplyDb geslaagd: ${ctx.get(triplyDBS)} \n${triplyError ? triplyError+"\n" : ''}` : ''
    let dsInfo = ''
    try {
      const acc = await ctx.app.triplyDb.getAccount();
      const dataSet = await acc.getDataset(ctx.getString(ds));
      let graphStr = ''
      for await( const graph of dataSet.getGraphs()){
        const graphInfo = await graph.getInfo()
        graphStr += ` - ${graphInfo.graphName}: ${graphInfo.numberOfStatements}\n`
      }
      for await (const service of dataSet.getServices()){
        await service.delete()
      }
      dsInfo = `${ctx.getString(ds)}:\n${graphStr}`
    } catch(e){
      // No dataset is created and thus no data is available.
    }
    const showcase = `
title: ${ctx.getString(title)}
datasetIri: ${ctx.getString(datasetIri).replace("<", "").replace(">", "")}
grootte: ${ctx.getString(size)}
data Locatie: ${ctx.getString(dataUrl).replace("<", "").replace(">", "")}
${externElem}${localElem}${triplyDBElem}${dsInfo}`

    console.log(showcase)
    return next();
  });
  pipe1.use(mw.toRdf(pipe1.destinations.dataset));
  return pipe1;
}

function endpoint(): Middleware {
  return async (ctx, next) => {
    ctx.record[extern] = false;
    ctx.record[ratt] = false;
    ctx.record[triplyDb] = true;

    // Ophalen endpoint als deze al aangemaakt is.
    if (ctx.getString(dataFormat) === applicationSPARQLQuery) {
      ctx.record[extern] = true;
    }
    try {
      const url = ctx.getString(dataUrl).replace("<", "").replace(">", "");
      const head = await fetch(url, { method: "HEAD" });
      const sizeContent = head.headers.get(contentLength);
      ctx.record["?size"] = sizeContent || ctx.record["?size"]
      if (sizeContent && +sizeContent < 1500000) {
        ctx.record[ratt] = true;
        return next();
      }
      if (sizeContent && +sizeContent < 20000000 && !url.endsWith("gz")) {
        ctx.record[ratt] = true;
        return next();
      }
    } catch (error: any) {
      console.warn(
        error.message,
        `RATT SPARQL endpoint for dataset ${ctx.record[datasetIri]} could not be created`
      );
    }
    return next();
  };
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
          log: false,
        }),
        mw.toRdf(pipe2.destinations.dataset)
      );

      await pipe2.run();
      ctx.record[extS] = true;
      ctx.record[ds] = dsName
    } catch (error) {
      ctx.record[extS] = false;
      ctx.record[error_extern] = error;
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
      const dsName = ctx
        .getString(title)
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
        .substring(0, 35); // Create a datasetName that is understandable.

      const pipe3 = new Ratt({
        defaultGraph: graph,
        cliContext: cliContext,
        prefixes: prefixes,
        sources: { ...sources, dataset: Ratt.Source.url(url) },
        destinations: {
          dataset: Ratt.Destination.TriplyDb.rdf(dsName, {
            overwrite: true,
          }),
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
          log: false,
        }),
        mw.toRdf(pipe3.destinations.dataset)
      );

      await pipe3.run();
      ctx.record[rattS] = true;
      ctx.record[ds] = dsName
    } catch (error) {
      ctx.record[rattS] = false;
      ctx.record[error_ratt] = error;
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
        const dataSet = await acc.ensureDataset(dsName);
        await dataSet.importFromUrls(url);
        if (+ctx.getString(size) > 200000000) return;
        await ensure_service(dataSet, "default");
        await ensure_query(acc, eccbooks2edm, {
          dataset: dataSet,
          queryString: eccbooks2edmQueryString,
        });
        await ensure_query(acc, eccucfix2edm, {
          dataset: dataSet,
          queryString: eccucfix2edmQueryString,
        });
        await ensure_query(acc, finnabooks2edm, {
          dataset: dataSet,
          queryString: finnabooks2edmQueryString,
        });
        await ensure_query(acc, ksamsok2edm, {
          dataset: dataSet,
          queryString: ksamsok2edmQueryString,
        });
        await ensure_query(acc, nmvw2edm, {
          dataset: dataSet,
          queryString: nmvw2edmQueryString,
        });
        await ensure_query(acc, schema2edm, {
          dataset: dataSet,
          queryString: schema2edmQueryString,
        });
      });
      if (+ctx.getString(size) > 200000000) {
        ctx.record[triplyDBS] = false;
        ctx.record[error_triplyDB] = "Too large to run, due to memory";
        return next();
      }
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
          log: false,
        }),
        mw.toRdf(pipe4.destinations.dataset)
      );

      await pipe4.run();
      ctx.record[triplyDBS] = true;
      ctx.record[ds] = dsName
    } catch (error) {
      ctx.record[triplyDBS] = false;
      ctx.record[error_triplyDB] = error;
    }
    return next();
  };
}
