import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { prefixes } from "./helpers/generics";

export const sources = {
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
  datasetMetadata: Ratt.Source.url(
    `https://triplestore.netwerkdigitaalerfgoed.nl/rest/explore/graph?uri=${encodeURIComponent(
      process.env.DATASET ||
        "http://data.bibliotheken.nl/id/dataset/rise-centsprenten"
    )}&role=context`,
    {
      request: {
        headers: {
          accept: "application/trig",
        },
      },
    }
  ),
};

export default async function (cliContext: CliContext): Promise<Ratt> {
  const app = new Ratt({
    defaultGraph: prefixes.defaultGraph,
    cliContext,
    prefixes: prefixes,
    sources: sources,
    destinations: {
      out: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
        truncateGraphs: true,
        synchronizeServices: true,
      }),
    },
  });
  // Retrieving cached datasetBeschrijvingen
  app.use(mw.loadRdf(app.sources.datasetMetadata));

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
            "https://data.netwerkdigitaalerfgoed.nl/edm/datasetBeschrijvingen/validationReport",
        },
        terminateOn: false,
        log: false,
      }
    )
  );


  app.use(mw.toRdf(app.destinations.out));

  return app;
}
