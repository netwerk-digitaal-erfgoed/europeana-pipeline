import path from "path";
import { Ratt, CliContext } from "@triply/ratt";
import { prefix } from "./helpers/ratt-helpers";
import { putAsset } from "./helpers/triplydb-helpers";

const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);

export default async function (cliContext: CliContext): Promise<Ratt> {
  // RATT context
  const sourceDatasetName = process.env.SOURCE_DATASET;
  const destinationDatasetName = process.env.DESTINATION_DATASET;
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
  });

  const account = await pipe.triplyDb.getAccount(process.env.TRIPLYDB_ACCOUNT);
  const dataset = await account.ensureDataset(destinationDatasetName);
  await dataset.addPrefixes(pipe.prefix);

  const linkedData = path.resolve(
    pipe.getDataDir(`rdf`),
    `${destinationDatasetName}.ttl`
  );

  await dataset.importFromFiles([linkedData], { overwriteAll: true });

  const asset = path.resolve(
    pipe.getDataDir(`rdf`),
    `${destinationDatasetName}.xml.zip`
  );

  await putAsset(dataset, asset, path.basename(asset));

  return pipe;
}
