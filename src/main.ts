import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";

const prefixes = {
  example: Ratt.prefixer("https://example.org/"),
};

export default async function (cliContext: CliContext): Promise<Ratt> {
  const app = new Ratt({
    defaultGraph: prefixes.example,
    cliContext,
    prefixes: prefixes,
    sources: {
      shapes: Ratt.Source.file("static/information-model.trig"),
    },
    destinations: {
      out: Ratt.Destination.TriplyDb.rdf("test-etl-boilerplate", {
        truncateGraphs: true,
      }),
    },
  });

  /**
   * Typically you'd read a file in the following way:
   * app.use(mw.fromCsv(Ratt.Sources.file("./dummy.csv"), { delimiter: "," }))
   * For testing purposes, we're reading from synthetic records instead
   */
  app.use(mw.fromJson([{ a: "a", b: "b", c: "c" }]));

  /**
   * Manipulate records, in this case appending the string '_changed' to a value
   */
  app.use(
    mw.change({ key: "a", type: "string", change: (val) => val + "_changed" })
  );

  /**
   * Take fields from the ratt record, and store as quads.
   */
  app.use(
    mw.addQuad(
      mw.toIri("a", { prefix: prefixes.example }),
      app.prefix.rdf("type"),
      mw.toIri("c", { prefix: prefixes.example })
    )
  );
  app.use(
    mw.addQuad(
      mw.toIri("a", { prefix: prefixes.example }),
      app.prefix.rdf("value"),
      mw.toLiteral("b")
    )
  );

  /**
   * Validation using SHACL constraints
   */
  app.use(
    mw.validateShacl(app.sources.shapes, {
      report: {
        destination: app.destinations.out,
        graph: "https://example.report.org/",
      },
    })
  );

  /**
   * Serialize quads to file
   */
  app.use(mw.toRdf(app.destinations.out));

  return app;
}
