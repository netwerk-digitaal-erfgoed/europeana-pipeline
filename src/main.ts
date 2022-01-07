import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { prefix } from "./helpers/ratt-helpers";
import { forEachStream } from "./helpers/etl-helpers";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";
import {streamToString} from "@triply/ratt/lib/utils/files";
import { Parser } from "n3";
import { IQueryResult } from "@comunica/actor-init-sparql/lib/ActorInitSparql-browser";
import { newEngine } from "@triply/actor-init-sparql-rdfjs";
import { ensure_query, ensure_service } from "./helpers/triplydb-helpers";
const md5 = require("md5");
import * as path from "path"
import parse from "csv-parse";
import Pumpify from "pumpify";
// Prefixes
const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);
const reportGraph = defaultGraph("violationReport");
const prefixes = {
  defaultGraph: defaultGraph,
  ...prefix,
};

export declare type CompressionType = "gz" | undefined;

const retrieveInstancesName = "retrieveInstances";
const retrieveInstances = `
PREFIX schema:  <http://schema.org/>
PREFIX sdo:  <https://schema.org/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX ksamsok: <http://kulturarvsdata.se/ksamsok#>
PREFIX bf:      <http://id.loc.gov/ontologies/bibframe/>
select ?uri WHERE {
  VALUES ?type {
    bf:Instance
    dcterms:PhysicalResource
    ksamsok:Entity
    schema:Book
    schema:Organization
    schema:Painting
    schema:Person
    schema:Photograph
    schema:Place
    schema:Sculpture
    schema:VisualArtwork
    sdo:Book
    sdo:Organization
    sdo:Painting
    sdo:Person
    sdo:Photograph
    sdo:Place
    sdo:Sculpture
    sdo:VisualArtwork
  }
  ?uri a ?type .
}`;

const retrieveDatasetsQueryString = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
select ?datasetIri ?dataUrl ?dataFormat where {
  {
    select ?datasetIri (max(?score) as ?maxScore) where {
      {
        ?datasetIri a dcat:Dataset .
        ?datasetIri dcat:distribution ?distribution .
        ?distribution dcat:accessURL ?url .
        ?distribution dct:format ?format.
        values(?format ?score){
            ("application/sparql-query" 1)
            ("application/trig" 2)
            ("application/n-quads" 3)
            ("application/turtle" 4)
            ("text/turtle" 5)
            ("application/n-triples" 6)
            ("application/rdf+xml" 7)
        }
      }
    } group by ?datasetIri
  }
  ?datasetIri dcat:distribution ?distribution .
  ?distribution dcat:accessURL ?dataUrl .
  ?distribution dct:format ?dataFormat.
  values(?dataFormat ?maxScore){
    ("application/sparql-query" 1)
    ("application/trig" 2)
    ("application/n-quads" 3)
    ("application/turtle" 4)
    ("text/turtle" 5)
    ("application/n-triples" 6)
    ("application/rdf+xml" 7)
  }
}`;

const retrieveDatasetMetadataQueryString = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
construct {
  ?s ?p ?o
} WHERE {
  graph ?graaf {
    ?dataset a dcat:Dataset .
    ?s ?p ?o
  }
}
`;

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const dataFormat = "?dataFormat";
const dataService = "?dataService";
const instanties = "?instanties";
const dataserviceType = "?type";
// Misc
const applicationSPARQLQuery = "application/sparql-query";
const triplyDBService = "default";
const contentLength = "content-length";
const datasetRegister =
  "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry";
// sources

const sources = {
  dcatShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_dcat.ttl"
  ),
  schemaShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_schema.ttl"
  ),
  datasetCatalog: Ratt.Source.url(datasetRegister, {
    request: {
      headers: {
        accept: "text/tab-separated-values",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `query=${encodeURIComponent(retrieveDatasetsQueryString)}`,
      method: "POST",
    },
  }),
};

const destinations = {
  report: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
    truncateGraphs: true,
    synchronizeServices: true,
  }),
};

export default async function (cliContext: CliContext): Promise<Ratt> {
  // RATT context
  const app = new Ratt({
    defaultGraph: defaultGraph,
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
  app.use(mw.fromCsv(app.sources.datasetCatalog, { delimiter: "\t" }));

  // TD issue: https://issues.triply.cc/issues/5616
  // Inladen van de metadata van de datasets die in de dataset catalogus van NDE beschikbaar zijn.
  app.use(
    addMwCallSiteToError(async function executeQuery(ctx, next) {
      const parser = new Parser();
      const query = retrieveDatasetMetadataQueryString.replace(
        "?dataset",
        ctx.getString(datasetIri)
      );
      const response = await fetch(`${datasetRegister}`, {
        headers: {
          accept: "application/trig",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: `query=${encodeURIComponent(query)}`,
        method: "POST",
      });
      ctx.store.addQuads(parser.parse(await response.text()));
      return next();
    })
  );

  // validatie van de metadata van de datasets
  app.use(
    mw.validateShacl([app.sources.dcatShapes, app.sources.schemaShapes], {
      report: { destination: app.destinations.report, graph: reportGraph },
      terminateOn: false,
    })
  );

  app.use(
    mw.when(dataUrl, [
      // Reset de store om leeg te beginnen voor het inhoudelijke gedeelte.
      mw.resetStore(),
      // Aanmaken van de SPARQL interface om de bevragingen over uit te voeren.
      mw.add({
        key: dataService,
        value: async (ctx) => {
          // Ophalen endpoint als deze al aangemaakt is.
          try {
            if (ctx.getString(dataFormat) === applicationSPARQLQuery) {
              ctx.record[dataserviceType] = "extern";
              return ctx.getString(dataUrl).replace("<", "").replace(">", "");
            }
          } catch (error: any) {
            console.warn(
              error.message,
              `External SPARQL endpoint from dataset ${ctx.record[datasetIri]} is not available or failed to return correct SPARQL`
            );
            return;
          }
          try {
            const head = await fetch(`${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`, {
              method: "HEAD",
            });
            const size = head.headers.get(contentLength);
            if (size && +size < 20000000) {
              // ToDo: set appropiate limiet.
              const parser = new Parser();
              const datasetStore = ctx.app.getNewStore();
              const response = await fetch(
                `${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`
              );
              if (response.body) {
                const rdfStream:any = response.body;
                let extension = path.extname(ctx.getString(dataUrl).replace("<", "").replace(">", ""));
                let compression: CompressionType
                if (extension === ".gz") {
                  compression = "gz";
                } else if (head.headers.get("Content-Encoding") === "application/gzip") {
                  compression = "gz";
                }
                datasetStore.addQuads(parser.parse(await streamToString(rdfStream,compression)));
                ctx.record[dataserviceType] = "RATT";
                return datasetStore;
              }
            }
          } catch (error: any) {
            console.warn(
              error.message,
              `RATT SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not be created`
            );
          }
          const account = await ctx.app.triplyDb.getAccount();
          const dataset = await account.ensureDataset(
            md5(ctx.getString(datasetIri))
          );
          try {
            // inladen van de data als deze nog niet bestaat.
            // Altijd inladen of alleen als er nog niets staat?
            if((await dataset.getInfo()).graphCount === 0){
              await dataset.importFromUrls(ctx.getString(dataUrl).replace("<", "").replace(">", ""));
            }
            // Aanmaken endpoint als deze nog niet bestaat.
            await ensure_service(dataset, triplyDBService);
            ctx.record[dataserviceType] = "TriplyDB";
            return dataset;
          } catch (error) {
            console.warn(
              `TriplyDB SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not created, see ${(await dataset.getInfo()).displayName} for more info`
            );
          }
        },
      }),
    ])
  );

  app.use(
    mw.when(
      (ctx) =>
        ctx.isNotEmpty(dataserviceType) &&
        ctx.getString(dataserviceType) === "TriplyDB",
      // Ophalen instanties
      mw.add({
        key: instanties,
        value: async (ctx) => {
          // Part 4: Store a SPARQL query.
          const account = await ctx.app.triplyDb.getAccount();
          const dataset = ctx.get(dataService);
          //TD <https://issues.triply.cc/issues/5782>
          const query = await ensure_query(account, retrieveInstancesName, {
            queryString: retrieveInstances,
            dataset: dataset,
          });
          // Async iterator
          return query.results().bindings();
        },
      }),
      forEachStream(instanties,
        (ctx,next)=>{
          console.log("test")
          return next()
        }
      )
    ),
    mw.when(
      (ctx) =>
        ctx.isNotEmpty(dataserviceType) &&
        ctx.getString(dataserviceType) === "RATT",
      // Ophalen instanties
      mw.add({
        key: instanties,
        value: async (ctx) => {
          let queryResult: IQueryResult;
          const engine = newEngine()
          try {
            queryResult = await engine.query(retrieveInstances, {
              sources: [ctx.get(dataService)],
            });
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("Parse error")) {
              e.message = "Failed to parse query: " + e.message;
            }
            throw e;
          }

          return await engine.resultToString(queryResult, "text/tab-separated-values");
        },
      }),
      forEachStream(instanties,
        mw.logRecord()
      )
    ),
    mw.when(
      (ctx) =>
        ctx.isNotEmpty(dataserviceType) &&
        ctx.getString(dataserviceType) === "extern",
      // Ophalen instanties
      mw.add({
        key: instanties,
        value: async (ctx) => {
          const response = await fetch(`${ctx.get(dataService)}`, {
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              accept: "text/tab-separated-values",
            },
            body: `query=${encodeURIComponent(retrieveInstances)}`,
            method: "POST",
          });
          if (response.body) {
            return new Pumpify.obj(response.body as any, parse());
          }
        },
      }),
      forEachStream(instanties,
        mw.logRecord()
      )
    )
  );

  return app;
}
