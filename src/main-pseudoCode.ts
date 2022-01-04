import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";

const datasets = [
  {
    dataset: "http://data.bibliotheken.nl/id/dataset/rise-centsprenten",
  },
  {
    dataset: "https://data.rkd.nl/artists",
  },
  {
    dataset: "http://data.bibliotheken.nl/id/dataset/rise-alba",
  },
  {
    dataset:
      "https://lit.hosting.deventit.net/AtlantisPubliek/data/dataset/LOD+Museale+Objecten",
  },
  {
    dataset:
      "https://lit.hosting.deventit.net/AtlantisPubliek/data/dataset/LOD+Thesaurus",
  },
  {
    dataset:
      "https://lit.hosting.deventit.net/AtlantisPubliek/data/dataset/LOD+Stambestanden",
  },
  {
    dataset:
      "https://lit.hosting.deventit.net/AtlantisPubliek/data/dataset/LOD+Archieven",
  },
  {
    dataset:
      "https://studiezaal.nijmegen.nl/AtlantisPubliek/data/dataset/LOD+Beelddocumenten",
  },
  {
    dataset:
      "https://lit.hosting.deventit.net/AtlantisPubliek/data/dataset/LOD+Persoon+en+Organisatie",
  },
  {
    dataset: "https://www.genealogieonline.nl/wo2slachtoffers/",
  },
];

const prefixes = {
  example: Ratt.prefixer("https://example.org/"),
};

const destinations = {
  out: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
    truncateGraphs: true,
  }),
};

const sources = {
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

export default async function (cliContext: CliContext): Promise<Ratt> {
  const app = new Ratt({
    defaultGraph: prefixes.example,
    cliContext,
    prefixes: prefixes,
    sources: sources,
    destinations: destinations,
  });
  app.use(mw.fromJson(datasets));

  app.use(mw.loadRdf(app.record["dataset"]))

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
        log: false,
      }
    )
  );
  app.use(async (ctx,next)=>{
    if (ctx.record["format"] === "SPARQL" ){
      ctx.record["endpoint"] = ctx.record["url"]
    }
    try {
      // create comunica SPARQL endpoint from app.record["url"] where format is "trig"
      // create comunica SPARQL endpoint from app.record["url"] where format is "nquads"
      // create comunica SPARQL endpoint from app.record["url"] where format is "ttl"
      // create comunica SPARQL endpoint from app.record["url"] where format is "ntriples"
      // create comunica SPARQL endpoint from app.record["url"] where format is "json-ld"
      // create comunica SPARQL endpoint from app.record["url"] where format is "rdf+xml"
      // app.record["endpoint"] = comunica SPARQL endpoint
    } catch(e) {
      // create TriplyDb SPARQL endpoint from app.record["url"] where format is "trig"
      // create TriplyDb SPARQL endpoint from app.record["url"] where format is "nquads"
      // create TriplyDb SPARQL endpoint from app.record["url"] where format is "ttl"
      // create TriplyDb SPARQL endpoint from app.record["url"] where format is "ntriples"
      // create TriplyDb SPARQL endpoint from app.record["url"] where format is "json-ld"
      // create TriplyDb SPARQL endpoint from app.record["url"] where format is "rdf+xml"
      // app.record["endpoint"] = TriplyDb SPARQL endpoint
    }
    await next()
  }
  )

  app.use(mw.sparqlConstruct(["queries"],app.record["endpoint"]))


  app.use(mw.toRdf(app.destinations.out));

  return app;
}
