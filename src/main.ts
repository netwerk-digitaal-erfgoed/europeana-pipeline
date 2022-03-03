import { Parser } from "n3";
import * as fs from "fs-extra";
import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { prefix, sparqlSelect } from "./helpers/ratt-helpers";
import { ensure_service, ensure_query } from "./helpers/triplydb-helpers";

const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);

const sparqlHeaders = {
  headers: {
    accept: "text/tab-separated-values;",
    "content-type": "application/sparql-query",
  },
  method: "post",
};

const query = "query";
const dataUrl = "dataUrl";
const size = "size";
const sparqlUrl = "sparqlUrl";
const sparql = "sparql";
const data = "data";

const sparqlUrlQuery = `
  prefix dct: <http://purl.org/dc/terms/>
  prefix dcat: <http://www.w3.org/ns/dcat#>
  select ?sparqlUrl where {
    ?datasetIri dcat:distribution ?distribution .
    ?distribution dcat:accessURL ?sparqlUrl .
    ?distribution dct:format "application/sparql-query" .
  } limit 1`;

const dataQuery = `
  prefix xsd: <http://www.w3.org/2001/XMLSchema#>
  prefix dct: <http://purl.org/dc/terms/>
  prefix dcat: <http://www.w3.org/ns/dcat#>
  select ?dataUrl ?size where {
    ?datasetIri dcat:distribution ?distribution .
    ?distribution dcat:accessURL ?dataUrl .
    ?distribution dct:format ?dataFormat.
    filter (?dataFormat !="application/sparql-query" )
    optional {
      ?distribution dcat:byteSize ?size .
    }
  } limit 1`;

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
  const pipe = new Ratt({
    defaultGraph: defaultGraph,
    cliContext: cliContext,
    prefixes: prefix,
    sources: {
      dataset: Ratt.Source.url(
        `https://triplestore.netwerkdigitaalerfgoed.nl/rest/explore/graph?uri=${sourceDatasetName}`
      ),
    },
    destinations: {
      dataset: Ratt.Destination.file(
        `data/rdf/${destinationDatasetName}.ttl`
      ),
    },
  });

  pipe.use(mw.loadRdf(pipe.sources.dataset,{defaultGraph:sourceDatasetName}));
  pipe.use(
    sparqlSelect(sparql, sparqlUrlQuery),
    mw.add({
      key: sparqlUrl,
      value: (ctx) => {
        return ""
        return ctx.getAny(sparql)[0].get("?sparqlUrl").value;
      },
    }),
    sparqlSelect(data, dataQuery),
    mw.add({
      key: dataUrl,
      value: (ctx) => {
        return ctx.getAny(data)[0].get("?dataUrl").value;
      },
    }),
    mw.add({
      key: size,
      value: (ctx) => {
        return ctx.getAny(data)[0].get("?size")?.value;
      },
    }),
    mw.add({
      key: query,
      value: (ctx) => {
        const query = ctx.store.getObjects(
          sourceDatasetName,
          prefix.sh("sparqlConstruct"),
          null
        );
        if (query.length > 0) {
          return query[0];
        }
        if (localQueryLocation) {
          return fs.readFileSync(localQueryLocation, "utf8");
        }
        if (!localQueryLocation) {
          throw new Error("No query available");
        }
      },
    })
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
            ...sparqlHeaders,
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
      (ctx) =>  ctx.isEmpty(sparqlUrl) && ctx.isNumber(size) && ctx.getNumber(size) < 20000000,
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
      (ctx) => ctx.isEmpty(sparqlUrl) && (!ctx.isNumber(size) || +ctx.getNumber(size) > 20000000),
      async (ctx, next) => {
        const acc = await pipe.triplyDb.getAccount();
        var dataSet = await acc.ensureDataset(destinationDatasetName);
        dataSet = await dataSet.clear("graphs");
        await dataSet.importFromUrls([ctx.getString(dataUrl)]);
        await ensure_service(dataSet, "default");
        await ensure_query(acc, "default", {
          dataset: dataSet,
          queryString: ctx.getString(query),
          output: "response"
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
