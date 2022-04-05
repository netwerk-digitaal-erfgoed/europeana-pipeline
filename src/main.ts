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

// Comunica can only handle triples up to a max size, the best estimate we have is the bytesize of the distribution.
// We check if the distribution is smaller then a treshhold and if so we go with the comunica route otherwise we use the triplyDb route.
const maxComunicaSize = 20_000_000;

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
  ?distribution dcat:accessURL ?dataUrl0 .
  bind(str(?dataUrl0) as ?dataUrl)
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
    ?sparqlDistribution dcat:accessURL ?sparqlUrl0 .
    bind(str(?sparqlUrl0) as ?sparqlUrl)
    ?sparqlDistribution dct:format "application/sparql-query" .
  }
} limit 1`;

  const datasetRegisterUrl =
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry";
  const dataDir = cliContext.dataDir || "./data";
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
      shaclShapes: Ratt.Source.file("static/shapes/shacl_edm.ttl"),
    },
    destinations: {
      dataset: Ratt.Destination.file(
        `${dataDir}/rdf/${destinationDatasetName}.ttl`
      ),
    },
  });

  pipe.use(mw.fromTsv(pipe.sources.dataset));
  pipe.use(
    // If the dataset metadata does not yet include a query string,
    // we supply a query string manually.
    mw.when(
      (ctx) => ctx.isEmpty(query),
      mw.add({
        key: query,
        value: (_ctx) => {
          if (!localQueryLocation) {
            throw new Error(
              "There is no query available. The metadata does not contain a SPARQL query and there is no local query set."
            );
          }
          return fs.readFileSync(localQueryLocation, "utf8");
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
        const parser = new Parser();
        const url = ctx.getString(sparqlUrl);
        const sparqlQuery = ctx.getString(query);
        let response: Response;
        try {
          response = await fetch(url, {
            headers: {
              accept: "application/trig, text/turtle",
              "content-type": "application/sparql-query",
            },
            method: "post",
            body: sparqlQuery,
          });
        } catch (error) {
          if (!(error instanceof Error))
            throw new Error(
              "We are throwing an incorrect error object as an error."
            );
          throw new Error(
            `Unable to recieve data from sparql url: ${url}.\n ${error.message}.\n  The sparql query returned incorrect results: ${sparqlQuery}`
          );
        }
        try {
          text = await response.text();
          ctx.store.addQuads(parser.parse(text));
        } catch (error) {
          if (!(error instanceof Error))
            throw new Error(
              "We are throwing an incorrect error object as an error."
            );
          throw new Error(
            `Could not parse the linked data from the data url: ${url}.\n ${error.message}.\n The sparql query returned unparsable results: ${sparqlQuery}`
          );
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
        ctx.getNumber(size) < maxComunicaSize,
      [
        async (ctx, next) => {
          const parser = new Parser();
          const url = ctx.getString(dataUrl);
          let response: Response;
          try {
            response = await fetch(url);
          } catch (error) {
            if (!(error instanceof Error))
              throw new Error(
                "We are throwing an incorrect error object as an error."
              );
            throw new Error(
              `Unable to recieve data from dataUrl: ${url}.\n ${error.message}`
            );
          }
          try {
            ctx.store.addQuads(parser.parse(await response.text()));
          } catch (error) {
            if (!(error instanceof Error))
              throw new Error(
                "We are throwing an incorrect error object as an error."
              );
            throw new Error(
              `Could not parse the linked data from the data url: ${url}.\n ${error.message}`
            );
          }
          return next();
        },
        mw.sparqlConstruct((ctx) => ctx.getString(query), {
          toGraph: defaultGraph("edm"),
        }),
      ]
    )
  );

  // VARIANT 3 of 3: Use TriplyDB for larger datasets.
  pipe.use(
    mw.when(
      (ctx) =>
        ctx.isEmpty(sparqlUrl) &&
        (!ctx.isNumber(size) || +ctx.getNumber(size) > maxComunicaSize),
      [
        async (ctx, next) => {
          const acc = await pipe.triplyDb.getAccount();
          var dataSet = await acc.ensureDataset(destinationDatasetName);
          dataSet = await dataSet.clear("graphs");
          const url = ctx.getString(dataUrl);
          try {
            await dataSet.importFromUrls([url]);
          } catch (error) {
            if (!(error instanceof Error))
              throw new Error(
                "We are throwing an incorrect error object as an error."
              );
            throw new Error(
              `Could not parse the linked data from the data url: ${url}.\n ${error.message}`
            );
          }
          await ensure_service(dataSet, "default");
          await ensure_query(acc, "default", {
            dataset: dataSet,
            queryString: ctx.getString(query),
            output: "response",
          });

          return next();
        },
        mw.loadRdf(Ratt.Source.TriplyDb.query("default"), {
          defaultGraph: defaultGraph("edm"),
        }),
      ]
    )
  );

  pipe.use(
    mw.validateShacl(pipe.sources.shaclShapes, {
      graphs: [defaultGraph("edm")],
      terminateOn: "Never",
      report: { destination: pipe.destinations.dataset },
    })
  );

  pipe.use(mw.toRdf(pipe.destinations.dataset));

  return pipe;
}
