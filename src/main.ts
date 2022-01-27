import { Parser } from "n3";

import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { ensure_service, ensure_query } from "./helpers/triplydb-helpers";

const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);
const reportGraph = defaultGraph("violationReport");

const sparql = {
  headers: {
    accept: "application/trig",
    "content-type": "application/sparql-query",
  },
  method: "post",
};

const url = "url";
const query = "query";
const title = "title";
const byteSize = "byteSize";
const format = "format";

export default async function (cliContext: CliContext): Promise<Ratt> {
  // RATT context
  const pipe = new Ratt({
    defaultGraph: defaultGraph,
    cliContext: cliContext,
    sources: {
      listOfDatasets: Ratt.Source.TriplyDb.query("query", {
        variables: {
          targetNode:
            "https://demo.netwerkdigitaalerfgoed.nl/registry/shape/bibliotheek_nijmegenEnrichment",
        },
      }),
      edmShapes: Ratt.Source.file("./rdf/informatieModellen/shacl_edm.ttl"),
    },
    destinations: {
      dataset: Ratt.Destination.TriplyDb.rdf("Europeana"),
    },
  });

  pipe.use(mw.fromJson(pipe.sources.listOfDatasets));

  // SPARQL implementation
  pipe.use(
    mw.when(
      (ctx) => ctx.getString(format) === "application/sparql-query",
      async (ctx, next) => {
        let text;
        try {
          const parser = new Parser();
          const response = await fetch(ctx.getString(url), {
            ...sparql,
            body: ctx.getString(query),
          });
          text = await response.text();
          ctx.store.addQuads(parser.parse(text))
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
        ctx.getString(format) != "application/sparql-query" &&
        +ctx.getString(byteSize) < 20000000,
      async (ctx, next) => {
        const parser = new Parser();
        const response = await fetch(ctx.getString(url));
        const text = await response.text();
        ctx.store.addQuads(parser.parse(text));
        return next();
      },
      mw.sparqlConstruct((ctx) => ctx.getString(query),{toGraph:defaultGraph("edm")})
    )
  );

  // TriplyDb
  pipe.use(
    mw.when(
      (ctx) =>
        ctx.getString(format) != "application/sparql-query" &&
        +ctx.getString(byteSize) > 20000000,
      async (ctx, next) => {
        const acc = await pipe.triplyDb.getAccount();
        var dataSet = await acc.ensureDataset(ctx.getString(title));
        dataSet = await dataSet.clear("graphs");
        await dataSet.importFromUrls([ctx.getString(url)]);
        await ensure_service(dataSet, "default");
        await ensure_query(acc, "default", {
          dataset: dataSet,
          queryString: ctx.getString(query),
        });
        return next();
      },
      mw.loadRdf(Ratt.Source.TriplyDb.query("default"),{defaultGraph:defaultGraph("edm")})
    )
  );

  // TD: https://issues.triply.cc/issues/6184
  pipe.use(
    mw.validateShacl(pipe.sources.edmShapes, {
      graphs: [defaultGraph],
      report: {
        destination: pipe.destinations.dataset,
        graph: reportGraph,
      },
      terminateOn: false,
      log: false,
    }),
    // TD: https://issues.triply.cc/issues/6184
    mw.toRdf(pipe.destinations.dataset)
  );

  return pipe;
}
