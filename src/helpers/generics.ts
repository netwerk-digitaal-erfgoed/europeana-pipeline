import { Ratt } from "@triply/ratt";
import {prefix } from "./ratt-helpers"

export const datasets = [
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

export const prefixes = {
  defaultGraph: Ratt.prefixer("https://data.netwerkdigitaalerfgoed.nl/edm/"),
  ...prefix
};

export const sources = {
  datasetCatalog: Ratt.Source.url(
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry",
    {
      request: {
        headers: {
          accept: "text/csv",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: `query=${encodeURIComponent(
          "select * where {?dataset a http://www.w3.org/ns/dcat#Dataset}"
        )}`,
        method: "POST",
      },
    }
  ),
  dataset: Ratt.Source.url(
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry",
    {
      request: {
        headers: {
          accept: "text/csv",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: `query=${encodeURIComponent(
          "select * where {?dataset a http://www.w3.org/ns/dcat#Dataset}"
        )}`,
        method: "POST",
      },
    }
  ),
}
