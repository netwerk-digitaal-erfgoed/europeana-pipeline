import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import {
  prefixes,
  retrieveDatasetsQueryString,
  retrieveDatasetMetadata,
  retrieveDatasetMetadataQueryString,
} from "./helpers/generics";
import {
  endpoint,
  triplyDBBindings,
  rattBindings,
  externBindings,
  constructQueries,
} from "./helpers/etl-helpers";
import { forEachiterator, externalSPARQL } from "./helpers/ratt-helpers";

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const dataService = "?dataService";
const instanties = "?instanties";
const dsType = "?type";
const datasetRegister = "?datasetRegister";
// Misc

const datasetRegisterValue =
  "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry";
// sources
const reportGraph = prefixes.defaultGraph("violationReport");
const sources = {
  dcatShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_dcat.ttl"
  ),
  schemaShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_dataset_dump_schema.ttl"
  ),
  edmShapes: Ratt.Source.file(
    "./rdf/informatieModellen/shacl_edm.ttl"
  ),
  datasetCatalog: Ratt.Source.url(datasetRegisterValue, {
    request: {
      headers: {
        accept: "text/tab-separated-values",
        "content-type": "application/sparql-query",
      },
      body: retrieveDatasetsQueryString,
      method: "post",
    },
  }),
};

const destinations = {
  report: Ratt.Destination.TriplyDb.rdf("datasetBeschrijvingen", {
    truncateGraphs: true,
    synchronizeServices: true,
  }),
  dataset: Ratt.Destination.TriplyDb.rdf("dataset", {
    truncateGraphs: true,
    synchronizeServices: true,
  }),
};

export default async function (cliContext: CliContext): Promise<Ratt> {
  // RATT context
  const app = new Ratt({
    defaultGraph: prefixes.defaultGraph,
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
    mw.add({
      key: retrieveDatasetMetadata,
      value: (ctx) => {
        return retrieveDatasetMetadataQueryString.replace(
          "?dataset",
          ctx.getString(datasetIri)
        );
      },
    }),
    mw.add({
      key: datasetRegister,
      value: (_ctx) => datasetRegisterValue,
    }),
    externalSPARQL(datasetRegister, retrieveDatasetMetadata)
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
      mw.add({ key: dataService, value: endpoint }),
    ])
  );

  app.use(
    mw.when(
      (ctx) => ctx.isNotEmpty(dsType) && ctx.getString(dsType) === "TriplyDB",
      // Ophalen instanties
      mw.add({ key: instanties, value: triplyDBBindings }),
      forEachiterator(instanties, [
        mw.add({
          key: "instance",
          value: (ctx) => {
            return "<" + ctx.getString("uri") + ">";
          },
        }),
        constructQueries("TriplyDB"),
        mw.validateShacl([app.sources.edmShapes], {
          report: { destination: app.destinations.report, graph: reportGraph },
          terminateOn: false,
        }),
        mw.toRdf(app.destinations.dataset)
      ])
    ),
    mw.when(
      (ctx) => ctx.isNotEmpty(dsType) && ctx.getString(dsType) === "RATT",
      // Ophalen instanties
      mw.add({ key: instanties, value: rattBindings }),
      forEachiterator(instanties, [
        mw.add({
          key: "instance",
          value: (ctx) => {
            return "<" + ctx.getString("_root.entries[0][1].value") + ">";
          },
        }),
        constructQueries("RATT"),
        mw.validateShacl([app.sources.edmShapes], {
          report: { destination: app.destinations.report, graph: reportGraph },
          terminateOn: false,
        }),
        mw.toRdf(app.destinations.dataset)
      ])
    ),
    mw.when(
      (ctx) => ctx.isNotEmpty(dsType) && ctx.getString(dsType) === "extern",
      // Ophalen instanties
      mw.add({ key: instanties, value: externBindings }),
      forEachiterator(instanties, [
        mw.add({
          key: "instance",
          value: (ctx) => {
            return "<" + ctx.getString("uri") + ">";
          },
        }),
        constructQueries("extern"),
        mw.validateShacl([app.sources.edmShapes], {
          report: { destination: app.destinations.report, graph: reportGraph },
          terminateOn: false,
        }),
        mw.toRdf(app.destinations.dataset)
      ]),
    )
  );

  return app;
}
