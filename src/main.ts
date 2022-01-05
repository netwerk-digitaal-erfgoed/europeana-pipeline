import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { prefix } from "./helpers/ratt-helpers";
import { retrieveDatasetBeschrijving } from "./helpers/etl-helpers";

export default async function (cliContext: CliContext): Promise<Ratt> {
  const app = new Ratt({
    defaultGraph: "https://data.netwerkdigitaalerfgoed.nl/edm/",
    cliContext,
    prefixes: {
      graph: Ratt.prefixer("https://data.netwerkdigitaalerfgoed.nl/edm/"),
      ...prefix,
    },
    sources: {
      shacl_dataset_dump_dcat: Ratt.Source.file(
        "./rdf/informatieModellen/shacl_dataset_dump_dcat.ttl"
      ),
      shacl_dataset_dump_schema: Ratt.Source.file(
        "./rdf/informatieModellen/shacl_dataset_dump_schema.ttl"
      ),
      datasetCatalog: Ratt.Source.TriplyDb.query("retrieveDatasets"),
    },
  });
  app.use(mw.fromJson(app.sources.datasetCatalog));
  app.use(retrieveDatasetBeschrijving());
  app.use(
    mw.validateShacl(
      [
        app.sources.shacl_dataset_dump_dcat,
        app.sources.shacl_dataset_dump_schema,
      ],
      {
        report: {
          destination: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
            truncateGraphs: true,
            synchronizeServices: true,
          }),
          graph: app.prefix.graph("violationReport"),
        },
        terminateOn: false,
        log: false,
      }
    )
  );
  app.use(mw.resetStore());
  app.use(
    mw.when(
      (ctx) => ctx.isNotEmpty("url"),
      mw.add({
        key: "endpoint",
        value: async (ctx) => {
          if (ctx.getString("format") === "application/sparql-query") {
            return ctx.getString("url");
          }
          const dataset = await (
            await ctx.app.triplyDb.getAccount()
          ).getDataset("datasetsEDM");
          await dataset.importFromUrls(ctx.getString("url"));
          return (
            await (await dataset.addService("sparql", "default")).getInfo()
          ).endpoint;
        },
      })
    )
  );

  return app;
}
