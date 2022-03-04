import { Parser } from "n3";
import * as fs from "fs-extra";
import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { prefix } from "./helpers/ratt-helpers";
import { ensure_service, ensure_query } from "./helpers/triplydb-helpers";

const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);

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
select ?size ?dataUrl ?sparqlUrl ?query WHERE {
    bind(<${sourceDatasetName}> as ?dataset)
    ?dataset a dcat:Dataset .
    ?dataset dcat:distribution ?distribution .
    ?distribution dct:format ?format .
    ?distribution dcat:accessURL ?dataUrl .
    FILTER( ?format="application/n-quads" || ?format="application/n-triples" || ?format="application/trig" || ?format="application/turtle" || ?format="text/n3" || ?format="text/turtle")
    optional {
        ?distribution dcat:byteSize ?size .
    }
    optional {
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
      change: (val) => {
        return ""
        return val.replace("<", "").replace(">", "");
      },
    }),
    mw.change({
      key: dataUrl,
      type: "string",
      change: (val) => {
        return val.replace("<", "").replace(">", "");
      },
    }),
    mw.when(
      (ctx) => ctx.isEmpty(query),
      mw.add({
        key: query,
        value: (_ctx) => {
          if (localQueryLocation) {
            return fs.readFileSync(localQueryLocation, "utf8");
          }
          if (!localQueryLocation) {
            throw new Error("No query available");
          }
        },
      })
    )
  );

  // SPARQL implementation
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
          ctx.store.addQuads(parser.parse(text));
        } catch (error) {
          console.log(error, text);
        }
        return next();
      }
    )
  );

  // Comunica implementation
  pipe.use(
    mw.when(
      (ctx) =>
        ctx.isEmpty(sparqlUrl) &&
        ctx.isNumber(size) &&
        ctx.getNumber(size) < 20000000,
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

  // TriplyDb
  pipe.use(
    mw.when(
      (ctx) =>
        ctx.isEmpty(sparqlUrl) &&
        (!ctx.isNumber(size) || +ctx.getNumber(size) > 20000000),
      async (ctx, next) => {
        const acc = await pipe.triplyDb.getAccount();
        var dataSet = await acc.ensureDataset(destinationDatasetName);
        dataSet = await dataSet.clear("graphs");
        await dataSet.importFromUrls([ctx.getString(dataUrl)]);
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
      })
    )
  );

  pipe.use(mw.toRdf(pipe.destinations.dataset));

  return pipe;
}
