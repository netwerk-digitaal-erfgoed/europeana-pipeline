import { Ratt, CliContext } from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import {
  prefixes,
  eccbooks2edmQueryString,
} from "./helpers/generics";
export declare type CompressionType = "gz" | undefined;


export default async function (cliContext: CliContext): Promise<Ratt> {
  const graph = "https://www.openarch.nl/epe-20201108.a2a";
  const edmGraph = "https://www.openarch.nl/epe-20201108.a2a-edm";
  const pipe3 = new Ratt({
    defaultGraph: graph,
    cliContext: cliContext,
    prefixes: prefixes,
    sources: {
      edmShapes: Ratt.Source.file("./rdf/informatieModellen/shacl_edm.ttl"),
      dataset: Ratt.Source.url(
        "https://www.openarch.nl/exports/c431a4425bc56080c868435c8d910f83/files/epe-20201108.a2a.ttl.gz"
      ),
    },
    destinations: {
      dataset: Ratt.Destination.TriplyDb.rdf("epe-20201108", {
        overwrite: true,
      }),
    },
  });
  // TD: https://issues.triply.cc/issues/6180
  //
  pipe3.use(
    mw.loadRdf(pipe3.sources.dataset),
    mw.sparqlConstruct(
      `PREFIX owl:     <http://www.w3.org/2002/07/owl#>
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX dc:      <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
      PREFIX void:    <http://rdfs.org/ns/void#>
      PREFIX schema:  <http://schema.org/>
      PREFIX edm:     <http://www.europeana.eu/schemas/edm/>
      PREFIX ore:     <http://www.openarchives.org/ore/terms/>

      CONSTRUCT {
          ?uri_cho a edm:ProvidedCHO ;
               edm:type ?edm_type ;
               dc:creator ?creator ;
               dc:description ?description ;
               dc:type ?genre ;
               dc:subject ?subject ;
               dc:title ?name ;
               dcterms:alternative ?altName ;
               dc:publisher ?publisher ;
               owl:sameAs ?sameAs ;
               dcterms:spatial ?spatial ;
               dcterms:temporal ?temporal ;
               dc:language "el" ;
               dcterms:medium ?material .
      }
      WHERE {
        {
        ?uri_cho a ?type .
          VALUES ?type { schema:Sculpture schema:VisualArtwork schema:Painting schema:Photograph }
          BIND(("IMAGE") as ?edm_type)
        }
        UNION
        {
          ?uri_cho a schema:Book .
          BIND(("TEXT") as ?edm_type)
        }

        # Generate an "URI_CHO#agg" URI pointing to a ore:Aggregation resource.
        BIND( URI(CONCAT(STR(?uri_cho),"#agg")) as ?uri_ore)

        # NOTE: The VAR_PROVIDER will be replaced during runtime by the starter.sh script.
        # Europeana requires the provider value to be specified through the aggregation process.
        BIND( STR('VAR_PROVIDER') as ?provider)

        OPTIONAL { ?uri_cho schema:creator ?creator }
        OPTIONAL { ?uri_cho schema:description ?description }
        OPTIONAL { ?uri_cho schema:genre ?genre .
                  FILTER (lang( ?genre) = "en")
                  BIND(str(?genre) as ?dc_genre)
                 }
        OPTIONAL { ?uri_cho schema:keywords ?subject }
        OPTIONAL { ?uri_cho schema:about ?subject }
        OPTIONAL { ?uri_cho schema:license ?cho_license }
        OPTIONAL { ?uri_cho schema:name ?name }
        OPTIONAL { ?uri_cho schema:alternateName ?altName }
        OPTIONAL {
           # use a default the provider mentioned in the dataset description, if any...
           ?dataset void:rootResource ?uri_cho .
           ?dataset schema:provider ?dataProvider .
        }
        OPTIONAL {
           # use as default the license statement mentioned in the dataset description, if any...
           ?dataset void:rootResource ?uri_cho .
           ?dataset schema:license ?dataset_license .
        }
        OPTIONAL {
           # use the provider from the resource description
           ?uri_cho schema:provider ?dataProvider
        }
        OPTIONAL { ?uri_cho schema:publisher ?publisher }
        OPTIONAL { ?uri_cho schema:sameAs ?sameAs }
        OPTIONAL { ?uri_cho schema:spatial ?spatial }
        OPTIONAL { ?uri_cho schema:temporal ?temporal }
        OPTIONAL { ?uri_cho schema:material ?material }
        OPTIONAL {
          # Europeana requires valid URI for edm:isShownAt
          ?uri_cho schema:url ?url
          BIND(IRI(?url) as ?isShownAt)
        }
        OPTIONAL {
          # Europeana requires valid URI for edm:isShownBy
          ?uri_cho schema:image ?image
          BIND(IRI(?image) as ?isShownBy)
        }
        BIND(COALESCE(IRI(?cho_license),IRI(?dataset_license),"no license info") as ?license)
      }
`,
      {
        toGraph: edmGraph,
      }
    ),
    mw.toRdf(pipe3.destinations.dataset)
  );

  return pipe3;
}
