import { Parser } from "n3";
import * as fs from "fs-extra";
import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { prefix } from "./helpers/ratt-helpers";
import { ensure_service, ensure_query } from "./helpers/triplydb-helpers";

const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);

// Adjusted to the syntax used in the [SPARQL TSV header format](https://www.w3.org/TR/sparql11-results-csv-tsv/#tsv-example).
const query = "?query";
const dataUrl = "?dataUrl";
const size = "?size";
const sparqlUrl = "?sparqlUrl";

export default async function (cliContext: CliContext): Promise<Ratt> {
  // RATT context
  const sourceDatasetName = process.env.SOURCE_DATASET;
  const destinationDatasetName = process.env.DESTINATION_DATASET;
  const localQueryLocation = process.env.LOCAL_QUERY;
  if (!sourceDatasetName)
    throw new Error("Expected environment variable SOURCE_DATASET to be set");
  if (!destinationDatasetName)
    throw new Error(
      "Expected environment variable DESTINATION_DATASET to be set"
    );

  const sparqlQuery = `
prefix dcat: <http://www.w3.org/ns/dcat#>
prefix dct: <http://purl.org/dc/terms/>
select ?size ?dataUrl ?sparqlUrl ?query {
  bind(<${sourceDatasetName}> as ?dataset)
  ?dataset a dcat:Dataset .
  ?dataset dcat:distribution ?distribution .
  ?distribution dct:format ?format .
  ?distribution dcat:accessURL ?dataUrl .
  filter(?format in ("application/n-quads", "application/n-triples", "application/trig", "application/turtle", "text/n3", "text/turtle"))
  optional {
    ?distribution dcat:byteSize ?size0.
    bind(xsd:integer(?size0) as ?size)
  }
  optional {
    # ?service
    #   a dcat:DataService;
    #   dcat:servesDataset ?dataset;
    #   dcat:endpointURL ?endpoint.
    # # Optional: also specify the result of a specific query (probably not needed).
    # ?result
    #   a dcat:Distribution;
    #   dcat:accessService ?service;
    #   dcat:mediaType 'application/sparql-results+json'.

    # OOPS: Wrong data model.
    ?dataset dcat:distribution ?sparqlDistribution .
    ?sparqlDistribution dcat:accessURL ?sparqlUrl .
    ?sparqlDistribution dct:format "application/sparql-query" .
  }
} limit 1`;

  const datasetRegisterUrl =
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry";

  const pipe = new Ratt({
    defaultGraph: defaultGraph,
    cliContext: cliContext,
    prefixes: prefix,
    sources: {
      dataset: Ratt.Source.url(datasetRegisterUrl, {
        request: {
          body: sparqlQuery,
          headers: {
            accept: "text/tab-separated-values",
            "content-type": "application/sparql-query",
          },
          method: "post",
        },
      }),
    },
    destinations: {
      dataset: Ratt.Destination.file(`data/rdf/${destinationDatasetName}.ttl`),
    },
  });

  pipe.use(mw.fromTsv(pipe.sources.dataset));
  pipe.use(
    mw.change({
      key: sparqlUrl,
      type: "string",
      change: val => {
        return ""
        return val.replace("<", "").replace(">", "")
      },
    }),
    /*
    // US: fromSparqlJson, fromSparqlTsv, fromSparqlCsv(, fromSparqlXml)
    sources: {
      dataset: Ratt.Source.url(datasetRegisterUrl, {
        request: {
          body: sparqlQuery,
          headers: {
            accept: "text/tab-separated-values",
            "content-type": "application/sparql-query",
          },
          method: "post",
        },
      }),
    },
    */
    mw.change({
      key: dataUrl,
      type: "string",
      change: val => val.replace("<", "").replace(">", ""),
    }),
    // If the dataset metadata does not yet include a query string,
    // we supply a query string manually.
    mw.when(
      ctx => ctx.isEmpty(query),
      mw.add({
        key: query,
        value: _ctx => {
          if (!localQueryLocation) {
            throw new Error("No query available")
          }
          return fs.readFileSync(localQueryLocation, "utf8")
        },
      })
    )
  );
  // ASSUMPTION: The current RATT record has a valid value for the "query" field.

  // VARIANT 1 of 3: Use an external SPARQL endpoint.
  pipe.use(
    mw.when(
      (ctx) => ctx.isNotEmpty(sparqlUrl),
      async (ctx, next) => {
        let text;
        try {
          const parser = new Parser();
          const response = await fetch(ctx.getString(sparqlUrl), {
            headers: {
              accept: "application/trig",
              "content-type": "application/sparql-query",
            },
            method: "post",
            body: ctx.getString(query),
          });
          text = await response.text();
          // TODO: Stream to file.
          ctx.store.addQuads(parser.parse(text));
        } catch (error) {
          console.log(error, text);
        }
        return next();
      }
    )
  );

  // VARIANT 2 of 3: Use the in-memory Comunica implementation for relatively small datasets.
  pipe.use(
    mw.when(
      (ctx) =>
        ctx.isEmpty(sparqlUrl) &&
        ctx.isNumber(size) &&
        // OOPS: magic number, magic unit (inherent in the data)
        ctx.getNumber(size) < 20_000_000,
      // CANNOT: From custom middleware to mw.fromRdf().
      // US: Dynamic sources in RATT
      // Look at <https://issues.triply.cc/issues/5616>, <https://issues.triply.cc/issues/6184>
      async (ctx, next) => {
        const parser = new Parser();
        const response = await fetch(ctx.getString(dataUrl));
        const text = await response.text();
        ctx.store.addQuads(parser.parse(text));
        return next();
      },
      mw.sparqlConstruct((ctx) => ctx.getString(query), {
        toGraph: defaultGraph("edm"),
      })
    )
  );

  // VARIANT 3 of 3: Use TriplyDB for larger datasets.
  pipe.use(
    mw.when(
      (ctx) =>
        ctx.isEmpty(sparqlUrl) &&
        // OOPS: repeating a magic number
        (!ctx.isNumber(size) || +ctx.getNumber(size) > 20_000_000),
      async (ctx, next) => {
        const acc = await pipe.triplyDb.getAccount();
        var dataSet = await acc.ensureDataset(destinationDatasetName);
        // TDBJS/OOPS: deleteGraph, but clean("graphs")
        dataSet = await dataSet.clear("graphs");
        await dataSet.importFromUrls([ctx.getString(dataUrl)]);
        await ensure_service(dataSet, "default");
        // US: RATT support for using API variables with a SPARQL endpoint in TDB (without saved query)?
        // US: Can pagination be implemented for SPARQL endpoints in TDB (without saved query)?
        await ensure_query(acc, "default", {
          dataset: dataSet,
          queryString: ctx.getString(query),
          output: "response",
        });
        return next();
      },
      // TODO: Stream to file.
      mw.loadRdf(Ratt.Source.TriplyDb.query("default"), {
        defaultGraph: defaultGraph("edm"),
      })
    )
  );

  pipe.use(mw.toRdf(pipe.destinations.dataset));

  return pipe;
}
