import { Ratt, CliContext, Context, Middleware } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import {
  prefixes,
  retrieveDatasetsQueryString,
  retrieveDatasetMetadataQueryString,
  retrieveInstances,
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
import { IQueryResult } from "@comunica/actor-init-sparql/lib/ActorInitSparql-browser";
import { newEngine } from "@triply/actor-init-sparql-rdfjs";
const md5 = require("md5");
import * as path from "path";
import { sdo } from "./helpers/ratt-helpers";
import { streamToString } from "@triply/ratt/lib/utils/files";

import { Parser } from "n3";
export declare type CompressionType = "gz" | undefined;

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const dataService = "?dataService";
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

  pipe1.use(
    // Controleren of we geen lege dataset hebben.
    mw.add({
      key: dataService,
      value: async (ctx) => {
        try {
          const url = ctx.getString(dataUrl).replace("<", "").replace(">", "");
          const head = await fetch(`${url}`, { method: "HEAD" });
          // const size = head.headers.get(contentLength);
          const parser = new Parser();
          const response = await fetch(`${url}`);
          if (response.body) {
            const rdfStream: any = response.body;
            let extension = path.extname(url);
            let compression: CompressionType;
            if (extension === ".gz") {
              compression = "gz";
            } else if (
              head.headers.get("Content-Encoding") === "application/gzip"
            ) {
              compression = "gz";
            }
            const datasetStore = ctx.app.getNewStore();
            datasetStore.addQuads(
              parser.parse(await streamToString(rdfStream, compression))
            );
            if (datasetStore.size === 0) return false;
            ctx.store = datasetStore;
            return true;
          }
        } catch (error: any) {
          console.warn(
            error.message,
            `RATT SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not be created`
          );
        }
        return false;
      },
    }),
    mw.when((ctx) => ctx.getBoolean(dataService), subETL(cliContext))
  );

  return pipe1;
}

function subETL(cliContext: CliContext): Middleware {
  return async (ctx, next) => {
    const url = ctx.getString(dataUrl).replace("<", "").replace(">", "");
    const graph = ctx.getString(datasetIri).replace("<", "").replace(">", "");
    const edmGraph =
      ctx.getString(datasetIri).replace("<", "").replace(">", "") + "edm";
    const mainStore = ctx.store;
    const pipe2 = new Ratt({
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
            .substring(0, 35),
          {
            overwrite: true,
          }
        ),
      },
    });

    // TD: https://issues.triply.cc/issues/6180
    //

    let queryResult: IQueryResult;
    const engine = newEngine();
    try {
      queryResult = await engine.query(retrieveInstances, {
        sources: [mainStore],
      });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Parse error")) {
        e.message = "Failed to parse query: " + e.message;
      }
      throw e;
    }
    if (queryResult.type === "bindings") {
      pipe2.use(mw.fromJson(await queryResult.bindings()));
    }
    pipe2.use(
      mw.when(
        (ctx) => {
          switch ((ctx.record as any).get("?type")) {
            case pipe2.prefix.sdo("Book"):
            case pipe2.prefix.sdo("Organization"):
            case pipe2.prefix.sdo("Painting"):
            case pipe2.prefix.sdo("Person"):
            case pipe2.prefix.sdo("Photograph"):
            case pipe2.prefix.sdo("Place"):
            case pipe2.prefix.sdo("Sculpture"):
            case pipe2.prefix.sdo("VisualArtwork"):
            case pipe2.prefix.schema("Book"):
            case pipe2.prefix.schema("Organization"):
            case pipe2.prefix.schema("Painting"):
            case pipe2.prefix.schema("Person"):
            case pipe2.prefix.schema("Photograph"):
            case pipe2.prefix.schema("Place"):
            case pipe2.prefix.schema("Sculpture"):
            case pipe2.prefix.schema("VisualArtwork"):
            case pipe2.prefix.dcterms("PhysicalResource"):
            case pipe2.prefix.ksamsok("Entity"):
            case pipe2.prefix.bf("Instance"):
              return true;
            default:
              return false;
          }
        },
        mw.loadRdf(pipe2.sources.dataset),
        mw.add({
          key: "instance",
          value: (ctx) => {
            return "<" + (ctx.record as any).get("?uri").value + ">";
          },
        }),
        mw.add({
          key: eccbooks2edm,
          value: (ctx: Context) => {
            return eccbooks2edmQueryString.replace(
              /\?id/g,
              ctx.getString("instance")
            );
          },
        }),
        mw.add({
          key: eccucfix2edm,
          value: (ctx: Context) => {
            return eccucfix2edmQueryString.replace(
              /\?id/g,
              ctx.getString("instance")
            );
          },
        }),
        mw.add({
          key: finnabooks2edm,
          value: (ctx: Context) => {
            return finnabooks2edmQueryString.replace(
              /\?id/g,
              ctx.getString("instance")
            );
          },
        }),
        mw.add({
          key: ksamsok2edm,
          value: (ctx: Context) => {
            return ksamsok2edmQueryString.replace(
              /\?id/g,
              ctx.getString("instance")
            );
          },
        }),
        mw.add({
          key: nmvw2edm,
          value: (ctx: Context) => {
            return nmvw2edmQueryString.replace(
              /\?id/g,
              ctx.getString("instance")
            );
          },
        }),
        mw.add({
          key: schema2edm,
          value: (ctx: Context) => {
            return schema2edmQueryString.replace(
              /\?id/g,
              ctx.getString("instance")
            );
          },
        }),
        mw.sparqlConstruct((ctx) => ctx.getString(eccbooks2edm), {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct((ctx) => ctx.getString(eccucfix2edm), {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct((ctx) => ctx.getString(finnabooks2edm), {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct((ctx) => ctx.getString(ksamsok2edm), {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct((ctx) => ctx.getString(nmvw2edm), {
          toGraph: edmGraph,
        }),
        mw.sparqlConstruct((ctx) => ctx.getString(schema2edm), {
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
      )
    );

    await pipe2.run();

    return next();
  };
}
