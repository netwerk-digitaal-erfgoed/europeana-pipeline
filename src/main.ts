import { Ratt, CliContext, Middleware } from "@triply/ratt";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";
import mw from "@triply/ratt/lib/middlewares";
import { Parser } from "n3";
import * as fs from "fs";
var md5 = require("md5");

function retrieveCachedDatasetBeschrijving(): Middleware {
  const parser = new Parser();
  return addMwCallSiteToError(async (ctx, next) => {
    let body: string;
    const dsUri = ctx.getString("dataset");

    if (!fs.existsSync(`./data/cache/files/${md5(dsUri)}`)) {
      const response = await fetch(
        `https://triplestore.netwerkdigitaalerfgoed.nl/rest/explore/graph?uri=${encodeURIComponent(
          dsUri
        )}&role=context`,
        {
          headers: {
            accept: "application/x-trig",
          },
        }
      );
      body = await response.text();
    } else {
      body = fs.readFileSync(`./data/cache/files/${md5(dsUri)}`, "utf8");
    }
    ctx.store.addQuads(parser.parse(body));
    fs.writeFile(`./data/cache/files/${md5(dsUri)}`, body, (err) => {
      if (err) return console.log(err);
    });
    return next();
  });
}

const prefixes = {
  example: Ratt.prefixer("https://example.org/"),
};

const sources = {
  datasetCatalog: Ratt.Source.url(
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry",
    {
      request: {
        headers: {
          accept: "text/csv",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "query=SELECT%20%3Fdataset%20WHERE%20%7B%0A%20%20%3Fdataset%20a%20%3Chttp%3A%2F%2Fwww.w3.org%2Fns%2Fdcat%23Dataset%3E%20.%0A%7D",
        method: "POST",
      },
    }
  ),
  shacl_dataset_dump_dcat: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_dcat.ttl"
  ),
  shacl_dataset_list_dcat: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_list_dcat.ttl"
  ),
  shacl_dataset_dump_schema: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_schema.ttl"
  ),
  shacl_dataset_list_schema: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_list_schema.ttl"
  ),
  shacl_dataset_list_void: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_list_void.ttl"
  ),
  shacl_edm: Ratt.Source.file("./rdf/informatieModellen/shacl_edm.ttl"),
};

const destinations = {
  out: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
    truncateGraphs: true,
  }),
};

export default async function (cliContext: CliContext): Promise<Ratt> {
  const app = new Ratt({
    defaultGraph: prefixes.example,
    cliContext,
    prefixes: prefixes,
    sources: sources,
    destinations: destinations,
  });
  app.use(
    mw.fromJson({
      dataset: "http://data.bibliotheken.nl/id/dataset/rise-centsprenten",
    })
  );
  app.use(retrieveCachedDatasetBeschrijving());

  app.use(
    mw.validateShacl(
      [
        app.sources.shacl_dataset_dump_dcat,
        app.sources.shacl_dataset_list_dcat,
        app.sources.shacl_dataset_dump_schema,
        app.sources.shacl_dataset_list_schema,
        app.sources.shacl_dataset_list_void,
      ],
      {
        report: {
          destination: app.destinations.out,
          graph:
            "https://data.netwerkdigitaalerfgoed.nl/ThomasdeGroot/datasetBeschrijvingen/validationReport",
        },
        terminateOn: false,
      }
    )
  );

  app.use(mw.toRdf(app.destinations.out));

  return app;
}
