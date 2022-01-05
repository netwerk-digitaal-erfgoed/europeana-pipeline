/* RATT helpers (2021-11-13)
 *
 * Published at <https://git.triply.cc/etl/ratt-helpers/-/blob/main/ratt-helpers.ts>
 */

import { Ratt } from '@triply/ratt'
import mw from '@triply/ratt/lib/middlewares'
import { Literal, NamedNode, PrefixedToIri } from 'n3'



/**
 * Enriches the data model in the given graph.
 * This makes use of the How-to-Model approach.
 *
 * @param  modelGraph The RDF graph that contains the data model that will be enriched.
 * @return RATT steps that can be part of a RATT pipeline.
 *
 * Example use:
 *
 *     import { enrich_model } from './helpers'
 *
 *     app.use(
 *       mw.loadRdf(app.Sources.model),
 *       enrich_model(graph.model),
 *     )
 */

export function enrich_model(modelGraph: NamedNode) {
  const triplydbApi = 'https://api.triplydb.com'
  return [
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-owl', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
  //mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-value-lists', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-taxonomy', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-skos-lex', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-node-shapes', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-property-shapes', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-sh-lex-1', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-sh-lex-2', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-lists', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
    mw.sparqlConstruct(Ratt.Source.TriplyDb.query('data-enrichment', 'enrich-definitions', {triplyDb: {url: triplydbApi}}), {toGraph: modelGraph}),
  ]
}



/**
 * Simplified notation for creating an IRI term based record keys that together uniquely identify each record.
 *
 * @param prefix A declared RATT prefix.
 * @param keys A list with zero or more RATT record keys.
 * @return An IRI that uses the given prefix and a hash that is based on the values for the given keys in the current RATT record.
 *
 * @td <https://issues.triply.cc/issues/5706>
 *
 * Example use:
 *
 *     import { hashedIri } from './helpers'
 *
 *     app.use(
 *       mw.addQuad(
 *         hashedIri(prefix.id, [key.abc, key.xyz]),
 *         ...
 */

export function hashedIri(prefix: PrefixedToIri, keys: string[]) {
  return mw.toIri.fromHashOf(keys, {prefix: prefix})
}



/**
 * Simplified notation for creating an IRI term based on strings.
 *
 * Let's assume that alias 't' denotes IRI prefix 'https://triply.cc/'.
 * The following 3 calls to this function all create the same IRI 'https://triply.cc/abc':
 *
 *   1. `iri('https://triply.cc/abc')`
 *   2. `iri(prefix.t, 'abc')`
 *   3. `iri('t', 'abc')`
 *
 * Example use:
 *
 *     import { iri } from './helpers'
 *
 *     app.use(
 *       mw.addQuad(
 *         iri(prefix.id, 'abc'),
 *         ...
 */

export function iri(x: string): NamedNode;
export function iri(x: PrefixedToIri, y: string): NamedNode;
export function iri(x: PrefixedToIri | string, y?: string) {
  if (y) {
    return mw.toIri(y, {prefix: x as PrefixedToIri})
  } else {
    return mw.toIri(x as string)
  }
}



/**
 * Simplified notation for creating a literal term.
 *
 * Supports the following variants for creating the literal `'foo'^^xsd:string`:
 * 1. `literal('foo')
 * 2. `literal('foo', xsd.string)`
 *
 * Supports the following variant for creating the language-tagged string `'foo'@en`:
 * 3. `literal('foo', lang.en)`
 *
 * Example use:
 *
 *     import { literal } from './helpers'
 *
 *     app.use(
 *       mw.addQuad(
 *         ...,
 *         ...,
 *         literal('1.23', xsd.decimal)),
 */

export function literal(lexicalForm: string): Literal;
export function literal(lexicalForm: string, datatype: NamedNode): Literal;
export function literal(lexicalForm: string, languageTag: string): Literal;
export function literal(lexicalForm: string, x: NamedNode | string = xsd.string) {
  if (typeof x === "string") {
    return mw.toLiteral(lexicalForm, {language: x})
  } else {
    return mw.toLiteral(lexicalForm, {datatype: x})
  }
}



/**
 * Simple notation for splitting the value of the given key using the given separator string.
 *
 * @param key The key in the current RATT record whose value will be split into multiple values.
 * @param separator The separator that will be used as the separator between the respective values.  The default value is the comma character.
 * @return A RATT step that can be included in a RATT pipeline.
 *
 * Example use:
 *
 *     import { split } from './helpers'
 *
 *     app.use(
 *       split(key.values),
 *       mw.addQuad(
 *         mw.toIri.forEach(key.values),
 *         ...
 */

export function split(
  key: string,
  separator: string = ','
) {
  return [
    mw.change({
      key: key,
      type: 'unknown',
      change: values_ => {
        const values = (values_ as string)
        values
          .split(separator)
          .map(value => value.trim())
          .filter(value => value)
      }
    }),
  ]
}



/**
 * Simple notation for the common case in which a string value from the RATT record must be translated into an IRI.
 * For example, source values may be ISO letter codes that denote countries; but the linked data output should use IRIs to denote countries.
 *
 * @param subject The subject term of the triple.
 * @param predicate The predicate term of the triple.
 * @param key The key in the RATT record that contains the string values that must be mapped onto IRIs.
 * @param translationTable The translation from strings to IRIs.
 * @param nulls Optional list of strings that denote NULL values and should not be mapped to IRIs.
 * @return RATT steps that can be used in a RATT pipeline.
 *
 * Example use:
 *
 *     import { string_to_iri } from './helpers'
 *
 *     TODO
 */

export function string_to_iri(
  key: string,
  translationTable: Map<string, NamedNode>,
  nulls: string[] = []
) {
  return [
    mw.change({
      key: key,
      type: 'string',
      change: value => {
        if (nulls.includes(value)) {
          return undefined;
        }
        if (!translationTable.has(value)) {
          throw Error(`Could not parse ${key} from ${value}.`)
        }
        return translationTable.get(value)
      }
    }),
  ]
}



export function validate_metadata(
  reportDestination: any,
  reportGraph: NamedNode
) {
  const assetName = 'generic-metadata'
  const scheme = 'https'
  const host = 'triplydb.com'
  const triplydbApi = `${scheme}://api.${host}`
  const organization = 'generic'
  const dataset = 'metadata'
  const prefix0 = {
    //Oops: 'model' should have been 'metadata'
    graph: Ratt.prefixer(`${scheme}://${host}/${organization}/model/graph/`),
  }
  const graph = {
    extra: prefix0.graph('extra'),
    metadata: prefix0.graph('metadata'),
  }
  return [
    mw.loadRdf(
      Ratt.Source.TriplyDb.rdf(organization, dataset, {
        graphs: [graph.extra], triplyDb: {url: triplydbApi}
      })),
    mw.validateShacl(
      Ratt.Source.TriplyDb.asset(organization, dataset, {
        name: assetName,
        triplyDb: {url: triplydbApi}
      }),
      {
        report: {
          destination: reportDestination,
          graph: reportGraph
        },
        terminateOn: false
      }
    ),
  ]
}



/**
 * Validates the currently loaded data model.
 * This makes use of the How-to-Model approach.
 *
 * The How-to-Model approach applies several enrichment steps in which redundant information is automatically added to the data model.
 * The How-to-Model approach automatically validates the enriched data model against a generic meta-model.
 *
 * @param  reportDestination The RATT destination where the validation report must be published.
 * @param  reportGraph The RDF graph in which the report must be published.
 * @return RATT steps that can be inserted into a RATT pipeline.
 *
 * - Old param: validationSource The RATT source that contains extra information that can be used during validation, in addition to the How-to-Model extra validation information.
 * - Old param: metaModelSource The RATT source that contains an extra meta-model that is used in addition to the How-to-Model meta-model.
 *
 * Example use:
 *
 *     import { validate_model } from './helpers'
 *
 *     app.use(
 *       mw.loadRdf(app.Source.model),
 *       validate_model(app.Destinations.remote, graph.report),
 */

export function validate_model(
  reportDestination: any,
  reportGraph: NamedNode
) {
  const scheme = 'https'
  const host = 'triplydb.com'
  const triplydbApi = `${scheme}://api.${host}`
  const organization = 'generic'
  const dataset = 'model'
  const prefix_ = {
    graph: Ratt.prefixer(`${scheme}://${host}/${organization}/${dataset}/graph/`),
  }
  const graph = {
    extra: prefix_.graph('extra'),
    model: prefix_.graph('model'),
  }
  return [
    mw.loadRdf(
      Ratt.Source.TriplyDb.rdf(organization, dataset, {
        graphs: [graph.extra],
        triplyDb: {url: triplydbApi}
      })
    ),
    mw.validateShacl(
      Ratt.Source.TriplyDb.rdf(organization, dataset, {
        graphs: [graph.model],
        triplyDb: {url: triplydbApi}
      }),
      {
        report: {
          destination: reportDestination,
          graph: reportGraph
        },
        terminateOn: false
      }
    ),
  ]
}



/* Prefix declarations
 * ===================
 *
 * A collection of commonly used prefix declarations.
 *
 * You can import these in the following way:
 *
 *     import {prefix as prefix0} from './mw/prefix'
 *
 *     const prefix = {
 *       owl: prefix0.owl,
 *     }
 *
 * @td <https://issues.triply.cc/issues/5698>
 */

export const prefix = {
  aat: Ratt.prefixer('http://vocab.getty.edu/aat/'),
  adms_assetType: Ratt.prefixer('http://purl.org/adms/assettype/'),
  adms_status: Ratt.prefixer('http://purl.org/adms/status/'),
  bibo: Ratt.prefixer('http://purl.org/ontology/bibo/'),
  bibo_status: Ratt.prefixer('http://purl.org/ontology/bibo/status/'),
  con: Ratt.prefixer('http://www.w3.org/2000/10/swap/pim/contact#'),
  dbo: Ratt.prefixer('http://dbpedia.org/ontology/'),
  dbr: Ratt.prefixer('http://dbpedia.org/resource/'),
  dcm: Ratt.prefixer('http://purl.org/dc/dcmitype/'),
  dct: Ratt.prefixer('http://purl.org/dc/terms/'),
  deo: Ratt.prefixer('http://purl.org/spar/deo/'),
  doco: Ratt.prefixer('http://purl.org/spar/doco/'),
  fabio: Ratt.prefixer('http://purl.org/spar/fabio/'),
  foaf: Ratt.prefixer('http://xmlns.com/foaf/0.1/'),
  format: Ratt.prefixer('http://www.w3.org/ns/formats/'),
  frbr: Ratt.prefixer('http://purl.org/vocab/frbr/core#'),
  geo: Ratt.prefixer('http://www.opengis.net/ont/geosparql#'),
  orb: Ratt.prefixer('http://purl.org/orb/1.0/'),
  org: Ratt.prefixer('http://www.w3.org/ns/org#'),
  owl: Ratt.prefixer('http://www.w3.org/2002/07/owl#'),
  pnv: Ratt.prefixer('https://w3id.org/pnv#'),
  po: Ratt.prefixer('http://www.essepuntato.it/2008/12/pattern#'),
  qb: Ratt.prefixer('http://purl.org/linked-data/cube#'),
  rdf: Ratt.prefixer('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  rdfs: Ratt.prefixer('http://www.w3.org/2000/01/rdf-schema#'),
  sdo: Ratt.prefixer('https://schema.org/'),
  sh: Ratt.prefixer('http://www.w3.org/ns/shacl#'),
  skos: Ratt.prefixer('http://www.w3.org/2004/02/skos/core#'),
  ssd: Ratt.prefixer('http://www.w3.org/ns/sparql-service-description#'),
  swap: Ratt.prefixer('http://www.w3.org/2000/10/swap/pim/doc#'),
  time: Ratt.prefixer('http://www.w3.org/2006/time#'),
  topic: Ratt.prefixer('https://triplydb.com/Triply/topics/id/'),
  vann: Ratt.prefixer('http://purl.org/vocab/vann/'),
  vs: Ratt.prefixer('http://www.w3.org/2003/06/sw-vocab-status/ns#'),
  wgs84: Ratt.prefixer('http://www.w3.org/2003/01/geo/wgs84_pos#'),
  xsd: Ratt.prefixer('http://www.w3.org/2001/XMLSchema#'),
}



/* Language tags
 * =============
 *
 * A collection of commonly used language tags.
 *
 * You can import these in the following way:
 *
 *     import { lang } from './helpers'
 *
 *     app.use(
 *       mw.toQuad(..., ..., literal('my label',lang.en)),
 */

export const lang = {
  en: 'en',
  nl: 'nl',
}



/* Terms from commonly used vocabularies
 * =====================================
 *
 * Notice that you do not need to import the prefix declaration for
 * a commonly used namespace in order to use the terms that are
 * declared within it.
 *
 * Example of use:
 *
 *     import { owl } from './helpers'
 *
 *     app.use(
 *       mw.toQuad(owl.sameAs, owl.sameAs, owl.sameAs))
 *
 * @td <https://issues.triply.cc/issues/5698>
 */



/* OGC GeoSPARQL
 * -------------
 */
export const geo = {
  // This class represents the top-level feature type. This class is equivalent to GFI_Feature defined in ISO 19156:2011, and it is superclass of all feature types.
  'Feature': prefix.geo('Feature'),
  // The class represents the top-level geometry type. This class is equivalent to the UML class GM_Object defined in ISO 19107, and it is superclass of all geometry types.
  'Geometry': prefix.geo('Geometry'),
  // The class spatial-object represents everything that can have a spatial representation. It is superclass of feature and geometry.
  'SpatialObject': prefix.geo('SpatialObject'),
  // The GML serialization of a geometry
  'asGML': prefix.geo('asGML'),
  // The WKT serialization of a geometry
  'asWKT': prefix.geo('asWKT'),
  // The number of measurements or axes needed to describe the position of this geometry in a coordinate system.
  'coordinateDimension': prefix.geo('coordinateDimension'),
  // The default geometry to be used in spatial calculations. It is Usually the most detailed geometry.
  'defaultGeometry': prefix.geo('defaultGeometry'),
  // The topological dimension of this geometric object, which must be less than or equal to the coordinate dimension. In non-homogeneous collections, this will return the largest topological dimension of the contained objects.
  'dimension': prefix.geo('dimension'),
  // Exists if the subject SpatialObject spatially contains the object SpatialObject. DE-9IM: T*TFF*FF*
  'ehContains': prefix.geo('ehContains'),
  // Exists if the subject SpatialObject is spatially covered by the object SpatialObject. DE-9IM: TFF*TFT**
  'ehCoveredBy': prefix.geo('ehCoveredBy'),
  // Exists if the subject SpatialObject spatially covers the object SpatialObject. DE-9IM: T*TFT*FF*
  'ehCovers': prefix.geo('ehCovers'),
  // Exists if the subject SpatialObject is spatially disjoint from the object SpatialObject. DE-9IM: FF*FF****
  'ehDisjoint': prefix.geo('ehDisjoint'),
  // Exists if the subject SpatialObject spatially equals the object SpatialObject. DE-9IM: TFFFTFFFT
  'ehEquals': prefix.geo('ehEquals'),
  // Exists if the subject SpatialObject is spatially inside the object SpatialObject. DE-9IM: TFF*FFT**
  'ehInside': prefix.geo('ehInside'),
  // Exists if the subject SpatialObject spatially meets the object SpatialObject. DE-9IM: FT******* ^ F**T***** ^ F***T****
  'ehMeet': prefix.geo('ehMeet'),
  // Exists if the subject SpatialObject spatially overlaps the object SpatialObject. DE-9IM: T*T***T**
  'ehOverlap': prefix.geo('ehOverlap'),
  // A GML serialization of a geometry object.
  'gmlLiteral': prefix.geo('gmlLiteral'),
  // A spatial representation for a given feature.
  'hasGeometry': prefix.geo('hasGeometry'),
  // Connects a geometry object with its text-based serialization.
  'hasSerialization': prefix.geo('hasSerialization'),
  // (true) if this geometric object is the empty Geometry. If true, then this geometric object represents the empty point set for the coordinate space.
  'isEmpty': prefix.geo('isEmpty'),
  // (true) if this geometric object has no anomalous geometric points, such as self intersection or self tangency.
  'isSimple': prefix.geo('isSimple'),
  // Exists if the subject SpatialObject is spatially disjoint from the object SpatialObject. DE-9IM: FFTFFTTTT
  'rcc8dc': prefix.geo('rcc8dc'),
  // Exists if the subject SpatialObject spatially meets the object SpatialObject. DE-9IM: FFTFTTTTT
  'rcc8ec': prefix.geo('rcc8ec'),
  // Exists if the subject SpatialObject spatially equals the object SpatialObject. DE-9IM: TFFFTFFFT
  'rcc8eq': prefix.geo('rcc8eq'),
  // Exists if the subject SpatialObject is spatially inside the object SpatialObject. DE-9IM: TFFTFFTTT
  'rcc8ntpp': prefix.geo('rcc8ntpp'),
  // Exists if the subject SpatialObject spatially contains the object SpatialObject. DE-9IM: TTTFFTFFT
  'rcc8ntppi': prefix.geo('rcc8ntppi'),
  // Exists if the subject SpatialObject spatially overlaps the object SpatialObject. DE-9IM: TTTTTTTTT
  'rcc8po': prefix.geo('rcc8po'),
  // Exists if the subject SpatialObject is spatially covered by the object SpatialObject. DE-9IM: TFFTTFTTT
  'rcc8tpp': prefix.geo('rcc8tpp'),
  // Exists if the subject SpatialObject spatially covers the object SpatialObject. DE-9IM: TTTFTTFFT
  'rcc8tppi': prefix.geo('rcc8tppi'),
  // Exists if the subject SpatialObject spatially contains the object SpatialObject. DE-9IM: T*****FF*
  'sfContains': prefix.geo('sfContains'),
  // Exists if the subject SpatialObject spatially crosses the object SpatialObject. DE-9IM: T*T******
  'sfCrosses': prefix.geo('sfCrosses'),
  // Exists if the subject SpatialObject is spatially disjoint from the object SpatialObject. DE-9IM: FF*FF****
  'sfDisjoint': prefix.geo('sfDisjoint'),
  // Exists if the subject SpatialObject spatially equals the object SpatialObject. DE-9IM: TFFFTFFFT
  'sfEquals': prefix.geo('sfEquals'),
  // Exists if the subject SpatialObject is not spatially disjoint from the object SpatialObject. DE-9IM: T******** ^ *T******* ^ ***T***** ^ ****T****
  'sfIntersects': prefix.geo('sfIntersects'),
  // Exists if the subject SpatialObject spatially overlaps the object SpatialObject. DE-9IM: T*T***T**
  'sfOverlaps': prefix.geo('sfOverlaps'),
  // Exists if the subject SpatialObject spatially touches the object SpatialObject. DE-9IM: FT******* ^ F**T***** ^ F***T****
  'sfTouches': prefix.geo('sfTouches'),
  // Exists if the subject SpatialObject is spatially within the object SpatialObject. DE-9IM: T*F**F***
  'sfWithin': prefix.geo('sfWithin'),
  // The number of measurements or axes needed to describe the spatial position of this geometry in a coordinate system.
  'spatialDimension': prefix.geo('spatialDimension'),
  // A Well-known Text serialization of a geometry object.
  'wktLiteral': prefix.geo('wktLiteral'),
}



/* Web Ontology Language (OWL)
 * ---------------------------
 */
export const owl = {
  // The class of collections of pairwise different individuals.
  'AllDifferent': prefix.owl('AllDifferent'),
  // The class of collections of pairwise disjoint classes.
  'AllDisjointClasses': prefix.owl('AllDisjointClasses'),
  // The class of collections of pairwise disjoint properties.
  'AllDisjointProperties': prefix.owl('AllDisjointProperties'),
  // The class of annotated annotations for which the RDF serialization consists of an annotated subject, predicate and object.
  'Annotation': prefix.owl('Annotation'),
  // The class of annotation properties.
  'AnnotationProperty': prefix.owl('AnnotationProperty'),
  // The class of asymmetric properties.
  'AsymmetricProperty': prefix.owl('AsymmetricProperty'),
  // The class of annotated axioms for which the RDF serialization consists of an annotated subject, predicate and object.
  'Axiom': prefix.owl('Axiom'),
  // The class of OWL classes.
  'Class': prefix.owl('Class'),
  // The class of OWL data ranges, which are special kinds of datatypes. Note: The use of the IRI owl:DataRange has been deprecated as of OWL 2. The IRI rdfs:Datatype SHOULD be used instead.
  'DataRange': prefix.owl('DataRange'),
  // The class of data properties.
  'DatatypeProperty': prefix.owl('DatatypeProperty'),
  // The class of deprecated classes.
  'DeprecatedClass': prefix.owl('DeprecatedClass'),
  // The class of deprecated properties.
  'DeprecatedProperty': prefix.owl('DeprecatedProperty'),
  // The class of functional properties.
  'FunctionalProperty': prefix.owl('FunctionalProperty'),
  // The class of inverse-functional properties.
  'InverseFunctionalProperty': prefix.owl('InverseFunctionalProperty'),
  // The class of irreflexive properties.
  'IrreflexiveProperty': prefix.owl('IrreflexiveProperty'),
  // The class of named individuals.
  'NamedIndividual': prefix.owl('NamedIndividual'),
  // The class of negative property assertions.
  'NegativePropertyAssertion': prefix.owl('NegativePropertyAssertion'),
  // This is the empty class.
  'Nothing': prefix.owl('Nothing'),
  // The class of object properties.
  'ObjectProperty': prefix.owl('ObjectProperty'),
  // The class of ontologies.
  'Ontology': prefix.owl('Ontology'),
  // The class of ontology properties.
  'OntologyProperty': prefix.owl('OntologyProperty'),
  // The class of reflexive properties.
  'ReflexiveProperty': prefix.owl('ReflexiveProperty'),
  // The class of property restrictions.
  'Restriction': prefix.owl('Restriction'),
  // The class of symmetric properties.
  'SymmetricProperty': prefix.owl('SymmetricProperty'),
  // The class of OWL individuals.
  'Thing': prefix.owl('Thing'),
  // The class of transitive properties.
  'TransitiveProperty': prefix.owl('TransitiveProperty'),
  // The property that determines the class that a universal property restriction refers to.
  'allValuesFrom': prefix.owl('allValuesFrom'),
  // The property that determines the predicate of an annotated axiom or annotated annotation.
  'annotatedProperty': prefix.owl('annotatedProperty'),
  // The property that determines the subject of an annotated axiom or annotated annotation.
  'annotatedSource': prefix.owl('annotatedSource'),
  // The property that determines the object of an annotated axiom or annotated annotation.
  'annotatedTarget': prefix.owl('annotatedTarget'),
  // The property that determines the predicate of a negative property assertion.
  'assertionProperty': prefix.owl('assertionProperty'),
  // The annotation property that indicates that a given ontology is backward compatible with another ontology.
  'backwardCompatibleWith': prefix.owl('backwardCompatibleWith'),
  // The data property that does not relate any individual to any data value.
  'bottomDataProperty': prefix.owl('bottomDataProperty'),
  // The object property that does not relate any two individuals.
  'bottomObjectProperty': prefix.owl('bottomObjectProperty'),
  // The property that determines the cardinality of an exact cardinality restriction.
  'cardinality': prefix.owl('cardinality'),
  // The property that determines that a given class is the complement of another class.
  'complementOf': prefix.owl('complementOf'),
  // The property that determines that a given data range is the complement of another data range with respect to the data domain.
  'datatypeComplementOf': prefix.owl('datatypeComplementOf'),
  // The annotation property that indicates that a given entity has been deprecated.
  'deprecated': prefix.owl('deprecated'),
  // The property that determines that two given individuals are different.
  'differentFrom': prefix.owl('differentFrom'),
  // The property that determines that a given class is equivalent to the disjoint union of a collection of other classes.
  'disjointUnionOf': prefix.owl('disjointUnionOf'),
  // The property that determines that two given classes are disjoint.
  'disjointWith': prefix.owl('disjointWith'),
  // The property that determines the collection of pairwise different individuals in a owl:AllDifferent axiom.
  'distinctMembers': prefix.owl('distinctMembers'),
  // The property that determines that two given classes are equivalent, and that is used to specify datatype definitions.
  'equivalentClass': prefix.owl('equivalentClass'),
  // The property that determines that two given properties are equivalent.
  'equivalentProperty': prefix.owl('equivalentProperty'),
  // The property that determines the collection of properties that jointly build a key.
  'hasKey': prefix.owl('hasKey'),
  // The property that determines the property that a self restriction refers to.
  'hasSelf': prefix.owl('hasSelf'),
  // The property that determines the individual that a has-value restriction refers to.
  'hasValue': prefix.owl('hasValue'),
  // The property that is used for importing other ontologies into a given ontology.
  'imports': prefix.owl('imports'),
  // The annotation property that indicates that a given ontology is incompatible with another ontology.
  'incompatibleWith': prefix.owl('incompatibleWith'),
  // The property that determines the collection of classes or data ranges that build an intersection.
  'intersectionOf': prefix.owl('intersectionOf'),
  // The property that determines that two given properties are inverse.
  'inverseOf': prefix.owl('inverseOf'),
  // The property that determines the cardinality of a maximum cardinality restriction.
  'maxCardinality': prefix.owl('maxCardinality'),
  // The property that determines the cardinality of a maximum qualified cardinality restriction.
  'maxQualifiedCardinality': prefix.owl('maxQualifiedCardinality'),
  // The property that determines the collection of members in either a owl:AllDifferent, owl:AllDisjointClasses or owl:AllDisjointProperties axiom.
  'members': prefix.owl('members'),
  // The property that determines the cardinality of a minimum cardinality restriction.
  'minCardinality': prefix.owl('minCardinality'),
  // The property that determines the cardinality of a minimum qualified cardinality restriction.
  'minQualifiedCardinality': prefix.owl('minQualifiedCardinality'),
  // The property that determines the class that a qualified object cardinality restriction refers to.
  'onClass': prefix.owl('onClass'),
  // The property that determines the data range that a qualified data cardinality restriction refers to.
  'onDataRange': prefix.owl('onDataRange'),
  // The property that determines the datatype that a datatype restriction refers to.
  'onDatatype': prefix.owl('onDatatype'),
  // The property that determines the n-tuple of properties that a property restriction on an n-ary data range refers to.
  'onProperties': prefix.owl('onProperties'),
  // The property that determines the property that a property restriction refers to.
  'onProperty': prefix.owl('onProperty'),
  // The property that determines the collection of individuals or data values that build an enumeration.
  'oneOf': prefix.owl('oneOf'),
  // The annotation property that indicates the predecessor ontology of a given ontology.
  'priorVersion': prefix.owl('priorVersion'),
  // The property that determines the n-tuple of properties that build a sub property chain of a given property.
  'propertyChainAxiom': prefix.owl('propertyChainAxiom'),
  // The property that determines that two given properties are disjoint.
  'propertyDisjointWith': prefix.owl('propertyDisjointWith'),
  // The property that determines the cardinality of an exact qualified cardinality restriction.
  'qualifiedCardinality': prefix.owl('qualifiedCardinality'),
  // The property that determines that two given individuals are equal.
  'sameAs': prefix.owl('sameAs'),
  // The property that determines the class that an existential property restriction refers to.
  'someValuesFrom': prefix.owl('someValuesFrom'),
  // The property that determines the subject of a negative property assertion.
  'sourceIndividual': prefix.owl('sourceIndividual'),
  // The property that determines the object of a negative object property assertion.
  'targetIndividual': prefix.owl('targetIndividual'),
  // The property that determines the value of a negative data property assertion.
  'targetValue': prefix.owl('targetValue'),
  // The data property that relates every individual to every data value.
  'topDataProperty': prefix.owl('topDataProperty'),
  // The object property that relates every two individuals.
  'topObjectProperty': prefix.owl('topObjectProperty'),
  // The property that determines the collection of classes or data ranges that build a union.
  'unionOf': prefix.owl('unionOf'),
  // The property that identifies the version IRI of an ontology.
  'versionIRI': prefix.owl('versionIRI'),
  // The annotation property that provides version information for an ontology or another OWL construct.
  'versionInfo': prefix.owl('versionInfo'),
  // The property that determines the collection of facet-value pairs that define a datatype restriction.
  'withRestrictions': prefix.owl('withRestrictions'),
}



/* Person Name Vocabulary (PNV)
 * ----------------------------
 */
export const pnv = {
  // A Person is a human being whose individual existence can somehow be documented
  'Person': prefix.pnv('Person'),
  // A name is considered to be a resource type in its own right
  'PersonName': prefix.pnv('PersonName'),
  // A Base surname is a family name without any prefixes, if those prefixes need to be ignored in sorting. If the family name is e.g. \"de Vries\" and it needs to be sorted under \"V\", the Base surname is \"Vries\". Base surname is equivalent to BioDes:geslachtsnaam.
  'baseSurname': prefix.pnv('baseSurname'),
  // A Disambiguating description is a name part that is appended to make sure that the right person is designated. Name parts like \"Sr.\" and \"Jr.\", used to distinguish a child from his parent, are disambiguating descriptions.
  'disambiguatingDescription': prefix.pnv('disambiguatingDescription'),
  // A First name is a combination of a given name, a patronym (if any) and a given name suffix. This property is only to be used by data providers who have combined these name elements into one field (following the BioDes structure). First name is equivalent to BioDes:voornaam.
  'firstName': prefix.pnv('firstName'),
  // A2A:PersonNameFirstName
  'givenName': prefix.pnv('givenName'),
  // A Given name suffix is a name part that is appended to a given name. In the name of the fifteenth-century Duke of Burgundy Philip the Good, for example, \"the Good\" is the Given name suffix.
  'givenNameSuffix': prefix.pnv('givenNameSuffix'),
  // An Honorific suffix is a name part that is appended to distinguish someone
  'honorificSuffix': prefix.pnv('honorificSuffix'),
  // An Infix designates name elements that come in between pnv:firstName and pnv:baseSurname. This property is only to be used by data providers who have structured their name elements following the BioDes structure. Infix is equivalent to BioDes:intrapositie.
  'infix': prefix.pnv('infix'),
  // An Infix title designates a title in the middle of a name
  'infixTitle': prefix.pnv('infixTitle'),
  // A2A:PersonNameInitials
  'initials': prefix.pnv('initials'),
  // Literal name designates a full personal name. This property may only be left blank if a person's name was unknown or if a person was unnamed (e.g. a child that died shortly after being born), in which cases the property pnv:nameSpecification should state \"unknown\" or \"unnamed\".
  'literalName': prefix.pnv('literalName'),
  // The Name specification property can be used to specify the type of name, e.g. to discern between name variants, or to state that the person's name is unknown or that the person was unnamed, e.g. in the case of a child that died before it was given a name. It can be a string (e.g. \"unknown\", \"unnamed\", \"religious name\", \"stage name\", \"pen name\", \"married name\" or \"birth name\") or a reference to a controlled vocabulary.
  'nameSpecification': prefix.pnv('nameSpecification'),
  // A Patronym is a name element based on the given name of one's father or grandfather. This is also the preferred property for a matronym (i.e. a name element based on the given name of one's mother or grandmother).
  'patronym': prefix.pnv('patronym'),
  // A Prefix is a noble or honorific title prefixing a name, e.g. \"Prof. dr.\" or \"Jhr.\"
  'prefix': prefix.pnv('prefix'),
  // A Suffix designates name elements that come after the family name. This property is only to be used by data providers who have structured their name elements following the BioDes structure.
  'suffix': prefix.pnv('suffix'),
  // A surname is the name of the family a person is born into, including one or more prefixes. In some cases the honorific prefix can be incorporated into the surname (e.g. Van Welderen baron Rengers).
  'surname': prefix.pnv('surname'),
  // A Surname prefix is a name part prefixing the surname (e.g. \"van\" or \"van den\").
  'surnamePrefix': prefix.pnv('surnamePrefix'),
  // A Trailing patronym refers to the parent's given name, suffixing the person's family name, mostly used for disambiguation.
  'trailingPatronym': prefix.pnv('trailingPatronym'),
}


/* Resource Description Format (RDF)
 * ---------------------------------
 */
export const rdf = {
  // The class of containers of alternatives.
  'Alt': prefix.rdf('Alt'),
  // The class of unordered containers.
  'Bag': prefix.rdf('Bag'),
  // A class representing a compound literal.
  'CompoundLiteral': prefix.rdf('CompoundLiteral'),
  // The datatype of RDF literals storing fragments of HTML content
  'HTML': prefix.rdf('HTML'),
  // The datatype of RDF literals storing JSON content.
  'JSON': prefix.rdf('JSON'),
  // The class of RDF Lists.
  'List': prefix.rdf('List'),
  // The class of plain (i.e. untyped) literal values, as used in RIF and OWL 2
  'PlainLiteral': prefix.rdf('PlainLiteral'),
  // The class of RDF properties.
  'Property': prefix.rdf('Property'),
  // The class of ordered containers.
  'Seq': prefix.rdf('Seq'),
  // The class of RDF statements.
  'Statement': prefix.rdf('Statement'),
  // The datatype of XML literal values.
  'XMLLiteral': prefix.rdf('XMLLiteral'),
  // The base direction component of a CompoundLiteral.
  'direction': prefix.rdf('direction'),
  // The first item in the subject RDF list.
  'first': prefix.rdf('first'),
  // The datatype of language-tagged string values
  'langString': prefix.rdf('langString'),
  // The language component of a CompoundLiteral.
  'language': prefix.rdf('language'),
  // The empty list, with no items in it. If the rest of a list is nil then the list has no more items in it.
  'nil': prefix.rdf('nil'),
  // The object of the subject RDF statement.
  'object': prefix.rdf('object'),
  // The predicate of the subject RDF statement.
  'predicate': prefix.rdf('predicate'),
  // The rest of the subject RDF list after the first item.
  'rest': prefix.rdf('rest'),
  // The subject of the subject RDF statement.
  'subject': prefix.rdf('subject'),
  // The subject is an instance of a class.
  'type': prefix.rdf('type'),
  // Idiomatic property used for structured values.
  'value': prefix.rdf('value'),
}
export const a = rdf.type



/* RDF Schema (RDFS)
 * -----------------
 */
export const rdfs = {
  // The class of classes.
  'Class': prefix.rdfs('Class'),
  // The class of RDF containers.
  'Container': prefix.rdfs('Container'),
  // The class of container membership properties, rdf:_1, rdf:_2, ..., all of which are sub-properties of 'member'.
  'ContainerMembershipProperty': prefix.rdfs('ContainerMembershipProperty'),
  // The class of RDF datatypes.
  'Datatype': prefix.rdfs('Datatype'),
  // The class of literal values, eg. textual strings and integers.
  'Literal': prefix.rdfs('Literal'),
  // The class resource, everything.
  'Resource': prefix.rdfs('Resource'),
  // A description of the subject resource.
  'comment': prefix.rdfs('comment'),
  // A domain of the subject property.
  'domain': prefix.rdfs('domain'),
  // The defininition of the subject resource.
  'isDefinedBy': prefix.rdfs('isDefinedBy'),
  // A human-readable name for the subject.
  'label': prefix.rdfs('label'),
  // A member of the subject resource.
  'member': prefix.rdfs('member'),
  // A range of the subject property.
  'range': prefix.rdfs('range'),
  // Further information about the subject resource.
  'seeAlso': prefix.rdfs('seeAlso'),
  // The subject is a subclass of a class.
  'subClassOf': prefix.rdfs('subClassOf'),
  // The subject is a subproperty of a property.
  'subPropertyOf': prefix.rdfs('subPropertyOf'),
}



/* Schema.org
 * ----------
 */
export const sdo = {
  // A 3D model represents some kind of 3D content, which may have [[encoding]]s in one or more [[MediaObject]]s. Many 3D formats are available (e.g. see [Wikipedia](https://en.wikipedia.org/wiki/Category:3D_graphics_file_formats)); specific encoding formats can be represented using the [[encodingFormat]] property applied to the relevant [[MediaObject]]. For thecase of a single file published after Zip compression, the convention of appending '+zip' to the [[encodingFormat]] can be used. Geospatial, AR/VR, artistic/animation, gaming, engineering and scientific content can all be represented using [[3DModel]].
  '3DModel': prefix.sdo('3DModel'),
  // A radio channel that uses AM.
  'AMRadioChannel': prefix.sdo('AMRadioChannel'),
  // Reference documentation for application programming interfaces (APIs).
  'APIReference': prefix.sdo('APIReference'),
  // Abdomen clinical examination.
  'Abdomen': prefix.sdo('Abdomen'),
  // Web page type: About page.
  'AboutPage': prefix.sdo('AboutPage'),
  // The act of committing to/adopting an object.Related actions:* [[RejectAction]]: The antonym of AcceptAction.
  'AcceptAction': prefix.sdo('AcceptAction'),
  // An accommodation is a place that can accommodate human beings, e.g. a hotel room, a camping pitch, or a meeting room. Many accommodations are for overnight stays, but this is not a mandatory requirement.For more specific types of accommodations not defined in schema.org, one can use additionalType with external vocabularies.<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Accommodation': prefix.sdo('Accommodation'),
  // Accountancy business.As a [[LocalBusiness]] it can be described as a [[provider]] of one or more [[Service]]\\(s).
  'AccountingService': prefix.sdo('AccountingService'),
  // The act of accomplishing something via previous efforts. It is an instantaneous action rather than an ongoing process.
  'AchieveAction': prefix.sdo('AchieveAction'),
  // An action performed by a direct agent and indirect participants upon a direct object. Optionally happens at a location with the help of an inanimate instrument. The execution of the action may produce a result. Specific action sub-type documentation specifies the exact expectation of each argument/role.See also [blog post](http://blog.schema.org/2014/04/announcing-schemaorg-actions.html) and [Actions overview document](https://schema.org/docs/actions.html).
  'Action': prefix.sdo('Action'),
  // A set of requirements that a must be fulfilled in order to perform an Action.
  'ActionAccessSpecification': prefix.sdo('ActionAccessSpecification'),
  // The status of an Action.
  'ActionStatusType': prefix.sdo('ActionStatusType'),
  // The act of starting or activating a device or application (e.g. starting a timer or turning on a flashlight).
  'ActivateAction': prefix.sdo('ActivateAction'),
  // Represents the activation fee part of the total price for an offered product, for example a cellphone contract.
  'ActivationFee': prefix.sdo('ActivationFee'),
  // An in-progress action (e.g, while watching the movie, or driving to a location).
  'ActiveActionStatus': prefix.sdo('ActiveActionStatus'),
  // Active, but not recruiting new participants.
  'ActiveNotRecruiting': prefix.sdo('ActiveNotRecruiting'),
  // The act of editing by adding an object to a collection.
  'AddAction': prefix.sdo('AddAction'),
  // A geographical region, typically under the jurisdiction of a particular government.
  'AdministrativeArea': prefix.sdo('AdministrativeArea'),
  // An adult entertainment establishment.
  'AdultEntertainment': prefix.sdo('AdultEntertainment'),
  // An [[Article]] that an external entity has paid to place or to produce to its specifications. Includes [advertorials](https://en.wikipedia.org/wiki/Advertorial), sponsored content, native advertising and other paid content.
  'AdvertiserContentArticle': prefix.sdo('AdvertiserContentArticle'),
  // Physical activity of relatively low intensity that depends primarily on the aerobic energy-generating process; during activity, the aerobic metabolism uses oxygen to adequately meet energy demands during exercise.
  'AerobicActivity': prefix.sdo('AerobicActivity'),
  // When a single product is associated with multiple offers (for example, the same pair of shoes is offered by different merchants), then AggregateOffer can be used.Note: AggregateOffers are normally expected to associate multiple offers that all share the same defined [[businessFunction]] value, or default to http://purl.org/goodrelations/v1#Sell if businessFunction is not explicitly defined.
  'AggregateOffer': prefix.sdo('AggregateOffer'),
  // The average rating based on multiple ratings or reviews.
  'AggregateRating': prefix.sdo('AggregateRating'),
  // The act of expressing a consistency of opinion with the object. An agent agrees to/about an object (a proposition, topic or theme) with participants.
  'AgreeAction': prefix.sdo('AgreeAction'),
  // An organization that provides flights for passengers.
  'Airline': prefix.sdo('Airline'),
  // An airport.
  'Airport': prefix.sdo('Airport'),
  // AlbumRelease.
  'AlbumRelease': prefix.sdo('AlbumRelease'),
  // An intangible item that describes an alignment between a learning resource and a node in an educational framework.Should not be used where the nature of the alignment can be described using a simple property, for example to express that a resource [[teaches]] or [[assesses]] a competency.
  'AlignmentObject': prefix.sdo('AlignmentObject'),
  // All-wheel Drive is a transmission layout where the engine drives all four wheels.
  'AllWheelDriveConfiguration': prefix.sdo('AllWheelDriveConfiguration'),
  // Content about the allergy-related aspects of a health topic.
  'AllergiesHealthAspect': prefix.sdo('AllergiesHealthAspect'),
  // The act of organizing tasks/objects/events by associating resources to it.
  'AllocateAction': prefix.sdo('AllocateAction'),
  // A creative work with a visual storytelling format intended to be viewed online, particularly on mobile devices.
  'AmpStory': prefix.sdo('AmpStory'),
  // An amusement park.
  'AmusementPark': prefix.sdo('AmusementPark'),
  // Physical activity that is of high-intensity which utilizes the anaerobic metabolism of the body.
  'AnaerobicActivity': prefix.sdo('AnaerobicActivity'),
  // An AnalysisNewsArticle is a [[NewsArticle]] that, while based on factual reporting, incorporates the expertise of the author/producer, offering interpretations and conclusions.
  'AnalysisNewsArticle': prefix.sdo('AnalysisNewsArticle'),
  // Any part of the human body, typically a component of an anatomical system. Organs, tissues, and cells are all anatomical structures.
  'AnatomicalStructure': prefix.sdo('AnatomicalStructure'),
  // An anatomical system is a group of anatomical structures that work together to perform a certain task. Anatomical systems, such as organ systems, are one organizing principle of anatomy, and can includes circulatory, digestive, endocrine, integumentary, immune, lymphatic, muscular, nervous, reproductive, respiratory, skeletal, urinary, vestibular, and other systems.
  'AnatomicalSystem': prefix.sdo('AnatomicalSystem'),
  // A specific branch of medical science that pertains to study of anesthetics and their application.
  'Anesthesia': prefix.sdo('Anesthesia'),
  // Animal shelter.
  'AnimalShelter': prefix.sdo('AnimalShelter'),
  // An answer offered to a question; perhaps correct, perhaps opinionated or wrong.
  'Answer': prefix.sdo('Answer'),
  // An apartment (in American English) or flat (in British English) is a self-contained housing unit (a type of residential real estate) that occupies only part of a building (Source: Wikipedia, the free encyclopedia, see <a href=\"http://en.wikipedia.org/wiki/Apartment\">http://en.wikipedia.org/wiki/Apartment</a>).
  'Apartment': prefix.sdo('Apartment'),
  // Residence type: Apartment complex.
  'ApartmentComplex': prefix.sdo('ApartmentComplex'),
  // Appearance assessment with clinical examination.
  'Appearance': prefix.sdo('Appearance'),
  // The act of inserting at the end if an ordered collection.
  'AppendAction': prefix.sdo('AppendAction'),
  // The act of registering to an organization/service without the guarantee to receive it.Related actions:* [[RegisterAction]]: Unlike RegisterAction, ApplyAction has no guarantees that the application will be accepted.
  'ApplyAction': prefix.sdo('ApplyAction'),
  // An indication for a medical therapy that has been formally specified or approved by a regulatory body that regulates use of the therapy; for example, the US FDA approves indications for most drugs in the US.
  'ApprovedIndication': prefix.sdo('ApprovedIndication'),
  // Aquarium.
  'Aquarium': prefix.sdo('Aquarium'),
  // An intangible type to be applied to any archive content, carrying with it a set of properties required to describe archival items and collections.
  'ArchiveComponent': prefix.sdo('ArchiveComponent'),
  // An organization with archival holdings. An organization which keeps and preserves archival material and typically makes it accessible to the public.
  'ArchiveOrganization': prefix.sdo('ArchiveOrganization'),
  // The act of arriving at a place. An agent arrives at a destination from a fromLocation, optionally with participants.
  'ArriveAction': prefix.sdo('ArriveAction'),
  // An art gallery.
  'ArtGallery': prefix.sdo('ArtGallery'),
  // A type of blood vessel that specifically carries blood away from the heart.
  'Artery': prefix.sdo('Artery'),
  // An article, such as a news article or piece of investigative report. Newspapers and magazines have articles of many different types and this is intended to cover them all.See also [blog post](http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html).
  'Article': prefix.sdo('Article'),
  // The act of posing a question / favor to someone.Related actions:* [[ReplyAction]]: Appears generally as a response to AskAction.
  'AskAction': prefix.sdo('AskAction'),
  // A [[NewsArticle]] expressing an open call by a [[NewsMediaOrganization]] asking the public for input, insights, clarifications, anecdotes, documentation, etc., on an issue, for reporting purposes.
  'AskPublicNewsArticle': prefix.sdo('AskPublicNewsArticle'),
  // The act of forming one's opinion, reaction or sentiment.
  'AssessAction': prefix.sdo('AssessAction'),
  // The act of allocating an action/event/task to some destination (someone or something).
  'AssignAction': prefix.sdo('AssignAction'),
  // A collection or bound volume of maps, charts, plates or tables, physical or in media form illustrating any subject.
  'Atlas': prefix.sdo('Atlas'),
  // Professional service: Attorney. This type is deprecated - [[LegalService]] is more inclusive and less ambiguous.
  'Attorney': prefix.sdo('Attorney'),
  // Intended audience for an item, i.e. the group for whom the item was created.
  'Audience': prefix.sdo('Audience'),
  // An audio file.
  'AudioObject': prefix.sdo('AudioObject'),
  // A specific and exact (byte-for-byte) version of an [[AudioObject]]. Two byte-for-byte identical files, for the purposes of this type, considered identical. If they have different embedded metadata the files will differ. Different external facts about the files, e.g. creator or dateCreated that aren't represented in their actual content, do not affect this notion of identity.
  'AudioObjectSnapshot': prefix.sdo('AudioObjectSnapshot'),
  // An audiobook.
  'Audiobook': prefix.sdo('Audiobook'),
  // Book format: Audiobook. This is an enumerated value for use with the bookFormat property. There is also a type 'Audiobook' in the bib extension which includes Audiobook specific properties.
  'AudiobookFormat': prefix.sdo('AudiobookFormat'),
  // Indicates that the publisher gives some special status to the publication of the document. (\"The Queens Printer\" version of a UK Act of Parliament, or the PDF version of a Directive published by the EU Office of Publications). Something \"Authoritative\" is considered to be also [[OfficialLegalValue]]\".
  'AuthoritativeLegalValue': prefix.sdo('AuthoritativeLegalValue'),
  // The act of granting permission to an object.
  'AuthorizeAction': prefix.sdo('AuthorizeAction'),
  // Auto body shop.
  'AutoBodyShop': prefix.sdo('AutoBodyShop'),
  // An car dealership.
  'AutoDealer': prefix.sdo('AutoDealer'),
  // An auto parts store.
  'AutoPartsStore': prefix.sdo('AutoPartsStore'),
  // A car rental business.
  'AutoRental': prefix.sdo('AutoRental'),
  // Car repair business.
  'AutoRepair': prefix.sdo('AutoRepair'),
  // A car wash business.
  'AutoWash': prefix.sdo('AutoWash'),
  // ATM/cash machine.
  'AutomatedTeller': prefix.sdo('AutomatedTeller'),
  // Car repair, sales, or parts.
  'AutomotiveBusiness': prefix.sdo('AutomotiveBusiness'),
  // A system of medicine that originated in India over thousands of years and that focuses on integrating and balancing the body, mind, and spirit.
  'Ayurvedic': prefix.sdo('Ayurvedic'),
  // Indicates that the item is available on back order.
  'BackOrder': prefix.sdo('BackOrder'),
  // A [[NewsArticle]] providing historical context, definition and detail on a specific topic (aka \"explainer\" or \"backgrounder\"). For example, an in-depth article or frequently-asked-questions ([FAQ](https://en.wikipedia.org/wiki/FAQ)) document on topics such as Climate Change or the European Union. Other kinds of background material from a non-news setting are often described using [[Book]] or [[Article]], in particular [[ScholarlyArticle]]. See also [[NewsArticle]] for related vocabulary from a learning/education perspective.
  'BackgroundNewsArticle': prefix.sdo('BackgroundNewsArticle'),
  // Pathogenic bacteria that cause bacterial infection.
  'Bacteria': prefix.sdo('Bacteria'),
  // A bakery.
  'Bakery': prefix.sdo('Bakery'),
  // Physical activity that is engaged to help maintain posture and balance.
  'Balance': prefix.sdo('Balance'),
  // A product or service offered by a bank whereby one may deposit, withdraw or transfer money and in some cases be paid interest.
  'BankAccount': prefix.sdo('BankAccount'),
  // Bank or credit union.
  'BankOrCreditUnion': prefix.sdo('BankOrCreditUnion'),
  // A bar or pub.
  'BarOrPub': prefix.sdo('BarOrPub'),
  // An image of a visual machine-readable code such as a barcode or QR code.
  'Barcode': prefix.sdo('Barcode'),
  // BasicIncome: this is a benefit for basic income.
  'BasicIncome': prefix.sdo('BasicIncome'),
  // Beach.
  'Beach': prefix.sdo('Beach'),
  // Beauty salon.
  'BeautySalon': prefix.sdo('BeautySalon'),
  // Bed and breakfast.<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'BedAndBreakfast': prefix.sdo('BedAndBreakfast'),
  // An entity holding detailed information about the available bed types, e.g. the quantity of twin beds for a hotel room. For the single case of just one bed of a certain type, you can use bed directly with a text. See also [[BedType]] (under development).
  'BedDetails': prefix.sdo('BedDetails'),
  // A type of bed. This is used for indicating the bed or beds available in an accommodation.
  'BedType': prefix.sdo('BedType'),
  // The act of forming a personal connection with someone (object) mutually/bidirectionally/symmetrically.Related actions:* [[FollowAction]]: Unlike FollowAction, BefriendAction implies that the connection is reciprocal.
  'BefriendAction': prefix.sdo('BefriendAction'),
  // Content about the benefits and advantages of usage or utilization of topic.
  'BenefitsHealthAspect': prefix.sdo('BenefitsHealthAspect'),
  // A bike store.
  'BikeStore': prefix.sdo('BikeStore'),
  // Any biological, chemical, or biochemical thing. For example: a protein; a gene; a chemical; a synthetic chemical.
  'BioChemEntity': prefix.sdo('BioChemEntity'),
  // A [blog](https://en.wikipedia.org/wiki/Blog), sometimes known as a \"weblog\". Note that the individual posts ([[BlogPosting]]s) in a [[Blog]] are often colloqually referred to by the same term.
  'Blog': prefix.sdo('Blog'),
  // A blog post.
  'BlogPosting': prefix.sdo('BlogPosting'),
  // A medical test performed on a sample of a patient's blood.
  'BloodTest': prefix.sdo('BloodTest'),
  // A type of boarding policy used by an airline.
  'BoardingPolicyType': prefix.sdo('BoardingPolicyType'),
  // A reservation for boat travel.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use [[Offer]].
  'BoatReservation': prefix.sdo('BoatReservation'),
  // A terminal for boats, ships, and other water vessels.
  'BoatTerminal': prefix.sdo('BoatTerminal'),
  // A trip on a commercial ferry line.
  'BoatTrip': prefix.sdo('BoatTrip'),
  // Arm length (measured between arms/shoulder line intersection and the prominent wrist bone). Used, for example, to fit shirts.
  'BodyMeasurementArm': prefix.sdo('BodyMeasurementArm'),
  // Maximum girth of bust. Used, for example, to fit women's suits.
  'BodyMeasurementBust': prefix.sdo('BodyMeasurementBust'),
  // Maximum girth of chest. Used, for example, to fit men's suits.
  'BodyMeasurementChest': prefix.sdo('BodyMeasurementChest'),
  // Foot length (measured between end of the most prominent toe and the most prominent part of the heel). Used, for example, to measure socks.
  'BodyMeasurementFoot': prefix.sdo('BodyMeasurementFoot'),
  // Maximum hand girth (measured over the knuckles of the open right hand excluding thumb, fingers together). Used, for example, to fit gloves.
  'BodyMeasurementHand': prefix.sdo('BodyMeasurementHand'),
  // Maximum girth of head above the ears. Used, for example, to fit hats.
  'BodyMeasurementHead': prefix.sdo('BodyMeasurementHead'),
  // Body height (measured between crown of head and soles of feet). Used, for example, to fit jackets.
  'BodyMeasurementHeight': prefix.sdo('BodyMeasurementHeight'),
  // Girth of hips (measured around the buttocks). Used, for example, to fit skirts.
  'BodyMeasurementHips': prefix.sdo('BodyMeasurementHips'),
  // Inside leg (measured between crotch and soles of feet). Used, for example, to fit pants.
  'BodyMeasurementInsideLeg': prefix.sdo('BodyMeasurementInsideLeg'),
  // Girth of neck. Used, for example, to fit shirts.
  'BodyMeasurementNeck': prefix.sdo('BodyMeasurementNeck'),
  // Enumerates types (or dimensions) of a person's body measurements, for example for fitting of clothes.
  'BodyMeasurementTypeEnumeration': prefix.sdo('BodyMeasurementTypeEnumeration'),
  // Girth of body just below the bust. Used, for example, to fit women's swimwear.
  'BodyMeasurementUnderbust': prefix.sdo('BodyMeasurementUnderbust'),
  // Girth of natural waistline (between hip bones and lower ribs). Used, for example, to fit pants.
  'BodyMeasurementWaist': prefix.sdo('BodyMeasurementWaist'),
  // Body weight. Used, for example, to measure pantyhose.
  'BodyMeasurementWeight': prefix.sdo('BodyMeasurementWeight'),
  // A body of water, such as a sea, ocean, or lake.
  'BodyOfWater': prefix.sdo('BodyOfWater'),
  // Rigid connective tissue that comprises up the skeletal structure of the human body.
  'Bone': prefix.sdo('Bone'),
  // A book.
  'Book': prefix.sdo('Book'),
  // The publication format of the book.
  'BookFormatType': prefix.sdo('BookFormatType'),
  // A series of books. Included books can be indicated with the hasPart property.
  'BookSeries': prefix.sdo('BookSeries'),
  // A bookstore.
  'BookStore': prefix.sdo('BookStore'),
  // An agent bookmarks/flags/labels/tags/marks an object.
  'BookmarkAction': prefix.sdo('BookmarkAction'),
  // Boolean: True or False.
  'Boolean': prefix.sdo('Boolean'),
  // The act of obtaining an object under an agreement to return it at a later date. Reciprocal of LendAction.Related actions:* [[LendAction]]: Reciprocal of BorrowAction.
  'BorrowAction': prefix.sdo('BorrowAction'),
  // A bowling alley.
  'BowlingAlley': prefix.sdo('BowlingAlley'),
  // Any anatomical structure which pertains to the soft nervous tissue functioning as the coordinating center of sensation and intellectual and nervous activity.
  'BrainStructure': prefix.sdo('BrainStructure'),
  // A brand is a name used by an organization or business person for labeling a product, product group, or similar.
  'Brand': prefix.sdo('Brand'),
  // A BreadcrumbList is an ItemList consisting of a chain of linked Web pages, typically described using at least their URL and their name, and typically ending with the current page.The [[position]] property is used to reconstruct the order of the items in a BreadcrumbList The convention is that a breadcrumb list has an [[itemListOrder]] of [[ItemListOrderAscending]] (lower values listed first), and that the first items in this list correspond to the \"top\" or beginning of the breadcrumb trail, e.g. with a site or section homepage. The specific values of 'position' are not assigned meaning for a BreadcrumbList, but they should be integers, e.g. beginning with '1' for the first item in the list.
  'BreadcrumbList': prefix.sdo('BreadcrumbList'),
  // Brewery.
  'Brewery': prefix.sdo('Brewery'),
  // A bridge.
  'Bridge': prefix.sdo('Bridge'),
  // A unique instance of a BroadcastService on a CableOrSatelliteService lineup.
  'BroadcastChannel': prefix.sdo('BroadcastChannel'),
  // An over the air or online broadcast event.
  'BroadcastEvent': prefix.sdo('BroadcastEvent'),
  // The frequency in MHz and the modulation used for a particular BroadcastService.
  'BroadcastFrequencySpecification': prefix.sdo('BroadcastFrequencySpecification'),
  // BroadcastRelease.
  'BroadcastRelease': prefix.sdo('BroadcastRelease'),
  // A delivery service through which content is provided via broadcast over the air or online.
  'BroadcastService': prefix.sdo('BroadcastService'),
  // An account that allows an investor to deposit funds and place investment orders with a licensed broker or brokerage firm.
  'BrokerageAccount': prefix.sdo('BrokerageAccount'),
  // A Buddhist temple.
  'BuddhistTemple': prefix.sdo('BuddhistTemple'),
  // A bus (also omnibus or autobus) is a road vehicle designed to carry passengers. Coaches are luxury busses, usually in service for long distance travel.
  'BusOrCoach': prefix.sdo('BusOrCoach'),
  // A reservation for bus travel. Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use [[Offer]].
  'BusReservation': prefix.sdo('BusReservation'),
  // A bus station.
  'BusStation': prefix.sdo('BusStation'),
  // A bus stop.
  'BusStop': prefix.sdo('BusStop'),
  // A trip on a commercial bus line.
  'BusTrip': prefix.sdo('BusTrip'),
  // A set of characteristics belonging to businesses, e.g. who compose an item's target audience.
  'BusinessAudience': prefix.sdo('BusinessAudience'),
  // A business entity type is a conceptual entity representing the legal form, the size, the main line of business, the position in the value chain, or any combination thereof, of an organization or business person.Commonly used values:* http://purl.org/goodrelations/v1#Business* http://purl.org/goodrelations/v1#Enduser* http://purl.org/goodrelations/v1#PublicInstitution* http://purl.org/goodrelations/v1#Reseller\t
  'BusinessEntityType': prefix.sdo('BusinessEntityType'),
  // Event type: Business event.
  'BusinessEvent': prefix.sdo('BusinessEvent'),
  // The business function specifies the type of activity or access (i.e., the bundle of rights) offered by the organization or business person through the offer. Typical are sell, rental or lease, maintenance or repair, manufacture / produce, recycle / dispose, engineering / construction, or installation. Proprietary specifications of access rights are also instances of this class.Commonly used values:* http://purl.org/goodrelations/v1#ConstructionInstallation* http://purl.org/goodrelations/v1#Dispose* http://purl.org/goodrelations/v1#LeaseOut* http://purl.org/goodrelations/v1#Maintain* http://purl.org/goodrelations/v1#ProvideService* http://purl.org/goodrelations/v1#Repair* http://purl.org/goodrelations/v1#Sell* http://purl.org/goodrelations/v1#Buy
  'BusinessFunction': prefix.sdo('BusinessFunction'),
  // BusinessSupport: this is a benefit for supporting businesses.
  'BusinessSupport': prefix.sdo('BusinessSupport'),
  // The act of giving money to a seller in exchange for goods or services rendered. An agent buys an object, product, or service from a seller for a price. Reciprocal of SellAction.
  'BuyAction': prefix.sdo('BuyAction'),
  // A CDCPMDRecord is a data structure representing a record in a CDC tabular data format      used for hospital data reporting. See [documentation](/docs/cdc-covid.html) for details, and the linked CDC materials for authoritative      definitions used as the source here.
  'CDCPMDRecord': prefix.sdo('CDCPMDRecord'),
  // CDFormat.
  'CDFormat': prefix.sdo('CDFormat'),
  // X-ray computed tomography imaging.
  'CT': prefix.sdo('CT'),
  // A service which provides access to media programming like TV or radio. Access may be via cable or satellite.
  'CableOrSatelliteService': prefix.sdo('CableOrSatelliteService'),
  // A cafe or coffee shop.
  'CafeOrCoffeeShop': prefix.sdo('CafeOrCoffeeShop'),
  // A camping site, campsite, or [[Campground]] is a place used for overnight stay in the outdoors, typically containing individual [[CampingPitch]] locations. In British English a campsite is an area, usually divided into a number of pitches, where people can camp overnight using tents or camper vans or caravans; this British English use of the word is synonymous with the American English expression campground. In American English the term campsite generally means an area where an individual, family, group, or military unit can pitch a tent or park a camper; a campground may contain many campsites (Source: Wikipedia see [https://en.wikipedia.org/wiki/Campsite](https://en.wikipedia.org/wiki/Campsite)).See also the dedicated [document on the use of schema.org for marking up hotels and other forms of accommodations](/docs/hotels.html).
  'Campground': prefix.sdo('Campground'),
  // A [[CampingPitch]] is an individual place for overnight stay in the outdoors, typically being part of a larger camping site, or [[Campground]].In British English a campsite, or campground, is an area, usually divided into a number of pitches, where people can camp overnight using tents or camper vans or caravans; this British English use of the word is synonymous with the American English expression campground. In American English the term campsite generally means an area where an individual, family, group, or military unit can pitch a tent or park a camper; a campground may contain many campsites.(Source: Wikipedia see [https://en.wikipedia.org/wiki/Campsite](https://en.wikipedia.org/wiki/Campsite)).See also the dedicated [document on the use of schema.org for marking up hotels and other forms of accommodations](/docs/hotels.html).
  'CampingPitch': prefix.sdo('CampingPitch'),
  // A canal, like the Panama Canal.
  'Canal': prefix.sdo('Canal'),
  // The act of asserting that a future event/action is no longer going to happen.Related actions:* [[ConfirmAction]]: The antonym of CancelAction.
  'CancelAction': prefix.sdo('CancelAction'),
  // A car is a wheeled, self-powered motor vehicle used for transportation.
  'Car': prefix.sdo('Car'),
  // A value indicating a special usage of a car, e.g. commercial rental, driving school, or as a taxi.
  'CarUsageType': prefix.sdo('CarUsageType'),
  // A specific branch of medical science that pertains to diagnosis and treatment of disorders of heart and vasculature.
  'Cardiovascular': prefix.sdo('Cardiovascular'),
  // Cardiovascular system assessment withclinical examination.
  'CardiovascularExam': prefix.sdo('CardiovascularExam'),
  // A case series (also known as a clinical series) is a medical research study that tracks patients with a known exposure given similar treatment or examines their medical records for exposure and outcome. A case series can be retrospective or prospective and usually involves a smaller number of patients than the more powerful case-control studies or randomized controlled trials. Case series may be consecutive or non-consecutive, depending on whether all cases presenting to the reporting authors over a period of time were included, or only a selection.
  'CaseSeries': prefix.sdo('CaseSeries'),
  // A casino.
  'Casino': prefix.sdo('Casino'),
  // CassetteFormat.
  'CassetteFormat': prefix.sdo('CassetteFormat'),
  // A Category Code.
  'CategoryCode': prefix.sdo('CategoryCode'),
  // A set of Category Code values.
  'CategoryCodeSet': prefix.sdo('CategoryCodeSet'),
  // A Catholic church.
  'CatholicChurch': prefix.sdo('CatholicChurch'),
  // Information about the causes and main actions that gave rise to the topic.
  'CausesHealthAspect': prefix.sdo('CausesHealthAspect'),
  // A graveyard.
  'Cemetery': prefix.sdo('Cemetery'),
  // One of the sections into which a book is divided. A chapter usually has a section number or a name.
  'Chapter': prefix.sdo('Chapter'),
  // CharitableIncorporatedOrganization: Non-profit type referring to a Charitable Incorporated Organization (UK).
  'CharitableIncorporatedOrganization': prefix.sdo('CharitableIncorporatedOrganization'),
  // An agent inspects, determines, investigates, inquires, or examines an object's accuracy, quality, condition, or state.
  'CheckAction': prefix.sdo('CheckAction'),
  // The act of an agent communicating (service provider, social media, etc) their arrival by registering/confirming for a previously reserved service (e.g. flight check in) or at a place (e.g. hotel), possibly resulting in a result (boarding pass, etc).Related actions:* [[CheckOutAction]]: The antonym of CheckInAction.* [[ArriveAction]]: Unlike ArriveAction, CheckInAction implies that the agent is informing/confirming the start of a previously reserved service.* [[ConfirmAction]]: Unlike ConfirmAction, CheckInAction implies that the agent is informing/confirming the *start* of a previously reserved service rather than its validity/existence.
  'CheckInAction': prefix.sdo('CheckInAction'),
  // The act of an agent communicating (service provider, social media, etc) their departure of a previously reserved service (e.g. flight check in) or place (e.g. hotel).Related actions:* [[CheckInAction]]: The antonym of CheckOutAction.* [[DepartAction]]: Unlike DepartAction, CheckOutAction implies that the agent is informing/confirming the end of a previously reserved service.* [[CancelAction]]: Unlike CancelAction, CheckOutAction implies that the agent is informing/confirming the end of a previously reserved service.
  'CheckOutAction': prefix.sdo('CheckOutAction'),
  // Web page type: Checkout page.
  'CheckoutPage': prefix.sdo('CheckoutPage'),
  // A chemical substance is 'a portion of matter of constant composition, composed of molecular entities of the same type or of different types' (source: [ChEBI:59999](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=59999)).
  'ChemicalSubstance': prefix.sdo('ChemicalSubstance'),
  // A Childcare center.
  'ChildCare': prefix.sdo('ChildCare'),
  // Event type: Children's event.
  'ChildrensEvent': prefix.sdo('ChildrensEvent'),
  // A system of medicine focused on the relationship between the body's structure, mainly the spine, and its functioning.
  'Chiropractic': prefix.sdo('Chiropractic'),
  // The act of expressing a preference from a set of options or a large or unbounded set of choices/options.
  'ChooseAction': prefix.sdo('ChooseAction'),
  // A church.
  'Church': prefix.sdo('Church'),
  // A city or town.
  'City': prefix.sdo('City'),
  // A city hall.
  'CityHall': prefix.sdo('CityHall'),
  // A public structure, such as a town hall or concert hall.
  'CivicStructure': prefix.sdo('CivicStructure'),
  // A [[Claim]] in Schema.org represents a specific, factually-oriented claim that could be the [[itemReviewed]] in a [[ClaimReview]]. The content of a claim can be summarized with the [[text]] property. Variations on well known claims can have their common identity indicated via [[sameAs]] links, and summarized with a [[name]]. Ideally, a [[Claim]] description includes enough contextual information to minimize the risk of ambiguity or inclarity. In practice, many claims are better understood in the context in which they appear or the interpretations provided by claim reviews.  Beyond [[ClaimReview]], the Claim type can be associated with related creative works - for example a [[ScholarlyArticle]] or [[Question]] might be [[about]] some [[Claim]].  At this time, Schema.org does not define any types of relationship between claims. This is a natural area for future exploration.
  'Claim': prefix.sdo('Claim'),
  // A fact-checking review of claims made (or reported) in some creative work (referenced via itemReviewed).
  'ClaimReview': prefix.sdo('ClaimReview'),
  // A class, also often called a 'Type'; equivalent to rdfs:Class.
  'Class': prefix.sdo('Class'),
  // Represents the cleaning fee part of the total price for an offered product, for example a vacation rental.
  'CleaningFee': prefix.sdo('CleaningFee'),
  // Medical clinicians, including practicing physicians and other medical professionals involved in clinical practice.
  'Clinician': prefix.sdo('Clinician'),
  // A short TV or radio program or a segment/part of a program.
  'Clip': prefix.sdo('Clip'),
  // A clothing store.
  'ClothingStore': prefix.sdo('ClothingStore'),
  // Play mode: CoOp. Co-operative games, where you play on the same team with friends.
  'CoOp': prefix.sdo('CoOp'),
  // Computer programming source code. Example: Full (compile ready) solutions, code snippet samples, scripts, templates.
  'Code': prefix.sdo('Code'),
  // Also known as a panel study. A cohort study is a form of longitudinal study used in medicine and social science. It is one type of study design and should be compared with a cross-sectional study.  A cohort is a group of people who share a common characteristic or experience within a defined period (e.g., are born, leave school, lose their job, are exposed to a drug or a vaccine, etc.). The comparison group may be the general population from which the cohort is drawn, or it may be another cohort of persons thought to have had little or no exposure to the substance under investigation, but otherwise similar. Alternatively, subgroups within the cohort may be compared with each other.
  'CohortStudy': prefix.sdo('CohortStudy'),
  // A collection of items e.g. creative works or products.
  'Collection': prefix.sdo('Collection'),
  // Web page type: Collection page.
  'CollectionPage': prefix.sdo('CollectionPage'),
  // A college, university, or other third-level educational institution.
  'CollegeOrUniversity': prefix.sdo('CollegeOrUniversity'),
  // A comedy club.
  'ComedyClub': prefix.sdo('ComedyClub'),
  // Event type: Comedy event.
  'ComedyEvent': prefix.sdo('ComedyEvent'),
  // The artwork on the cover of a comic.
  'ComicCoverArt': prefix.sdo('ComicCoverArt'),
  // Individual comic issues are serially published as    \tpart of a larger series. For the sake of consistency, even one-shot issues    \tbelong to a series comprised of a single issue. All comic issues can be    \tuniquely identified by: the combination of the name and volume number of the    \tseries to which the issue belongs; the issue number; and the variant    \tdescription of the issue (if any).
  'ComicIssue': prefix.sdo('ComicIssue'),
  // A sequential publication of comic stories under a    \tunifying title, for example \"The Amazing Spider-Man\" or \"Groo the    \tWanderer\".
  'ComicSeries': prefix.sdo('ComicSeries'),
  // The term \"story\" is any indivisible, re-printable    \tunit of a comic, including the interior stories, covers, and backmatter. Most    \tcomics have at least two stories: a cover (ComicCoverArt) and an interior story.
  'ComicStory': prefix.sdo('ComicStory'),
  // A comment on an item - for example, a comment on a blog post. The comment's content is expressed via the [[text]] property, and its topic via [[about]], properties shared with all CreativeWorks.
  'Comment': prefix.sdo('Comment'),
  // The act of generating a comment about a subject.
  'CommentAction': prefix.sdo('CommentAction'),
  // Permission to add comments to the document.
  'CommentPermission': prefix.sdo('CommentPermission'),
  // The act of conveying information to another person via a communication medium (instrument) such as speech, email, or telephone conversation.
  'CommunicateAction': prefix.sdo('CommunicateAction'),
  // A field of public health focusing on improving health characteristics of a defined population in relation with their geographical or environment areas.
  'CommunityHealth': prefix.sdo('CommunityHealth'),
  // CompilationAlbum.
  'CompilationAlbum': prefix.sdo('CompilationAlbum'),
  // A [[CompleteDataFeed]] is a [[DataFeed]] whose standard representation includes content for every item currently in the feed.This is the equivalent of Atom's element as defined in Feed Paging and Archiving [RFC 5005](https://tools.ietf.org/html/rfc5005), For example (and as defined for Atom), when using data from a feed that represents a collection of items that varies over time (e.g. \"Top Twenty Records\") there is no need to have newer entries mixed in alongside older, obsolete entries. By marking this feed as a CompleteDataFeed, old entries can be safely discarded when the feed is refreshed, since we can assume the feed has provided descriptions for all current items.
  'CompleteDataFeed': prefix.sdo('CompleteDataFeed'),
  // Completed.
  'Completed': prefix.sdo('Completed'),
  // An action that has already taken place.
  'CompletedActionStatus': prefix.sdo('CompletedActionStatus'),
  // A compound price specification is one that bundles multiple prices that all apply in combination for different dimensions of consumption. Use the name property of the attached unit price specification for indicating the dimension of a price component (e.g. \"electricity\" or \"final cleaning\").
  'CompoundPriceSpecification': prefix.sdo('CompoundPriceSpecification'),
  // This type covers computer programming languages such as Scheme and Lisp, as well as other language-like computer representations. Natural languages are best represented with the [[Language]] type.
  'ComputerLanguage': prefix.sdo('ComputerLanguage'),
  // A computer store.
  'ComputerStore': prefix.sdo('ComputerStore'),
  // The act of notifying someone that a future event/action is going to happen as expected.Related actions:* [[CancelAction]]: The antonym of ConfirmAction.
  'ConfirmAction': prefix.sdo('ConfirmAction'),
  // A Consortium is a membership [[Organization]] whose members are typically Organizations.
  'Consortium': prefix.sdo('Consortium'),
  // The act of ingesting information/resources/food.
  'ConsumeAction': prefix.sdo('ConsumeAction'),
  // Web page type: Contact page.
  'ContactPage': prefix.sdo('ContactPage'),
  // A contact point&#x2014;for example, a Customer Complaints department.
  'ContactPoint': prefix.sdo('ContactPoint'),
  // Enumerated options related to a ContactPoint.
  'ContactPointOption': prefix.sdo('ContactPointOption'),
  // Content about contagion mechanisms and contagiousness information over the topic.
  'ContagiousnessHealthAspect': prefix.sdo('ContagiousnessHealthAspect'),
  // One of the continents (for example, Europe or Africa).
  'Continent': prefix.sdo('Continent'),
  // An agent controls a device or application.
  'ControlAction': prefix.sdo('ControlAction'),
  // A convenience store.
  'ConvenienceStore': prefix.sdo('ConvenienceStore'),
  // One or more messages between organizations or people on a particular topic. Individual messages can be linked to the conversation with isPartOf or hasPart properties.
  'Conversation': prefix.sdo('Conversation'),
  // The act of producing/preparing food.
  'CookAction': prefix.sdo('CookAction'),
  // Organization: A business corporation.
  'Corporation': prefix.sdo('Corporation'),
  // A [[comment]] that corrects [[CreativeWork]].
  'CorrectionComment': prefix.sdo('CorrectionComment'),
  // A country.
  'Country': prefix.sdo('Country'),
  // A description of an educational course which may be offered as distinct instances at which take place at different times or take place at different locations, or be offered through different media or modes of study. An educational course is a sequence of one or more educational events and/or creative works which aims to build knowledge, competence or ability of learners.
  'Course': prefix.sdo('Course'),
  // An instance of a [[Course]] which is distinct from other instances because it is offered at a different time or location or through different media or modes of study or to a specific section of students.
  'CourseInstance': prefix.sdo('CourseInstance'),
  // A courthouse.
  'Courthouse': prefix.sdo('Courthouse'),
  // The artwork on the outer surface of a CreativeWork.
  'CoverArt': prefix.sdo('CoverArt'),
  // A CovidTestingFacility is a [[MedicalClinic]] where testing for the COVID-19 Coronavirus      disease is available. If the facility is being made available from an established [[Pharmacy]], [[Hotel]], or other      non-medical organization, multiple types can be listed. This makes it easier to re-use existing schema.org information      about that place e.g. contact info, address, opening hours. Note that in an emergency, such information may not always be reliable.
  'CovidTestingFacility': prefix.sdo('CovidTestingFacility'),
  // The act of deliberately creating/producing/generating/building a result out of the agent.
  'CreateAction': prefix.sdo('CreateAction'),
  // The most generic kind of creative work, including books, movies, photographs, software programs, etc.
  'CreativeWork': prefix.sdo('CreativeWork'),
  // A media season e.g. tv, radio, video game etc.
  'CreativeWorkSeason': prefix.sdo('CreativeWorkSeason'),
  // A CreativeWorkSeries in schema.org is a group of related items, typically but not necessarily of the same kind. CreativeWorkSeries are usually organized into some order, often chronological. Unlike [[ItemList]] which is a general purpose data structure for lists of things, the emphasis with CreativeWorkSeries is on published materials (written e.g. books and periodicals, or media such as tv, radio and games).Specific subtypes are available for describing [[TVSeries]], [[RadioSeries]], [[MovieSeries]], [[BookSeries]], [[Periodical]] and [[VideoGameSeries]]. In each case, the [[hasPart]] / [[isPartOf]] properties can be used to relate the CreativeWorkSeries to its parts. The general CreativeWorkSeries type serves largely just to organize these more specific and practical subtypes.It is common for properties applicable to an item from the series to be usefully applied to the containing group. Schema.org attempts to anticipate some of these cases, but publishers should be free to apply properties of the series parts to the series as a whole wherever they seem appropriate.\t
  'CreativeWorkSeries': prefix.sdo('CreativeWorkSeries'),
  // A card payment method of a particular brand or name.  Used to mark up a particular payment method and/or the financial product/service that supplies the card account.Commonly used values:* http://purl.org/goodrelations/v1#AmericanExpress* http://purl.org/goodrelations/v1#DinersClub* http://purl.org/goodrelations/v1#Discover* http://purl.org/goodrelations/v1#JCB* http://purl.org/goodrelations/v1#MasterCard* http://purl.org/goodrelations/v1#VISA
  'CreditCard': prefix.sdo('CreditCard'),
  // A crematorium.
  'Crematorium': prefix.sdo('Crematorium'),
  // A [[CriticReview]] is a more specialized form of Review written or published by a source that is recognized for its reviewing activities. These can include online columns, travel and food guides, TV and radio shows, blogs and other independent Web sites. [[CriticReview]]s are typically more in-depth and professionally written. For simpler, casually written user/visitor/viewer/customer reviews, it is more appropriate to use the [[UserReview]] type. Review aggregator sites such as Metacritic already separate out the site's user reviews from selected critic reviews that originate from third-party sources.
  'CriticReview': prefix.sdo('CriticReview'),
  // Studies carried out on pre-existing data (usually from 'snapshot' surveys), such as that collected by the Census Bureau. Sometimes called Prevalence Studies.
  'CrossSectional': prefix.sdo('CrossSectional'),
  // Text representing a CSS selector.
  'CssSelectorType': prefix.sdo('CssSelectorType'),
  // A service to convert funds from one currency to another currency.
  'CurrencyConversionService': prefix.sdo('CurrencyConversionService'),
  // An alternative, closely-related condition typically considered later in the differential diagnosis process along with the signs that are used to distinguish it.
  'DDxElement': prefix.sdo('DDxElement'),
  // DJMixAlbum.
  'DJMixAlbum': prefix.sdo('DJMixAlbum'),
  // DVDFormat.
  'DVDFormat': prefix.sdo('DVDFormat'),
  // Indicates that the item is damaged.
  'DamagedCondition': prefix.sdo('DamagedCondition'),
  // Event type: A social dance.
  'DanceEvent': prefix.sdo('DanceEvent'),
  // A dance group&#x2014;for example, the Alvin Ailey Dance Theater or Riverdance.
  'DanceGroup': prefix.sdo('DanceGroup'),
  // A collection of datasets.
  'DataCatalog': prefix.sdo('DataCatalog'),
  // A dataset in downloadable form.
  'DataDownload': prefix.sdo('DataDownload'),
  // A single feed providing structured information about one or more entities or topics.
  'DataFeed': prefix.sdo('DataFeed'),
  // A single item within a larger data feed.
  'DataFeedItem': prefix.sdo('DataFeedItem'),
  // The basic data types such as Integers, Strings, etc.
  'DataType': prefix.sdo('DataType'),
  // A body of structured information describing some topic(s) of interest.
  'Dataset': prefix.sdo('Dataset'),
  // A date value in [ISO 8601 date format](http://en.wikipedia.org/wiki/ISO_8601).
  'Date': prefix.sdo('Date'),
  // A combination of date and time of day in the form [-]CCYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm] (see Chapter 5.4 of ISO 8601).
  'DateTime': prefix.sdo('DateTime'),
  // A DatedMoneySpecification represents monetary values with optional start and end dates. For example, this could represent an employee's salary over a specific period of time. __Note:__ This type has been superseded by [[MonetaryAmount]] use of that type is recommended
  'DatedMoneySpecification': prefix.sdo('DatedMoneySpecification'),
  // The day of the week, e.g. used to specify to which day the opening hours of an OpeningHoursSpecification refer.Originally, URLs from [GoodRelations](http://purl.org/goodrelations/v1) were used (for [[Monday]], [[Tuesday]], [[Wednesday]], [[Thursday]], [[Friday]], [[Saturday]], [[Sunday]] plus a special entry for [[PublicHolidays]]); these have now been integrated directly into schema.org.
  'DayOfWeek': prefix.sdo('DayOfWeek'),
  // A day spa.
  'DaySpa': prefix.sdo('DaySpa'),
  // The act of stopping or deactivating a device or application (e.g. stopping a timer or turning off a flashlight).
  'DeactivateAction': prefix.sdo('DeactivateAction'),
  // Content coded 'missing context' in a [[MediaReview]], considered in the context of how it was published or shared.For a [[VideoObject]] to be 'missing context': Presenting unaltered video in an inaccurate manner that misrepresents the footage. For example, using incorrect dates or locations, altering the transcript or sharing brief clips from a longer video to mislead viewers. (A video rated 'original' can also be missing context.)For an [[ImageObject]] to be 'missing context': Presenting unaltered images in an inaccurate manner to misrepresent the image and mislead the viewer. For example, a common tactic is using an unaltered image but saying it came from a different time or place. (An image rated 'original' can also be missing context.)For an [[ImageObject]] with embedded text to be 'missing context': An unaltered image presented in an inaccurate manner to misrepresent the image and mislead the viewer. For example, a common tactic is using an unaltered image but saying it came from a different time or place. (An 'original' image with inaccurate text would generally fall in this category.)For an [[AudioObject]] to be 'missing context': Unaltered audio presented in an inaccurate manner that misrepresents it. For example, using incorrect dates or locations, or sharing brief clips from a longer recording to mislead viewers. (Audio rated “original” can also be missing context.)
  'DecontextualizedContent': prefix.sdo('DecontextualizedContent'),
  // A defence establishment, such as an army or navy base.
  'DefenceEstablishment': prefix.sdo('DefenceEstablishment'),
  // A DefinedRegion is a geographic area defined by potentially arbitrary (rather than political, administrative or natural geographical) criteria. Properties are provided for defining a region by reference to sets of postal codes.Examples: a delivery destination when shopping. Region where regional pricing is configured.Requirement 1:Country: USStates: \"NY\", \"CA\"Requirement 2:Country: USPostalCode Set: { [94000-94585], [97000, 97999], [13000, 13599]}{ [12345, 12345], [78945, 78945], }Region = state, canton, prefecture, autonomous community...
  'DefinedRegion': prefix.sdo('DefinedRegion'),
  // A word, name, acronym, phrase, etc. with a formal definition. Often used in the context of category or subject classification, glossaries or dictionaries, product or creative work types, etc. Use the name property for the term being defined, use termCode if the term has an alpha-numeric code allocated, use description to provide the definition of the term.
  'DefinedTerm': prefix.sdo('DefinedTerm'),
  // A set of defined terms for example a set of categories or a classification scheme, a glossary, dictionary or enumeration.
  'DefinedTermSet': prefix.sdo('DefinedTermSet'),
  // Indicates a document for which the text is conclusively what the law says and is legally binding. (e.g. The digitally signed version of an Official Journal.)  Something \"Definitive\" is considered to be also [[AuthoritativeLegalValue]].
  'DefinitiveLegalValue': prefix.sdo('DefinitiveLegalValue'),
  // The act of editing a recipient by removing one of its objects.
  'DeleteAction': prefix.sdo('DeleteAction'),
  // The price for the delivery of an offer using a particular delivery method.
  'DeliveryChargeSpecification': prefix.sdo('DeliveryChargeSpecification'),
  // An event involving the delivery of an item.
  'DeliveryEvent': prefix.sdo('DeliveryEvent'),
  // A delivery method is a standardized procedure for transferring the product or service to the destination of fulfillment chosen by the customer. Delivery methods are characterized by the means of transportation used, and by the organization or group that is the contracting party for the sending organization or person.Commonly used values:* http://purl.org/goodrelations/v1#DeliveryModeDirectDownload* http://purl.org/goodrelations/v1#DeliveryModeFreight* http://purl.org/goodrelations/v1#DeliveryModeMail* http://purl.org/goodrelations/v1#DeliveryModeOwnFleet* http://purl.org/goodrelations/v1#DeliveryModePickUp* http://purl.org/goodrelations/v1#DHL* http://purl.org/goodrelations/v1#FederalExpress* http://purl.org/goodrelations/v1#UPS
  'DeliveryMethod': prefix.sdo('DeliveryMethod'),
  // A DeliveryTimeSettings represents re-usable pieces of shipping information, relating to timing. It is designed for publication on an URL that may be referenced via the [[shippingSettingsLink]] property of a [[OfferShippingDetails]]. Several occurrences can be published, distinguished (and identified/referenced) by their different values for [[transitTimeLabel]].
  'DeliveryTimeSettings': prefix.sdo('DeliveryTimeSettings'),
  // A demand entity represents the public, not necessarily binding, not necessarily exclusive, announcement by an organization or person to seek a certain type of goods or services. For describing demand using this type, the very same properties used for Offer apply.
  'Demand': prefix.sdo('Demand'),
  // DemoAlbum.
  'DemoAlbum': prefix.sdo('DemoAlbum'),
  // A dentist.
  'Dentist': prefix.sdo('Dentist'),
  // A branch of medicine that is involved in the dental care.
  'Dentistry': prefix.sdo('Dentistry'),
  // The act of  departing from a place. An agent departs from an fromLocation for a destination, optionally with participants.
  'DepartAction': prefix.sdo('DepartAction'),
  // A department store.
  'DepartmentStore': prefix.sdo('DepartmentStore'),
  // A type of Bank Account with a main purpose of depositing funds to gain interest or other benefits.
  'DepositAccount': prefix.sdo('DepositAccount'),
  // Something relating to or practicing dermatology.
  'Dermatologic': prefix.sdo('Dermatologic'),
  // A specific branch of medical science that pertains to diagnosis and treatment of disorders of skin.
  'Dermatology': prefix.sdo('Dermatology'),
  // A diet appropriate for people with diabetes.
  'DiabeticDiet': prefix.sdo('DiabeticDiet'),
  // A medical device used for diagnostic purposes.
  'Diagnostic': prefix.sdo('Diagnostic'),
  // A medical laboratory that offers on-site or off-site diagnostic services.
  'DiagnosticLab': prefix.sdo('DiagnosticLab'),
  // A medical procedure intended primarily for diagnostic, as opposed to therapeutic, purposes.
  'DiagnosticProcedure': prefix.sdo('DiagnosticProcedure'),
  // A strategy of regulating the intake of food to achieve or maintain a specific health-related goal.
  'Diet': prefix.sdo('Diet'),
  // Dietetic and nutrition as a medical specialty.
  'DietNutrition': prefix.sdo('DietNutrition'),
  // A product taken by mouth that contains a dietary ingredient intended to supplement the diet. Dietary ingredients may include vitamins, minerals, herbs or other botanicals, amino acids, and substances such as enzymes, organ tissues, glandulars and metabolites.
  'DietarySupplement': prefix.sdo('DietarySupplement'),
  // DigitalAudioTapeFormat.
  'DigitalAudioTapeFormat': prefix.sdo('DigitalAudioTapeFormat'),
  // An electronic file or document.
  'DigitalDocument': prefix.sdo('DigitalDocument'),
  // A permission for a particular person or group to access a particular file.
  'DigitalDocumentPermission': prefix.sdo('DigitalDocumentPermission'),
  // A type of permission which can be granted for accessing a digital document.
  'DigitalDocumentPermissionType': prefix.sdo('DigitalDocumentPermissionType'),
  // DigitalFormat.
  'DigitalFormat': prefix.sdo('DigitalFormat'),
  // DisabilitySupport: this is a benefit for disability support.
  'DisabilitySupport': prefix.sdo('DisabilitySupport'),
  // The act of expressing a difference of opinion with the object. An agent disagrees to/about an object (a proposition, topic or theme) with participants.
  'DisagreeAction': prefix.sdo('DisagreeAction'),
  // Indicates that the item has been discontinued.
  'Discontinued': prefix.sdo('Discontinued'),
  // The act of discovering/finding an object.
  'DiscoverAction': prefix.sdo('DiscoverAction'),
  // A posting to a discussion forum.
  'DiscussionForumPosting': prefix.sdo('DiscussionForumPosting'),
  // The act of expressing a negative sentiment about the object. An agent dislikes an object (a proposition, topic or theme) with participants.
  'DislikeAction': prefix.sdo('DislikeAction'),
  // Properties that take Distances as values are of the form '&lt;Number&gt; &lt;Length unit of measure&gt;'. E.g., '7 ft'.
  'Distance': prefix.sdo('Distance'),
  // Represents the distance fee (e.g., price per km or mile) part of the total price for an offered product, for example a car rental.
  'DistanceFee': prefix.sdo('DistanceFee'),
  // A distillery.
  'Distillery': prefix.sdo('Distillery'),
  // The act of providing goods, services, or money without compensation, often for philanthropic reasons.
  'DonateAction': prefix.sdo('DonateAction'),
  // A specific dosing schedule for a drug or supplement.
  'DoseSchedule': prefix.sdo('DoseSchedule'),
  // A trial design in which neither the researcher nor the patient knows the details of the treatment the patient was randomly assigned to.
  'DoubleBlindedTrial': prefix.sdo('DoubleBlindedTrial'),
  // The act of downloading an object.
  'DownloadAction': prefix.sdo('DownloadAction'),
  // Represents the downpayment (up-front payment) price component of the total price for an offered product that has additional installment payments.
  'Downpayment': prefix.sdo('Downpayment'),
  // The act of producing a visual/graphical representation of an object, typically with a pen/pencil and paper as instruments.
  'DrawAction': prefix.sdo('DrawAction'),
  // A picture or diagram made with a pencil, pen, or crayon rather than paint.
  'Drawing': prefix.sdo('Drawing'),
  // The act of swallowing liquids.
  'DrinkAction': prefix.sdo('DrinkAction'),
  // A value indicating which roadwheels will receive torque.
  'DriveWheelConfigurationValue': prefix.sdo('DriveWheelConfigurationValue'),
  // Indicates the usage of the vehicle for driving school.
  'DrivingSchoolVehicleUsage': prefix.sdo('DrivingSchoolVehicleUsage'),
  // A chemical or biologic substance, used as a medical therapy, that has a physiological effect on an organism. Here the term drug is used interchangeably with the term medicine although clinical knowledge make a clear difference between them.
  'Drug': prefix.sdo('Drug'),
  // A class of medical drugs, e.g., statins. Classes can represent general pharmacological class, common mechanisms of action, common physiological effects, etc.
  'DrugClass': prefix.sdo('DrugClass'),
  // The cost per unit of a medical drug. Note that this type is not meant to represent the price in an offer of a drug for sale; see the Offer type for that. This type will typically be used to tag wholesale or average retail cost of a drug, or maximum reimbursable cost. Costs of medical drugs vary widely depending on how and where they are paid for, so while this type captures some of the variables, costs should be used with caution by consumers of this schema's markup.
  'DrugCost': prefix.sdo('DrugCost'),
  // Enumerated categories of medical drug costs.
  'DrugCostCategory': prefix.sdo('DrugCostCategory'),
  // The legal availability status of a medical drug.
  'DrugLegalStatus': prefix.sdo('DrugLegalStatus'),
  // Categories that represent an assessment of the risk of fetal injury due to a drug or pharmaceutical used as directed by the mother during pregnancy.
  'DrugPregnancyCategory': prefix.sdo('DrugPregnancyCategory'),
  // Indicates whether this drug is available by prescription or over-the-counter.
  'DrugPrescriptionStatus': prefix.sdo('DrugPrescriptionStatus'),
  // A specific strength in which a medical drug is available in a specific country.
  'DrugStrength': prefix.sdo('DrugStrength'),
  // A dry-cleaning business.
  'DryCleaningOrLaundry': prefix.sdo('DryCleaningOrLaundry'),
  // Quantity: Duration (use [ISO 8601 duration format](http://en.wikipedia.org/wiki/ISO_8601)).
  'Duration': prefix.sdo('Duration'),
  // Book format: Ebook.
  'EBook': prefix.sdo('EBook'),
  // EPRelease.
  'EPRelease': prefix.sdo('EPRelease'),
  // Represents EU Energy Efficiency Class A as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryA': prefix.sdo('EUEnergyEfficiencyCategoryA'),
  // Represents EU Energy Efficiency Class A+ as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryA1Plus': prefix.sdo('EUEnergyEfficiencyCategoryA1Plus'),
  // Represents EU Energy Efficiency Class A++ as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryA2Plus': prefix.sdo('EUEnergyEfficiencyCategoryA2Plus'),
  // Represents EU Energy Efficiency Class A+++ as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryA3Plus': prefix.sdo('EUEnergyEfficiencyCategoryA3Plus'),
  // Represents EU Energy Efficiency Class B as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryB': prefix.sdo('EUEnergyEfficiencyCategoryB'),
  // Represents EU Energy Efficiency Class C as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryC': prefix.sdo('EUEnergyEfficiencyCategoryC'),
  // Represents EU Energy Efficiency Class D as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryD': prefix.sdo('EUEnergyEfficiencyCategoryD'),
  // Represents EU Energy Efficiency Class E as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryE': prefix.sdo('EUEnergyEfficiencyCategoryE'),
  // Represents EU Energy Efficiency Class F as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryF': prefix.sdo('EUEnergyEfficiencyCategoryF'),
  // Represents EU Energy Efficiency Class G as defined in EU energy labeling regulations.
  'EUEnergyEfficiencyCategoryG': prefix.sdo('EUEnergyEfficiencyCategoryG'),
  // Enumerates the EU energy efficiency classes A-G as well as A+, A++, and A+++ as defined in EU directive 2017/1369.
  'EUEnergyEfficiencyEnumeration': prefix.sdo('EUEnergyEfficiencyEnumeration'),
  // Ear function assessment with clinical examination.
  'Ear': prefix.sdo('Ear'),
  // The act of swallowing solid objects.
  'EatAction': prefix.sdo('EatAction'),
  // Content coded 'edited or cropped content' in a [[MediaReview]], considered in the context of how it was published or shared.For a [[VideoObject]] to be 'edited or cropped content': The video has been edited or rearranged. This category applies to time edits, including editing multiple videos together to alter the story being told or editing out large portions from a video.For an [[ImageObject]] to be 'edited or cropped content': Presenting a part of an image from a larger whole to mislead the viewer.For an [[ImageObject]] with embedded text to be 'edited or cropped content': Presenting a part of an image from a larger whole to mislead the viewer.For an [[AudioObject]] to be 'edited or cropped content': The audio has been edited or rearranged. This category applies to time edits, including editing multiple audio clips together to alter the story being told or editing out large portions from the recording.
  'EditedOrCroppedContent': prefix.sdo('EditedOrCroppedContent'),
  // Event type: Education event.
  'EducationEvent': prefix.sdo('EducationEvent'),
  // An EducationalAudience.
  'EducationalAudience': prefix.sdo('EducationalAudience'),
  // An educational or occupational credential. A diploma, academic degree, certification, qualification, badge, etc., that may be awarded to a person or other entity that meets the requirements defined by the credentialer.
  'EducationalOccupationalCredential': prefix.sdo('EducationalOccupationalCredential'),
  // A program offered by an institution which determines the learning progress to achieve an outcome, usually a credential like a degree or certificate. This would define a discrete set of opportunities (e.g., job, courses) that together constitute a program with a clear start, end, set of requirements, and transition to a new occupational opportunity (e.g., a job), or sometimes a higher educational opportunity (e.g., an advanced degree).
  'EducationalOccupationalProgram': prefix.sdo('EducationalOccupationalProgram'),
  // An educational organization.
  'EducationalOrganization': prefix.sdo('EducationalOrganization'),
  // Content about the effectiveness-related aspects of a health topic.
  'EffectivenessHealthAspect': prefix.sdo('EffectivenessHealthAspect'),
  // An electrician.
  'Electrician': prefix.sdo('Electrician'),
  // An electronics store.
  'ElectronicsStore': prefix.sdo('ElectronicsStore'),
  // An elementary school.
  'ElementarySchool': prefix.sdo('ElementarySchool'),
  // An email message.
  'EmailMessage': prefix.sdo('EmailMessage'),
  // An embassy.
  'Embassy': prefix.sdo('Embassy'),
  // A specific branch of medical science that deals with the evaluation and initial treatment of medical conditions caused by trauma or sudden illness.
  'Emergency': prefix.sdo('Emergency'),
  // An emergency service, such as a fire station or ER.
  'EmergencyService': prefix.sdo('EmergencyService'),
  // A subclass of OrganizationRole used to describe employee relationships.
  'EmployeeRole': prefix.sdo('EmployeeRole'),
  // An aggregate rating of an Organization related to its role as an employer.
  'EmployerAggregateRating': prefix.sdo('EmployerAggregateRating'),
  // An [[EmployerReview]] is a review of an [[Organization]] regarding its role as an employer, written by a current or former employee of that organization.
  'EmployerReview': prefix.sdo('EmployerReview'),
  // An employment agency.
  'EmploymentAgency': prefix.sdo('EmploymentAgency'),
  // A specific branch of medical science that pertains to diagnosis and treatment of disorders of endocrine glands and their secretions.
  'Endocrine': prefix.sdo('Endocrine'),
  // An agent approves/certifies/likes/supports/sanction an object.
  'EndorseAction': prefix.sdo('EndorseAction'),
  // An EndorsementRating is a rating that expresses some level of endorsement, for example inclusion in a \"critic's pick\" blog, a\"Like\" or \"+1\" on a social network. It can be considered the [[result]] of an [[EndorseAction]] in which the [[object]] of the action is rated positively bysome [[agent]]. As is common elsewhere in schema.org, it is sometimes more useful to describe the results of such an action without explicitly describing the [[Action]].An [[EndorsementRating]] may be part of a numeric scale or organized system, but this is not required: having an explicit type for indicating a positive,endorsement rating is particularly useful in the absence of numeric scales as it helps consumers understand that the rating is broadly positive.
  'EndorsementRating': prefix.sdo('EndorsementRating'),
  // Properties that take Energy as values are of the form '&lt;Number&gt; &lt;Energy unit of measure&gt;'.
  'Energy': prefix.sdo('Energy'),
  // EnergyConsumptionDetails represents information related to the energy efficiency of a product that consumes energy. The information that can be provided is based on international regulations such as for example [EU directive 2017/1369](https://eur-lex.europa.eu/eli/reg/2017/1369/oj) for energy labeling and the [Energy labeling rule](https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/energy-water-use-labeling-consumer) under the Energy Policy and Conservation Act (EPCA) in the US.
  'EnergyConsumptionDetails': prefix.sdo('EnergyConsumptionDetails'),
  // Enumerates energy efficiency levels (also known as \"classes\" or \"ratings\") and certifications that are part of several international energy efficiency standards.
  'EnergyEfficiencyEnumeration': prefix.sdo('EnergyEfficiencyEnumeration'),
  // Represents EnergyStar certification.
  'EnergyStarCertified': prefix.sdo('EnergyStarCertified'),
  // Used to indicate whether a product is EnergyStar certified.
  'EnergyStarEnergyEfficiencyEnumeration': prefix.sdo('EnergyStarEnergyEfficiencyEnumeration'),
  // Information about the engine of the vehicle. A vehicle can have multiple engines represented by multiple engine specification entities.
  'EngineSpecification': prefix.sdo('EngineSpecification'),
  // Enrolling participants by invitation only.
  'EnrollingByInvitation': prefix.sdo('EnrollingByInvitation'),
  // A business providing entertainment.
  'EntertainmentBusiness': prefix.sdo('EntertainmentBusiness'),
  // An entry point, within some Web-based protocol.
  'EntryPoint': prefix.sdo('EntryPoint'),
  // Lists or enumerations—for example, a list of cuisines or music genres, etc.
  'Enumeration': prefix.sdo('Enumeration'),
  // A media episode (e.g. TV, radio, video game) which can be part of a series or season.
  'Episode': prefix.sdo('Episode'),
  // An event happening at a certain time and location, such as a concert, lecture, or festival. Ticketing information may be added via the [[offers]] property. Repeated events may be structured as separate Event objects.
  'Event': prefix.sdo('Event'),
  // An EventAttendanceModeEnumeration value is one of potentially several modes of organising an event, relating to whether it is online or offline.
  'EventAttendanceModeEnumeration': prefix.sdo('EventAttendanceModeEnumeration'),
  // The event has been cancelled. If the event has multiple startDate values, all are assumed to be cancelled. Either startDate or previousStartDate may be used to specify the event's cancelled date(s).
  'EventCancelled': prefix.sdo('EventCancelled'),
  // Indicates that the event was changed to allow online participation. See [[eventAttendanceMode]] for specifics of whether it is now fully or partially online.
  'EventMovedOnline': prefix.sdo('EventMovedOnline'),
  // The event has been postponed and no new date has been set. The event's previousStartDate should be set.
  'EventPostponed': prefix.sdo('EventPostponed'),
  // The event has been rescheduled. The event's previousStartDate should be set to the old date and the startDate should be set to the event's new date. (If the event has been rescheduled multiple times, the previousStartDate property may be repeated).
  'EventRescheduled': prefix.sdo('EventRescheduled'),
  // A reservation for an event like a concert, sporting event, or lecture.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use [[Offer]].
  'EventReservation': prefix.sdo('EventReservation'),
  // The event is taking place or has taken place on the startDate as scheduled. Use of this value is optional, as it is assumed by default.
  'EventScheduled': prefix.sdo('EventScheduled'),
  // A series of [[Event]]s. Included events can relate with the series using the [[superEvent]] property.An EventSeries is a collection of events that share some unifying characteristic. For example, \"The Olympic Games\" is a series, whichis repeated regularly. The \"2012 London Olympics\" can be presented both as an [[Event]] in the series \"Olympic Games\", and as an[[EventSeries]] that included a number of sporting competitions as Events.The nature of the association between the events in an [[EventSeries]] can vary, but typical examples couldinclude a thematic event series (e.g. topical meetups or classes), or a series of regular events that share a location, attendee group and/or organizers.EventSeries has been defined as a kind of Event to make it easy for publishers to use it in an Event context withoutworrying about which kinds of series are really event-like enough to call an Event. In general an EventSeriesmay seem more Event-like when the period of time is compact and when aspects such as location are fixed, butit may also sometimes prove useful to describe a longer-term series as an Event.
  'EventSeries': prefix.sdo('EventSeries'),
  // EventStatusType is an enumeration type whose instances represent several states that an Event may be in.
  'EventStatusType': prefix.sdo('EventStatusType'),
  // An event venue.
  'EventVenue': prefix.sdo('EventVenue'),
  // Data derived from multiple randomized clinical trials or meta-analyses.
  'EvidenceLevelA': prefix.sdo('EvidenceLevelA'),
  // Data derived from a single randomized trial, or nonrandomized studies.
  'EvidenceLevelB': prefix.sdo('EvidenceLevelB'),
  // Only consensus opinion of experts, case studies, or standard-of-care.
  'EvidenceLevelC': prefix.sdo('EvidenceLevelC'),
  // A structured value representing exchange rate.
  'ExchangeRateSpecification': prefix.sdo('ExchangeRateSpecification'),
  // Specifies that a refund can be done as an exchange for the same product.
  'ExchangeRefund': prefix.sdo('ExchangeRefund'),
  // The act of participating in exertive activity for the purposes of improving health and fitness.
  'ExerciseAction': prefix.sdo('ExerciseAction'),
  // A gym.
  'ExerciseGym': prefix.sdo('ExerciseGym'),
  // Fitness-related activity designed for a specific health-related purpose, including defined exercise routines as well as activity prescribed by a clinician.
  'ExercisePlan': prefix.sdo('ExercisePlan'),
  // Event type: Exhibition event, e.g. at a museum, library, archive, tradeshow, ...
  'ExhibitionEvent': prefix.sdo('ExhibitionEvent'),
  // Eye or ophtalmological function assessment with clinical examination.
  'Eye': prefix.sdo('Eye'),
  // A [[FAQPage]] is a [[WebPage]] presenting one or more \"[Frequently asked questions](https://en.wikipedia.org/wiki/FAQ)\" (see also [[QAPage]]).
  'FAQPage': prefix.sdo('FAQPage'),
  // A designation by the US FDA signifying that adequate and well-controlled studies have failed to demonstrate a risk to the fetus in the first trimester of pregnancy (and there is no evidence of risk in later trimesters).
  'FDAcategoryA': prefix.sdo('FDAcategoryA'),
  // A designation by the US FDA signifying that animal reproduction studies have failed to demonstrate a risk to the fetus and there are no adequate and well-controlled studies in pregnant women.
  'FDAcategoryB': prefix.sdo('FDAcategoryB'),
  // A designation by the US FDA signifying that animal reproduction studies have shown an adverse effect on the fetus and there are no adequate and well-controlled studies in humans, but potential benefits may warrant use of the drug in pregnant women despite potential risks.
  'FDAcategoryC': prefix.sdo('FDAcategoryC'),
  // A designation by the US FDA signifying that there is positive evidence of human fetal risk based on adverse reaction data from investigational or marketing experience or studies in humans, but potential benefits may warrant use of the drug in pregnant women despite potential risks.
  'FDAcategoryD': prefix.sdo('FDAcategoryD'),
  // A designation by the US FDA signifying that studies in animals or humans have demonstrated fetal abnormalities and/or there is positive evidence of human fetal risk based on adverse reaction data from investigational or marketing experience, and the risks involved in use of the drug in pregnant women clearly outweigh potential benefits.
  'FDAcategoryX': prefix.sdo('FDAcategoryX'),
  // A designation that the drug in question has not been assigned a pregnancy category designation by the US FDA.
  'FDAnotEvaluated': prefix.sdo('FDAnotEvaluated'),
  // A radio channel that uses FM.
  'FMRadioChannel': prefix.sdo('FMRadioChannel'),
  // An action that failed to complete. The action's error property and the HTTP return code contain more information about the failure.
  'FailedActionStatus': prefix.sdo('FailedActionStatus'),
  // The boolean value false.
  'False': prefix.sdo('False'),
  // A fast-food restaurant.
  'FastFoodRestaurant': prefix.sdo('FastFoodRestaurant'),
  // The female gender.
  'Female': prefix.sdo('Female'),
  // Event type: Festival.
  'Festival': prefix.sdo('Festival'),
  // The act of capturing sound and moving images on film, video, or digitally.
  'FilmAction': prefix.sdo('FilmAction'),
  // A product provided to consumers and businesses by financial institutions such as banks, insurance companies, brokerage firms, consumer finance companies, and investment companies which comprise the financial services industry.
  'FinancialProduct': prefix.sdo('FinancialProduct'),
  // Financial services business.
  'FinancialService': prefix.sdo('FinancialService'),
  // The act of finding an object.Related actions:* [[SearchAction]]: FindAction is generally lead by a SearchAction, but not necessarily.
  'FindAction': prefix.sdo('FindAction'),
  // A fire station. With firemen.
  'FireStation': prefix.sdo('FireStation'),
  // Physical activity that is engaged in to improve joint and muscle flexibility.
  'Flexibility': prefix.sdo('Flexibility'),
  // An airline flight.
  'Flight': prefix.sdo('Flight'),
  // A reservation for air travel.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use [[Offer]].
  'FlightReservation': prefix.sdo('FlightReservation'),
  // Data type: Floating number.
  'Float': prefix.sdo('Float'),
  // A FloorPlan is an explicit representation of a collection of similar accommodations, allowing the provision of common information (room counts, sizes, layout diagrams) and offers for rental or sale. In typical use, some [[ApartmentComplex]] has an [[accommodationFloorPlan]] which is a [[FloorPlan]].  A FloorPlan is always in the context of a particular place, either a larger [[ApartmentComplex]] or a single [[Apartment]]. The visual/spatial aspects of a floor plan (i.e. room layout, [see wikipedia](https://en.wikipedia.org/wiki/Floor_plan)) can be indicated using [[image]].
  'FloorPlan': prefix.sdo('FloorPlan'),
  // A florist.
  'Florist': prefix.sdo('Florist'),
  // The act of forming a personal connection with someone/something (object) unidirectionally/asymmetrically to get updates polled from.Related actions:* [[BefriendAction]]: Unlike BefriendAction, FollowAction implies that the connection is *not* necessarily reciprocal.* [[SubscribeAction]]: Unlike SubscribeAction, FollowAction implies that the follower acts as an active agent constantly/actively polling for updates.* [[RegisterAction]]: Unlike RegisterAction, FollowAction implies that the agent is interested in continuing receiving updates from the object.* [[JoinAction]]: Unlike JoinAction, FollowAction implies that the agent is interested in getting updates from the object.* [[TrackAction]]: Unlike TrackAction, FollowAction refers to the polling of updates of all aspects of animate objects rather than the location of inanimate objects (e.g. you track a package, but you don't follow it).
  'FollowAction': prefix.sdo('FollowAction'),
  // A food-related business.
  'FoodEstablishment': prefix.sdo('FoodEstablishment'),
  // A reservation to dine at a food-related business.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
  'FoodEstablishmentReservation': prefix.sdo('FoodEstablishmentReservation'),
  // Event type: Food event.
  'FoodEvent': prefix.sdo('FoodEvent'),
  // A food service, like breakfast, lunch, or dinner.
  'FoodService': prefix.sdo('FoodService'),
  // Four-wheel drive is a transmission layout where the engine primarily drives two wheels with a part-time four-wheel drive capability.
  'FourWheelDriveConfiguration': prefix.sdo('FourWheelDriveConfiguration'),
  // Specifies that product returns are free of charge for the customer.
  'FreeReturn': prefix.sdo('FreeReturn'),
  // The day of the week between Thursday and Saturday.
  'Friday': prefix.sdo('Friday'),
  // Front-wheel drive is a transmission layout where the engine drives the front wheels.
  'FrontWheelDriveConfiguration': prefix.sdo('FrontWheelDriveConfiguration'),
  // Specifies that a refund can be done in the full amount the customer paid for the product
  'FullRefund': prefix.sdo('FullRefund'),
  // A FundingAgency is an organization that implements one or more [[FundingScheme]]s and manages    the granting process (via [[Grant]]s, typically [[MonetaryGrant]]s).    A funding agency is not always required for grant funding, e.g. philanthropic giving, corporate sponsorship etc.    Examples of funding agencies include ERC, REA, NIH, Bill and Melinda Gates Foundation...
  'FundingAgency': prefix.sdo('FundingAgency'),
  // A FundingScheme combines organizational, project and policy aspects of grant-based funding    that sets guidelines, principles and mechanisms to support other kinds of projects and activities.    Funding is typically organized via [[Grant]] funding. Examples of funding schemes: Swiss Priority Programmes (SPPs); EU Framework 7 (FP7); Horizon 2020; the NIH-R01 Grant Program; Wellcome institutional strategic support fund. For large scale public sector funding, the management and administration of grant awards is often handled by other, dedicated, organizations - [[FundingAgency]]s such as ERC, REA, ...
  'FundingScheme': prefix.sdo('FundingScheme'),
  // Pathogenic fungus.
  'Fungus': prefix.sdo('Fungus'),
  // A furniture store.
  'FurnitureStore': prefix.sdo('FurnitureStore'),
  // The Game type represents things which are games. These are typically rule-governed recreational activities, e.g. role-playing games in which players assume the role of characters in a fictional setting.
  'Game': prefix.sdo('Game'),
  // Indicates whether this game is multi-player, co-op or single-player.
  'GamePlayMode': prefix.sdo('GamePlayMode'),
  // Server that provides game interaction in a multiplayer game.
  'GameServer': prefix.sdo('GameServer'),
  // Status of a game server.
  'GameServerStatus': prefix.sdo('GameServerStatus'),
  // A garden store.
  'GardenStore': prefix.sdo('GardenStore'),
  // A gas station.
  'GasStation': prefix.sdo('GasStation'),
  // A specific branch of medical science that pertains to diagnosis and treatment of disorders of digestive system.
  'Gastroenterologic': prefix.sdo('Gastroenterologic'),
  // Residence type: Gated community.
  'GatedResidenceCommunity': prefix.sdo('GatedResidenceCommunity'),
  // An enumeration of genders.
  'GenderType': prefix.sdo('GenderType'),
  // A discrete unit of inheritance which affects one or more biological traits (Source: [https://en.wikipedia.org/wiki/Gene](https://en.wikipedia.org/wiki/Gene)). Examples include FOXP2 (Forkhead box protein P2), SCARNA21 (small Cajal body-specific RNA 21), A- (agouti genotype).
  'Gene': prefix.sdo('Gene'),
  // A general contractor.
  'GeneralContractor': prefix.sdo('GeneralContractor'),
  // A specific branch of medical science that pertains to hereditary transmission and the variation of inherited characteristics and disorders.
  'Genetic': prefix.sdo('Genetic'),
  // Genitourinary system function assessment with clinical examination.
  'Genitourinary': prefix.sdo('Genitourinary'),
  // A GeoCircle is a GeoShape representing a circular geographic area. As it is a GeoShape          it provides the simple textual property 'circle', but also allows the combination of postalCode alongside geoRadius.          The center of the circle can be indicated via the 'geoMidpoint' property, or more approximately using 'address', 'postalCode'.
  'GeoCircle': prefix.sdo('GeoCircle'),
  // The geographic coordinates of a place or event.
  'GeoCoordinates': prefix.sdo('GeoCoordinates'),
  // The geographic shape of a place. A GeoShape can be described using several properties whose values are based on latitude/longitude pairs. Either whitespace or commas can be used to separate latitude and longitude; whitespace should be used when writing a list of several such points.
  'GeoShape': prefix.sdo('GeoShape'),
  // (Eventually to be defined as) a supertype of GeoShape designed to accommodate definitions from Geo-Spatial best practices.
  'GeospatialGeometry': prefix.sdo('GeospatialGeometry'),
  // A specific branch of medical science that is concerned with the diagnosis and treatment of diseases, debilities and provision of care to the aged.
  'Geriatric': prefix.sdo('Geriatric'),
  // Content that discusses practical and policy aspects for getting access to specific kinds of healthcare (e.g. distribution mechanisms for vaccines).
  'GettingAccessHealthAspect': prefix.sdo('GettingAccessHealthAspect'),
  // The act of transferring ownership of an object to a destination. Reciprocal of TakeAction.Related actions:* [[TakeAction]]: Reciprocal of GiveAction.* [[SendAction]]: Unlike SendAction, GiveAction implies that ownership is being transferred (e.g. I may send my laptop to you, but that doesn't mean I'm giving it to you).
  'GiveAction': prefix.sdo('GiveAction'),
  // A diet exclusive of gluten.
  'GlutenFreeDiet': prefix.sdo('GlutenFreeDiet'),
  // A golf course.
  'GolfCourse': prefix.sdo('GolfCourse'),
  // GovernmentBenefitsType enumerates several kinds of government benefits to support the COVID-19 situation. Note that this structure may not capture all benefits offered.
  'GovernmentBenefitsType': prefix.sdo('GovernmentBenefitsType'),
  // A government building.
  'GovernmentBuilding': prefix.sdo('GovernmentBuilding'),
  // A government office&#x2014;for example, an IRS or DMV office.
  'GovernmentOffice': prefix.sdo('GovernmentOffice'),
  // A governmental organization or agency.
  'GovernmentOrganization': prefix.sdo('GovernmentOrganization'),
  // A permit issued by a government agency.
  'GovernmentPermit': prefix.sdo('GovernmentPermit'),
  // A service provided by a government organization, e.g. food stamps, veterans benefits, etc.
  'GovernmentService': prefix.sdo('GovernmentService'),
  // A grant, typically financial or otherwise quantifiable, of resources. Typically a [[funder]] sponsors some [[MonetaryAmount]] to an [[Organization]] or [[Person]],    sometimes not necessarily via a dedicated or long-lived [[Project]], resulting in one or more outputs, or [[fundedItem]]s. For financial sponsorship, indicate the [[funder]] of a [[MonetaryGrant]]. For non-financial support, indicate [[sponsor]] of [[Grant]]s of resources (e.g. office space).Grants support  activities directed towards some agreed collective goals, often but not always organized as [[Project]]s. Long-lived projects are sometimes sponsored by a variety of grants over time, but it is also common for a project to be associated with a single grant.The amount of a [[Grant]] is represented using [[amount]] as a [[MonetaryAmount]].
  'Grant': prefix.sdo('Grant'),
  // Book format: GraphicNovel. May represent a bound collection of ComicIssue instances.
  'GraphicNovel': prefix.sdo('GraphicNovel'),
  // A grocery store.
  'GroceryStore': prefix.sdo('GroceryStore'),
  // The airline boards by groups based on check-in time, priority, etc.
  'GroupBoardingPolicy': prefix.sdo('GroupBoardingPolicy'),
  // [[Guide]] is a page or article that recommend specific products or services, or aspects of a thing for a user to consider. A [[Guide]] may represent a Buying Guide and detail aspects of products or services for a user to consider. A [[Guide]] may represent a Product Guide and recommend specific products or services. A [[Guide]] may represent a Ranked List and recommend specific products or services with ranking.
  'Guide': prefix.sdo('Guide'),
  // A specific branch of medical science that pertains to the health care of women, particularly in the diagnosis and treatment of disorders affecting the female reproductive system.
  'Gynecologic': prefix.sdo('Gynecologic'),
  // A business that provide Heating, Ventilation and Air Conditioning services.
  'HVACBusiness': prefix.sdo('HVACBusiness'),
  // A [hackathon](https://en.wikipedia.org/wiki/Hackathon) event.
  'Hackathon': prefix.sdo('Hackathon'),
  // A hair salon.
  'HairSalon': prefix.sdo('HairSalon'),
  // A diet conforming to Islamic dietary practices.
  'HalalDiet': prefix.sdo('HalalDiet'),
  // Book format: Hardcover.
  'Hardcover': prefix.sdo('Hardcover'),
  // A hardware store.
  'HardwareStore': prefix.sdo('HardwareStore'),
  // Head assessment with clinical examination.
  'Head': prefix.sdo('Head'),
  // Health and beauty.
  'HealthAndBeautyBusiness': prefix.sdo('HealthAndBeautyBusiness'),
  // HealthAspectEnumeration enumerates several aspects of health content online, each of which might be described using [[hasHealthAspect]] and [[HealthTopicContent]].
  'HealthAspectEnumeration': prefix.sdo('HealthAspectEnumeration'),
  // HealthCare: this is a benefit for health care.
  'HealthCare': prefix.sdo('HealthCare'),
  // A health club.
  'HealthClub': prefix.sdo('HealthClub'),
  // A US-style health insurance plan, including PPOs, EPOs, and HMOs.
  'HealthInsurancePlan': prefix.sdo('HealthInsurancePlan'),
  // A description of costs to the patient under a given network or formulary.
  'HealthPlanCostSharingSpecification': prefix.sdo('HealthPlanCostSharingSpecification'),
  // For a given health insurance plan, the specification for costs and coverage of prescription drugs.
  'HealthPlanFormulary': prefix.sdo('HealthPlanFormulary'),
  // A US-style health insurance plan network.
  'HealthPlanNetwork': prefix.sdo('HealthPlanNetwork'),
  // [[HealthTopicContent]] is [[WebContent]] that is about some aspect of a health topic, e.g. a condition, its symptoms or treatments. Such content may be comprised of several parts or sections and use different types of media. Multiple instances of [[WebContent]] (and hence [[HealthTopicContent]]) can be related using [[hasPart]] / [[isPartOf]] where there is some kind of content hierarchy, and their content described with [[about]] and [[mentions]] e.g. building upon the existing [[MedicalCondition]] vocabulary.
  'HealthTopicContent': prefix.sdo('HealthTopicContent'),
  // Uses devices to support users with hearing impairments.
  'HearingImpairedSupported': prefix.sdo('HearingImpairedSupported'),
  // A specific branch of medical science that pertains to diagnosis and treatment of disorders of blood and blood producing organs.
  'Hematologic': prefix.sdo('Hematologic'),
  // A high school.
  'HighSchool': prefix.sdo('HighSchool'),
  // A diet conforming to Hindu dietary practices, in particular, beef-free.
  'HinduDiet': prefix.sdo('HinduDiet'),
  // A Hindu temple.
  'HinduTemple': prefix.sdo('HinduTemple'),
  // A store that sells materials useful or necessary for various hobbies.
  'HobbyShop': prefix.sdo('HobbyShop'),
  // A construction business.A HomeAndConstructionBusiness is a [[LocalBusiness]] that provides services around homes and buildings.As a [[LocalBusiness]] it can be described as a [[provider]] of one or more [[Service]]\\(s).
  'HomeAndConstructionBusiness': prefix.sdo('HomeAndConstructionBusiness'),
  // A home goods store.
  'HomeGoodsStore': prefix.sdo('HomeGoodsStore'),
  // A system of medicine based on the principle that a disease can be cured by a substance that produces similar symptoms in healthy people.
  'Homeopathic': prefix.sdo('Homeopathic'),
  // A hospital.
  'Hospital': prefix.sdo('Hospital'),
  // A hostel - cheap accommodation, often in shared dormitories.<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Hostel': prefix.sdo('Hostel'),
  // A hotel is an establishment that provides lodging paid on a short-term basis (Source: Wikipedia, the free encyclopedia, see http://en.wikipedia.org/wiki/Hotel).<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Hotel': prefix.sdo('Hotel'),
  // A hotel room is a single room in a hotel.<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'HotelRoom': prefix.sdo('HotelRoom'),
  // A house is a building or structure that has the ability to be occupied for habitation by humans or other creatures (Source: Wikipedia, the free encyclopedia, see <a href=\"http://en.wikipedia.org/wiki/House\">http://en.wikipedia.org/wiki/House</a>).
  'House': prefix.sdo('House'),
  // A house painting service.
  'HousePainter': prefix.sdo('HousePainter'),
  // Content that discusses and explains how a particular health-related topic works, e.g. in terms of mechanisms and underlying science.
  'HowItWorksHealthAspect': prefix.sdo('HowItWorksHealthAspect'),
  // Information about how or where to find a topic. Also may contain location data that can be used for where to look for help if the topic is observed.
  'HowOrWhereHealthAspect': prefix.sdo('HowOrWhereHealthAspect'),
  // Instructions that explain how to achieve a result by performing a sequence of steps.
  'HowTo': prefix.sdo('HowTo'),
  // A direction indicating a single action to do in the instructions for how to achieve a result.
  'HowToDirection': prefix.sdo('HowToDirection'),
  // An item used as either a tool or supply when performing the instructions for how to to achieve a result.
  'HowToItem': prefix.sdo('HowToItem'),
  // A sub-grouping of steps in the instructions for how to achieve a result (e.g. steps for making a pie crust within a pie recipe).
  'HowToSection': prefix.sdo('HowToSection'),
  // A step in the instructions for how to achieve a result. It is an ordered list with HowToDirection and/or HowToTip items.
  'HowToStep': prefix.sdo('HowToStep'),
  // A supply consumed when performing the instructions for how to achieve a result.
  'HowToSupply': prefix.sdo('HowToSupply'),
  // An explanation in the instructions for how to achieve a result. It provides supplementary information about a technique, supply, author's preference, etc. It can explain what could be done, or what should not be done, but doesn't specify what should be done (see HowToDirection).
  'HowToTip': prefix.sdo('HowToTip'),
  // A tool used (but not consumed) when performing instructions for how to achieve a result.
  'HowToTool': prefix.sdo('HowToTool'),
  // A HyperToc represents a hypertext table of contents for complex media objects, such as [[VideoObject]], [[AudioObject]]. Items in the table of contents are indicated using the [[tocEntry]] property, and typed [[HyperTocEntry]]. For cases where the same larger work is split into multiple files, [[associatedMedia]] can be used on individual [[HyperTocEntry]] items.
  'HyperToc': prefix.sdo('HyperToc'),
  // A HyperToEntry is an item within a [[HyperToc]], which represents a hypertext table of contents for complex media objects, such as [[VideoObject]], [[AudioObject]]. The media object itself is indicated using [[associatedMedia]]. Each section of interest within that content can be described with a [[HyperTocEntry]], with associated [[startOffset]] and [[endOffset]]. When several entries are all from the same file, [[associatedMedia]] is used on the overarching [[HyperTocEntry]]; if the content has been split into multiple files, they can be referenced using [[associatedMedia]] on each [[HyperTocEntry]].
  'HyperTocEntry': prefix.sdo('HyperTocEntry'),
  // An ice cream shop.
  'IceCreamShop': prefix.sdo('IceCreamShop'),
  // The act of intentionally disregarding the object. An agent ignores an object.
  'IgnoreAction': prefix.sdo('IgnoreAction'),
  // Web page type: Image gallery page.
  'ImageGallery': prefix.sdo('ImageGallery'),
  // An image file.
  'ImageObject': prefix.sdo('ImageObject'),
  // A specific and exact (byte-for-byte) version of an [[ImageObject]]. Two byte-for-byte identical files, for the purposes of this type, considered identical. If they have different embedded metadata (e.g. XMP, EXIF) the files will differ. Different external facts about the files, e.g. creator or dateCreated that aren't represented in their actual content, do not affect this notion of identity.
  'ImageObjectSnapshot': prefix.sdo('ImageObjectSnapshot'),
  // Any medical imaging modality typically used for diagnostic purposes.
  'ImagingTest': prefix.sdo('ImagingTest'),
  // Indicates that a legislation is in force.
  'InForce': prefix.sdo('InForce'),
  // Indicates that the item is in stock.
  'InStock': prefix.sdo('InStock'),
  // Indicates that the item is available only at physical locations.
  'InStoreOnly': prefix.sdo('InStoreOnly'),
  // A single, identifiable product instance (e.g. a laptop with a particular serial number).
  'IndividualProduct': prefix.sdo('IndividualProduct'),
  // Something in medical science that pertains to infectious diseases i.e caused by bacterial, viral, fungal or parasitic infections.
  'Infectious': prefix.sdo('Infectious'),
  // Classes of agents or pathogens that transmit infectious diseases. Enumerated type.
  'InfectiousAgentClass': prefix.sdo('InfectiousAgentClass'),
  // An infectious disease is a clinically evident human disease resulting from the presence of pathogenic microbial agents, like pathogenic viruses, pathogenic bacteria, fungi, protozoa, multicellular parasites, and prions. To be considered an infectious disease, such pathogens are known to be able to cause this disease.
  'InfectiousDisease': prefix.sdo('InfectiousDisease'),
  // The act of notifying someone of information pertinent to them, with no expectation of a response.
  'InformAction': prefix.sdo('InformAction'),
  // Content discussing ingredients-related aspects of a health topic.
  'IngredientsHealthAspect': prefix.sdo('IngredientsHealthAspect'),
  // The act of adding at a specific location in an ordered collection.
  'InsertAction': prefix.sdo('InsertAction'),
  // The act of installing an application.
  'InstallAction': prefix.sdo('InstallAction'),
  // Represents the installment pricing component of the total price for an offered product.
  'Installment': prefix.sdo('Installment'),
  // An Insurance agency.
  'InsuranceAgency': prefix.sdo('InsuranceAgency'),
  // A utility class that serves as the umbrella for a number of 'intangible' things such as quantities, structured values, etc.
  'Intangible': prefix.sdo('Intangible'),
  // Data type: Integer.
  'Integer': prefix.sdo('Integer'),
  // The act of interacting with another person or organization.
  'InteractAction': prefix.sdo('InteractAction'),
  // A summary of how users have interacted with this CreativeWork. In most cases, authors will use a subtype to specify the specific type of interaction.
  'InteractionCounter': prefix.sdo('InteractionCounter'),
  // An international trial.
  'InternationalTrial': prefix.sdo('InternationalTrial'),
  // An internet cafe.
  'InternetCafe': prefix.sdo('InternetCafe'),
  // A company or fund that gathers capital from a number of investors to create a pool of money that is then re-invested into stocks, bonds and other assets.
  'InvestmentFund': prefix.sdo('InvestmentFund'),
  // A type of financial product that typically requires the client to transfer funds to a financial service in return for potential beneficial financial return.
  'InvestmentOrDeposit': prefix.sdo('InvestmentOrDeposit'),
  // The act of asking someone to attend an event. Reciprocal of RsvpAction.
  'InviteAction': prefix.sdo('InviteAction'),
  // A statement of the money due for goods or services; a bill.
  'Invoice': prefix.sdo('Invoice'),
  // Represents the invoice price of an offered product.
  'InvoicePrice': prefix.sdo('InvoicePrice'),
  // A list of possible product availability options.
  'ItemAvailability': prefix.sdo('ItemAvailability'),
  // A list of items of any sort&#x2014;for example, Top 10 Movies About Weathermen, or Top 100 Party Songs. Not to be confused with HTML lists, which are often used only for formatting.
  'ItemList': prefix.sdo('ItemList'),
  // An ItemList ordered with lower values listed first.
  'ItemListOrderAscending': prefix.sdo('ItemListOrderAscending'),
  // An ItemList ordered with higher values listed first.
  'ItemListOrderDescending': prefix.sdo('ItemListOrderDescending'),
  // Enumerated for values for itemListOrder for indicating how an ordered ItemList is organized.
  'ItemListOrderType': prefix.sdo('ItemListOrderType'),
  // An ItemList ordered with no explicit order.
  'ItemListUnordered': prefix.sdo('ItemListUnordered'),
  // A page devoted to a single item, such as a particular product or hotel.
  'ItemPage': prefix.sdo('ItemPage'),
  // A jewelry store.
  'JewelryStore': prefix.sdo('JewelryStore'),
  // A listing that describes a job opening in a certain organization.
  'JobPosting': prefix.sdo('JobPosting'),
  // An agent joins an event/group with participants/friends at a location.Related actions:* [[RegisterAction]]: Unlike RegisterAction, JoinAction refers to joining a group/team of people.* [[SubscribeAction]]: Unlike SubscribeAction, JoinAction does not imply that you'll be receiving updates.* [[FollowAction]]: Unlike FollowAction, JoinAction does not imply that you'll be polling for updates.
  'JoinAction': prefix.sdo('JoinAction'),
  // The anatomical location at which two or more bones make contact.
  'Joint': prefix.sdo('Joint'),
  // A diet conforming to Jewish dietary practices.
  'KosherDiet': prefix.sdo('KosherDiet'),
  // A medical science pertaining to chemical, hematological, immunologic, microscopic, or bacteriological diagnostic analyses or research.
  'LaboratoryScience': prefix.sdo('LaboratoryScience'),
  // A lake (for example, Lake Pontrachain).
  'LakeBodyOfWater': prefix.sdo('LakeBodyOfWater'),
  // A landform or physical feature.  Landform elements include mountains, plains, lakes, rivers, seascape and oceanic waterbody interface features such as bays, peninsulas, seas and so Fourth, including sub-aqueous terrain features such as submersed mountain ranges, volcanoes, and the great ocean basins.
  'Landform': prefix.sdo('Landform'),
  // An historical landmark or building.
  'LandmarksOrHistoricalBuildings': prefix.sdo('LandmarksOrHistoricalBuildings'),
  // Natural languages such as Spanish, Tamil, Hindi, English, etc. Formal language code tags expressed in [BCP 47](https://en.wikipedia.org/wiki/IETF_language_tag) can be used via the [[alternateName]] property. The Language type previously also covered programming languages such as Scheme and Lisp, which are now best represented using [[ComputerLanguage]].
  'Language': prefix.sdo('Language'),
  // LaserDiscFormat.
  'LaserDiscFormat': prefix.sdo('LaserDiscFormat'),
  // The LearningResource type can be used to indicate [[CreativeWork]]s (whether physical or digital) that have a particular and explicit orientation towards learning, education, skill acquisition, and other educational purposes.[[LearningResource]] is expected to be used as an addition to a primary type such as [[Book]], [[VideoObject]], [[Product]] etc.[[EducationEvent]] serves a similar purpose for event-like things (e.g. a [[Trip]]). A [[LearningResource]] may be created as a result of an [[EducationEvent]], for example by recording one.
  'LearningResource': prefix.sdo('LearningResource'),
  // An agent leaves an event / group with participants/friends at a location.Related actions:* [[JoinAction]]: The antonym of LeaveAction.* [[UnRegisterAction]]: Unlike UnRegisterAction, LeaveAction implies leaving a group/team of people rather than a service.
  'LeaveAction': prefix.sdo('LeaveAction'),
  // The steering position is on the left side of the vehicle (viewed from the main direction of driving).
  'LeftHandDriving': prefix.sdo('LeftHandDriving'),
  // A list of possible statuses for the legal force of a legislation.
  'LegalForceStatus': prefix.sdo('LegalForceStatus'),
  // A LegalService is a business that provides legally-oriented services, advice and representation, e.g. law firms.As a [[LocalBusiness]] it can be described as a [[provider]] of one or more [[Service]]\\(s).
  'LegalService': prefix.sdo('LegalService'),
  // A list of possible levels for the legal validity of a legislation.
  'LegalValueLevel': prefix.sdo('LegalValueLevel'),
  // A legal document such as an act, decree, bill, etc. (enforceable or not) or a component of a legal act (like an article).
  'Legislation': prefix.sdo('Legislation'),
  // A specific object or file containing a Legislation. Note that the same Legislation can be published in multiple files. For example, a digitally signed PDF, a plain PDF and an HTML version.
  'LegislationObject': prefix.sdo('LegislationObject'),
  // A legislative building&#x2014;for example, the state capitol.
  'LegislativeBuilding': prefix.sdo('LegislativeBuilding'),
  // Any physical activity engaged in for recreational purposes. Examples may include ballroom dancing, roller skating, canoeing, fishing, etc.
  'LeisureTimeActivity': prefix.sdo('LeisureTimeActivity'),
  // The act of providing an object under an agreement that it will be returned at a later date. Reciprocal of BorrowAction.Related actions:* [[BorrowAction]]: Reciprocal of LendAction.
  'LendAction': prefix.sdo('LendAction'),
  // A library.
  'Library': prefix.sdo('Library'),
  // A [[LibrarySystem]] is a collaborative system amongst several libraries.
  'LibrarySystem': prefix.sdo('LibrarySystem'),
  // A process of care involving exercise, changes to diet, fitness routines, and other lifestyle changes aimed at improving a health condition.
  'LifestyleModification': prefix.sdo('LifestyleModification'),
  // A short band of tough, flexible, fibrous connective tissue that functions to connect multiple bones, cartilages, and structurally support joints.
  'Ligament': prefix.sdo('Ligament'),
  // The act of expressing a positive sentiment about the object. An agent likes an object (a proposition, topic or theme) with participants.
  'LikeAction': prefix.sdo('LikeAction'),
  // Indicates that the item has limited availability.
  'LimitedAvailability': prefix.sdo('LimitedAvailability'),
  // LimitedByGuaranteeCharity: Non-profit type referring to a charitable company that is limited by guarantee (UK).
  'LimitedByGuaranteeCharity': prefix.sdo('LimitedByGuaranteeCharity'),
  // A Role that represents a Web link e.g. as expressed via the 'url' property. Its linkRelationship property can indicate URL-based and plain textual link types e.g. those in IANA link registry or others such as 'amphtml'. This structure provides a placeholder where details from HTML's link element can be represented outside of HTML, e.g. in JSON-LD feeds.
  'LinkRole': prefix.sdo('LinkRole'),
  // A shop that sells alcoholic drinks such as wine, beer, whisky and other spirits.
  'LiquorStore': prefix.sdo('LiquorStore'),
  // An list item, e.g. a step in a checklist or how-to description.
  'ListItem': prefix.sdo('ListItem'),
  // Represents the list price (the price a product is actually advertised for) of an offered product.
  'ListPrice': prefix.sdo('ListPrice'),
  // The act of consuming audio content.
  'ListenAction': prefix.sdo('ListenAction'),
  // Event type: Literary event.
  'LiteraryEvent': prefix.sdo('LiteraryEvent'),
  // LiveAlbum.
  'LiveAlbum': prefix.sdo('LiveAlbum'),
  // A [[LiveBlogPosting]] is a [[BlogPosting]] intended to provide a rolling textual coverage of an ongoing event through continuous updates.
  'LiveBlogPosting': prefix.sdo('LiveBlogPosting'),
  // Information about coping or life related to the topic.
  'LivingWithHealthAspect': prefix.sdo('LivingWithHealthAspect'),
  // A financial product for the loaning of an amount of money, or line of credit, under agreed terms and charges.
  'LoanOrCredit': prefix.sdo('LoanOrCredit'),
  // A particular physical business or branch of an organization. Examples of LocalBusiness include a restaurant, a particular branch of a restaurant chain, a branch of a bank, a medical practice, a club, a bowling alley, etc.
  'LocalBusiness': prefix.sdo('LocalBusiness'),
  // Specifies a location feature by providing a structured value representing a feature of an accommodation as a property-value pair of varying degrees of formality.
  'LocationFeatureSpecification': prefix.sdo('LocationFeatureSpecification'),
  // A DeliveryMethod in which an item is made available via locker.
  'LockerDelivery': prefix.sdo('LockerDelivery'),
  // A locksmith.
  'Locksmith': prefix.sdo('Locksmith'),
  // A lodging business, such as a motel, hotel, or inn.
  'LodgingBusiness': prefix.sdo('LodgingBusiness'),
  // A reservation for lodging at a hotel, motel, inn, etc.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
  'LodgingReservation': prefix.sdo('LodgingReservation'),
  // Unlike cross-sectional studies, longitudinal studies track the same people, and therefore the differences observed in those people are less likely to be the result of cultural differences across generations. Longitudinal studies are also used in medicine to uncover predictors of certain diseases.
  'Longitudinal': prefix.sdo('Longitudinal'),
  // The act of being defeated in a competitive activity.
  'LoseAction': prefix.sdo('LoseAction'),
  // A diet focused on reduced calorie intake.
  'LowCalorieDiet': prefix.sdo('LowCalorieDiet'),
  // A diet focused on reduced fat and cholesterol intake.
  'LowFatDiet': prefix.sdo('LowFatDiet'),
  // A diet appropriate for people with lactose intolerance.
  'LowLactoseDiet': prefix.sdo('LowLactoseDiet'),
  // A diet focused on reduced sodium intake.
  'LowSaltDiet': prefix.sdo('LowSaltDiet'),
  // Lung and respiratory system clinical examination.
  'Lung': prefix.sdo('Lung'),
  // A type of blood vessel that specifically carries lymph fluid unidirectionally toward the heart.
  'LymphaticVessel': prefix.sdo('LymphaticVessel'),
  // Magnetic resonance imaging.
  'MRI': prefix.sdo('MRI'),
  // Represents the manufacturer suggested retail price (\"MSRP\") of an offered product.
  'MSRP': prefix.sdo('MSRP'),
  // The male gender.
  'Male': prefix.sdo('Male'),
  // A book, document, or piece of music written by hand rather than typed or printed.
  'Manuscript': prefix.sdo('Manuscript'),
  // A map.
  'Map': prefix.sdo('Map'),
  // An enumeration of several kinds of Map.
  'MapCategoryType': prefix.sdo('MapCategoryType'),
  // The act of marrying a person.
  'MarryAction': prefix.sdo('MarryAction'),
  // Properties that take Mass as values are of the form '&lt;Number&gt; &lt;Mass unit of measure&gt;'. E.g., '7 kg'.
  'Mass': prefix.sdo('Mass'),
  // A math solver which is capable of solving a subset of mathematical problems.
  'MathSolver': prefix.sdo('MathSolver'),
  // The maximum dosing schedule considered safe for a drug or supplement as recommended by an authority or by the drug/supplement's manufacturer. Capture the recommending authority in the recognizingAuthority property of MedicalEntity.
  'MaximumDoseSchedule': prefix.sdo('MaximumDoseSchedule'),
  // Related topics may be treated by a Topic.
  'MayTreatHealthAspect': prefix.sdo('MayTreatHealthAspect'),
  // Enumeration of common measurement types (or dimensions), for example \"chest\" for a person, \"inseam\" for pants, \"gauge\" for screws, or \"wheel\" for bicycles.
  'MeasurementTypeEnumeration': prefix.sdo('MeasurementTypeEnumeration'),
  // Web page type: Media gallery page. A mixed-media page that can contains media such as images, videos, and other multimedia.
  'MediaGallery': prefix.sdo('MediaGallery'),
  //  Codes for use with the [[mediaAuthenticityCategory]] property, indicating the authenticity of a media object (in the context of how it was published or shared). In general these codes are not mutually exclusive, although some combinations (such as 'original' versus 'transformed', 'edited' and 'staged') would be contradictory if applied in the same [[MediaReview]]. Note that the application of these codes is with regard to a piece of media shared or published in a particular context.
  'MediaManipulationRatingEnumeration': prefix.sdo('MediaManipulationRatingEnumeration'),
  // A media object, such as an image, video, or audio object embedded in a web page or a downloadable dataset i.e. DataDownload. Note that a creative work may have many media objects associated with it on the same web page. For example, a page about a single song (MusicRecording) may have a music video (VideoObject), and a high and low bandwidth audio stream (2 AudioObject's).
  'MediaObject': prefix.sdo('MediaObject'),
  // A [[MediaReview]] is a more specialized form of Review dedicated to the evaluation of media content online, typically in the context of fact-checking and misinformation.    For more general reviews of media in the broader sense, use [[UserReview]], [[CriticReview]] or other [[Review]] types. This definition is    a work in progress. While the [[MediaManipulationRatingEnumeration]] list reflects significant community review amongst fact-checkers and others working    to combat misinformation, the specific structures for representing media objects, their versions and publication context, is still evolving. Similarly, best practices for the relationship between [[MediaReview]] and [[ClaimReview]] markup has not yet been finalized.
  'MediaReview': prefix.sdo('MediaReview'),
  // Represents an item or group of closely related items treated as a unit for the sake of evaluation in a [[MediaReview]]. Authorship etc. apply to the items rather than to the curation/grouping or reviewing party.
  'MediaReviewItem': prefix.sdo('MediaReviewItem'),
  // A subscription which allows a user to access media including audio, video, books, etc.
  'MediaSubscription': prefix.sdo('MediaSubscription'),
  // Target audiences for medical web pages.
  'MedicalAudience': prefix.sdo('MedicalAudience'),
  // Target audiences types for medical web pages. Enumerated type.
  'MedicalAudienceType': prefix.sdo('MedicalAudienceType'),
  // A particular physical or virtual business of an organization for medical purposes. Examples of MedicalBusiness include differents business run by health professionals.
  'MedicalBusiness': prefix.sdo('MedicalBusiness'),
  // The causative agent(s) that are responsible for the pathophysiologic process that eventually results in a medical condition, symptom or sign. In this schema, unless otherwise specified this is meant to be the proximate cause of the medical condition, symptom or sign. The proximate cause is defined as the causative agent that most directly results in the medical condition, symptom or sign. For example, the HIV virus could be considered a cause of AIDS. Or in a diagnostic context, if a patient fell and sustained a hip fracture and two days later sustained a pulmonary embolism which eventuated in a cardiac arrest, the cause of the cardiac arrest (the proximate cause) would be the pulmonary embolism and not the fall. Medical causes can include cardiovascular, chemical, dermatologic, endocrine, environmental, gastroenterologic, genetic, hematologic, gynecologic, iatrogenic, infectious, musculoskeletal, neurologic, nutritional, obstetric, oncologic, otolaryngologic, pharmacologic, psychiatric, pulmonary, renal, rheumatologic, toxic, traumatic, or urologic causes; medical conditions can be causes as well.
  'MedicalCause': prefix.sdo('MedicalCause'),
  // A facility, often associated with a hospital or medical school, that is devoted to the specific diagnosis and/or healthcare. Previously limited to outpatients but with evolution it may be open to inpatients as well.
  'MedicalClinic': prefix.sdo('MedicalClinic'),
  // A code for a medical entity.
  'MedicalCode': prefix.sdo('MedicalCode'),
  // Any condition of the human body that affects the normal functioning of a person, whether physically or mentally. Includes diseases, injuries, disabilities, disorders, syndromes, etc.
  'MedicalCondition': prefix.sdo('MedicalCondition'),
  // A stage of a medical condition, such as 'Stage IIIa'.
  'MedicalConditionStage': prefix.sdo('MedicalConditionStage'),
  // A condition or factor that serves as a reason to withhold a certain medical therapy. Contraindications can be absolute (there are no reasonable circumstances for undertaking a course of action) or relative (the patient is at higher risk of complications, but that these risks may be outweighed by other considerations or mitigated by other measures).
  'MedicalContraindication': prefix.sdo('MedicalContraindication'),
  // Any object used in a medical capacity, such as to diagnose or treat a patient.
  'MedicalDevice': prefix.sdo('MedicalDevice'),
  // Categories of medical devices, organized by the purpose or intended use of the device.
  'MedicalDevicePurpose': prefix.sdo('MedicalDevicePurpose'),
  // The most generic type of entity related to health and the practice of medicine.
  'MedicalEntity': prefix.sdo('MedicalEntity'),
  // Enumerations related to health and the practice of medicine: A concept that is used to attribute a quality to another concept, as a qualifier, a collection of items or a listing of all of the elements of a set in medicine practice.
  'MedicalEnumeration': prefix.sdo('MedicalEnumeration'),
  // Level of evidence for a medical guideline. Enumerated type.
  'MedicalEvidenceLevel': prefix.sdo('MedicalEvidenceLevel'),
  // Any recommendation made by a standard society (e.g. ACC/AHA) or consensus statement that denotes how to diagnose and treat a particular condition. Note: this type should be used to tag the actual guideline recommendation; if the guideline recommendation occurs in a larger scholarly article, use MedicalScholarlyArticle to tag the overall article, not this type. Note also: the organization making the recommendation should be captured in the recognizingAuthority base property of MedicalEntity.
  'MedicalGuideline': prefix.sdo('MedicalGuideline'),
  // A guideline contraindication that designates a process as harmful and where quality of the data supporting the contraindication is sound.
  'MedicalGuidelineContraindication': prefix.sdo('MedicalGuidelineContraindication'),
  // A guideline recommendation that is regarded as efficacious and where quality of the data supporting the recommendation is sound.
  'MedicalGuidelineRecommendation': prefix.sdo('MedicalGuidelineRecommendation'),
  // Any medical imaging modality typically used for diagnostic purposes. Enumerated type.
  'MedicalImagingTechnique': prefix.sdo('MedicalImagingTechnique'),
  // A condition or factor that indicates use of a medical therapy, including signs, symptoms, risk factors, anatomical states, etc.
  'MedicalIndication': prefix.sdo('MedicalIndication'),
  // A utility class that serves as the umbrella for a number of 'intangible' things in the medical space.
  'MedicalIntangible': prefix.sdo('MedicalIntangible'),
  // An observational study is a type of medical study that attempts to infer the possible effect of a treatment through observation of a cohort of subjects over a period of time. In an observational study, the assignment of subjects into treatment groups versus control groups is outside the control of the investigator. This is in contrast with controlled studies, such as the randomized controlled trials represented by MedicalTrial, where each subject is randomly assigned to a treatment group or a control group before the start of the treatment.
  'MedicalObservationalStudy': prefix.sdo('MedicalObservationalStudy'),
  // Design models for observational medical studies. Enumerated type.
  'MedicalObservationalStudyDesign': prefix.sdo('MedicalObservationalStudyDesign'),
  // A medical organization (physical or not), such as hospital, institution or clinic.
  'MedicalOrganization': prefix.sdo('MedicalOrganization'),
  // A process of care used in either a diagnostic, therapeutic, preventive or palliative capacity that relies on invasive (surgical), non-invasive, or other techniques.
  'MedicalProcedure': prefix.sdo('MedicalProcedure'),
  // An enumeration that describes different types of medical procedures.
  'MedicalProcedureType': prefix.sdo('MedicalProcedureType'),
  // Medical researchers.
  'MedicalResearcher': prefix.sdo('MedicalResearcher'),
  // A complex mathematical calculation requiring an online calculator, used to assess prognosis. Note: use the url property of Thing to record any URLs for online calculators.
  'MedicalRiskCalculator': prefix.sdo('MedicalRiskCalculator'),
  // Any rule set or interactive tool for estimating the risk of developing a complication or condition.
  'MedicalRiskEstimator': prefix.sdo('MedicalRiskEstimator'),
  // A risk factor is anything that increases a person's likelihood of developing or contracting a disease, medical condition, or complication.
  'MedicalRiskFactor': prefix.sdo('MedicalRiskFactor'),
  // A simple system that adds up the number of risk factors to yield a score that is associated with prognosis, e.g. CHAD score, TIMI risk score.
  'MedicalRiskScore': prefix.sdo('MedicalRiskScore'),
  // A scholarly article in the medical domain.
  'MedicalScholarlyArticle': prefix.sdo('MedicalScholarlyArticle'),
  // Any physical manifestation of a person's medical condition discoverable by objective diagnostic tests or physical examination.
  'MedicalSign': prefix.sdo('MedicalSign'),
  // Any feature associated or not with a medical condition. In medicine a symptom is generally subjective while a sign is objective.
  'MedicalSignOrSymptom': prefix.sdo('MedicalSignOrSymptom'),
  // Any specific branch of medical science or practice. Medical specialities include clinical specialties that pertain to particular organ systems and their respective disease states, as well as allied health specialties. Enumerated type.
  'MedicalSpecialty': prefix.sdo('MedicalSpecialty'),
  // A medical study is an umbrella type covering all kinds of research studies relating to human medicine or health, including observational studies and interventional trials and registries, randomized, controlled or not. When the specific type of study is known, use one of the extensions of this type, such as MedicalTrial or MedicalObservationalStudy. Also, note that this type should be used to mark up data that describes the study itself; to tag an article that publishes the results of a study, use MedicalScholarlyArticle. Note: use the code property of MedicalEntity to store study IDs, e.g. clinicaltrials.gov ID.
  'MedicalStudy': prefix.sdo('MedicalStudy'),
  // The status of a medical study. Enumerated type.
  'MedicalStudyStatus': prefix.sdo('MedicalStudyStatus'),
  // Any complaint sensed and expressed by the patient (therefore defined as subjective)  like stomachache, lower-back pain, or fatigue.
  'MedicalSymptom': prefix.sdo('MedicalSymptom'),
  // Any medical test, typically performed for diagnostic purposes.
  'MedicalTest': prefix.sdo('MedicalTest'),
  // Any collection of tests commonly ordered together.
  'MedicalTestPanel': prefix.sdo('MedicalTestPanel'),
  // Any medical intervention designed to prevent, treat, and cure human diseases and medical conditions, including both curative and palliative therapies. Medical therapies are typically processes of care relying upon pharmacotherapy, behavioral therapy, supportive therapy (with fluid or nutrition for example), or detoxification (e.g. hemodialysis) aimed at improving or preventing a health condition.
  'MedicalTherapy': prefix.sdo('MedicalTherapy'),
  // A medical trial is a type of medical study that uses scientific process used to compare the safety and efficacy of medical therapies or medical procedures. In general, medical trials are controlled and subjects are allocated at random to the different treatment and/or control groups.
  'MedicalTrial': prefix.sdo('MedicalTrial'),
  // Design models for medical trials. Enumerated type.
  'MedicalTrialDesign': prefix.sdo('MedicalTrialDesign'),
  // A web page that provides medical information.
  'MedicalWebPage': prefix.sdo('MedicalWebPage'),
  // Systems of medical practice.
  'MedicineSystem': prefix.sdo('MedicineSystem'),
  // A meeting room, conference room, or conference hall is a room provided for singular events such as business conferences and meetings (Source: Wikipedia, the free encyclopedia, see <a href=\"http://en.wikipedia.org/wiki/Conference_hall\">http://en.wikipedia.org/wiki/Conference_hall</a>).<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'MeetingRoom': prefix.sdo('MeetingRoom'),
  // A men's clothing store.
  'MensClothingStore': prefix.sdo('MensClothingStore'),
  // A structured representation of food or drink items available from a FoodEstablishment.
  'Menu': prefix.sdo('Menu'),
  // A food or drink item listed in a menu or menu section.
  'MenuItem': prefix.sdo('MenuItem'),
  // A sub-grouping of food or drink items in a menu. E.g. courses (such as 'Dinner', 'Breakfast', etc.), specific type of dishes (such as 'Meat', 'Vegan', 'Drinks', etc.), or some other classification made by the menu provider.
  'MenuSection': prefix.sdo('MenuSection'),
  // Enumerates several kinds of product return policies.
  'MerchantReturnEnumeration': prefix.sdo('MerchantReturnEnumeration'),
  // Specifies that there is a finite window for product returns.
  'MerchantReturnFiniteReturnWindow': prefix.sdo('MerchantReturnFiniteReturnWindow'),
  // Specifies that product returns are not permitted.
  'MerchantReturnNotPermitted': prefix.sdo('MerchantReturnNotPermitted'),
  // A MerchantReturnPolicy provides information about product return policies associated with an [[Organization]], [[Product]], or [[Offer]].
  'MerchantReturnPolicy': prefix.sdo('MerchantReturnPolicy'),
  // A seasonal override of a return policy, for example used for holidays.
  'MerchantReturnPolicySeasonalOverride': prefix.sdo('MerchantReturnPolicySeasonalOverride'),
  // Specifies that there is an unlimited window for product returns.
  'MerchantReturnUnlimitedWindow': prefix.sdo('MerchantReturnUnlimitedWindow'),
  // Specifies that a product return policy is not provided.
  'MerchantReturnUnspecified': prefix.sdo('MerchantReturnUnspecified'),
  // A single message from a sender to one or more organizations or people.
  'Message': prefix.sdo('Message'),
  // A middle school (typically for children aged around 11-14, although this varies somewhat).
  'MiddleSchool': prefix.sdo('MiddleSchool'),
  // A nurse-like health profession that deals with pregnancy, childbirth, and the postpartum period (including care of the newborn), besides sexual and reproductive health of women throughout their lives.
  'Midwifery': prefix.sdo('Midwifery'),
  // Represents the minimum advertised price (\"MAP\") (as dictated by the manufacturer) of an offered product.
  'MinimumAdvertisedPrice': prefix.sdo('MinimumAdvertisedPrice'),
  // Content about common misconceptions and myths that are related to a topic.
  'MisconceptionsHealthAspect': prefix.sdo('MisconceptionsHealthAspect'),
  // MixedEventAttendanceMode - an event that is conducted as a combination of both offline and online modes.
  'MixedEventAttendanceMode': prefix.sdo('MixedEventAttendanceMode'),
  // MixtapeAlbum.
  'MixtapeAlbum': prefix.sdo('MixtapeAlbum'),
  // A software application designed specifically to work well on a mobile device such as a telephone.
  'MobileApplication': prefix.sdo('MobileApplication'),
  // A store that sells mobile phones and related accessories.
  'MobilePhoneStore': prefix.sdo('MobilePhoneStore'),
  // Any constitutionally or isotopically distinct atom, molecule, ion, ion pair, radical, radical ion, complex, conformer etc., identifiable as a separately distinguishable entity.
  'MolecularEntity': prefix.sdo('MolecularEntity'),
  // The day of the week between Sunday and Tuesday.
  'Monday': prefix.sdo('Monday'),
  // A monetary value or range. This type can be used to describe an amount of money such as $50 USD, or a range as in describing a bank account being suitable for a balance between £1,000 and £1,000,000 GBP, or the value of a salary, etc. It is recommended to use [[PriceSpecification]] Types to describe the price of an Offer, Invoice, etc.
  'MonetaryAmount': prefix.sdo('MonetaryAmount'),
  // A statistical distribution of monetary amounts.
  'MonetaryAmountDistribution': prefix.sdo('MonetaryAmountDistribution'),
  // A monetary grant.
  'MonetaryGrant': prefix.sdo('MonetaryGrant'),
  // The act of transferring money from one place to another place. This may occur electronically or physically.
  'MoneyTransfer': prefix.sdo('MoneyTransfer'),
  // A loan in which property or real estate is used as collateral. (A loan securitized against some real estate).
  'MortgageLoan': prefix.sdo('MortgageLoan'),
  // A mosque.
  'Mosque': prefix.sdo('Mosque'),
  // A motel.<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Motel': prefix.sdo('Motel'),
  // A motorcycle or motorbike is a single-track, two-wheeled motor vehicle.
  'Motorcycle': prefix.sdo('Motorcycle'),
  // A motorcycle dealer.
  'MotorcycleDealer': prefix.sdo('MotorcycleDealer'),
  // A motorcycle repair shop.
  'MotorcycleRepair': prefix.sdo('MotorcycleRepair'),
  // A motorized bicycle is a bicycle with an attached motor used to power the vehicle, or to assist with pedaling.
  'MotorizedBicycle': prefix.sdo('MotorizedBicycle'),
  // A mountain, like Mount Whitney or Mount Everest.
  'Mountain': prefix.sdo('Mountain'),
  // The act of an agent relocating to a place.Related actions:* [[TransferAction]]: Unlike TransferAction, the subject of the move is a living Person or Organization rather than an inanimate object.
  'MoveAction': prefix.sdo('MoveAction'),
  // A movie.
  'Movie': prefix.sdo('Movie'),
  // A short segment/part of a movie.
  'MovieClip': prefix.sdo('MovieClip'),
  // A movie rental store.
  'MovieRentalStore': prefix.sdo('MovieRentalStore'),
  // A series of movies. Included movies can be indicated with the hasPart property.
  'MovieSeries': prefix.sdo('MovieSeries'),
  // A movie theater.
  'MovieTheater': prefix.sdo('MovieTheater'),
  // A moving company.
  'MovingCompany': prefix.sdo('MovingCompany'),
  // A trial that takes place at multiple centers.
  'MultiCenterTrial': prefix.sdo('MultiCenterTrial'),
  // Play mode: MultiPlayer. Requiring or allowing multiple human players to play simultaneously.
  'MultiPlayer': prefix.sdo('MultiPlayer'),
  // Multicellular parasite that causes an infection.
  'MulticellularParasite': prefix.sdo('MulticellularParasite'),
  // A muscle is an anatomical structure consisting of a contractile form of tissue that animals use to effect movement.
  'Muscle': prefix.sdo('Muscle'),
  // A specific branch of medical science that pertains to diagnosis and treatment of disorders of muscles, ligaments and skeletal system.
  'Musculoskeletal': prefix.sdo('Musculoskeletal'),
  // Musculoskeletal system clinical examination.
  'MusculoskeletalExam': prefix.sdo('MusculoskeletalExam'),
  // A museum.
  'Museum': prefix.sdo('Museum'),
  // A collection of music tracks.
  'MusicAlbum': prefix.sdo('MusicAlbum'),
  // Classification of the album by it's type of content: soundtrack, live album, studio album, etc.
  'MusicAlbumProductionType': prefix.sdo('MusicAlbumProductionType'),
  // The kind of release which this album is: single, EP or album.
  'MusicAlbumReleaseType': prefix.sdo('MusicAlbumReleaseType'),
  // A musical composition.
  'MusicComposition': prefix.sdo('MusicComposition'),
  // Event type: Music event.
  'MusicEvent': prefix.sdo('MusicEvent'),
  // A musical group, such as a band, an orchestra, or a choir. Can also be a solo musician.
  'MusicGroup': prefix.sdo('MusicGroup'),
  // A collection of music tracks in playlist form.
  'MusicPlaylist': prefix.sdo('MusicPlaylist'),
  // A music recording (track), usually a single song.
  'MusicRecording': prefix.sdo('MusicRecording'),
  // A MusicRelease is a specific release of a music album.
  'MusicRelease': prefix.sdo('MusicRelease'),
  // Format of this release (the type of recording media used, ie. compact disc, digital media, LP, etc.).
  'MusicReleaseFormatType': prefix.sdo('MusicReleaseFormatType'),
  // A music store.
  'MusicStore': prefix.sdo('MusicStore'),
  // A music venue.
  'MusicVenue': prefix.sdo('MusicVenue'),
  // A music video file.
  'MusicVideoObject': prefix.sdo('MusicVideoObject'),
  // Organization: Non-governmental Organization.
  'NGO': prefix.sdo('NGO'),
  // NLNonprofitType: Non-profit organization type originating from the Netherlands.
  'NLNonprofitType': prefix.sdo('NLNonprofitType'),
  // A nail salon.
  'NailSalon': prefix.sdo('NailSalon'),
  // Neck assessment with clinical examination.
  'Neck': prefix.sdo('Neck'),
  // A common pathway for the electrochemical nerve impulses that are transmitted along each of the axons.
  'Nerve': prefix.sdo('Nerve'),
  // Neurological system clinical examination.
  'Neuro': prefix.sdo('Neuro'),
  // A specific branch of medical science that studies the nerves and nervous system and its respective disease states.
  'Neurologic': prefix.sdo('Neurologic'),
  // Indicates that the item is new.
  'NewCondition': prefix.sdo('NewCondition'),
  // A NewsArticle is an article whose content reports news, or provides background context and supporting materials for understanding the news.A more detailed overview of [schema.org News markup](/docs/news.html) is also available.
  'NewsArticle': prefix.sdo('NewsArticle'),
  // A News/Media organization such as a newspaper or TV station.
  'NewsMediaOrganization': prefix.sdo('NewsMediaOrganization'),
  // A publication containing information about varied topics that are pertinent to general information, a geographic area, or a specific subject matter (i.e. business, culture, education). Often published daily.
  'Newspaper': prefix.sdo('Newspaper'),
  // A nightclub or discotheque.
  'NightClub': prefix.sdo('NightClub'),
  // A type of medical procedure that involves noninvasive techniques.
  'NoninvasiveProcedure': prefix.sdo('NoninvasiveProcedure'),
  // Nonprofit501a: Non-profit type referring to Farmers’ Cooperative Associations.
  'Nonprofit501a': prefix.sdo('Nonprofit501a'),
  // Nonprofit501c1: Non-profit type referring to Corporations Organized Under Act of Congress, including Federal Credit Unions and National Farm Loan Associations.
  'Nonprofit501c1': prefix.sdo('Nonprofit501c1'),
  // Nonprofit501c10: Non-profit type referring to Domestic Fraternal Societies and Associations.
  'Nonprofit501c10': prefix.sdo('Nonprofit501c10'),
  // Nonprofit501c11: Non-profit type referring to Teachers' Retirement Fund Associations.
  'Nonprofit501c11': prefix.sdo('Nonprofit501c11'),
  // Nonprofit501c12: Non-profit type referring to Benevolent Life Insurance Associations, Mutual Ditch or Irrigation Companies, Mutual or Cooperative Telephone Companies.
  'Nonprofit501c12': prefix.sdo('Nonprofit501c12'),
  // Nonprofit501c13: Non-profit type referring to Cemetery Companies.
  'Nonprofit501c13': prefix.sdo('Nonprofit501c13'),
  // Nonprofit501c14: Non-profit type referring to State-Chartered Credit Unions, Mutual Reserve Funds.
  'Nonprofit501c14': prefix.sdo('Nonprofit501c14'),
  // Nonprofit501c15: Non-profit type referring to Mutual Insurance Companies or Associations.
  'Nonprofit501c15': prefix.sdo('Nonprofit501c15'),
  // Nonprofit501c16: Non-profit type referring to Cooperative Organizations to Finance Crop Operations.
  'Nonprofit501c16': prefix.sdo('Nonprofit501c16'),
  // Nonprofit501c17: Non-profit type referring to Supplemental Unemployment Benefit Trusts.
  'Nonprofit501c17': prefix.sdo('Nonprofit501c17'),
  // Nonprofit501c18: Non-profit type referring to Employee Funded Pension Trust (created before 25 June 1959).
  'Nonprofit501c18': prefix.sdo('Nonprofit501c18'),
  // Nonprofit501c19: Non-profit type referring to Post or Organization of Past or Present Members of the Armed Forces.
  'Nonprofit501c19': prefix.sdo('Nonprofit501c19'),
  // Nonprofit501c2: Non-profit type referring to Title-holding Corporations for Exempt Organizations.
  'Nonprofit501c2': prefix.sdo('Nonprofit501c2'),
  // Nonprofit501c20: Non-profit type referring to Group Legal Services Plan Organizations.
  'Nonprofit501c20': prefix.sdo('Nonprofit501c20'),
  // Nonprofit501c21: Non-profit type referring to Black Lung Benefit Trusts.
  'Nonprofit501c21': prefix.sdo('Nonprofit501c21'),
  // Nonprofit501c22: Non-profit type referring to Withdrawal Liability Payment Funds.
  'Nonprofit501c22': prefix.sdo('Nonprofit501c22'),
  // Nonprofit501c23: Non-profit type referring to Veterans Organizations.
  'Nonprofit501c23': prefix.sdo('Nonprofit501c23'),
  // Nonprofit501c24: Non-profit type referring to Section 4049 ERISA Trusts.
  'Nonprofit501c24': prefix.sdo('Nonprofit501c24'),
  // Nonprofit501c25: Non-profit type referring to Real Property Title-Holding Corporations or Trusts with Multiple Parents.
  'Nonprofit501c25': prefix.sdo('Nonprofit501c25'),
  // Nonprofit501c26: Non-profit type referring to State-Sponsored Organizations Providing Health Coverage for High-Risk Individuals.
  'Nonprofit501c26': prefix.sdo('Nonprofit501c26'),
  // Nonprofit501c27: Non-profit type referring to State-Sponsored Workers' Compensation Reinsurance Organizations.
  'Nonprofit501c27': prefix.sdo('Nonprofit501c27'),
  // Nonprofit501c28: Non-profit type referring to National Railroad Retirement Investment Trusts.
  'Nonprofit501c28': prefix.sdo('Nonprofit501c28'),
  // Nonprofit501c3: Non-profit type referring to Religious, Educational, Charitable, Scientific, Literary, Testing for Public Safety, to Foster National or International Amateur Sports Competition, or Prevention of Cruelty to Children or Animals Organizations.
  'Nonprofit501c3': prefix.sdo('Nonprofit501c3'),
  // Nonprofit501c4: Non-profit type referring to Civic Leagues, Social Welfare Organizations, and Local Associations of Employees.
  'Nonprofit501c4': prefix.sdo('Nonprofit501c4'),
  // Nonprofit501c5: Non-profit type referring to Labor, Agricultural and Horticultural Organizations.
  'Nonprofit501c5': prefix.sdo('Nonprofit501c5'),
  // Nonprofit501c6: Non-profit type referring to Business Leagues, Chambers of Commerce, Real Estate Boards.
  'Nonprofit501c6': prefix.sdo('Nonprofit501c6'),
  // Nonprofit501c7: Non-profit type referring to Social and Recreational Clubs.
  'Nonprofit501c7': prefix.sdo('Nonprofit501c7'),
  // Nonprofit501c8: Non-profit type referring to Fraternal Beneficiary Societies and Associations.
  'Nonprofit501c8': prefix.sdo('Nonprofit501c8'),
  // Nonprofit501c9: Non-profit type referring to Voluntary Employee Beneficiary Associations.
  'Nonprofit501c9': prefix.sdo('Nonprofit501c9'),
  // Nonprofit501d: Non-profit type referring to Religious and Apostolic Associations.
  'Nonprofit501d': prefix.sdo('Nonprofit501d'),
  // Nonprofit501e: Non-profit type referring to Cooperative Hospital Service Organizations.
  'Nonprofit501e': prefix.sdo('Nonprofit501e'),
  // Nonprofit501f: Non-profit type referring to Cooperative Service Organizations.
  'Nonprofit501f': prefix.sdo('Nonprofit501f'),
  // Nonprofit501k: Non-profit type referring to Child Care Organizations.
  'Nonprofit501k': prefix.sdo('Nonprofit501k'),
  // Nonprofit501n: Non-profit type referring to Charitable Risk Pools.
  'Nonprofit501n': prefix.sdo('Nonprofit501n'),
  // Nonprofit501q: Non-profit type referring to Credit Counseling Organizations.
  'Nonprofit501q': prefix.sdo('Nonprofit501q'),
  // Nonprofit527: Non-profit type referring to Political organizations.
  'Nonprofit527': prefix.sdo('Nonprofit527'),
  // NonprofitANBI: Non-profit type referring to a Public Benefit Organization (NL).
  'NonprofitANBI': prefix.sdo('NonprofitANBI'),
  // NonprofitSBBI: Non-profit type referring to a Social Interest Promoting Institution (NL).
  'NonprofitSBBI': prefix.sdo('NonprofitSBBI'),
  // NonprofitType enumerates several kinds of official non-profit types of which a non-profit organization can be.
  'NonprofitType': prefix.sdo('NonprofitType'),
  // Nose function assessment with clinical examination.
  'Nose': prefix.sdo('Nose'),
  // Indicates that a legislation is currently not in force.
  'NotInForce': prefix.sdo('NotInForce'),
  // Not yet recruiting.
  'NotYetRecruiting': prefix.sdo('NotYetRecruiting'),
  // A notary.
  'Notary': prefix.sdo('Notary'),
  // A file containing a note, primarily for the author.
  'NoteDigitalDocument': prefix.sdo('NoteDigitalDocument'),
  // Data type: Number.Usage guidelines:* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
  'Number': prefix.sdo('Number'),
  // A health profession of a person formally educated and trained in the care of the sick or infirm person.
  'Nursing': prefix.sdo('Nursing'),
  // Nutritional information about the recipe.
  'NutritionInformation': prefix.sdo('NutritionInformation'),
  // The character of a medical substance, typically a medicine, of being available over the counter or not.
  'OTC': prefix.sdo('OTC'),
  // Instances of the class [[Observation]] are used to specify observations about an entity (which may or may not be an instance of a [[StatisticalPopulation]]), at a particular time. The principal properties of an [[Observation]] are [[observedNode]], [[measuredProperty]], [[measuredValue]] (or [[median]], etc.) and [[observationDate]] ([[measuredProperty]] properties can, but need not always, be W3C RDF Data Cube \"measure properties\", as in the [lifeExpectancy example](https://www.w3.org/TR/vocab-data-cube/#dsd-example)).See also [[StatisticalPopulation]], and the [data and datasets](/docs/data-and-datasets.html) overview for more details.
  'Observation': prefix.sdo('Observation'),
  // An observational study design.
  'Observational': prefix.sdo('Observational'),
  // A specific branch of medical science that specializes in the care of women during the prenatal and postnatal care and with the delivery of the child.
  'Obstetric': prefix.sdo('Obstetric'),
  // A profession, may involve prolonged training and/or a formal qualification.
  'Occupation': prefix.sdo('Occupation'),
  // Any physical activity engaged in for job-related purposes. Examples may include waiting tables, maid service, carrying a mailbag, picking fruits or vegetables, construction work, etc.
  'OccupationalActivity': prefix.sdo('OccupationalActivity'),
  // Indicates employment-related experience requirements, e.g. [[monthsOfExperience]].
  'OccupationalExperienceRequirements': prefix.sdo('OccupationalExperienceRequirements'),
  // A treatment of people with physical, emotional, or social problems, using purposeful activity to help them overcome or learn to deal with their problems.
  'OccupationalTherapy': prefix.sdo('OccupationalTherapy'),
  // An ocean (for example, the Pacific).
  'OceanBodyOfWater': prefix.sdo('OceanBodyOfWater'),
  // An offer to transfer some rights to an item or to provide a service — for example, an offer to sell tickets to an event, to rent the DVD of a movie, to stream a TV show over the internet, to repair a motorcycle, or to loan a book.Note: As the [[businessFunction]] property, which identifies the form of offer (e.g. sell, lease, repair, dispose), defaults to http://purl.org/goodrelations/v1#Sell; an Offer without a defined businessFunction value can be assumed to be an offer to sell.For [GTIN](http://www.gs1.org/barcodes/technical/idkeys/gtin)-related fields, see [Check Digit calculator](http://www.gs1.org/barcodes/support/check_digit_calculator) and [validation guide](http://www.gs1us.org/resources/standards/gtin-validation-guide) from [GS1](http://www.gs1.org/).
  'Offer': prefix.sdo('Offer'),
  // An OfferCatalog is an ItemList that contains related Offers and/or further OfferCatalogs that are offeredBy the same provider.
  'OfferCatalog': prefix.sdo('OfferCatalog'),
  // An [[OfferForLease]] in Schema.org represents an [[Offer]] to lease out something, i.e. an [[Offer]] whose  [[businessFunction]] is [lease out](http://purl.org/goodrelations/v1#LeaseOut.). See [Good Relations](https://en.wikipedia.org/wiki/GoodRelations) for  background on the underlying concepts.
  'OfferForLease': prefix.sdo('OfferForLease'),
  // An [[OfferForPurchase]] in Schema.org represents an [[Offer]] to sell something, i.e. an [[Offer]] whose  [[businessFunction]] is [sell](http://purl.org/goodrelations/v1#Sell.). See [Good Relations](https://en.wikipedia.org/wiki/GoodRelations) for  background on the underlying concepts.
  'OfferForPurchase': prefix.sdo('OfferForPurchase'),
  // A list of possible conditions for the item.
  'OfferItemCondition': prefix.sdo('OfferItemCondition'),
  // OfferShippingDetails represents information about shipping destinations.Multiple of these entities can be used to represent different shipping rates for different destinations:One entity for Alaska/Hawaii. A different one for continental US.A different one for all France.Multiple of these entities can be used to represent different shipping costs and delivery times.Two entities that are identical but differ in rate and time:e.g. Cheaper and slower: $5 in 5-7daysor Fast and expensive: $15 in 1-2 days.
  'OfferShippingDetails': prefix.sdo('OfferShippingDetails'),
  // An office equipment store.
  'OfficeEquipmentStore': prefix.sdo('OfficeEquipmentStore'),
  // All the documents published by an official publisher should have at least the legal value level \"OfficialLegalValue\". This indicates that the document was published by an organisation with the public task of making it available (e.g. a consolidated version of a EU directive published by the EU Office of Publications).
  'OfficialLegalValue': prefix.sdo('OfficialLegalValue'),
  // OfflineEventAttendanceMode - an event that is primarily conducted offline.
  'OfflineEventAttendanceMode': prefix.sdo('OfflineEventAttendanceMode'),
  // Game server status: OfflinePermanently. Server is offline and not available.
  'OfflinePermanently': prefix.sdo('OfflinePermanently'),
  // Game server status: OfflineTemporarily. Server is offline now but it can be online soon.
  'OfflineTemporarily': prefix.sdo('OfflineTemporarily'),
  // A publication event e.g. catch-up TV or radio podcast, during which a program is available on-demand.
  'OnDemandEvent': prefix.sdo('OnDemandEvent'),
  // A DeliveryMethod in which an item is collected on site, e.g. in a store or at a box office.
  'OnSitePickup': prefix.sdo('OnSitePickup'),
  // A specific branch of medical science that deals with benign and malignant tumors, including the study of their development, diagnosis, treatment and prevention.
  'Oncologic': prefix.sdo('Oncologic'),
  // OneTimePayments: this is a benefit for one-time payments for individuals.
  'OneTimePayments': prefix.sdo('OneTimePayments'),
  // Game server status: Online. Server is available.
  'Online': prefix.sdo('Online'),
  // OnlineEventAttendanceMode - an event that is primarily conducted online.
  'OnlineEventAttendanceMode': prefix.sdo('OnlineEventAttendanceMode'),
  // Game server status: OnlineFull. Server is online but unavailable. The maximum number of players has reached.
  'OnlineFull': prefix.sdo('OnlineFull'),
  // Indicates that the item is available only online.
  'OnlineOnly': prefix.sdo('OnlineOnly'),
  // A trial design in which the researcher knows the full details of the treatment, and so does the patient.
  'OpenTrial': prefix.sdo('OpenTrial'),
  // A structured value providing information about the opening hours of a place or a certain service inside a place.The place is __open__ if the [[opens]] property is specified, and __closed__ otherwise.If the value for the [[closes]] property is less than the value for the [[opens]] property then the hour range is assumed to span over the next day.
  'OpeningHoursSpecification': prefix.sdo('OpeningHoursSpecification'),
  // An [[OpinionNewsArticle]] is a [[NewsArticle]] that primarily expresses opinions rather than journalistic reporting of news and events. For example, a [[NewsArticle]] consisting of a column or [[Blog]]/[[BlogPosting]] entry in the Opinions section of a news publication.
  'OpinionNewsArticle': prefix.sdo('OpinionNewsArticle'),
  // A store that sells reading glasses and similar devices for improving vision.
  'Optician': prefix.sdo('Optician'),
  // The science or practice of testing visual acuity and prescribing corrective lenses.
  'Optometric': prefix.sdo('Optometric'),
  // An order is a confirmation of a transaction (a receipt), which can contain multiple line items, each represented by an Offer that has been accepted by the customer.
  'Order': prefix.sdo('Order'),
  // An agent orders an object/product/service to be delivered/sent.
  'OrderAction': prefix.sdo('OrderAction'),
  // OrderStatus representing cancellation of an order.
  'OrderCancelled': prefix.sdo('OrderCancelled'),
  // OrderStatus representing successful delivery of an order.
  'OrderDelivered': prefix.sdo('OrderDelivered'),
  // OrderStatus representing that an order is in transit.
  'OrderInTransit': prefix.sdo('OrderInTransit'),
  // An order item is a line of an order. It includes the quantity and shipping details of a bought offer.
  'OrderItem': prefix.sdo('OrderItem'),
  // OrderStatus representing that payment is due on an order.
  'OrderPaymentDue': prefix.sdo('OrderPaymentDue'),
  // OrderStatus representing availability of an order for pickup.
  'OrderPickupAvailable': prefix.sdo('OrderPickupAvailable'),
  // OrderStatus representing that there is a problem with the order.
  'OrderProblem': prefix.sdo('OrderProblem'),
  // OrderStatus representing that an order is being processed.
  'OrderProcessing': prefix.sdo('OrderProcessing'),
  // OrderStatus representing that an order has been returned.
  'OrderReturned': prefix.sdo('OrderReturned'),
  // Enumerated status values for Order.
  'OrderStatus': prefix.sdo('OrderStatus'),
  // An organization such as a school, NGO, corporation, club, etc.
  'Organization': prefix.sdo('Organization'),
  // A subclass of Role used to describe roles within organizations.
  'OrganizationRole': prefix.sdo('OrganizationRole'),
  // The act of manipulating/administering/supervising/controlling one or more objects.
  'OrganizeAction': prefix.sdo('OrganizeAction'),
  // Content coded 'as original media content' in a [[MediaReview]], considered in the context of how it was published or shared.For a [[VideoObject]] to be 'original': No evidence the footage has been misleadingly altered or manipulated, though it may contain false or misleading claims.For an [[ImageObject]] to be 'original': No evidence the image has been misleadingly altered or manipulated, though it may still contain false or misleading claims.For an [[ImageObject]] with embedded text to be 'original': No evidence the image has been misleadingly altered or manipulated, though it may still contain false or misleading claims.For an [[AudioObject]] to be 'original': No evidence the audio has been misleadingly altered or manipulated, though it may contain false or misleading claims.
  'OriginalMediaContent': prefix.sdo('OriginalMediaContent'),
  // Specifies that the customer must pay the original shipping costs when returning a product.
  'OriginalShippingFees': prefix.sdo('OriginalShippingFees'),
  // A system of medicine focused on promoting the body's innate ability to heal itself.
  'Osteopathic': prefix.sdo('Osteopathic'),
  // A specific branch of medical science that is concerned with the ear, nose and throat and their respective disease states.
  'Otolaryngologic': prefix.sdo('Otolaryngologic'),
  // Indicates that the item is out of stock.
  'OutOfStock': prefix.sdo('OutOfStock'),
  // An outlet store.
  'OutletStore': prefix.sdo('OutletStore'),
  // Overview of the content. Contains a summarized view of the topic with the most relevant information for an introduction.
  'OverviewHealthAspect': prefix.sdo('OverviewHealthAspect'),
  // A structured value providing information about when a certain organization or person owned a certain product.
  'OwnershipInfo': prefix.sdo('OwnershipInfo'),
  // Positron emission tomography imaging.
  'PET': prefix.sdo('PET'),
  // PaidLeave: this is a benefit for paid leave.
  'PaidLeave': prefix.sdo('PaidLeave'),
  // The act of producing a painting, typically with paint and canvas as instruments.
  'PaintAction': prefix.sdo('PaintAction'),
  // A painting.
  'Painting': prefix.sdo('Painting'),
  // A medical procedure intended primarily for palliative purposes, aimed at relieving the symptoms of an underlying health condition.
  'PalliativeProcedure': prefix.sdo('PalliativeProcedure'),
  // Book format: Paperback.
  'Paperback': prefix.sdo('Paperback'),
  // The delivery of a parcel either via the postal service or a commercial service.
  'ParcelDelivery': prefix.sdo('ParcelDelivery'),
  // A private parcel service as the delivery mode available for a certain offer.Commonly used values:* http://purl.org/goodrelations/v1#DHL* http://purl.org/goodrelations/v1#FederalExpress* http://purl.org/goodrelations/v1#UPS
  'ParcelService': prefix.sdo('ParcelService'),
  // A set of characteristics describing parents, who can be interested in viewing some content.
  'ParentAudience': prefix.sdo('ParentAudience'),
  // ParentalSupport: this is a benefit for parental support.
  'ParentalSupport': prefix.sdo('ParentalSupport'),
  // A park.
  'Park': prefix.sdo('Park'),
  // A parking lot or other parking facility.
  'ParkingFacility': prefix.sdo('ParkingFacility'),
  // A parking map.
  'ParkingMap': prefix.sdo('ParkingMap'),
  // Indicates that parts of the legislation are in force, and parts are not.
  'PartiallyInForce': prefix.sdo('PartiallyInForce'),
  // A specific branch of medical science that is concerned with the study of the cause, origin and nature of a disease state, including its consequences as a result of manifestation of the disease. In clinical care, the term is used to designate a branch of medicine using laboratory tests to diagnose and determine the prognostic significance of illness.
  'Pathology': prefix.sdo('Pathology'),
  // A medical test performed by a laboratory that typically involves examination of a tissue sample by a pathologist.
  'PathologyTest': prefix.sdo('PathologyTest'),
  // A patient is any person recipient of health care services.
  'Patient': prefix.sdo('Patient'),
  // Content about the real life experience of patients or people that have lived a similar experience about the topic. May be forums, topics, Q-and-A and related material.
  'PatientExperienceHealthAspect': prefix.sdo('PatientExperienceHealthAspect'),
  // A shop that will buy, or lend money against the security of, personal possessions.
  'PawnShop': prefix.sdo('PawnShop'),
  // An agent pays a price to a participant.
  'PayAction': prefix.sdo('PayAction'),
  // An automatic payment system is in place and will be used.
  'PaymentAutomaticallyApplied': prefix.sdo('PaymentAutomaticallyApplied'),
  // A payment method using a credit, debit, store or other card to associate the payment with an account.
  'PaymentCard': prefix.sdo('PaymentCard'),
  // The costs of settling the payment using a particular payment method.
  'PaymentChargeSpecification': prefix.sdo('PaymentChargeSpecification'),
  // The payment has been received and processed.
  'PaymentComplete': prefix.sdo('PaymentComplete'),
  // The payee received the payment, but it was declined for some reason.
  'PaymentDeclined': prefix.sdo('PaymentDeclined'),
  // The payment is due, but still within an acceptable time to be received.
  'PaymentDue': prefix.sdo('PaymentDue'),
  // A payment method is a standardized procedure for transferring the monetary amount for a purchase. Payment methods are characterized by the legal and technical structures used, and by the organization or group carrying out the transaction.Commonly used values:* http://purl.org/goodrelations/v1#ByBankTransferInAdvance* http://purl.org/goodrelations/v1#ByInvoice* http://purl.org/goodrelations/v1#Cash* http://purl.org/goodrelations/v1#CheckInAdvance* http://purl.org/goodrelations/v1#COD* http://purl.org/goodrelations/v1#DirectDebit* http://purl.org/goodrelations/v1#GoogleCheckout* http://purl.org/goodrelations/v1#PayPal* http://purl.org/goodrelations/v1#PaySwarm
  'PaymentMethod': prefix.sdo('PaymentMethod'),
  // The payment is due and considered late.
  'PaymentPastDue': prefix.sdo('PaymentPastDue'),
  // A Service to transfer funds from a person or organization to a beneficiary person or organization.
  'PaymentService': prefix.sdo('PaymentService'),
  // A specific payment status. For example, PaymentDue, PaymentComplete, etc.
  'PaymentStatusType': prefix.sdo('PaymentStatusType'),
  // A specific branch of medical science that specializes in the care of infants, children and adolescents.
  'Pediatric': prefix.sdo('Pediatric'),
  // A set of characteristics belonging to people, e.g. who compose an item's target audience.
  'PeopleAudience': prefix.sdo('PeopleAudience'),
  // A type of medical procedure that involves percutaneous techniques, where access to organs or tissue is achieved via needle-puncture of the skin. For example, catheter-based procedures like stent delivery.
  'PercutaneousProcedure': prefix.sdo('PercutaneousProcedure'),
  // The act of participating in performance arts.
  'PerformAction': prefix.sdo('PerformAction'),
  // A PerformanceRole is a Role that some entity places with regard to a theatrical performance, e.g. in a Movie, TVSeries etc.
  'PerformanceRole': prefix.sdo('PerformanceRole'),
  // A theater or other performing art center.
  'PerformingArtsTheater': prefix.sdo('PerformingArtsTheater'),
  // A performance group, such as a band, an orchestra, or a circus.
  'PerformingGroup': prefix.sdo('PerformingGroup'),
  // A publication in any medium issued in successive parts bearing numerical or chronological designations and intended, such as a magazine, scholarly journal, or newspaper to continue indefinitely.See also [blog post](http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html).
  'Periodical': prefix.sdo('Periodical'),
  // A permit issued by an organization, e.g. a parking pass.
  'Permit': prefix.sdo('Permit'),
  // A person (alive, dead, undead, or fictional).
  'Person': prefix.sdo('Person'),
  // A pet store.
  'PetStore': prefix.sdo('PetStore'),
  // A pharmacy or drugstore.
  'Pharmacy': prefix.sdo('Pharmacy'),
  // The practice or art and science of preparing and dispensing drugs and medicines.
  'PharmacySpecialty': prefix.sdo('PharmacySpecialty'),
  // A photograph.
  'Photograph': prefix.sdo('Photograph'),
  // The act of capturing still images of objects using a camera.
  'PhotographAction': prefix.sdo('PhotographAction'),
  // Any bodily activity that enhances or maintains physical fitness and overall health and wellness. Includes activity that is part of daily living and routine, structured exercise, and exercise prescribed as part of a medical treatment or recovery plan.
  'PhysicalActivity': prefix.sdo('PhysicalActivity'),
  // Categories of physical activity, organized by physiologic classification.
  'PhysicalActivityCategory': prefix.sdo('PhysicalActivityCategory'),
  // A type of physical examination of a patient performed by a physician.
  'PhysicalExam': prefix.sdo('PhysicalExam'),
  // A process of progressive physical care and rehabilitation aimed at improving a health condition.
  'PhysicalTherapy': prefix.sdo('PhysicalTherapy'),
  // A doctor's office.
  'Physician': prefix.sdo('Physician'),
  // The practice of treatment of disease, injury, or deformity by physical methods such as massage, heat treatment, and exercise rather than by drugs or surgery..
  'Physiotherapy': prefix.sdo('Physiotherapy'),
  // Entities that have a somewhat fixed, physical extension.
  'Place': prefix.sdo('Place'),
  // Place of worship, such as a church, synagogue, or mosque.
  'PlaceOfWorship': prefix.sdo('PlaceOfWorship'),
  // A placebo-controlled trial design.
  'PlaceboControlledTrial': prefix.sdo('PlaceboControlledTrial'),
  // The act of planning the execution of an event/task/action/reservation/plan to a future date.
  'PlanAction': prefix.sdo('PlanAction'),
  // A specific branch of medical science that pertains to therapeutic or cosmetic repair or re-formation of missing, injured or malformed tissues or body parts by manual and instrumental means.
  'PlasticSurgery': prefix.sdo('PlasticSurgery'),
  // A play is a form of literature, usually consisting of dialogue between characters, intended for theatrical performance rather than just reading. Note: A performance of a Play would be a [[TheaterEvent]] or [[BroadcastEvent]] - the *Play* being the [[workPerformed]].
  'Play': prefix.sdo('Play'),
  // The act of playing/exercising/training/performing for enjoyment, leisure, recreation, Competition or exercise.Related actions:* [[ListenAction]]: Unlike ListenAction (which is under ConsumeAction), PlayAction refers to performing for an audience or at an event, rather than consuming music.* [[WatchAction]]: Unlike WatchAction (which is under ConsumeAction), PlayAction refers to showing/displaying for an audience or at an event, rather than consuming visual content.
  'PlayAction': prefix.sdo('PlayAction'),
  // A playground.
  'Playground': prefix.sdo('Playground'),
  // A plumbing service.
  'Plumber': prefix.sdo('Plumber'),
  // A single episode of a podcast series.
  'PodcastEpisode': prefix.sdo('PodcastEpisode'),
  // A single season of a podcast. Many podcasts do not break down into separate seasons. In that case, PodcastSeries should be used.
  'PodcastSeason': prefix.sdo('PodcastSeason'),
  // A podcast is an episodic series of digital audio or video files which a user can download and listen to.
  'PodcastSeries': prefix.sdo('PodcastSeries'),
  // Podiatry is the care of the human foot, especially the diagnosis and treatment of foot disorders.
  'Podiatric': prefix.sdo('Podiatric'),
  // A police station.
  'PoliceStation': prefix.sdo('PoliceStation'),
  // A pond.
  'Pond': prefix.sdo('Pond'),
  // A post office.
  'PostOffice': prefix.sdo('PostOffice'),
  // The mailing address.
  'PostalAddress': prefix.sdo('PostalAddress'),
  // Indicates a range of postalcodes, usually defined as the set of valid codes between [[postalCodeBegin]] and [[postalCodeEnd]], inclusively.
  'PostalCodeRangeSpecification': prefix.sdo('PostalCodeRangeSpecification'),
  // A large, usually printed placard, bill, or announcement, often illustrated, that is posted to advertise or publicize something.
  'Poster': prefix.sdo('Poster'),
  // A description of an action that is supported.
  'PotentialActionStatus': prefix.sdo('PotentialActionStatus'),
  // Indicates that the item is available for pre-order.
  'PreOrder': prefix.sdo('PreOrder'),
  // An agent orders a (not yet released) object/product/service to be delivered/sent.
  'PreOrderAction': prefix.sdo('PreOrderAction'),
  // Indicates that the item is available for ordering and delivery before general availability.
  'PreSale': prefix.sdo('PreSale'),
  // Content discussing pregnancy-related aspects of a health topic.
  'PregnancyHealthAspect': prefix.sdo('PregnancyHealthAspect'),
  // The act of inserting at the beginning if an ordered collection.
  'PrependAction': prefix.sdo('PrependAction'),
  // A preschool.
  'Preschool': prefix.sdo('Preschool'),
  // Available by prescription only.
  'PrescriptionOnly': prefix.sdo('PrescriptionOnly'),
  // A file containing slides or used for a presentation.
  'PresentationDigitalDocument': prefix.sdo('PresentationDigitalDocument'),
  // Information about actions or measures that can be taken to avoid getting the topic or reaching a critical situation related to the topic.
  'PreventionHealthAspect': prefix.sdo('PreventionHealthAspect'),
  // An indication for preventing an underlying condition, symptom, etc.
  'PreventionIndication': prefix.sdo('PreventionIndication'),
  // Enumerates different price components that together make up the total price for an offered product.
  'PriceComponentTypeEnumeration': prefix.sdo('PriceComponentTypeEnumeration'),
  // A structured value representing a price or price range. Typically, only the subclasses of this type are used for markup. It is recommended to use [[MonetaryAmount]] to describe independent amounts of money such as a salary, credit card limits, etc.
  'PriceSpecification': prefix.sdo('PriceSpecification'),
  // Enumerates different price types, for example list price, invoice price, and sale price.
  'PriceTypeEnumeration': prefix.sdo('PriceTypeEnumeration'),
  // The medical care by a physician, or other health-care professional, who is the patient's first contact with the health-care system and who may recommend a specialist if necessary.
  'PrimaryCare': prefix.sdo('PrimaryCare'),
  // A prion is an infectious agent composed of protein in a misfolded form.
  'Prion': prefix.sdo('Prion'),
  // Any offered product or service. For example: a pair of shoes; a concert ticket; the rental of a car; a haircut; or an episode of a TV show streamed online.
  'Product': prefix.sdo('Product'),
  // A set of products (either [[ProductGroup]]s or specific variants) that are listed together e.g. in an [[Offer]].
  'ProductCollection': prefix.sdo('ProductCollection'),
  // A ProductGroup represents a group of [[Product]]s that vary only in certain well-described ways, such as by [[size]], [[color]], [[material]] etc.While a ProductGroup itself is not directly offered for sale, the various varying products that it represents can be. The ProductGroup serves as a prototype or template, standing in for all of the products who have an [[isVariantOf]] relationship to it. As such, properties (including additional types) can be applied to the ProductGroup to represent characteristics shared by each of the (possibly very many) variants. Properties that reference a ProductGroup are not included in this mechanism; neither are the following specific properties [[variesBy]], [[hasVariant]], [[url]].
  'ProductGroup': prefix.sdo('ProductGroup'),
  // A datasheet or vendor specification of a product (in the sense of a prototypical description).
  'ProductModel': prefix.sdo('ProductModel'),
  // ProductReturnEnumeration enumerates several kinds of product return policy. Note that this structure may not capture all aspects of the policy.
  'ProductReturnEnumeration': prefix.sdo('ProductReturnEnumeration'),
  // ProductReturnFiniteReturnWindow: there is a finite window for product returns.
  'ProductReturnFiniteReturnWindow': prefix.sdo('ProductReturnFiniteReturnWindow'),
  // ProductReturnNotPermitted: product returns are not permitted.
  'ProductReturnNotPermitted': prefix.sdo('ProductReturnNotPermitted'),
  // A ProductReturnPolicy provides information about product return policies associated with an [[Organization]] or [[Product]].
  'ProductReturnPolicy': prefix.sdo('ProductReturnPolicy'),
  // ProductReturnUnlimitedWindow: there is an unlimited window for product returns.
  'ProductReturnUnlimitedWindow': prefix.sdo('ProductReturnUnlimitedWindow'),
  // ProductReturnUnspecified: a product return policy is not specified here.
  'ProductReturnUnspecified': prefix.sdo('ProductReturnUnspecified'),
  // Original definition: \"provider of professional services.\"The general [[ProfessionalService]] type for local businesses was deprecated due to confusion with [[Service]]. For reference, the types that it included were: [[Dentist]],        [[AccountingService]], [[Attorney]], [[Notary]], as well as types for several kinds of [[HomeAndConstructionBusiness]]: [[Electrician]], [[GeneralContractor]],        [[HousePainter]], [[Locksmith]], [[Plumber]], [[RoofingContractor]]. [[LegalService]] was introduced as a more inclusive supertype of [[Attorney]].
  'ProfessionalService': prefix.sdo('ProfessionalService'),
  // Web page type: Profile page.
  'ProfilePage': prefix.sdo('ProfilePage'),
  // Typical progression and happenings of life course of the topic.
  'PrognosisHealthAspect': prefix.sdo('PrognosisHealthAspect'),
  // Used to describe membership in a loyalty programs (e.g. \"StarAliance\"), traveler clubs (e.g. \"AAA\"), purchase clubs (\"Safeway Club\"), etc.
  'ProgramMembership': prefix.sdo('ProgramMembership'),
  // An enterprise (potentially individual but typically collaborative), planned to achieve a particular aim.Use properties from [[Organization]], [[subOrganization]]/[[parentOrganization]] to indicate project sub-structures.
  'Project': prefix.sdo('Project'),
  // Data type: PronounceableText.
  'PronounceableText': prefix.sdo('PronounceableText'),
  // A property, used to indicate attributes and relationships of some Thing; equivalent to rdf:Property.
  'Property': prefix.sdo('Property'),
  // A property-value pair, e.g. representing a feature of a product or place. Use the 'name' property for the name of the property. If there is an additional human-readable version of the value, put that into the 'description' property. Always use specific schema.org properties when a) they exist and b) you can populate them. Using PropertyValue as a substitute will typically not trigger the same effect as using the original, specific property.
  'PropertyValue': prefix.sdo('PropertyValue'),
  // A Property value specification.
  'PropertyValueSpecification': prefix.sdo('PropertyValueSpecification'),
  // Protein is here used in its widest possible definition, as classes of amino acid based molecules. Amyloid-beta Protein in human (UniProt P05067), eukaryota (e.g. an OrthoDB group) or even a single molecule that one can point to are all of type schema:Protein. A protein can thus be a subclass of another protein, e.g. schema:Protein as a UniProt record can have multiple isoforms inside it which would also be schema:Protein. They can be imagined, synthetic, hypothetical or naturally occurring.
  'Protein': prefix.sdo('Protein'),
  // Single-celled organism that causes an infection.
  'Protozoa': prefix.sdo('Protozoa'),
  // A specific branch of medical science that is concerned with the study, treatment, and prevention of mental illness, using both medical and psychological therapies.
  'Psychiatric': prefix.sdo('Psychiatric'),
  // A process of care relying upon counseling, dialogue and communication  aimed at improving a mental health condition without use of drugs.
  'PsychologicalTreatment': prefix.sdo('PsychologicalTreatment'),
  // Branch of medicine that pertains to the health services to improve and protect community health, especially epidemiology, sanitation, immunization, and preventive medicine.
  'PublicHealth': prefix.sdo('PublicHealth'),
  // This stands for any day that is a public holiday; it is a placeholder for all official public holidays in some particular location. While not technically a \"day of the week\", it can be used with [[OpeningHoursSpecification]]. In the context of an opening hours specification it can be used to indicate opening hours on public holidays, overriding general opening hours for the day of the week on which a public holiday occurs.
  'PublicHolidays': prefix.sdo('PublicHolidays'),
  // A public swimming pool.
  'PublicSwimmingPool': prefix.sdo('PublicSwimmingPool'),
  // A public toilet is a room or small building containing one or more toilets (and possibly also urinals) which is available for use by the general public, or by customers or employees of certain businesses.
  'PublicToilet': prefix.sdo('PublicToilet'),
  // A PublicationEvent corresponds indifferently to the event of publication for a CreativeWork of any type e.g. a broadcast event, an on-demand event, a book/journal publication via a variety of delivery media.
  'PublicationEvent': prefix.sdo('PublicationEvent'),
  // A part of a successively published publication such as a periodical or publication volume, often numbered, usually containing a grouping of works such as articles.See also [blog post](http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html).
  'PublicationIssue': prefix.sdo('PublicationIssue'),
  // A part of a successively published publication such as a periodical or multi-volume work, often numbered. It may represent a time span, such as a year.See also [blog post](http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html).
  'PublicationVolume': prefix.sdo('PublicationVolume'),
  // A specific branch of medical science that pertains to the study of the respiratory system and its respective disease states.
  'Pulmonary': prefix.sdo('Pulmonary'),
  // A QAPage is a WebPage focussed on a specific Question and its Answer(s), e.g. in a question answering site or documenting Frequently Asked Questions (FAQs).
  'QAPage': prefix.sdo('QAPage'),
  // A predefined value for a product characteristic, e.g. the power cord plug type 'US' or the garment sizes 'S', 'M', 'L', and 'XL'.
  'QualitativeValue': prefix.sdo('QualitativeValue'),
  //  A point value or interval for product characteristics and other purposes.
  'QuantitativeValue': prefix.sdo('QuantitativeValue'),
  // A statistical distribution of values.
  'QuantitativeValueDistribution': prefix.sdo('QuantitativeValueDistribution'),
  // Quantities such as distance, time, mass, weight, etc. Particular instances of say Mass are entities like '3 Kg' or '4 milligrams'.
  'Quantity': prefix.sdo('Quantity'),
  // A specific question - e.g. from a user seeking answers online, or collected in a Frequently Asked Questions (FAQ) document.
  'Question': prefix.sdo('Question'),
  // Quiz: A test of knowledge, skills and abilities.
  'Quiz': prefix.sdo('Quiz'),
  // A quotation. Often but not necessarily from some written work, attributable to a real world author and - if associated with a fictional character - to any fictional Person. Use [[isBasedOn]] to link to source/origin. The [[recordedIn]] property can be used to reference a Quotation from an [[Event]].
  'Quotation': prefix.sdo('Quotation'),
  // An agent quotes/estimates/appraises an object/product/service with a price at a location/store.
  'QuoteAction': prefix.sdo('QuoteAction'),
  // A place offering space for \"Recreational Vehicles\", Caravans, mobile homes and the like.
  'RVPark': prefix.sdo('RVPark'),
  // A process of care using radiation aimed at improving a health condition.
  'RadiationTherapy': prefix.sdo('RadiationTherapy'),
  // A delivery service through which radio content is provided via broadcast over the air or online.
  'RadioBroadcastService': prefix.sdo('RadioBroadcastService'),
  // A unique instance of a radio BroadcastService on a CableOrSatelliteService lineup.
  'RadioChannel': prefix.sdo('RadioChannel'),
  // A short radio program or a segment/part of a radio program.
  'RadioClip': prefix.sdo('RadioClip'),
  // A radio episode which can be part of a series or season.
  'RadioEpisode': prefix.sdo('RadioEpisode'),
  // Season dedicated to radio broadcast and associated online delivery.
  'RadioSeason': prefix.sdo('RadioSeason'),
  // CreativeWorkSeries dedicated to radio broadcast and associated online delivery.
  'RadioSeries': prefix.sdo('RadioSeries'),
  // A radio station.
  'RadioStation': prefix.sdo('RadioStation'),
  // Radiography is an imaging technique that uses electromagnetic radiation other than visible light, especially X-rays, to view the internal structure of a non-uniformly composed and opaque object such as the human body.
  'Radiography': prefix.sdo('Radiography'),
  // A randomized trial design.
  'RandomizedTrial': prefix.sdo('RandomizedTrial'),
  // A rating is an evaluation on a numeric scale, such as 1 to 5 stars.
  'Rating': prefix.sdo('Rating'),
  // The act of responding instinctively and emotionally to an object, expressing a sentiment.
  'ReactAction': prefix.sdo('ReactAction'),
  // The act of consuming written content.
  'ReadAction': prefix.sdo('ReadAction'),
  // Permission to read or view the document.
  'ReadPermission': prefix.sdo('ReadPermission'),
  // A real-estate agent.
  'RealEstateAgent': prefix.sdo('RealEstateAgent'),
  // A [[RealEstateListing]] is a listing that describes one or more real-estate [[Offer]]s (whose [[businessFunction]] is typically to lease out, or to sell).  The [[RealEstateListing]] type itself represents the overall listing, as manifested in some [[WebPage]].
  'RealEstateListing': prefix.sdo('RealEstateListing'),
  // Real-wheel drive is a transmission layout where the engine drives the rear wheels.
  'RearWheelDriveConfiguration': prefix.sdo('RearWheelDriveConfiguration'),
  // The act of physically/electronically taking delivery of an object that has been transferred from an origin to a destination. Reciprocal of SendAction.Related actions:* [[SendAction]]: The reciprocal of ReceiveAction.* [[TakeAction]]: Unlike TakeAction, ReceiveAction does not imply that the ownership has been transfered (e.g. I can receive a package, but it does not mean the package is now mine).
  'ReceiveAction': prefix.sdo('ReceiveAction'),
  // A recipe. For dietary restrictions covered by the recipe, a few common restrictions are enumerated via [[suitableForDiet]]. The [[keywords]] property can also be used to add more detail.
  'Recipe': prefix.sdo('Recipe'),
  // [[Recommendation]] is a type of [[Review]] that suggests or proposes something as the best option or best course of action. Recommendations may be for products or services, or other concrete things, as in the case of a ranked list or product guide. A [[Guide]] may list multiple recommendations for different categories. For example, in a [[Guide]] about which TVs to buy, the author may have several [[Recommendation]]s.
  'Recommendation': prefix.sdo('Recommendation'),
  // A recommended dosing schedule for a drug or supplement as prescribed or recommended by an authority or by the drug/supplement's manufacturer. Capture the recommending authority in the recognizingAuthority property of MedicalEntity.
  'RecommendedDoseSchedule': prefix.sdo('RecommendedDoseSchedule'),
  // Recruiting participants.
  'Recruiting': prefix.sdo('Recruiting'),
  // A recycling center.
  'RecyclingCenter': prefix.sdo('RecyclingCenter'),
  // Enumerates several kinds of product return refund types.
  'RefundTypeEnumeration': prefix.sdo('RefundTypeEnumeration'),
  // Indicates that the item is refurbished.
  'RefurbishedCondition': prefix.sdo('RefurbishedCondition'),
  // The act of registering to be a user of a service, product or web page.Related actions:* [[JoinAction]]: Unlike JoinAction, RegisterAction implies you are registering to be a user of a service, *not* a group/team of people.* [FollowAction]]: Unlike FollowAction, RegisterAction doesn't imply that the agent is expecting to poll for updates from the object.* [[SubscribeAction]]: Unlike SubscribeAction, RegisterAction doesn't imply that the agent is expecting updates from the object.
  'RegisterAction': prefix.sdo('RegisterAction'),
  // A registry-based study design.
  'Registry': prefix.sdo('Registry'),
  // The drug's cost represents the maximum reimbursement paid by an insurer for the drug.
  'ReimbursementCap': prefix.sdo('ReimbursementCap'),
  // The act of rejecting to/adopting an object.Related actions:* [[AcceptAction]]: The antonym of RejectAction.
  'RejectAction': prefix.sdo('RejectAction'),
  // Other prominent or relevant topics tied to the main topic.
  'RelatedTopicsHealthAspect': prefix.sdo('RelatedTopicsHealthAspect'),
  // RemixAlbum.
  'RemixAlbum': prefix.sdo('RemixAlbum'),
  // A specific branch of medical science that pertains to the study of the kidneys and its respective disease states.
  'Renal': prefix.sdo('Renal'),
  // The act of giving money in return for temporary use, but not ownership, of an object such as a vehicle or property. For example, an agent rents a property from a landlord in exchange for a periodic payment.
  'RentAction': prefix.sdo('RentAction'),
  // A reservation for a rental car.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
  'RentalCarReservation': prefix.sdo('RentalCarReservation'),
  // Indicates the usage of the vehicle as a rental car.
  'RentalVehicleUsage': prefix.sdo('RentalVehicleUsage'),
  // A structured value representing repayment.
  'RepaymentSpecification': prefix.sdo('RepaymentSpecification'),
  // The act of editing a recipient by replacing an old object with a new object.
  'ReplaceAction': prefix.sdo('ReplaceAction'),
  // The act of responding to a question/message asked/sent by the object. Related to [[AskAction]]Related actions:* [[AskAction]]: Appears generally as an origin of a ReplyAction.
  'ReplyAction': prefix.sdo('ReplyAction'),
  // A Report generated by governmental or non-governmental organization.
  'Report': prefix.sdo('Report'),
  // The [[ReportageNewsArticle]] type is a subtype of [[NewsArticle]] representing news articles which are the result of journalistic news reporting conventions.In practice many news publishers produce a wide variety of article types, many of which might be considered a [[NewsArticle]] but not a [[ReportageNewsArticle]]. For example, opinion pieces, reviews, analysis, sponsored or satirical articles, or articles that combine several of these elements.The [[ReportageNewsArticle]] type is based on a stricter ideal for \"news\" as a work of journalism, with articles based on factual information either observed or verified by the author, or reported and verified from knowledgeable sources.  This often includes perspectives from multiple viewpoints on a particular issue (distinguishing news reports from public relations or propaganda).  News reports in the [[ReportageNewsArticle]] sense de-emphasize the opinion of the author, with commentary and value judgements typically expressed elsewhere.A [[ReportageNewsArticle]] which goes deeper into analysis can also be marked with an additional type of [[AnalysisNewsArticle]].
  'ReportageNewsArticle': prefix.sdo('ReportageNewsArticle'),
  // A patient-reported or observed dosing schedule for a drug or supplement.
  'ReportedDoseSchedule': prefix.sdo('ReportedDoseSchedule'),
  // A Research Organization (e.g. scientific institute, research company).
  'ResearchOrganization': prefix.sdo('ResearchOrganization'),
  // A Research project.
  'ResearchProject': prefix.sdo('ResearchProject'),
  // Researchers.
  'Researcher': prefix.sdo('Researcher'),
  // Describes a reservation for travel, dining or an event. Some reservations require tickets. Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, restaurant reservations, flights, or rental cars, use [[Offer]].
  'Reservation': prefix.sdo('Reservation'),
  // The status for a previously confirmed reservation that is now cancelled.
  'ReservationCancelled': prefix.sdo('ReservationCancelled'),
  // The status of a confirmed reservation.
  'ReservationConfirmed': prefix.sdo('ReservationConfirmed'),
  // The status of a reservation on hold pending an update like credit card number or flight changes.
  'ReservationHold': prefix.sdo('ReservationHold'),
  // A group of multiple reservations with common values for all sub-reservations.
  'ReservationPackage': prefix.sdo('ReservationPackage'),
  // The status of a reservation when a request has been sent, but not confirmed.
  'ReservationPending': prefix.sdo('ReservationPending'),
  // Enumerated status values for Reservation.
  'ReservationStatusType': prefix.sdo('ReservationStatusType'),
  // Reserving a concrete object.Related actions:* [[ScheduleAction]]: Unlike ScheduleAction, ReserveAction reserves concrete objects (e.g. a table, a hotel) towards a time slot / spatial allocation.
  'ReserveAction': prefix.sdo('ReserveAction'),
  // A reservoir of water, typically an artificially created lake, like the Lake Kariba reservoir.
  'Reservoir': prefix.sdo('Reservoir'),
  // The place where a person lives.
  'Residence': prefix.sdo('Residence'),
  // A resort is a place used for relaxation or recreation, attracting visitors for holidays or vacations. Resorts are places, towns or sometimes commercial establishment operated by a single company (Source: Wikipedia, the free encyclopedia, see <a href=\"http://en.wikipedia.org/wiki/Resort\">http://en.wikipedia.org/wiki/Resort</a>).<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Resort': prefix.sdo('Resort'),
  // The therapy that is concerned with the maintenance or improvement of respiratory function (as in patients with pulmonary disease).
  'RespiratoryTherapy': prefix.sdo('RespiratoryTherapy'),
  // A restaurant.
  'Restaurant': prefix.sdo('Restaurant'),
  // Specifies that the customer must pay a restocking fee when returning a product
  'RestockingFees': prefix.sdo('RestockingFees'),
  // A diet restricted to certain foods or preparations for cultural, religious, health or lifestyle reasons.
  'RestrictedDiet': prefix.sdo('RestrictedDiet'),
  // Results are available.
  'ResultsAvailable': prefix.sdo('ResultsAvailable'),
  // Results are not available.
  'ResultsNotAvailable': prefix.sdo('ResultsNotAvailable'),
  // The act of resuming a device or application which was formerly paused (e.g. resume music playback or resume a timer).
  'ResumeAction': prefix.sdo('ResumeAction'),
  // The drug's cost represents the retail cost of the drug.
  'Retail': prefix.sdo('Retail'),
  // The act of returning to the origin that which was previously received (concrete objects) or taken (ownership).
  'ReturnAction': prefix.sdo('ReturnAction'),
  // Specifies that product returns must be made at a kiosk.
  'ReturnAtKiosk': prefix.sdo('ReturnAtKiosk'),
  // Specifies that product returns must to be done by mail.
  'ReturnByMail': prefix.sdo('ReturnByMail'),
  // Specifies that product returns must be paid for, and are the responsibility of, the customer.
  'ReturnFeesCustomerResponsibility': prefix.sdo('ReturnFeesCustomerResponsibility'),
  // Enumerates several kinds of policies for product return fees.
  'ReturnFeesEnumeration': prefix.sdo('ReturnFeesEnumeration'),
  // Specifies that product returns must be made in a store.
  'ReturnInStore': prefix.sdo('ReturnInStore'),
  // Indicated that creating a return label is the responsibility of the customer.
  'ReturnLabelCustomerResponsibility': prefix.sdo('ReturnLabelCustomerResponsibility'),
  // Indicated that a return label must be downloaded and printed by the customer.
  'ReturnLabelDownloadAndPrint': prefix.sdo('ReturnLabelDownloadAndPrint'),
  // Specifies that a return label will be provided by the seller in the shipping box.
  'ReturnLabelInBox': prefix.sdo('ReturnLabelInBox'),
  // Enumerates several types of return labels for product returns.
  'ReturnLabelSourceEnumeration': prefix.sdo('ReturnLabelSourceEnumeration'),
  // Enumerates several types of product return methods.
  'ReturnMethodEnumeration': prefix.sdo('ReturnMethodEnumeration'),
  // Specifies that the customer must pay the return shipping costs when returning a product
  'ReturnShippingFees': prefix.sdo('ReturnShippingFees'),
  // A review of an item - for example, of a restaurant, movie, or store.
  'Review': prefix.sdo('Review'),
  // The act of producing a balanced opinion about the object for an audience. An agent reviews an object with participants resulting in a review.
  'ReviewAction': prefix.sdo('ReviewAction'),
  // A [[NewsArticle]] and [[CriticReview]] providing a professional critic's assessment of a service, product, performance, or artistic or literary work.
  'ReviewNewsArticle': prefix.sdo('ReviewNewsArticle'),
  // A specific branch of medical science that deals with the study and treatment of rheumatic, autoimmune or joint diseases.
  'Rheumatologic': prefix.sdo('Rheumatologic'),
  // The steering position is on the right side of the vehicle (viewed from the main direction of driving).
  'RightHandDriving': prefix.sdo('RightHandDriving'),
  // Information about the risk factors and possible complications that may follow a topic.
  'RisksOrComplicationsHealthAspect': prefix.sdo('RisksOrComplicationsHealthAspect'),
  // A river (for example, the broad majestic Shannon).
  'RiverBodyOfWater': prefix.sdo('RiverBodyOfWater'),
  // Represents additional information about a relationship or property. For example a Role can be used to say that a 'member' role linking some SportsTeam to a player occurred during a particular time period. Or that a Person's 'actor' role in a Movie was for some particular characterName. Such properties can be attached to a Role entity, which is then associated with the main entities using ordinary properties like 'member' or 'actor'.See also [blog post](http://blog.schema.org/2014/06/introducing-role.html).
  'Role': prefix.sdo('Role'),
  // A roofing contractor.
  'RoofingContractor': prefix.sdo('RoofingContractor'),
  // A room is a distinguishable space within a structure, usually separated from other spaces by interior walls. (Source: Wikipedia, the free encyclopedia, see <a href=\"http://en.wikipedia.org/wiki/Room\">http://en.wikipedia.org/wiki/Room</a>).<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Room': prefix.sdo('Room'),
  // The act of notifying an event organizer as to whether you expect to attend the event.
  'RsvpAction': prefix.sdo('RsvpAction'),
  // The invitee may or may not attend.
  'RsvpResponseMaybe': prefix.sdo('RsvpResponseMaybe'),
  // The invitee will not attend.
  'RsvpResponseNo': prefix.sdo('RsvpResponseNo'),
  // RsvpResponseType is an enumeration type whose instances represent responding to an RSVP request.
  'RsvpResponseType': prefix.sdo('RsvpResponseType'),
  // The invitee will attend.
  'RsvpResponseYes': prefix.sdo('RsvpResponseYes'),
  // Represents the suggested retail price (\"SRP\") of an offered product.
  'SRP': prefix.sdo('SRP'),
  // Content about the safety-related aspects of a health topic.
  'SafetyHealthAspect': prefix.sdo('SafetyHealthAspect'),
  // Event type: Sales event.
  'SaleEvent': prefix.sdo('SaleEvent'),
  // Represents a sale price (usually active for a limited period) of an offered product.
  'SalePrice': prefix.sdo('SalePrice'),
  // Content coded 'satire or parody content' in a [[MediaReview]], considered in the context of how it was published or shared.For a [[VideoObject]] to be 'satire or parody content': A video that was created as political or humorous commentary and is presented in that context. (Reshares of satire/parody content that do not include relevant context are more likely to fall under the “missing context” rating.)For an [[ImageObject]] to be 'satire or parody content': An image that was created as political or humorous commentary and is presented in that context. (Reshares of satire/parody content that do not include relevant context are more likely to fall under the “missing context” rating.)For an [[ImageObject]] with embedded text to be 'satire or parody content': An image that was created as political or humorous commentary and is presented in that context. (Reshares of satire/parody content that do not include relevant context are more likely to fall under the “missing context” rating.)For an [[AudioObject]] to be 'satire or parody content': Audio that was created as political or humorous commentary and is presented in that context. (Reshares of satire/parody content that do not include relevant context are more likely to fall under the “missing context” rating.)
  'SatireOrParodyContent': prefix.sdo('SatireOrParodyContent'),
  // An [[Article]] whose content is primarily [[satirical]](https://en.wikipedia.org/wiki/Satire) in nature, i.e. unlikely to be literally true. A satirical article is sometimes but not necessarily also a [[NewsArticle]]. [[ScholarlyArticle]]s are also sometimes satirized.
  'SatiricalArticle': prefix.sdo('SatiricalArticle'),
  // The day of the week between Friday and Sunday.
  'Saturday': prefix.sdo('Saturday'),
  // A schedule defines a repeating time period used to describe a regularly occurring [[Event]]. At a minimum a schedule will specify [[repeatFrequency]] which describes the interval between occurences of the event. Additional information can be provided to specify the schedule more precisely.      This includes identifying the day(s) of the week or month when the recurring event will take place, in addition to its start and end time. Schedules may also      have start and end dates to indicate when they are active, e.g. to define a limited calendar of events.
  'Schedule': prefix.sdo('Schedule'),
  // Scheduling future actions, events, or tasks.Related actions:* [[ReserveAction]]: Unlike ReserveAction, ScheduleAction allocates future actions (e.g. an event, a task, etc) towards a time slot / spatial allocation.
  'ScheduleAction': prefix.sdo('ScheduleAction'),
  // A scholarly article.
  'ScholarlyArticle': prefix.sdo('ScholarlyArticle'),
  // A school.
  'School': prefix.sdo('School'),
  // A School District is an administrative area for the administration of schools.
  'SchoolDistrict': prefix.sdo('SchoolDistrict'),
  // A screening of a movie or other video.
  'ScreeningEvent': prefix.sdo('ScreeningEvent'),
  // Content about how to screen or further filter a topic.
  'ScreeningHealthAspect': prefix.sdo('ScreeningHealthAspect'),
  // A piece of sculpture.
  'Sculpture': prefix.sdo('Sculpture'),
  // A sea (for example, the Caspian sea).
  'SeaBodyOfWater': prefix.sdo('SeaBodyOfWater'),
  // The act of searching for an object.Related actions:* [[FindAction]]: SearchAction generally leads to a FindAction, but not necessarily.
  'SearchAction': prefix.sdo('SearchAction'),
  // Web page type: Search results page.
  'SearchResultsPage': prefix.sdo('SearchResultsPage'),
  // A media season e.g. tv, radio, video game etc.
  'Season': prefix.sdo('Season'),
  // Used to describe a seat, such as a reserved seat in an event reservation.
  'Seat': prefix.sdo('Seat'),
  // A seating map.
  'SeatingMap': prefix.sdo('SeatingMap'),
  // Information about questions that may be asked, when to see a professional, measures before seeing a doctor or content about the first consultation.
  'SeeDoctorHealthAspect': prefix.sdo('SeeDoctorHealthAspect'),
  // This is the [[Action]] of navigating to a specific [[startOffset]] timestamp within a [[VideoObject]], typically represented with a URL template structure.
  'SeekToAction': prefix.sdo('SeekToAction'),
  // Self care actions or measures that can be taken to sooth, health or avoid a topic. This may be carried at home and can be carried/managed by the person itself.
  'SelfCareHealthAspect': prefix.sdo('SelfCareHealthAspect'),
  // A self-storage facility.
  'SelfStorage': prefix.sdo('SelfStorage'),
  // The act of taking money from a buyer in exchange for goods or services rendered. An agent sells an object, product, or service to a buyer for a price. Reciprocal of BuyAction.
  'SellAction': prefix.sdo('SellAction'),
  // The act of physically/electronically dispatching an object for transfer from an origin to a destination.Related actions:* [[ReceiveAction]]: The reciprocal of SendAction.* [[GiveAction]]: Unlike GiveAction, SendAction does not imply the transfer of ownership (e.g. I can send you my laptop, but I'm not necessarily giving it to you).
  'SendAction': prefix.sdo('SendAction'),
  // A Series in schema.org is a group of related items, typically but not necessarily of the same kind. See also [[CreativeWorkSeries]], [[EventSeries]].
  'Series': prefix.sdo('Series'),
  // A service provided by an organization, e.g. delivery service, print services, etc.
  'Service': prefix.sdo('Service'),
  // A means for accessing a service, e.g. a government office location, web site, or phone number.
  'ServiceChannel': prefix.sdo('ServiceChannel'),
  // The act of distributing content to people for their amusement or edification.
  'ShareAction': prefix.sdo('ShareAction'),
  // Printed music, as opposed to performed or recorded music.
  'SheetMusic': prefix.sdo('SheetMusic'),
  // ShippingDeliveryTime provides various pieces of information about delivery times for shipping.
  'ShippingDeliveryTime': prefix.sdo('ShippingDeliveryTime'),
  // A ShippingRateSettings represents re-usable pieces of shipping information. It is designed for publication on an URL that may be referenced via the [[shippingSettingsLink]] property of an [[OfferShippingDetails]]. Several occurrences can be published, distinguished and matched (i.e. identified/referenced) by their different values for [[shippingLabel]].
  'ShippingRateSettings': prefix.sdo('ShippingRateSettings'),
  // A shoe store.
  'ShoeStore': prefix.sdo('ShoeStore'),
  // A shopping center or mall.
  'ShoppingCenter': prefix.sdo('ShoppingCenter'),
  // Short story or tale. A brief work of literature, usually written in narrative prose.
  'ShortStory': prefix.sdo('ShortStory'),
  // Side effects that can be observed from the usage of the topic.
  'SideEffectsHealthAspect': prefix.sdo('SideEffectsHealthAspect'),
  // A trial design in which the researcher knows which treatment the patient was randomly assigned to but the patient does not.
  'SingleBlindedTrial': prefix.sdo('SingleBlindedTrial'),
  // A trial that takes place at a single center.
  'SingleCenterTrial': prefix.sdo('SingleCenterTrial'),
  // Residence type: Single-family home.
  'SingleFamilyResidence': prefix.sdo('SingleFamilyResidence'),
  // Play mode: SinglePlayer. Which is played by a lone player.
  'SinglePlayer': prefix.sdo('SinglePlayer'),
  // SingleRelease.
  'SingleRelease': prefix.sdo('SingleRelease'),
  // A navigation element of the page.
  'SiteNavigationElement': prefix.sdo('SiteNavigationElement'),
  // Enumerates common size groups for various product categories.
  'SizeGroupEnumeration': prefix.sdo('SizeGroupEnumeration'),
  // Size related properties of a product, typically a size code ([[name]]) and optionally a [[sizeSystem]], [[sizeGroup]], and product measurements ([[hasMeasurement]]). In addition, the intended audience can be defined through [[suggestedAge]], [[suggestedGender]], and suggested body measurements ([[suggestedMeasurement]]).
  'SizeSpecification': prefix.sdo('SizeSpecification'),
  // Enumerates common size systems for different categories of products, for example \"EN-13402\" or \"UK\" for wearables or \"Imperial\" for screws.
  'SizeSystemEnumeration': prefix.sdo('SizeSystemEnumeration'),
  // Imperial size system.
  'SizeSystemImperial': prefix.sdo('SizeSystemImperial'),
  // Metric size system.
  'SizeSystemMetric': prefix.sdo('SizeSystemMetric'),
  // A ski resort.
  'SkiResort': prefix.sdo('SkiResort'),
  // Skin assessment with clinical examination.
  'Skin': prefix.sdo('Skin'),
  // Event type: Social event.
  'SocialEvent': prefix.sdo('SocialEvent'),
  // A post to a social media platform, including blog posts, tweets, Facebook posts, etc.
  'SocialMediaPosting': prefix.sdo('SocialMediaPosting'),
  // A software application.
  'SoftwareApplication': prefix.sdo('SoftwareApplication'),
  // Computer programming source code. Example: Full (compile ready) solutions, code snippet samples, scripts, templates.
  'SoftwareSourceCode': prefix.sdo('SoftwareSourceCode'),
  // Indicates that the item has sold out.
  'SoldOut': prefix.sdo('SoldOut'),
  // The action that takes in a math expression and directs users to a page potentially capable of solving/simplifying that expression.
  'SolveMathAction': prefix.sdo('SolveMathAction'),
  // A placeholder for multiple similar products of the same kind.
  'SomeProducts': prefix.sdo('SomeProducts'),
  // SoundtrackAlbum.
  'SoundtrackAlbum': prefix.sdo('SoundtrackAlbum'),
  // A SpeakableSpecification indicates (typically via [[xpath]] or [[cssSelector]]) sections of a document that are highlighted as particularly [[speakable]]. Instances of this type are expected to be used primarily as values of the [[speakable]] property.
  'SpeakableSpecification': prefix.sdo('SpeakableSpecification'),
  // A SpecialAnnouncement combines a simple date-stamped textual information update      with contextualized Web links and other structured data.  It represents an information update made by a      locally-oriented organization, for example schools, pharmacies, healthcare providers,  community groups, police,      local government.For work in progress guidelines on Coronavirus-related markup see [this doc](https://docs.google.com/document/d/14ikaGCKxo50rRM7nvKSlbUpjyIk2WMQd3IkB1lItlrM/edit#).The motivating scenario for SpecialAnnouncement is the [Coronavirus pandemic](https://en.wikipedia.org/wiki/2019%E2%80%9320_coronavirus_pandemic), and the initial vocabulary is oriented to this urgent situation. Schema.orgexpect to improve the markup iteratively as it is deployed and as feedback emerges from use. In addition to ourusual [Github entry](https://github.com/schemaorg/schemaorg/issues/2490), feedback comments can also be provided in [this document](https://docs.google.com/document/d/1fpdFFxk8s87CWwACs53SGkYv3aafSxz_DTtOQxMrBJQ/edit#).While this schema is designed to communicate urgent crisis-related information, it is not the same as an emergency warning technology like [CAP](https://en.wikipedia.org/wiki/Common_Alerting_Protocol), although there may be overlaps. The intent is to coverthe kinds of everyday practical information being posted to existing websites during an emergency situation.Several kinds of information can be provided:We encourage the provision of \"name\", \"text\", \"datePosted\", \"expires\" (if appropriate), \"category\" and\"url\" as a simple baseline. It is important to provide a value for \"category\" where possible, most ideally as a well knownURL from Wikipedia or Wikidata. In the case of the 2019-2020 Coronavirus pandemic, this should be \"https://en.wikipedia.org/w/index.php?title=2019-20\\_coronavirus\\_pandemic\" or \"https://www.wikidata.org/wiki/Q81068910\".For many of the possible properties, values can either be simple links or an inline description, depending on whether a summary is available. For a link, provide just the URL of the appropriate page as the property's value. For an inline description, use a [[WebContent]] type, and provide the url as a property of that, alongside at least a simple \"[[text]]\" summary of the page. It isunlikely that a single SpecialAnnouncement will need all of the possible properties simultaneously.We expect that in many cases the page referenced might contain more specialized structured data, e.g. contact info, [[openingHours]], [[Event]], [[FAQPage]] etc. By linking to those pages from a [[SpecialAnnouncement]] you can help make it clearer that the events are related to the situation (e.g. Coronavirus) indicated by the [[category]] property of the [[SpecialAnnouncement]].Many [[SpecialAnnouncement]]s will relate to particular regions and to identifiable local organizations. Use [[spatialCoverage]] for the region, and [[announcementLocation]] to indicate specific [[LocalBusiness]]es and [[CivicStructure]]s. If the announcement affects both a particular region and a specific location (for example, a library closure that serves an entire region), use both [[spatialCoverage]] and [[announcementLocation]].The [[about]] property can be used to indicate entities that are the focus of the announcement. We now recommend using [[about]] onlyfor representing non-location entities (e.g. a [[Course]] or a [[RadioStation]]). For places, use [[announcementLocation]] and [[spatialCoverage]]. Consumers of this markup should be aware that the initial design encouraged the use of /about for locations too.The basic content of [[SpecialAnnouncement]] is similar to that of an [RSS](https://en.wikipedia.org/wiki/RSS) or [Atom](https://en.wikipedia.org/wiki/Atom_(Web_standard)) feed. For publishers without such feeds, basic feed-like information can be shared by posting[[SpecialAnnouncement]] updates in a page, e.g. using JSON-LD. For sites with Atom/RSS functionality, you can point to a feedwith the [[webFeed]] property. This can be a simple URL, or an inline [[DataFeed]] object, with [[encodingFormat]] providingmedia type information e.g. \"application/rss+xml\" or \"application/atom+xml\".
  'SpecialAnnouncement': prefix.sdo('SpecialAnnouncement'),
  // Any branch of a field in which people typically develop specific expertise, usually after significant study, time, and effort.
  'Specialty': prefix.sdo('Specialty'),
  // The scientific study and treatment of defects, disorders, and malfunctions of speech and voice, as stuttering, lisping, or lalling, and of language disturbances, as aphasia or delayed language acquisition.
  'SpeechPathology': prefix.sdo('SpeechPathology'),
  // SpokenWordAlbum.
  'SpokenWordAlbum': prefix.sdo('SpokenWordAlbum'),
  // A sporting goods store.
  'SportingGoodsStore': prefix.sdo('SportingGoodsStore'),
  // A sports location, such as a playing field.
  'SportsActivityLocation': prefix.sdo('SportsActivityLocation'),
  // A sports club.
  'SportsClub': prefix.sdo('SportsClub'),
  // Event type: Sports event.
  'SportsEvent': prefix.sdo('SportsEvent'),
  // Represents the collection of all sports organizations, including sports teams, governing bodies, and sports associations.
  'SportsOrganization': prefix.sdo('SportsOrganization'),
  // Organization: Sports team.
  'SportsTeam': prefix.sdo('SportsTeam'),
  // A spreadsheet file.
  'SpreadsheetDigitalDocument': prefix.sdo('SpreadsheetDigitalDocument'),
  // A stadium.
  'StadiumOrArena': prefix.sdo('StadiumOrArena'),
  // Content coded 'staged content' in a [[MediaReview]], considered in the context of how it was published or shared.For a [[VideoObject]] to be 'staged content': A video that has been created using actors or similarly contrived.For an [[ImageObject]] to be 'staged content': An image that was created using actors or similarly contrived, such as a screenshot of a fake tweet.For an [[ImageObject]] with embedded text to be 'staged content': An image that was created using actors or similarly contrived, such as a screenshot of a fake tweet.For an [[AudioObject]] to be 'staged content': Audio that has been created using actors or similarly contrived.
  'StagedContent': prefix.sdo('StagedContent'),
  // Stages that can be observed from a topic.
  'StagesHealthAspect': prefix.sdo('StagesHealthAspect'),
  // A state or province of a country.
  'State': prefix.sdo('State'),
  // A statement about something, for example a fun or interesting fact. If known, the main entity this statement is about, can be indicated using mainEntity. For more formal claims (e.g. in Fact Checking), consider using [[Claim]] instead. Use the [[text]] property to capture the text of the statement.
  'Statement': prefix.sdo('Statement'),
  // A StatisticalPopulation is a set of instances of a certain given type that satisfy some set of constraints. The property [[populationType]] is used to specify the type. Any property that can be used on instances of that type can appear on the statistical population. For example, a [[StatisticalPopulation]] representing all [[Person]]s with a [[homeLocation]] of East Podunk California, would be described by applying the appropriate [[homeLocation]] and [[populationType]] properties to a [[StatisticalPopulation]] item that stands for that set of people.The properties [[numConstraints]] and [[constrainingProperty]] are used to specify which of the populations properties are used to specify the population. Note that the sense of \"population\" used here is the general sense of a statisticalpopulation, and does not imply that the population consists of people. For example, a [[populationType]] of [[Event]] or [[NewsArticle]] could be used. See also [[Observation]], and the [data and datasets](/docs/data-and-datasets.html) overview for more details.
  'StatisticalPopulation': prefix.sdo('StatisticalPopulation'),
  // Lists or enumerations dealing with status types.
  'StatusEnumeration': prefix.sdo('StatusEnumeration'),
  // A value indicating a steering position.
  'SteeringPositionValue': prefix.sdo('SteeringPositionValue'),
  // A retail good store.
  'Store': prefix.sdo('Store'),
  // Specifies that the customer receives a store credit as refund when returning a product
  'StoreCreditRefund': prefix.sdo('StoreCreditRefund'),
  // Physical activity that is engaged in to improve muscle and bone strength. Also referred to as resistance training.
  'StrengthTraining': prefix.sdo('StrengthTraining'),
  // Structured values are used when the value of a property has a more complex structure than simply being a textual value or a reference to another thing.
  'StructuredValue': prefix.sdo('StructuredValue'),
  // StudioAlbum.
  'StudioAlbum': prefix.sdo('StudioAlbum'),
  // A StupidType for testing.
  'StupidType': prefix.sdo('StupidType'),
  // The act of forming a personal connection with someone/something (object) unidirectionally/asymmetrically to get updates pushed to.Related actions:* [[FollowAction]]: Unlike FollowAction, SubscribeAction implies that the subscriber acts as a passive agent being constantly/actively pushed for updates.* [[RegisterAction]]: Unlike RegisterAction, SubscribeAction implies that the agent is interested in continuing receiving updates from the object.* [[JoinAction]]: Unlike JoinAction, SubscribeAction implies that the agent is interested in continuing receiving updates from the object.
  'SubscribeAction': prefix.sdo('SubscribeAction'),
  // Represents the subscription pricing component of the total price for an offered product.
  'Subscription': prefix.sdo('Subscription'),
  // Any matter of defined composition that has discrete existence, whose origin may be biological, mineral or chemical.
  'Substance': prefix.sdo('Substance'),
  // A subway station.
  'SubwayStation': prefix.sdo('SubwayStation'),
  // A suite in a hotel or other public accommodation, denotes a class of luxury accommodations, the key feature of which is multiple rooms (Source: Wikipedia, the free encyclopedia, see <a href=\"http://en.wikipedia.org/wiki/Suite_(hotel)\">http://en.wikipedia.org/wiki/Suite_(hotel)</a>).<br /><br />See also the <a href=\"/docs/hotels.html\">dedicated document on the use of schema.org for marking up hotels and other forms of accommodations</a>.
  'Suite': prefix.sdo('Suite'),
  // The day of the week between Saturday and Monday.
  'Sunday': prefix.sdo('Sunday'),
  // Anatomical features that can be observed by sight (without dissection), including the form and proportions of the human body as well as surface landmarks that correspond to deeper subcutaneous structures. Superficial anatomy plays an important role in sports medicine, phlebotomy, and other medical specialties as underlying anatomical structures can be identified through surface palpation. For example, during back surgery, superficial anatomy can be used to palpate and count vertebrae to find the site of incision. Or in phlebotomy, superficial anatomy can be used to locate an underlying vein; for example, the median cubital vein can be located by palpating the borders of the cubital fossa (such as the epicondyles of the humerus) and then looking for the superficial signs of the vein, such as size, prominence, ability to refill after depression, and feel of surrounding tissue support. As another example, in a subluxation (dislocation) of the glenohumeral joint, the bony structure becomes pronounced with the deltoid muscle failing to cover the glenohumeral joint allowing the edges of the scapula to be superficially visible. Here, the superficial anatomy is the visible edges of the scapula, implying the underlying dislocation of the joint (the related anatomical structure).
  'SuperficialAnatomy': prefix.sdo('SuperficialAnatomy'),
  // A specific branch of medical science that pertains to treating diseases, injuries and deformities by manual and instrumental means.
  'Surgical': prefix.sdo('Surgical'),
  // A medical procedure involving an incision with instruments; performed for diagnose, or therapeutic purposes.
  'SurgicalProcedure': prefix.sdo('SurgicalProcedure'),
  // The act of momentarily pausing a device or application (e.g. pause music playback or pause a timer).
  'SuspendAction': prefix.sdo('SuspendAction'),
  // Suspended.
  'Suspended': prefix.sdo('Suspended'),
  // Symptoms or related symptoms of a Topic.
  'SymptomsHealthAspect': prefix.sdo('SymptomsHealthAspect'),
  // A synagogue.
  'Synagogue': prefix.sdo('Synagogue'),
  // A short TV program or a segment/part of a TV program.
  'TVClip': prefix.sdo('TVClip'),
  // A TV episode which can be part of a series or season.
  'TVEpisode': prefix.sdo('TVEpisode'),
  // Season dedicated to TV broadcast and associated online delivery.
  'TVSeason': prefix.sdo('TVSeason'),
  // CreativeWorkSeries dedicated to TV broadcast and associated online delivery.
  'TVSeries': prefix.sdo('TVSeries'),
  // A table on a Web page.
  'Table': prefix.sdo('Table'),
  // The act of gaining ownership of an object from an origin. Reciprocal of GiveAction.Related actions:* [[GiveAction]]: The reciprocal of TakeAction.* [[ReceiveAction]]: Unlike ReceiveAction, TakeAction implies that ownership has been transfered.
  'TakeAction': prefix.sdo('TakeAction'),
  // A tattoo parlor.
  'TattooParlor': prefix.sdo('TattooParlor'),
  // A taxi.
  'Taxi': prefix.sdo('Taxi'),
  // A reservation for a taxi.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use [[Offer]].
  'TaxiReservation': prefix.sdo('TaxiReservation'),
  // A service for a vehicle for hire with a driver for local travel. Fares are usually calculated based on distance traveled.
  'TaxiService': prefix.sdo('TaxiService'),
  // A taxi stand.
  'TaxiStand': prefix.sdo('TaxiStand'),
  // Indicates the usage of the car as a taxi.
  'TaxiVehicleUsage': prefix.sdo('TaxiVehicleUsage'),
  // A set of organisms asserted to represent a natural cohesive biological unit.
  'Taxon': prefix.sdo('Taxon'),
  // A technical article - Example: How-to (task) topics, step-by-step, procedural troubleshooting, specifications, etc.
  'TechArticle': prefix.sdo('TechArticle'),
  // A unique instance of a television BroadcastService on a CableOrSatelliteService lineup.
  'TelevisionChannel': prefix.sdo('TelevisionChannel'),
  // A television station.
  'TelevisionStation': prefix.sdo('TelevisionStation'),
  // A tennis complex.
  'TennisComplex': prefix.sdo('TennisComplex'),
  // Terminated.
  'Terminated': prefix.sdo('Terminated'),
  // Data type: Text.
  'Text': prefix.sdo('Text'),
  // A file composed primarily of text.
  'TextDigitalDocument': prefix.sdo('TextDigitalDocument'),
  // Event type: Theater performance.
  'TheaterEvent': prefix.sdo('TheaterEvent'),
  // A theater group or company, for example, the Royal Shakespeare Company or Druid Theatre.
  'TheaterGroup': prefix.sdo('TheaterGroup'),
  // A medical device used for therapeutic purposes.
  'Therapeutic': prefix.sdo('Therapeutic'),
  // A medical procedure intended primarily for therapeutic purposes, aimed at improving a health condition.
  'TherapeuticProcedure': prefix.sdo('TherapeuticProcedure'),
  // A thesis or dissertation document submitted in support of candidature for an academic degree or professional qualification.
  'Thesis': prefix.sdo('Thesis'),
  // The most generic type of item.
  'Thing': prefix.sdo('Thing'),
  // Throat assessment with  clinical examination.
  'Throat': prefix.sdo('Throat'),
  // The day of the week between Wednesday and Friday.
  'Thursday': prefix.sdo('Thursday'),
  // Used to describe a ticket to an event, a flight, a bus ride, etc.
  'Ticket': prefix.sdo('Ticket'),
  // The act of reaching a draw in a competitive activity.
  'TieAction': prefix.sdo('TieAction'),
  // A point in time recurring on multiple days in the form hh:mm:ss[Z|(+|-)hh:mm] (see [XML schema for details](http://www.w3.org/TR/xmlschema-2/#time)).
  'Time': prefix.sdo('Time'),
  // The act of giving money voluntarily to a beneficiary in recognition of services rendered.
  'TipAction': prefix.sdo('TipAction'),
  // A tire shop.
  'TireShop': prefix.sdo('TireShop'),
  // The associated telephone number is toll free.
  'TollFree': prefix.sdo('TollFree'),
  // A tourist attraction.  In principle any Thing can be a [[TouristAttraction]], from a [[Mountain]] and [[LandmarksOrHistoricalBuildings]] to a [[LocalBusiness]].  This Type can be used on its own to describe a general [[TouristAttraction]], or be used as an [[additionalType]] to add tourist attraction properties to any other type.  (See examples below)
  'TouristAttraction': prefix.sdo('TouristAttraction'),
  // A tourist destination. In principle any [[Place]] can be a [[TouristDestination]] from a [[City]], Region or [[Country]] to an [[AmusementPark]] or [[Hotel]]. This Type can be used on its own to describe a general [[TouristDestination]], or be used as an [[additionalType]] to add tourist relevant properties to any other [[Place]].  A [[TouristDestination]] is defined as a [[Place]] that contains, or is colocated with, one or more [[TouristAttraction]]s, often linked by a similar theme or interest to a particular [[touristType]]. The [UNWTO](http://www2.unwto.org/) defines Destination (main destination of a tourism trip) as the place visited that is central to the decision to take the trip.  (See examples below).
  'TouristDestination': prefix.sdo('TouristDestination'),
  // A tourist information center.
  'TouristInformationCenter': prefix.sdo('TouristInformationCenter'),
  // A tourist trip. A created itinerary of visits to one or more places of interest ([[TouristAttraction]]/[[TouristDestination]]) often linked by a similar theme, geographic area, or interest to a particular [[touristType]]. The [UNWTO](http://www2.unwto.org/) defines tourism trip as the Trip taken by visitors.  (See examples below).
  'TouristTrip': prefix.sdo('TouristTrip'),
  // A specific branch of medical science that is concerned with poisons, their nature, effects and detection and involved in the treatment of poisoning.
  'Toxicologic': prefix.sdo('Toxicologic'),
  // A toy store.
  'ToyStore': prefix.sdo('ToyStore'),
  // An agent tracks an object for updates.Related actions:* [[FollowAction]]: Unlike FollowAction, TrackAction refers to the interest on the location of innanimates objects.* [[SubscribeAction]]: Unlike SubscribeAction, TrackAction refers to  the interest on the location of innanimate objects.
  'TrackAction': prefix.sdo('TrackAction'),
  // The act of participating in an exchange of goods and services for monetary compensation. An agent trades an object, product or service with a participant in exchange for a one time or periodic payment.
  'TradeAction': prefix.sdo('TradeAction'),
  // A system of medicine based on common theoretical concepts that originated in China and evolved over thousands of years, that uses herbs, acupuncture, exercise, massage, dietary therapy, and other methods to treat a wide range of conditions.
  'TraditionalChinese': prefix.sdo('TraditionalChinese'),
  // A reservation for train travel.Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use [[Offer]].
  'TrainReservation': prefix.sdo('TrainReservation'),
  // A train station.
  'TrainStation': prefix.sdo('TrainStation'),
  // A trip on a commercial train line.
  'TrainTrip': prefix.sdo('TrainTrip'),
  // The act of transferring/moving (abstract or concrete) animate or inanimate objects from one place to another.
  'TransferAction': prefix.sdo('TransferAction'),
  // Content coded 'transformed content' in a [[MediaReview]], considered in the context of how it was published or shared.For a [[VideoObject]] to be 'transformed content':  or all of the video has been manipulated to transform the footage itself. This category includes using tools like the Adobe Suite to change the speed of the video, add or remove visual elements or dub audio. Deepfakes are also a subset of transformation.For an [[ImageObject]] to be transformed content': Adding or deleting visual elements to give the image a different meaning with the intention to mislead.For an [[ImageObject]] with embedded text to be 'transformed content': Adding or deleting visual elements to give the image a different meaning with the intention to mislead.For an [[AudioObject]] to be 'transformed content': Part or all of the audio has been manipulated to alter the words or sounds, or the audio has been synthetically generated, such as to create a sound-alike voice.
  'TransformedContent': prefix.sdo('TransformedContent'),
  // A transit map.
  'TransitMap': prefix.sdo('TransitMap'),
  // The act of traveling from an fromLocation to a destination by a specified mode of transport, optionally with participants.
  'TravelAction': prefix.sdo('TravelAction'),
  // A travel agency.
  'TravelAgency': prefix.sdo('TravelAgency'),
  // An indication for treating an underlying condition, symptom, etc.
  'TreatmentIndication': prefix.sdo('TreatmentIndication'),
  // Treatments or related therapies for a Topic.
  'TreatmentsHealthAspect': prefix.sdo('TreatmentsHealthAspect'),
  // A trip or journey. An itinerary of visits to one or more places.
  'Trip': prefix.sdo('Trip'),
  // A trial design in which neither the researcher, the person administering the therapy nor the patient knows the details of the treatment the patient was randomly assigned to.
  'TripleBlindedTrial': prefix.sdo('TripleBlindedTrial'),
  // The boolean value true.
  'True': prefix.sdo('True'),
  // The day of the week between Monday and Wednesday.
  'Tuesday': prefix.sdo('Tuesday'),
  // A structured value indicating the quantity, unit of measurement, and business function of goods included in a bundle offer.
  'TypeAndQuantityNode': prefix.sdo('TypeAndQuantityNode'),
  // Categorization and other types related to a topic.
  'TypesHealthAspect': prefix.sdo('TypesHealthAspect'),
  // UKNonprofitType: Non-profit organization type originating from the United Kingdom.
  'UKNonprofitType': prefix.sdo('UKNonprofitType'),
  // UKTrust: Non-profit type referring to a UK trust.
  'UKTrust': prefix.sdo('UKTrust'),
  // Data type: URL.
  'URL': prefix.sdo('URL'),
  // USNonprofitType: Non-profit organization type originating from the United States.
  'USNonprofitType': prefix.sdo('USNonprofitType'),
  // Ultrasound imaging.
  'Ultrasound': prefix.sdo('Ultrasound'),
  // The act of un-registering from a service.Related actions:* [[RegisterAction]]: antonym of UnRegisterAction.* [[LeaveAction]]: Unlike LeaveAction, UnRegisterAction implies that you are unregistering from a service you werer previously registered, rather than leaving a team/group of people.
  'UnRegisterAction': prefix.sdo('UnRegisterAction'),
  // UnemploymentSupport: this is a benefit for unemployment support.
  'UnemploymentSupport': prefix.sdo('UnemploymentSupport'),
  // UnincorporatedAssociationCharity: Non-profit type referring to a charitable company that is not incorporated (UK).
  'UnincorporatedAssociationCharity': prefix.sdo('UnincorporatedAssociationCharity'),
  // The price asked for a given offer by the respective organization or person.
  'UnitPriceSpecification': prefix.sdo('UnitPriceSpecification'),
  // Indicates that a document has no particular or special standing (e.g. a republication of a law by a private publisher).
  'UnofficialLegalValue': prefix.sdo('UnofficialLegalValue'),
  // The act of managing by changing/editing the state of the object.
  'UpdateAction': prefix.sdo('UpdateAction'),
  // A specific branch of medical science that is concerned with the diagnosis and treatment of diseases pertaining to the urinary tract and the urogenital system.
  'Urologic': prefix.sdo('Urologic'),
  // Content about how, when, frequency and dosage of a topic.
  'UsageOrScheduleHealthAspect': prefix.sdo('UsageOrScheduleHealthAspect'),
  // The act of applying an object to its intended purpose.
  'UseAction': prefix.sdo('UseAction'),
  // Indicates that the item is used.
  'UsedCondition': prefix.sdo('UsedCondition'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserBlocks': prefix.sdo('UserBlocks'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserCheckins': prefix.sdo('UserCheckins'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserComments': prefix.sdo('UserComments'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserDownloads': prefix.sdo('UserDownloads'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserInteraction': prefix.sdo('UserInteraction'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserLikes': prefix.sdo('UserLikes'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserPageVisits': prefix.sdo('UserPageVisits'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserPlays': prefix.sdo('UserPlays'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserPlusOnes': prefix.sdo('UserPlusOnes'),
  // A review created by an end-user (e.g. consumer, purchaser, attendee etc.), in contrast with [[CriticReview]].
  'UserReview': prefix.sdo('UserReview'),
  // UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use [[Action]]-based vocabulary, alongside types such as [[Comment]].
  'UserTweets': prefix.sdo('UserTweets'),
  // A diet exclusive of all animal products.
  'VeganDiet': prefix.sdo('VeganDiet'),
  // A diet exclusive of animal meat.
  'VegetarianDiet': prefix.sdo('VegetarianDiet'),
  // A vehicle is a device that is designed or used to transport people or cargo over land, water, air, or through space.
  'Vehicle': prefix.sdo('Vehicle'),
  // A type of blood vessel that specifically carries blood to the heart.
  'Vein': prefix.sdo('Vein'),
  // A venue map (e.g. for malls, auditoriums, museums, etc.).
  'VenueMap': prefix.sdo('VenueMap'),
  // A component of the human body circulatory system comprised of an intricate network of hollow tubes that transport blood throughout the entire body.
  'Vessel': prefix.sdo('Vessel'),
  // A vet's office.
  'VeterinaryCare': prefix.sdo('VeterinaryCare'),
  // Web page type: Video gallery page.
  'VideoGallery': prefix.sdo('VideoGallery'),
  // A video game is an electronic game that involves human interaction with a user interface to generate visual feedback on a video device.
  'VideoGame': prefix.sdo('VideoGame'),
  // A short segment/part of a video game.
  'VideoGameClip': prefix.sdo('VideoGameClip'),
  // A video game series.
  'VideoGameSeries': prefix.sdo('VideoGameSeries'),
  // A video file.
  'VideoObject': prefix.sdo('VideoObject'),
  // A specific and exact (byte-for-byte) version of a [[VideoObject]]. Two byte-for-byte identical files, for the purposes of this type, considered identical. If they have different embedded metadata the files will differ. Different external facts about the files, e.g. creator or dateCreated that aren't represented in their actual content, do not affect this notion of identity.
  'VideoObjectSnapshot': prefix.sdo('VideoObjectSnapshot'),
  // The act of consuming static visual content.
  'ViewAction': prefix.sdo('ViewAction'),
  // VinylFormat.
  'VinylFormat': prefix.sdo('VinylFormat'),
  // An online or virtual location for attending events. For example, one may attend an online seminar or educational event. While a virtual location may be used as the location of an event, virtual locations should not be confused with physical locations in the real world.
  'VirtualLocation': prefix.sdo('VirtualLocation'),
  // Pathogenic virus that causes viral infection.
  'Virus': prefix.sdo('Virus'),
  // Event type: Visual arts event.
  'VisualArtsEvent': prefix.sdo('VisualArtsEvent'),
  // A work of art that is primarily visual in character.
  'VisualArtwork': prefix.sdo('VisualArtwork'),
  // Vital signs are measures of various physiological functions in order to assess the most basic body functions.
  'VitalSign': prefix.sdo('VitalSign'),
  // A volcano, like Fuji san.
  'Volcano': prefix.sdo('Volcano'),
  // The act of expressing a preference from a fixed/finite/structured set of choices/options.
  'VoteAction': prefix.sdo('VoteAction'),
  // An advertising section of the page.
  'WPAdBlock': prefix.sdo('WPAdBlock'),
  // The footer section of the page.
  'WPFooter': prefix.sdo('WPFooter'),
  // The header section of the page.
  'WPHeader': prefix.sdo('WPHeader'),
  // A sidebar section of the page.
  'WPSideBar': prefix.sdo('WPSideBar'),
  // The act of expressing a desire about the object. An agent wants an object.
  'WantAction': prefix.sdo('WantAction'),
  // A structured value representing the duration and scope of services that will be provided to a customer free of charge in case of a defect or malfunction of a product.
  'WarrantyPromise': prefix.sdo('WarrantyPromise'),
  // A range of of services that will be provided to a customer free of charge in case of a defect or malfunction of a product.Commonly used values:* http://purl.org/goodrelations/v1#Labor-BringIn* http://purl.org/goodrelations/v1#PartsAndLabor-BringIn* http://purl.org/goodrelations/v1#PartsAndLabor-PickUp
  'WarrantyScope': prefix.sdo('WarrantyScope'),
  // The act of consuming dynamic/moving visual content.
  'WatchAction': prefix.sdo('WatchAction'),
  // A waterfall, like Niagara.
  'Waterfall': prefix.sdo('Waterfall'),
  // The act of dressing oneself in clothing.
  'WearAction': prefix.sdo('WearAction'),
  // Measurement of the back section, for example of a jacket
  'WearableMeasurementBack': prefix.sdo('WearableMeasurementBack'),
  // Measurement of the chest/bust section, for example of a suit
  'WearableMeasurementChestOrBust': prefix.sdo('WearableMeasurementChestOrBust'),
  // Measurement of the collar, for example of a shirt
  'WearableMeasurementCollar': prefix.sdo('WearableMeasurementCollar'),
  // Measurement of the cup, for example of a bra
  'WearableMeasurementCup': prefix.sdo('WearableMeasurementCup'),
  // Measurement of the height, for example the heel height of a shoe
  'WearableMeasurementHeight': prefix.sdo('WearableMeasurementHeight'),
  // Measurement of the hip section, for example of a skirt
  'WearableMeasurementHips': prefix.sdo('WearableMeasurementHips'),
  // Measurement of the inseam, for example of pants
  'WearableMeasurementInseam': prefix.sdo('WearableMeasurementInseam'),
  // Represents the length, for example of a dress
  'WearableMeasurementLength': prefix.sdo('WearableMeasurementLength'),
  // Measurement of the outside leg, for example of pants
  'WearableMeasurementOutsideLeg': prefix.sdo('WearableMeasurementOutsideLeg'),
  // Measurement of the sleeve length, for example of a shirt
  'WearableMeasurementSleeve': prefix.sdo('WearableMeasurementSleeve'),
  // Enumerates common types of measurement for wearables products.
  'WearableMeasurementTypeEnumeration': prefix.sdo('WearableMeasurementTypeEnumeration'),
  // Measurement of the waist section, for example of pants
  'WearableMeasurementWaist': prefix.sdo('WearableMeasurementWaist'),
  // Measurement of the width, for example of shoes
  'WearableMeasurementWidth': prefix.sdo('WearableMeasurementWidth'),
  // Size group \"Big\" for wearables.
  'WearableSizeGroupBig': prefix.sdo('WearableSizeGroupBig'),
  // Size group \"Boys\" for wearables.
  'WearableSizeGroupBoys': prefix.sdo('WearableSizeGroupBoys'),
  // Enumerates common size groups (also known as \"size types\") for wearable products.
  'WearableSizeGroupEnumeration': prefix.sdo('WearableSizeGroupEnumeration'),
  // Size group \"Extra Short\" for wearables.
  'WearableSizeGroupExtraShort': prefix.sdo('WearableSizeGroupExtraShort'),
  // Size group \"Extra Tall\" for wearables.
  'WearableSizeGroupExtraTall': prefix.sdo('WearableSizeGroupExtraTall'),
  // Size group \"Girls\" for wearables.
  'WearableSizeGroupGirls': prefix.sdo('WearableSizeGroupGirls'),
  // Size group \"Husky\" (or \"Stocky\") for wearables.
  'WearableSizeGroupHusky': prefix.sdo('WearableSizeGroupHusky'),
  // Size group \"Infants\" for wearables.
  'WearableSizeGroupInfants': prefix.sdo('WearableSizeGroupInfants'),
  // Size group \"Juniors\" for wearables.
  'WearableSizeGroupJuniors': prefix.sdo('WearableSizeGroupJuniors'),
  // Size group \"Maternity\" for wearables.
  'WearableSizeGroupMaternity': prefix.sdo('WearableSizeGroupMaternity'),
  // Size group \"Mens\" for wearables.
  'WearableSizeGroupMens': prefix.sdo('WearableSizeGroupMens'),
  // Size group \"Misses\" (also known as \"Missy\") for wearables.
  'WearableSizeGroupMisses': prefix.sdo('WearableSizeGroupMisses'),
  // Size group \"Petite\" for wearables.
  'WearableSizeGroupPetite': prefix.sdo('WearableSizeGroupPetite'),
  // Size group \"Plus\" for wearables.
  'WearableSizeGroupPlus': prefix.sdo('WearableSizeGroupPlus'),
  // Size group \"Regular\" for wearables.
  'WearableSizeGroupRegular': prefix.sdo('WearableSizeGroupRegular'),
  // Size group \"Short\" for wearables.
  'WearableSizeGroupShort': prefix.sdo('WearableSizeGroupShort'),
  // Size group \"Tall\" for wearables.
  'WearableSizeGroupTall': prefix.sdo('WearableSizeGroupTall'),
  // Size group \"Womens\" for wearables.
  'WearableSizeGroupWomens': prefix.sdo('WearableSizeGroupWomens'),
  // Australian size system for wearables.
  'WearableSizeSystemAU': prefix.sdo('WearableSizeSystemAU'),
  // Brazilian size system for wearables.
  'WearableSizeSystemBR': prefix.sdo('WearableSizeSystemBR'),
  // Chinese size system for wearables.
  'WearableSizeSystemCN': prefix.sdo('WearableSizeSystemCN'),
  // Continental size system for wearables.
  'WearableSizeSystemContinental': prefix.sdo('WearableSizeSystemContinental'),
  // German size system for wearables.
  'WearableSizeSystemDE': prefix.sdo('WearableSizeSystemDE'),
  // EN 13402 (joint European standard for size labelling of clothes).
  'WearableSizeSystemEN13402': prefix.sdo('WearableSizeSystemEN13402'),
  // Enumerates common size systems specific for wearable products
  'WearableSizeSystemEnumeration': prefix.sdo('WearableSizeSystemEnumeration'),
  // European size system for wearables.
  'WearableSizeSystemEurope': prefix.sdo('WearableSizeSystemEurope'),
  // French size system for wearables.
  'WearableSizeSystemFR': prefix.sdo('WearableSizeSystemFR'),
  // GS1 (formerly NRF) size system for wearables.
  'WearableSizeSystemGS1': prefix.sdo('WearableSizeSystemGS1'),
  // Italian size system for wearables.
  'WearableSizeSystemIT': prefix.sdo('WearableSizeSystemIT'),
  // Japanese size system for wearables.
  'WearableSizeSystemJP': prefix.sdo('WearableSizeSystemJP'),
  // Mexican size system for wearables.
  'WearableSizeSystemMX': prefix.sdo('WearableSizeSystemMX'),
  // United Kingdom size system for wearables.
  'WearableSizeSystemUK': prefix.sdo('WearableSizeSystemUK'),
  // United States size system for wearables.
  'WearableSizeSystemUS': prefix.sdo('WearableSizeSystemUS'),
  // An application programming interface accessible over Web/Internet technologies.
  'WebAPI': prefix.sdo('WebAPI'),
  // Web applications.
  'WebApplication': prefix.sdo('WebApplication'),
  // WebContent is a type representing all [[WebPage]], [[WebSite]] and [[WebPageElement]] content. It is sometimes the case that detailed distinctions between Web pages, sites and their parts is not always important or obvious. The  [[WebContent]] type makes it easier to describe Web-addressable content without requiring such distinctions to always be stated. (The intent is that the existing types [[WebPage]], [[WebSite]] and [[WebPageElement]] will eventually be declared as subtypes of [[WebContent]]).
  'WebContent': prefix.sdo('WebContent'),
  // A web page. Every web page is implicitly assumed to be declared to be of type WebPage, so the various properties about that webpage, such as <code>breadcrumb</code> may be used. We recommend explicit declaration if these properties are specified, but if they are found outside of an itemscope, they will be assumed to be about the page.
  'WebPage': prefix.sdo('WebPage'),
  // A web page element, like a table or an image.
  'WebPageElement': prefix.sdo('WebPageElement'),
  // A WebSite is a set of related web pages and other items typically served from a single web domain and accessible via URLs.
  'WebSite': prefix.sdo('WebSite'),
  // The day of the week between Tuesday and Thursday.
  'Wednesday': prefix.sdo('Wednesday'),
  // The conventional Western system of medicine, that aims to apply the best available evidence gained from the scientific method to clinical decision making. Also known as conventional or Western medicine.
  'WesternConventional': prefix.sdo('WesternConventional'),
  // The drug's cost represents the wholesale acquisition cost of the drug.
  'Wholesale': prefix.sdo('Wholesale'),
  // A wholesale store.
  'WholesaleStore': prefix.sdo('WholesaleStore'),
  // The act of achieving victory in a competitive activity.
  'WinAction': prefix.sdo('WinAction'),
  // A winery.
  'Winery': prefix.sdo('Winery'),
  // Withdrawn.
  'Withdrawn': prefix.sdo('Withdrawn'),
  // A program with both an educational and employment component. Typically based at a workplace and structured around work-based learning, with the aim of instilling competencies related to an occupation. WorkBasedProgram is used to distinguish programs such as apprenticeships from school, college or other classroom based educational programs.
  'WorkBasedProgram': prefix.sdo('WorkBasedProgram'),
  // A Workers Union (also known as a Labor Union, Labour Union, or Trade Union) is an organization that promotes the interests of its worker members by collectively bargaining with management, organizing, and political lobbying.
  'WorkersUnion': prefix.sdo('WorkersUnion'),
  // The act of authoring written creative content.
  'WriteAction': prefix.sdo('WriteAction'),
  // Permission to write or edit the document.
  'WritePermission': prefix.sdo('WritePermission'),
  // Text representing an XPath (typically but not necessarily version 1.0).
  'XPathType': prefix.sdo('XPathType'),
  // X-ray imaging.
  'XRay': prefix.sdo('XRay'),
  // The airline boards by zones of the plane.
  'ZoneBoardingPolicy': prefix.sdo('ZoneBoardingPolicy'),
  // A zoo.
  'Zoo': prefix.sdo('Zoo'),
  // The subject matter of the content.
  'about': prefix.sdo('about'),
  // Indicates whether the book is an abridged edition.
  'abridged': prefix.sdo('abridged'),
  // An abstract is a short description that summarizes a [[CreativeWork]].
  'abstract': prefix.sdo('abstract'),
  // The time needed to accelerate the vehicle from a given start velocity to a given target velocity.Typical unit code(s): SEC for seconds* Note: There are unfortunately no standard unit codes for seconds/0..100 km/h or seconds/0..60 mph. Simply use \"SEC\" for seconds and indicate the velocities in the [[name]] of the [[QuantitativeValue]], or use [[valueReference]] with a [[QuantitativeValue]] of 0..60 mph or 0..100 km/h to specify the reference speeds.
  'accelerationTime': prefix.sdo('accelerationTime'),
  // The answer(s) that has been accepted as best, typically on a Question/Answer site. Sites vary in their selection mechanisms, e.g. drawing on community opinion and/or the view of the Question author.
  'acceptedAnswer': prefix.sdo('acceptedAnswer'),
  // The offer(s) -- e.g., product, quantity and price combinations -- included in the order.
  'acceptedOffer': prefix.sdo('acceptedOffer'),
  // The payment method(s) accepted by seller for this offer.
  'acceptedPaymentMethod': prefix.sdo('acceptedPaymentMethod'),
  // Indicates whether a FoodEstablishment accepts reservations. Values can be Boolean, an URL at which reservations can be made or (for backwards compatibility) the strings ```Yes``` or ```No```.
  'acceptsReservations': prefix.sdo('acceptsReservations'),
  // Password, PIN, or access code needed for delivery (e.g. from a locker).
  'accessCode': prefix.sdo('accessCode'),
  // The human sensory perceptual system or cognitive faculty through which a person may process or perceive information. Expected values include: auditory, tactile, textual, visual, colorDependent, chartOnVisual, chemOnVisual, diagramOnVisual, mathOnVisual, musicOnVisual, textOnVisual.
  'accessMode': prefix.sdo('accessMode'),
  // A list of single or combined accessModes that are sufficient to understand all the intellectual content of a resource. Expected values include:  auditory, tactile, textual, visual.
  'accessModeSufficient': prefix.sdo('accessModeSufficient'),
  // Indicates that the resource is compatible with the referenced accessibility API ([WebSchemas wiki lists possible values](http://www.w3.org/wiki/WebSchemas/Accessibility)).
  'accessibilityAPI': prefix.sdo('accessibilityAPI'),
  // Identifies input methods that are sufficient to fully control the described resource ([WebSchemas wiki lists possible values](http://www.w3.org/wiki/WebSchemas/Accessibility)).
  'accessibilityControl': prefix.sdo('accessibilityControl'),
  // Content features of the resource, such as accessible media, alternatives and supported enhancements for accessibility ([WebSchemas wiki lists possible values](http://www.w3.org/wiki/WebSchemas/Accessibility)).
  'accessibilityFeature': prefix.sdo('accessibilityFeature'),
  // A characteristic of the described resource that is physiologically dangerous to some users. Related to WCAG 2.0 guideline 2.3 ([WebSchemas wiki lists possible values](http://www.w3.org/wiki/WebSchemas/Accessibility)).
  'accessibilityHazard': prefix.sdo('accessibilityHazard'),
  // A human-readable summary of specific accessibility features or deficiencies, consistent with the other accessibility metadata but expressing subtleties such as \"short descriptions are present but long descriptions will be needed for non-visual users\" or \"short descriptions are present and no long descriptions are needed.\"
  'accessibilitySummary': prefix.sdo('accessibilitySummary'),
  // Category of an [[Accommodation]], following real estate conventions e.g. RESO (see [PropertySubType](https://ddwiki.reso.org/display/DDW17/PropertySubType+Field), and [PropertyType](https://ddwiki.reso.org/display/DDW17/PropertyType+Field) fields  for suggested values).
  'accommodationCategory': prefix.sdo('accommodationCategory'),
  // A floorplan of some [[Accommodation]].
  'accommodationFloorPlan': prefix.sdo('accommodationFloorPlan'),
  // The identifier for the account the payment will be applied to.
  'accountId': prefix.sdo('accountId'),
  // A minimum amount that has to be paid in every month.
  'accountMinimumInflow': prefix.sdo('accountMinimumInflow'),
  // An overdraft is an extension of credit from a lending institution when an account reaches zero. An overdraft allows the individual to continue withdrawing money even if the account has no funds in it. Basically the bank allows people to borrow a set amount of money.
  'accountOverdraftLimit': prefix.sdo('accountOverdraftLimit'),
  // Specifies the Person that is legally accountable for the CreativeWork.
  'accountablePerson': prefix.sdo('accountablePerson'),
  // Indicates a page documenting how licenses can be purchased or otherwise acquired, for the current item.
  'acquireLicensePage': prefix.sdo('acquireLicensePage'),
  // The organization or person from which the product was acquired.
  'acquiredFrom': prefix.sdo('acquiredFrom'),
  // The ACRISS Car Classification Code is a code used by many car rental companies, for classifying vehicles. ACRISS stands for Association of Car Rental Industry Systems and Standards.
  'acrissCode': prefix.sdo('acrissCode'),
  // A set of requirements that a must be fulfilled in order to perform an Action. If more than one value is specied, fulfilling one set of requirements will allow the Action to be performed.
  'actionAccessibilityRequirement': prefix.sdo('actionAccessibilityRequirement'),
  // An application that can complete the request.
  'actionApplication': prefix.sdo('actionApplication'),
  // A sub property of object. The options subject to this action.
  'actionOption': prefix.sdo('actionOption'),
  // The high level platform(s) where the Action can be performed for the given URL. To specify a specific application or operating system instance, use actionApplication.
  'actionPlatform': prefix.sdo('actionPlatform'),
  // Indicates the current disposition of the Action.
  'actionStatus': prefix.sdo('actionStatus'),
  // For a [[NewsMediaOrganization]] or other news-related [[Organization]], a statement about public engagement activities (for news media, the newsroom’s), including involving the public - digitally or otherwise -- in coverage decisions, reporting and activities after publication.
  'actionableFeedbackPolicy': prefix.sdo('actionableFeedbackPolicy'),
  // An active ingredient, typically chemical compounds and/or biologic substances.
  'activeIngredient': prefix.sdo('activeIngredient'),
  // Length of time to engage in the activity.
  'activityDuration': prefix.sdo('activityDuration'),
  // How often one should engage in the activity.
  'activityFrequency': prefix.sdo('activityFrequency'),
  // An actor, e.g. in tv, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip.
  'actor': prefix.sdo('actor'),
  // An actor, e.g. in tv, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
  'actors': prefix.sdo('actors'),
  // An additional offer that can only be obtained in combination with the first base offer (e.g. supplements and extensions that are available for a surcharge).
  'addOn': prefix.sdo('addOn'),
  // An additional name for a Person, can be used for a middle name.
  'additionalName': prefix.sdo('additionalName'),
  // If responding yes, the number of guests who will attend in addition to the invitee.
  'additionalNumberOfGuests': prefix.sdo('additionalNumberOfGuests'),
  // A property-value pair representing an additional characteristics of the entitity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
  'additionalProperty': prefix.sdo('additionalProperty'),
  // An additional type for the item, typically used for adding more specific types from external vocabularies in microdata syntax. This is a relationship between something and a class that the thing is in. In RDFa syntax, it is better to use the native RDFa syntax - the 'typeof' attribute - for multiple types. Schema.org tools may have only weaker understanding of extra types, in particular those defined externally.
  'additionalType': prefix.sdo('additionalType'),
  // Any additional component of the exercise prescription that may need to be articulated to the patient. This may include the order of exercises, the number of repetitions of movement, quantitative distance, progressions over time, etc.
  'additionalVariable': prefix.sdo('additionalVariable'),
  // Physical address of the item.
  'address': prefix.sdo('address'),
  // The country. For example, USA. You can also provide the two-letter [ISO 3166-1 alpha-2 country code](http://en.wikipedia.org/wiki/ISO_3166-1).
  'addressCountry': prefix.sdo('addressCountry'),
  // The locality in which the street address is, and which is in the region. For example, Mountain View.
  'addressLocality': prefix.sdo('addressLocality'),
  // The region in which the locality is, and which is in the country. For example, California or another appropriate first-level [Administrative division](https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country)
  'addressRegion': prefix.sdo('addressRegion'),
  // A route by which this drug may be administered, e.g. 'oral'.
  'administrationRoute': prefix.sdo('administrationRoute'),
  // The amount of time that is required between accepting the offer and the actual usage of the resource or service.
  'advanceBookingRequirement': prefix.sdo('advanceBookingRequirement'),
  // A possible complication and/or side effect of this therapy. If it is known that an adverse outcome is serious (resulting in death, disability, or permanent damage; requiring hospitalization; or is otherwise life-threatening or requires immediate medical attention), tag it as a seriouseAdverseOutcome instead.
  'adverseOutcome': prefix.sdo('adverseOutcome'),
  // Drugs that affect the test's results.
  'affectedBy': prefix.sdo('affectedBy'),
  // An organization that this person is affiliated with. For example, a school/university, a club, or a team.
  'affiliation': prefix.sdo('affiliation'),
  // A media object representing the circumstances after performing this direction.
  'afterMedia': prefix.sdo('afterMedia'),
  // The direct performer or driver of the action (animate or inanimate). e.g. *John* wrote a book.
  'agent': prefix.sdo('agent'),
  // The overall rating, based on a collection of reviews or ratings, of the item.
  'aggregateRating': prefix.sdo('aggregateRating'),
  // The kind of aircraft (e.g., \"Boeing 747\").
  'aircraft': prefix.sdo('aircraft'),
  // A music album.
  'album': prefix.sdo('album'),
  // Classification of the album by it's type of content: soundtrack, live album, studio album, etc.
  'albumProductionType': prefix.sdo('albumProductionType'),
  // A release of this album.
  'albumRelease': prefix.sdo('albumRelease'),
  // The kind of release which this album is: single, EP or album.
  'albumReleaseType': prefix.sdo('albumReleaseType'),
  // A collection of music albums.
  'albums': prefix.sdo('albums'),
  // Any precaution, guidance, contraindication, etc. related to consumption of alcohol while taking this drug.
  'alcoholWarning': prefix.sdo('alcoholWarning'),
  // The algorithm or rules to follow to compute the score.
  'algorithm': prefix.sdo('algorithm'),
  // A category of alignment between the learning resource and the framework node. Recommended values include: 'requires', 'textComplexity', 'readingLevel', and 'educationalSubject'.
  'alignmentType': prefix.sdo('alignmentType'),
  // An alias for the item.
  'alternateName': prefix.sdo('alternateName'),
  // A secondary title of the CreativeWork.
  'alternativeHeadline': prefix.sdo('alternativeHeadline'),
  // Another gene which is a variation of this one.
  'alternativeOf': prefix.sdo('alternativeOf'),
  // Alumni of an organization.
  'alumni': prefix.sdo('alumni'),
  // An organization that the person is an alumni of.
  'alumniOf': prefix.sdo('alumniOf'),
  // An amenity feature (e.g. a characteristic or service) of the Accommodation. This generic property does not make a statement about whether the feature is included in an offer for the main accommodation or available at extra costs.
  'amenityFeature': prefix.sdo('amenityFeature'),
  // The amount of money.
  'amount': prefix.sdo('amount'),
  // The quantity of the goods included in the offer.
  'amountOfThisGood': prefix.sdo('amountOfThisGood'),
  // Indicates a specific [[CivicStructure]] or [[LocalBusiness]] associated with the SpecialAnnouncement. For example, a specific testing facility or business with special opening hours. For a larger geographic region like a quarantine of an entire region, use [[spatialCoverage]].
  'announcementLocation': prefix.sdo('announcementLocation'),
  // The annual rate that is charged for borrowing (or made by investing), expressed as a single percentage number that represents the actual yearly cost of funds over the term of a loan. This includes any fees or additional costs associated with the transaction.
  'annualPercentageRate': prefix.sdo('annualPercentageRate'),
  // The number of answers this question has received.
  'answerCount': prefix.sdo('answerCount'),
  // A step-by-step or full explanation about Answer. Can outline how this Answer was achieved or contain more broad clarification or statement about it.
  'answerExplanation': prefix.sdo('answerExplanation'),
  // The muscle whose action counteracts the specified muscle.
  'antagonist': prefix.sdo('antagonist'),
  // Indicates an occurence of a [[Claim]] in some [[CreativeWork]].
  'appearance': prefix.sdo('appearance'),
  // The location in which the status applies.
  'applicableLocation': prefix.sdo('applicableLocation'),
  // The location(s) applicants can apply from. This is usually used for telecommuting jobs where the applicant does not need to be in a physical office. Note: This should not be used for citizenship or work visa requirements.
  'applicantLocationRequirements': prefix.sdo('applicantLocationRequirements'),
  // An application that can complete the request.
  'application': prefix.sdo('application'),
  // Type of software application, e.g. 'Game, Multimedia'.
  'applicationCategory': prefix.sdo('applicationCategory'),
  // Contact details for further information relevant to this job posting.
  'applicationContact': prefix.sdo('applicationContact'),
  // The date at which the program stops collecting applications for the next enrollment cycle.
  'applicationDeadline': prefix.sdo('applicationDeadline'),
  // The date at which the program begins collecting applications for the next enrollment cycle.
  'applicationStartDate': prefix.sdo('applicationStartDate'),
  // Subcategory of the application, e.g. 'Arcade Game'.
  'applicationSubCategory': prefix.sdo('applicationSubCategory'),
  // The name of the application suite to which the application belongs (e.g. Excel belongs to Office).
  'applicationSuite': prefix.sdo('applicationSuite'),
  // The delivery method(s) to which the delivery charge or payment charge specification applies.
  'appliesToDeliveryMethod': prefix.sdo('appliesToDeliveryMethod'),
  // The payment method(s) to which the payment charge specification applies.
  'appliesToPaymentMethod': prefix.sdo('appliesToPaymentMethod'),
  // Collection, [fonds](https://en.wikipedia.org/wiki/Fonds), or item held, kept or maintained by an [[ArchiveOrganization]].
  'archiveHeld': prefix.sdo('archiveHeld'),
  // Indicates a page or other link involved in archival of a [[CreativeWork]]. In the case of [[MediaReview]], the items in a [[MediaReviewItem]] may often become inaccessible, but be archived by archival, journalistic, activist, or law enforcement organizations. In such cases, the referenced page may not directly publish the content.
  'archivedAt': prefix.sdo('archivedAt'),
  // The area within which users can expect to reach the broadcast service.
  'area': prefix.sdo('area'),
  // The geographic area where a service or offered item is provided.
  'areaServed': prefix.sdo('areaServed'),
  // The airport where the flight terminates.
  'arrivalAirport': prefix.sdo('arrivalAirport'),
  // The terminal or port from which the boat arrives.
  'arrivalBoatTerminal': prefix.sdo('arrivalBoatTerminal'),
  // The stop or station from which the bus arrives.
  'arrivalBusStop': prefix.sdo('arrivalBusStop'),
  // Identifier of the flight's arrival gate.
  'arrivalGate': prefix.sdo('arrivalGate'),
  // The platform where the train arrives.
  'arrivalPlatform': prefix.sdo('arrivalPlatform'),
  // The station where the train trip ends.
  'arrivalStation': prefix.sdo('arrivalStation'),
  // Identifier of the flight's arrival terminal.
  'arrivalTerminal': prefix.sdo('arrivalTerminal'),
  // The expected arrival time.
  'arrivalTime': prefix.sdo('arrivalTime'),
  // The number of copies when multiple copies of a piece of artwork are produced - e.g. for a limited edition of 20 prints, 'artEdition' refers to the total number of copies (in this example \"20\").
  'artEdition': prefix.sdo('artEdition'),
  // The material used. (e.g. Oil, Watercolour, Acrylic, Linoprint, Marble, Cyanotype, Digital, Lithograph, DryPoint, Intaglio, Pastel, Woodcut, Pencil, Mixed Media, etc.)
  'artMedium': prefix.sdo('artMedium'),
  // The branches that comprise the arterial structure.
  'arterialBranch': prefix.sdo('arterialBranch'),
  // e.g. Painting, Drawing, Sculpture, Print, Photograph, Assemblage, Collage, etc.
  'artform': prefix.sdo('artform'),
  // The actual body of the article.
  'articleBody': prefix.sdo('articleBody'),
  // Articles may belong to one or more 'sections' in a magazine or newspaper, such as Sports, Lifestyle, etc.
  'articleSection': prefix.sdo('articleSection'),
  // The primary artist for a work    \tin a medium other than pencils or digital line art--for example, if the    \tprimary artwork is done in watercolors or digital paints.
  'artist': prefix.sdo('artist'),
  // The supporting materials for the artwork, e.g. Canvas, Paper, Wood, Board, etc.
  'artworkSurface': prefix.sdo('artworkSurface'),
  // An aspect of medical practice that is considered on the page, such as 'diagnosis', 'treatment', 'causes', 'prognosis', 'etiology', 'epidemiology', etc.
  'aspect': prefix.sdo('aspect'),
  // Library file name e.g., mscorlib.dll, system.web.dll.
  'assembly': prefix.sdo('assembly'),
  // Associated product/technology version. e.g., .NET Framework 4.5.
  'assemblyVersion': prefix.sdo('assemblyVersion'),
  // The item being described is intended to assess the competency or learning outcome defined by the referenced term.
  'assesses': prefix.sdo('assesses'),
  // The anatomy of the underlying organ system or structures associated with this entity.
  'associatedAnatomy': prefix.sdo('associatedAnatomy'),
  // A NewsArticle associated with the Media Object.
  'associatedArticle': prefix.sdo('associatedArticle'),
  // An associated [[ClaimReview]], related by specific common content, topic or claim. The expectation is that this property would be most typically used in cases where a single activity is conducting both claim reviews and media reviews, in which case [[relatedMediaReview]] would commonly be used on a [[ClaimReview]], while [[relatedClaimReview]] would be used on [[MediaReview]].
  'associatedClaimReview': prefix.sdo('associatedClaimReview'),
  // Disease associated to this BioChemEntity. Such disease can be a MedicalCondition or a URL. If you want to add an evidence supporting the association, please use PropertyValue.
  'associatedDisease': prefix.sdo('associatedDisease'),
  // A media object that encodes this CreativeWork. This property is a synonym for encoding.
  'associatedMedia': prefix.sdo('associatedMedia'),
  // An associated [[MediaReview]], related by specific common content, topic or claim. The expectation is that this property would be most typically used in cases where a single activity is conducting both claim reviews and media reviews, in which case [[relatedMediaReview]] would commonly be used on a [[ClaimReview]], while [[relatedClaimReview]] would be used on [[MediaReview]].
  'associatedMediaReview': prefix.sdo('associatedMediaReview'),
  // If applicable, a description of the pathophysiology associated with the anatomical system, including potential abnormal changes in the mechanical, physical, and biochemical functions of the system.
  'associatedPathophysiology': prefix.sdo('associatedPathophysiology'),
  // An associated [[Review]].
  'associatedReview': prefix.sdo('associatedReview'),
  // A person that acts as performing member of a sports team; a player as opposed to a coach.
  'athlete': prefix.sdo('athlete'),
  // A person or organization attending the event.
  'attendee': prefix.sdo('attendee'),
  // A person attending the event.
  'attendees': prefix.sdo('attendees'),
  // An intended audience, i.e. a group for whom something was created.
  'audience': prefix.sdo('audience'),
  // The target group associated with a given audience (e.g. veterans, car owners, musicians, etc.).
  'audienceType': prefix.sdo('audienceType'),
  // An embedded audio object.
  'audio': prefix.sdo('audio'),
  // The Organization responsible for authenticating the user's subscription. For example, many media apps require a cable/satellite provider to authenticate your subscription before playing media.
  'authenticator': prefix.sdo('authenticator'),
  // The author of this content or rating. Please note that author is special in that HTML 5 provides a special mechanism for indicating authorship via the rel tag. That is equivalent to this and may be used interchangeably.
  'author': prefix.sdo('author'),
  // The availability of this item&#x2014;for example In stock, Out of stock, Pre-order, etc.
  'availability': prefix.sdo('availability'),
  // The end of the availability of the product or service included in the offer.
  'availabilityEnds': prefix.sdo('availabilityEnds'),
  // The beginning of the availability of the product or service included in the offer.
  'availabilityStarts': prefix.sdo('availabilityStarts'),
  // The place(s) from which the offer can be obtained (e.g. store locations).
  'availableAtOrFrom': prefix.sdo('availableAtOrFrom'),
  // A means of accessing the service (e.g. a phone bank, a web site, a location, etc.).
  'availableChannel': prefix.sdo('availableChannel'),
  // The delivery method(s) available for this offer.
  'availableDeliveryMethod': prefix.sdo('availableDeliveryMethod'),
  // When the item is available for pickup from the store, locker, etc.
  'availableFrom': prefix.sdo('availableFrom'),
  // The location in which the strength is available.
  'availableIn': prefix.sdo('availableIn'),
  // A language someone may use with or at the item, service or place. Please use one of the language codes from the [IETF BCP 47 standard](http://tools.ietf.org/html/bcp47). See also [[inLanguage]]
  'availableLanguage': prefix.sdo('availableLanguage'),
  // Device required to run the application. Used in cases where a specific make/model is required to run the application.
  'availableOnDevice': prefix.sdo('availableOnDevice'),
  // A medical service available from this provider.
  'availableService': prefix.sdo('availableService'),
  // An available dosage strength for the drug.
  'availableStrength': prefix.sdo('availableStrength'),
  // A diagnostic test or procedure offered by this lab.
  'availableTest': prefix.sdo('availableTest'),
  // After this date, the item will no longer be available for pickup.
  'availableThrough': prefix.sdo('availableThrough'),
  // An award won by or for this item.
  'award': prefix.sdo('award'),
  // Awards won by or for this item.
  'awards': prefix.sdo('awards'),
  // The away team in a sports event.
  'awayTeam': prefix.sdo('awayTeam'),
  // For an [[Article]], typically a [[NewsArticle]], the backstory property provides a textual summary giving a brief explanation of why and how an article was created. In a journalistic setting this could include information about reporting process, methods, interviews, data sources, etc.
  'backstory': prefix.sdo('backstory'),
  // The type of a bank account.
  'bankAccountType': prefix.sdo('bankAccountType'),
  // The base salary of the job or of an employee in an EmployeeRole.
  'baseSalary': prefix.sdo('baseSalary'),
  // A sub property of recipient. The recipient blind copied on a message.
  'bccRecipient': prefix.sdo('bccRecipient'),
  // The type of bed or beds included in the accommodation. For the single case of just one bed of a certain type, you use bed directly with a text.      If you want to indicate the quantity of a certain kind of bed, use an instance of BedDetails. For more detailed information, use the amenityFeature property.
  'bed': prefix.sdo('bed'),
  // A media object representing the circumstances before performing this direction.
  'beforeMedia': prefix.sdo('beforeMedia'),
  // A bank or bank’s branch, financial institution or international financial institution operating the beneficiary’s bank account or releasing funds for the beneficiary.
  'beneficiaryBank': prefix.sdo('beneficiaryBank'),
  // Description of benefits associated with the job.
  'benefits': prefix.sdo('benefits'),
  // The URL that goes directly to the summary of benefits and coverage for the specific standard plan or plan variation.
  'benefitsSummaryUrl': prefix.sdo('benefitsSummaryUrl'),
  // The highest value allowed in this rating system. If bestRating is omitted, 5 is assumed.
  'bestRating': prefix.sdo('bestRating'),
  // The billing address for the order.
  'billingAddress': prefix.sdo('billingAddress'),
  // Specifies for how long this price (or price component) will be billed. Can be used, for example, to model the contractual duration of a subscription or payment plan. Type can be either a Duration or a Number (in which case the unit of measurement, for example month, is specified by the unitCode property).
  'billingDuration': prefix.sdo('billingDuration'),
  // This property specifies the minimal quantity and rounding increment that will be the basis for the billing. The unit of measurement is specified by the unitCode property.
  'billingIncrement': prefix.sdo('billingIncrement'),
  // The time interval used to compute the invoice.
  'billingPeriod': prefix.sdo('billingPeriod'),
  // Specifies after how much time this price (or price component) becomes valid and billing starts. Can be used, for example, to model a price increase after the first year of a subscription. The unit of measurement is specified by the unitCode property.
  'billingStart': prefix.sdo('billingStart'),
  // A BioChemEntity that is known to interact with this item.
  'bioChemInteraction': prefix.sdo('bioChemInteraction'),
  // A similar BioChemEntity, e.g., obtained by fingerprint similarity algorithms.
  'bioChemSimilarity': prefix.sdo('bioChemSimilarity'),
  // A role played by the BioChemEntity within a biological context.
  'biologicalRole': prefix.sdo('biologicalRole'),
  // The biomechanical properties of the bone.
  'biomechnicalClass': prefix.sdo('biomechnicalClass'),
  // Date of birth.
  'birthDate': prefix.sdo('birthDate'),
  // The place where the person was born.
  'birthPlace': prefix.sdo('birthPlace'),
  // The bitrate of the media object.
  'bitrate': prefix.sdo('bitrate'),
  // A posting that is part of this blog.
  'blogPost': prefix.sdo('blogPost'),
  // Indicates a post that is part of a [[Blog]]. Note that historically, what we term a \"Blog\" was once known as a \"weblog\", and that what we term a \"BlogPosting\" is now often colloquially referred to as a \"blog\".
  'blogPosts': prefix.sdo('blogPosts'),
  // The blood vessel that carries blood from the heart to the muscle.
  'bloodSupply': prefix.sdo('bloodSupply'),
  // The airline-specific indicator of boarding order / preference.
  'boardingGroup': prefix.sdo('boardingGroup'),
  // The type of boarding policy used by the airline (e.g. zone-based or group-based).
  'boardingPolicy': prefix.sdo('boardingPolicy'),
  // Location in the body of the anatomical structure.
  'bodyLocation': prefix.sdo('bodyLocation'),
  // Indicates the design and body style of the vehicle (e.g. station wagon, hatchback, etc.).
  'bodyType': prefix.sdo('bodyType'),
  // The edition of the book.
  'bookEdition': prefix.sdo('bookEdition'),
  // The format of the book.
  'bookFormat': prefix.sdo('bookFormat'),
  // 'bookingAgent' is an out-dated term indicating a 'broker' that serves as a booking agent.
  'bookingAgent': prefix.sdo('bookingAgent'),
  // The date and time the reservation was booked.
  'bookingTime': prefix.sdo('bookingTime'),
  // A sub property of participant. The person that borrows the object being lent.
  'borrower': prefix.sdo('borrower'),
  // A box is the area enclosed by the rectangle formed by two points. The first point is the lower corner, the second point is the upper corner. A box is expressed as two points separated by a space character.
  'box': prefix.sdo('box'),
  // The branches that delineate from the nerve bundle. Not to be confused with [[branchOf]].
  'branch': prefix.sdo('branch'),
  // A short textual code (also called \"store code\") that uniquely identifies a place of business. The code is typically assigned by the parentOrganization and used in structured URLs.For example, in the URL http://www.starbucks.co.uk/store-locator/etc/detail/3047 the code \"3047\" is a branchCode for a particular branch.
  'branchCode': prefix.sdo('branchCode'),
  // The larger organization that this local business is a branch of, if any. Not to be confused with (anatomical)[[branch]].
  'branchOf': prefix.sdo('branchOf'),
  // The brand(s) associated with a product or service, or the brand(s) maintained by an organization or business person.
  'brand': prefix.sdo('brand'),
  // A set of links that can help a user understand and navigate a website hierarchy.
  'breadcrumb': prefix.sdo('breadcrumb'),
  // Any precaution, guidance, contraindication, etc. related to this drug's use by breastfeeding mothers.
  'breastfeedingWarning': prefix.sdo('breastfeedingWarning'),
  // The media network(s) whose content is broadcast on this station.
  'broadcastAffiliateOf': prefix.sdo('broadcastAffiliateOf'),
  // The unique address by which the BroadcastService can be identified in a provider lineup. In US, this is typically a number.
  'broadcastChannelId': prefix.sdo('broadcastChannelId'),
  // The name displayed in the channel guide. For many US affiliates, it is the network name.
  'broadcastDisplayName': prefix.sdo('broadcastDisplayName'),
  // The frequency used for over-the-air broadcasts. Numeric values or simple ranges e.g. 87-99. In addition a shortcut idiom is supported for frequences of AM and FM radio channels, e.g. \"87 FM\".
  'broadcastFrequency': prefix.sdo('broadcastFrequency'),
  // The frequency in MHz for a particular broadcast.
  'broadcastFrequencyValue': prefix.sdo('broadcastFrequencyValue'),
  // The event being broadcast such as a sporting event or awards ceremony.
  'broadcastOfEvent': prefix.sdo('broadcastOfEvent'),
  // The type of service required to have access to the channel (e.g. Standard or Premium).
  'broadcastServiceTier': prefix.sdo('broadcastServiceTier'),
  // The modulation (e.g. FM, AM, etc) used by a particular broadcast service.
  'broadcastSignalModulation': prefix.sdo('broadcastSignalModulation'),
  // The subchannel used for the broadcast.
  'broadcastSubChannel': prefix.sdo('broadcastSubChannel'),
  // The timezone in [ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601) for which the service bases its broadcasts
  'broadcastTimezone': prefix.sdo('broadcastTimezone'),
  // The organization owning or operating the broadcast service.
  'broadcaster': prefix.sdo('broadcaster'),
  // An entity that arranges for an exchange between a buyer and a seller.  In most cases a broker never acquires or releases ownership of a product or service involved in an exchange.  If it is not clear whether an entity is a broker, seller, or buyer, the latter two terms are preferred.
  'broker': prefix.sdo('broker'),
  // Specifies browser requirements in human-readable text. For example, 'requires HTML5 support'.
  'browserRequirements': prefix.sdo('browserRequirements'),
  // The name of the bus (e.g. Bolt Express).
  'busName': prefix.sdo('busName'),
  // The unique identifier for the bus.
  'busNumber': prefix.sdo('busNumber'),
  // Days of the week when the merchant typically operates, indicated via opening hours markup.
  'businessDays': prefix.sdo('businessDays'),
  // The business function (e.g. sell, lease, repair, dispose) of the offer or component of a bundle (TypeAndQuantityNode). The default is http://purl.org/goodrelations/v1#Sell.
  'businessFunction': prefix.sdo('businessFunction'),
  // A sub property of participant. The participant/person/organization that bought the object.
  'buyer': prefix.sdo('buyer'),
  // The artist that performed this album or recording.
  'byArtist': prefix.sdo('byArtist'),
  // Defines the day(s) of the week on which a recurring [[Event]] takes place. May be specified using either [[DayOfWeek]], or alternatively [[Text]] conforming to iCal's syntax for byDay recurrence rules.
  'byDay': prefix.sdo('byDay'),
  // Defines the month(s) of the year on which a recurring [[Event]] takes place. Specified as an [[Integer]] between 1-12. January is 1.
  'byMonth': prefix.sdo('byMonth'),
  // Defines the day(s) of the month on which a recurring [[Event]] takes place. Specified as an [[Integer]] between 1-31.
  'byMonthDay': prefix.sdo('byMonthDay'),
  // Defines the week(s) of the month on which a recurring Event takes place. Specified as an Integer between 1-5. For clarity, byMonthWeek is best used in conjunction with byDay to indicate concepts like the first and third Mondays of a month.
  'byMonthWeek': prefix.sdo('byMonthWeek'),
  // A [callsign](https://en.wikipedia.org/wiki/Call_sign), as used in broadcasting and radio communications to identify people, radio and TV stations, or vehicles.
  'callSign': prefix.sdo('callSign'),
  // The number of calories.
  'calories': prefix.sdo('calories'),
  // A sub property of object. The candidate subject of this action.
  'candidate': prefix.sdo('candidate'),
  // The caption for this object. For downloadable machine formats (closed caption, subtitles etc.) use MediaObject and indicate the [[encodingFormat]].
  'caption': prefix.sdo('caption'),
  // The number of grams of carbohydrates.
  'carbohydrateContent': prefix.sdo('carbohydrateContent'),
  // The available volume for cargo or luggage. For automobiles, this is usually the trunk volume.Typical unit code(s): LTR for liters, FTQ for cubic foot/feetNote: You can use [[minValue]] and [[maxValue]] to indicate ranges.
  'cargoVolume': prefix.sdo('cargoVolume'),
  // 'carrier' is an out-dated term indicating the 'provider' for parcel delivery and flights.
  'carrier': prefix.sdo('carrier'),
  // Specifies specific carrier(s) requirements for the application (e.g. an application may only work on a specific carrier network).
  'carrierRequirements': prefix.sdo('carrierRequirements'),
  // A cardholder benefit that pays the cardholder a small percentage of their net expenditures.
  'cashBack': prefix.sdo('cashBack'),
  // A data catalog which contains this dataset.
  'catalog': prefix.sdo('catalog'),
  // The catalog number for the release.
  'catalogNumber': prefix.sdo('catalogNumber'),
  // A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy.
  'category': prefix.sdo('category'),
  // The condition, complication, symptom, sign, etc. caused.
  'causeOf': prefix.sdo('causeOf'),
  // A sub property of recipient. The recipient copied on a message.
  'ccRecipient': prefix.sdo('ccRecipient'),
  // Fictional person connected with a creative work.
  'character': prefix.sdo('character'),
  // A piece of data that represents a particular aspect of a fictional character (skill, power, character points, advantage, disadvantage).
  'characterAttribute': prefix.sdo('characterAttribute'),
  // The name of a character played in some acting or performing role, i.e. in a PerformanceRole.
  'characterName': prefix.sdo('characterName'),
  // Cheat codes to the game.
  'cheatCode': prefix.sdo('cheatCode'),
  // The earliest someone may check into a lodging establishment.
  'checkinTime': prefix.sdo('checkinTime'),
  // The latest someone may check out of a lodging establishment.
  'checkoutTime': prefix.sdo('checkoutTime'),
  // The chemical composition describes the identity and relative ratio of the chemical elements that make up the substance.
  'chemicalComposition': prefix.sdo('chemicalComposition'),
  // A role played by the BioChemEntity within a chemical context.
  'chemicalRole': prefix.sdo('chemicalRole'),
  // Maximal age of the child.
  'childMaxAge': prefix.sdo('childMaxAge'),
  // Minimal age of the child.
  'childMinAge': prefix.sdo('childMinAge'),
  // Closest child taxa of the taxon in question.
  'childTaxon': prefix.sdo('childTaxon'),
  // A child of the person.
  'children': prefix.sdo('children'),
  // The number of milligrams of cholesterol.
  'cholesterolContent': prefix.sdo('cholesterolContent'),
  // A circle is the circular region of a specified radius centered at a specified latitude and longitude. A circle is expressed as a pair followed by a radius in meters.
  'circle': prefix.sdo('circle'),
  // A citation or reference to another creative work, such as another publication, web page, scholarly article, etc.
  'citation': prefix.sdo('citation'),
  // For a [[Claim]] interpreted from [[MediaObject]] content    sed to indicate a claim contained, implied or refined from the content of a [[MediaObject]].
  'claimInterpreter': prefix.sdo('claimInterpreter'),
  // A short summary of the specific claims reviewed in a ClaimReview.
  'claimReviewed': prefix.sdo('claimReviewed'),
  // Description of the absorption and elimination of drugs, including their concentration (pharmacokinetics, pK) and biological effects (pharmacodynamics, pD).
  'clincalPharmacology': prefix.sdo('clincalPharmacology'),
  // Description of the absorption and elimination of drugs, including their concentration (pharmacokinetics, pK) and biological effects (pharmacodynamics, pD).
  'clinicalPharmacology': prefix.sdo('clinicalPharmacology'),
  // Position of the clip within an ordered group of clips.
  'clipNumber': prefix.sdo('clipNumber'),
  // The closing hour of the place or service on the given day(s) of the week.
  'closes': prefix.sdo('closes'),
  // A person that acts in a coaching role for a sports team.
  'coach': prefix.sdo('coach'),
  // A medical code for the entity, taken from a controlled vocabulary or ontology such as ICD-9, DiseasesDB, MeSH, SNOMED-CT, RxNorm, etc.
  'code': prefix.sdo('code'),
  // Link to the repository where the un-compiled, human readable code and related code is located (SVN, github, CodePlex).
  'codeRepository': prefix.sdo('codeRepository'),
  // What type of code sample: full (compile ready) solution, code snippet, inline code, scripts, template.
  'codeSampleType': prefix.sdo('codeSampleType'),
  // A short textual code that uniquely identifies the value.
  'codeValue': prefix.sdo('codeValue'),
  // The coding system, e.g. 'ICD-10'.
  'codingSystem': prefix.sdo('codingSystem'),
  // A colleague of the person.
  'colleague': prefix.sdo('colleague'),
  // A colleague of the person.
  'colleagues': prefix.sdo('colleagues'),
  // A sub property of object. The collection target of the action.
  'collection': prefix.sdo('collection'),
  // The number of items in the [[Collection]].
  'collectionSize': prefix.sdo('collectionSize'),
  // The color of the product.
  'color': prefix.sdo('color'),
  // The individual who adds color to inked drawings.
  'colorist': prefix.sdo('colorist'),
  // Comments, typically from users.
  'comment': prefix.sdo('comment'),
  // The number of comments this CreativeWork (e.g. Article, Question or Answer) has received. This is most applicable to works published in Web sites with commenting system; additional comments may exist elsewhere.
  'commentCount': prefix.sdo('commentCount'),
  // The text of the UserComment.
  'commentText': prefix.sdo('commentText'),
  // The time at which the UserComment was made.
  'commentTime': prefix.sdo('commentTime'),
  // Knowledge, skill, ability or personal attribute that must be demonstrated by a person or other entity in order to do something such as earn an Educational Occupational Credential or understand a LearningResource.
  'competencyRequired': prefix.sdo('competencyRequired'),
  // A competitor in a sports event.
  'competitor': prefix.sdo('competitor'),
  // The person or organization who wrote a composition, or who is the composer of a work performed at some event.
  'composer': prefix.sdo('composer'),
  // Specifying something physically contained by something else. Typically used here for the underlying anatomical structures, such as organs, that comprise the anatomical system.
  'comprisedOf': prefix.sdo('comprisedOf'),
  // Conditions that affect the availability of, or method(s) of access to, an item. Typically used for real world items such as an [[ArchiveComponent]] held by an [[ArchiveOrganization]]. This property is not suitable for use as a general Web access control mechanism. It is expressed only in natural language.For example \"Available by appointment from the Reading Room\" or \"Accessible only from logged-in accounts \".
  'conditionsOfAccess': prefix.sdo('conditionsOfAccess'),
  // A number that confirms the given order or payment has been received.
  'confirmationNumber': prefix.sdo('confirmationNumber'),
  // Other anatomical structures to which this structure is connected.
  'connectedTo': prefix.sdo('connectedTo'),
  // Indicates a property used as a constraint to define a [[StatisticalPopulation]] with respect to the set of entities  corresponding to an indicated type (via [[populationType]]).
  'constrainingProperty': prefix.sdo('constrainingProperty'),
  // An option available on this contact point (e.g. a toll-free number or support for hearing-impaired callers).
  'contactOption': prefix.sdo('contactOption'),
  // A contact point for a person or organization.
  'contactPoint': prefix.sdo('contactPoint'),
  // A contact point for a person or organization.
  'contactPoints': prefix.sdo('contactPoints'),
  // A person or organization can have different contact points, for different purposes. For example, a sales contact point, a PR contact point and so on. This property is used to specify the kind of contact point.
  'contactType': prefix.sdo('contactType'),
  // A secure method for consumers to purchase products or services via debit, credit or smartcards by using RFID or NFC technology.
  'contactlessPayment': prefix.sdo('contactlessPayment'),
  // The basic containment relation between a place and one that contains it.
  'containedIn': prefix.sdo('containedIn'),
  // The basic containment relation between a place and one that contains it.
  'containedInPlace': prefix.sdo('containedInPlace'),
  // The basic containment relation between a place and another that it contains.
  'containsPlace': prefix.sdo('containsPlace'),
  // A season that is part of the media series.
  'containsSeason': prefix.sdo('containsSeason'),
  // The location depicted or described in the content. For example, the location in a photograph or painting.
  'contentLocation': prefix.sdo('contentLocation'),
  // Official rating of a piece of content&#x2014;for example,'MPAA PG-13'.
  'contentRating': prefix.sdo('contentRating'),
  // The specific time described by a creative work, for works (e.g. articles, video objects etc.) that emphasise a particular moment within an Event.
  'contentReferenceTime': prefix.sdo('contentReferenceTime'),
  // File size in (mega/kilo) bytes.
  'contentSize': prefix.sdo('contentSize'),
  // The supported content type(s) for an EntryPoint response.
  'contentType': prefix.sdo('contentType'),
  // Actual bytes of the media object, for example the image file or video file.
  'contentUrl': prefix.sdo('contentUrl'),
  // A contraindication for this therapy.
  'contraindication': prefix.sdo('contraindication'),
  // A secondary contributor to the CreativeWork or Event.
  'contributor': prefix.sdo('contributor'),
  // The time it takes to actually cook the dish, in [ISO 8601 duration format](http://en.wikipedia.org/wiki/ISO_8601).
  'cookTime': prefix.sdo('cookTime'),
  // The method of cooking, such as Frying, Steaming, ...
  'cookingMethod': prefix.sdo('cookingMethod'),
  // The party holding the legal copyright to the CreativeWork.
  'copyrightHolder': prefix.sdo('copyrightHolder'),
  // Text of a notice appropriate for describing the copyright aspects of this Creative Work, ideally indicating the owner of the copyright for the Work.
  'copyrightNotice': prefix.sdo('copyrightNotice'),
  // The year during which the claimed copyright for the CreativeWork was first asserted.
  'copyrightYear': prefix.sdo('copyrightYear'),
  // Indicates a correction to a [[CreativeWork]], either via a [[CorrectionComment]], textually or in another document.
  'correction': prefix.sdo('correction'),
  // For an [[Organization]] (e.g. [[NewsMediaOrganization]]), a statement describing (in news media, the newsroom’s) disclosure and correction policy for errors.
  'correctionsPolicy': prefix.sdo('correctionsPolicy'),
  // The category of cost, such as wholesale, retail, reimbursement cap, etc.
  'costCategory': prefix.sdo('costCategory'),
  // The currency (in 3-letter of the drug cost. See: http://en.wikipedia.org/wiki/ISO_4217.
  'costCurrency': prefix.sdo('costCurrency'),
  // Additional details to capture the origin of the cost data. For example, 'Medicare Part B'.
  'costOrigin': prefix.sdo('costOrigin'),
  // The cost per unit of the drug.
  'costPerUnit': prefix.sdo('costPerUnit'),
  // Countries for which the application is not supported. You can also provide the two-letter ISO 3166-1 alpha-2 country code.
  'countriesNotSupported': prefix.sdo('countriesNotSupported'),
  // Countries for which the application is supported. You can also provide the two-letter ISO 3166-1 alpha-2 country code.
  'countriesSupported': prefix.sdo('countriesSupported'),
  // The place where the product was assembled.
  'countryOfAssembly': prefix.sdo('countryOfAssembly'),
  // The place where the item (typically [[Product]]) was last processed and tested before importation.
  'countryOfLastProcessing': prefix.sdo('countryOfLastProcessing'),
  // The country of origin of something, including products as well as creative  works such as movie and TV content.In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of [[CreativeWork]] it is difficult to provide fully general guidance, and properties such as [[contentLocation]] and [[locationCreated]] may be more applicable.In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
  'countryOfOrigin': prefix.sdo('countryOfOrigin'),
  // A sub property of location. The course where this action was taken.
  'course': prefix.sdo('course'),
  // The identifier for the [[Course]] used by the course [[provider]] (e.g. CS101 or 6.001).
  'courseCode': prefix.sdo('courseCode'),
  // The medium or means of delivery of the course instance or the mode of study, either as a text label (e.g. \"online\", \"onsite\" or \"blended\"; \"synchronous\" or \"asynchronous\"; \"full-time\" or \"part-time\") or as a URL reference to a term from a controlled vocabulary (e.g. https://ceds.ed.gov/element/001311#Asynchronous ).
  'courseMode': prefix.sdo('courseMode'),
  // Requirements for taking the Course. May be completion of another [[Course]] or a textual description like \"permission of instructor\". Requirements may be a pre-requisite competency, referenced using [[AlignmentObject]].
  'coursePrerequisites': prefix.sdo('coursePrerequisites'),
  // The amount of work expected of students taking the course, often provided as a figure per week or per month, and may be broken down by type. For example, \"2 hours of lectures, 1 hour of lab work and 3 hours of independent study per week\".
  'courseWorkload': prefix.sdo('courseWorkload'),
  // The time when the live blog will stop covering the Event. Note that coverage may continue after the Event concludes.
  'coverageEndTime': prefix.sdo('coverageEndTime'),
  // The time when the live blog will begin covering the Event. Note that coverage may begin before the Event's start time. The LiveBlogPosting may also be created before coverage begins.
  'coverageStartTime': prefix.sdo('coverageStartTime'),
  // The status of a creative work in terms of its stage in a lifecycle. Example terms include Incomplete, Draft, Published, Obsolete. Some organizations define a set of terms for the stages of their publication lifecycle.
  'creativeWorkStatus': prefix.sdo('creativeWorkStatus'),
  // The creator/author of this CreativeWork. This is the same as the Author property for CreativeWork.
  'creator': prefix.sdo('creator'),
  // The category or type of credential being described, for example \"degree”, “certificate”, “badge”, or more specific term.
  'credentialCategory': prefix.sdo('credentialCategory'),
  // Text that can be used to credit person(s) and/or organization(s) associated with a published Creative Work.
  'creditText': prefix.sdo('creditText'),
  // The group the release is credited to if different than the byArtist. For example, Red and Blue is credited to \"Stefani Germanotta Band\", but by Lady Gaga.
  'creditedTo': prefix.sdo('creditedTo'),
  // A CSS selector, e.g. of a [[SpeakableSpecification]] or [[WebPageElement]]. In the latter case, multiple matches within a page can constitute a single conceptual \"Web page element\".
  'cssSelector': prefix.sdo('cssSelector'),
  // The currency accepted.Use standard formats: [ISO 4217 currency format](http://en.wikipedia.org/wiki/ISO_4217) e.g. \"USD\"; [Ticker symbol](https://en.wikipedia.org/wiki/List_of_cryptocurrencies) for cryptocurrencies e.g. \"BTC\"; well known names for [Local Exchange Tradings Systems](https://en.wikipedia.org/wiki/Local_exchange_trading_system) (LETS) and other currency types e.g. \"Ithaca HOUR\".
  'currenciesAccepted': prefix.sdo('currenciesAccepted'),
  // The currency in which the monetary amount is expressed.Use standard formats: [ISO 4217 currency format](http://en.wikipedia.org/wiki/ISO_4217) e.g. \"USD\"; [Ticker symbol](https://en.wikipedia.org/wiki/List_of_cryptocurrencies) for cryptocurrencies e.g. \"BTC\"; well known names for [Local Exchange Tradings Systems](https://en.wikipedia.org/wiki/Local_exchange_trading_system) (LETS) and other currency types e.g. \"Ithaca HOUR\".
  'currency': prefix.sdo('currency'),
  // The current price of a currency.
  'currentExchangeRate': prefix.sdo('currentExchangeRate'),
  // Party placing the order or paying the invoice.
  'customer': prefix.sdo('customer'),
  // The type of return fees if the product is returned due to customer remorse.
  'customerRemorseReturnFees': prefix.sdo('customerRemorseReturnFees'),
  // The method (from an enumeration) by which the customer obtains a return shipping label for a product returned due to customer remorse.
  'customerRemorseReturnLabelSource': prefix.sdo('customerRemorseReturnLabelSource'),
  // The amount of shipping costs if a product is returned due to customer remorse. Applicable when property [[customerRemorseReturnFees]] equals [[ReturnShippingFees]].
  'customerRemorseReturnShippingFeesAmount': prefix.sdo('customerRemorseReturnShippingFeesAmount'),
  // Order cutoff time allows merchants to describe the time after which they will no longer process orders received on that day. For orders processed after cutoff time, one day gets added to the delivery time estimate. This property is expected to be most typically used via the [[ShippingRateSettings]] publication pattern. The time is indicated using the ISO-8601 Time format, e.g. \"23:30:00-05:00\" would represent 6:30 pm Eastern Standard Time (EST) which is 5 hours behind Coordinated Universal Time (UTC).
  'cutoffTime': prefix.sdo('cutoffTime'),
  // collectiondate - Date for which patient counts are reported.
  'cvdCollectionDate': prefix.sdo('cvdCollectionDate'),
  // Name of the County of the NHSN facility that this data record applies to. Use [[cvdFacilityId]] to identify the facility. To provide other details, [[healthcareReportingData]] can be used on a [[Hospital]] entry.
  'cvdFacilityCounty': prefix.sdo('cvdFacilityCounty'),
  // Identifier of the NHSN facility that this data record applies to. Use [[cvdFacilityCounty]] to indicate the county. To provide other details, [[healthcareReportingData]] can be used on a [[Hospital]] entry.
  'cvdFacilityId': prefix.sdo('cvdFacilityId'),
  // numbeds - HOSPITAL INPATIENT BEDS: Inpatient beds, including all staffed, licensed, and overflow (surge) beds used for inpatients.
  'cvdNumBeds': prefix.sdo('cvdNumBeds'),
  // numbedsocc - HOSPITAL INPATIENT BED OCCUPANCY: Total number of staffed inpatient beds that are occupied.
  'cvdNumBedsOcc': prefix.sdo('cvdNumBedsOcc'),
  // numc19died - DEATHS: Patients with suspected or confirmed COVID-19 who died in the hospital, ED, or any overflow location.
  'cvdNumC19Died': prefix.sdo('cvdNumC19Died'),
  // numc19hopats - HOSPITAL ONSET: Patients hospitalized in an NHSN inpatient care location with onset of suspected or confirmed COVID-19 14 or more days after hospitalization.
  'cvdNumC19HOPats': prefix.sdo('cvdNumC19HOPats'),
  // numc19hosppats - HOSPITALIZED: Patients currently hospitalized in an inpatient care location who have suspected or confirmed COVID-19.
  'cvdNumC19HospPats': prefix.sdo('cvdNumC19HospPats'),
  // numc19mechventpats - HOSPITALIZED and VENTILATED: Patients hospitalized in an NHSN inpatient care location who have suspected or confirmed COVID-19 and are on a mechanical ventilator.
  'cvdNumC19MechVentPats': prefix.sdo('cvdNumC19MechVentPats'),
  // numc19ofmechventpats - ED/OVERFLOW and VENTILATED: Patients with suspected or confirmed COVID-19 who are in the ED or any overflow location awaiting an inpatient bed and on a mechanical ventilator.
  'cvdNumC19OFMechVentPats': prefix.sdo('cvdNumC19OFMechVentPats'),
  // numc19overflowpats - ED/OVERFLOW: Patients with suspected or confirmed COVID-19 who are in the ED or any overflow location awaiting an inpatient bed.
  'cvdNumC19OverflowPats': prefix.sdo('cvdNumC19OverflowPats'),
  // numicubeds - ICU BEDS: Total number of staffed inpatient intensive care unit (ICU) beds.
  'cvdNumICUBeds': prefix.sdo('cvdNumICUBeds'),
  // numicubedsocc - ICU BED OCCUPANCY: Total number of staffed inpatient ICU beds that are occupied.
  'cvdNumICUBedsOcc': prefix.sdo('cvdNumICUBedsOcc'),
  // numtotbeds - ALL HOSPITAL BEDS: Total number of all Inpatient and outpatient beds, including all staffed,ICU, licensed, and overflow (surge) beds used for inpatients or outpatients.
  'cvdNumTotBeds': prefix.sdo('cvdNumTotBeds'),
  // numvent - MECHANICAL VENTILATORS: Total number of ventilators available.
  'cvdNumVent': prefix.sdo('cvdNumVent'),
  // numventuse - MECHANICAL VENTILATORS IN USE: Total number of ventilators in use.
  'cvdNumVentUse': prefix.sdo('cvdNumVentUse'),
  // An item within in a data feed. Data feeds may have many elements.
  'dataFeedElement': prefix.sdo('dataFeedElement'),
  // A dataset contained in this catalog.
  'dataset': prefix.sdo('dataset'),
  // The range of temporal applicability of a dataset, e.g. for a 2011 census dataset, the year 2011 (in ISO 8601 time interval format).
  'datasetTimeInterval': prefix.sdo('datasetTimeInterval'),
  // The date on which the CreativeWork was created or the item was added to a DataFeed.
  'dateCreated': prefix.sdo('dateCreated'),
  // The datetime the item was removed from the DataFeed.
  'dateDeleted': prefix.sdo('dateDeleted'),
  // The date the ticket was issued.
  'dateIssued': prefix.sdo('dateIssued'),
  // The date on which the CreativeWork was most recently modified or when the item's entry was modified within a DataFeed.
  'dateModified': prefix.sdo('dateModified'),
  // Publication date of an online listing.
  'datePosted': prefix.sdo('datePosted'),
  // Date of first broadcast/publication.
  'datePublished': prefix.sdo('datePublished'),
  // The date/time at which the message has been read by the recipient if a single recipient exists.
  'dateRead': prefix.sdo('dateRead'),
  // The date/time the message was received if a single recipient exists.
  'dateReceived': prefix.sdo('dateReceived'),
  // The date/time at which the message was sent.
  'dateSent': prefix.sdo('dateSent'),
  // The date of the first registration of the vehicle with the respective public authorities.
  'dateVehicleFirstRegistered': prefix.sdo('dateVehicleFirstRegistered'),
  // A [dateline](https://en.wikipedia.org/wiki/Dateline) is a brief piece of text included in news articles that describes where and when the story was written or filed though the date is often omitted. Sometimes only a placename is provided.Structured representations of dateline-related information can also be expressed more explicitly using [[locationCreated]] (which represents where a work was created e.g. where a news report was written).  For location depicted or described in the content, use [[contentLocation]].Dateline summaries are oriented more towards human readers than towards automated processing, and can vary substantially. Some examples: \"BEIRUT, Lebanon, June 2.\", \"Paris, France\", \"December 19, 2017 11:43AM Reporting from Washington\", \"Beijing/Moscow\", \"QUEZON CITY, Philippines\".
  'dateline': prefix.sdo('dateline'),
  // The day of the week for which these opening hours are valid.
  'dayOfWeek': prefix.sdo('dayOfWeek'),
  // Date of death.
  'deathDate': prefix.sdo('deathDate'),
  // The place where the person died.
  'deathPlace': prefix.sdo('deathPlace'),
  // The default value of the input.  For properties that expect a literal, the default is a literal value, for properties that expect an object, it's an ID reference to one of the current values.
  'defaultValue': prefix.sdo('defaultValue'),
  // Destination address.
  'deliveryAddress': prefix.sdo('deliveryAddress'),
  // The typical delay between the receipt of the order and the goods either leaving the warehouse or being prepared for pickup, in case the delivery method is on site pickup.
  'deliveryLeadTime': prefix.sdo('deliveryLeadTime'),
  // A sub property of instrument. The method of delivery.
  'deliveryMethod': prefix.sdo('deliveryMethod'),
  // New entry added as the package passes through each leg of its journey (from shipment to final delivery).
  'deliveryStatus': prefix.sdo('deliveryStatus'),
  // The total delay between the receipt of the order and the goods reaching the final customer.
  'deliveryTime': prefix.sdo('deliveryTime'),
  // A relationship between an organization and a department of that organization, also described as an organization (allowing different urls, logos, opening hours). For example: a store with a pharmacy, or a bakery with a cafe.
  'department': prefix.sdo('department'),
  // The airport where the flight originates.
  'departureAirport': prefix.sdo('departureAirport'),
  // The terminal or port from which the boat departs.
  'departureBoatTerminal': prefix.sdo('departureBoatTerminal'),
  // The stop or station from which the bus departs.
  'departureBusStop': prefix.sdo('departureBusStop'),
  // Identifier of the flight's departure gate.
  'departureGate': prefix.sdo('departureGate'),
  // The platform from which the train departs.
  'departurePlatform': prefix.sdo('departurePlatform'),
  // The station from which the train departs.
  'departureStation': prefix.sdo('departureStation'),
  // Identifier of the flight's departure terminal.
  'departureTerminal': prefix.sdo('departureTerminal'),
  // The expected departure time.
  'departureTime': prefix.sdo('departureTime'),
  // Prerequisites needed to fulfill steps in article.
  'dependencies': prefix.sdo('dependencies'),
  // The depth of the item.
  'depth': prefix.sdo('depth'),
  // A description of the item.
  'description': prefix.sdo('description'),
  // Device required to run the application. Used in cases where a specific make/model is required to run the application.
  'device': prefix.sdo('device'),
  // One or more alternative conditions considered in the differential diagnosis process as output of a diagnosis process.
  'diagnosis': prefix.sdo('diagnosis'),
  // An image containing a diagram that illustrates the structure and/or its component substructures and/or connections with other structures.
  'diagram': prefix.sdo('diagram'),
  // A sub property of instrument. The diet used in this action.
  'diet': prefix.sdo('diet'),
  // Nutritional information specific to the dietary plan. May include dietary recommendations on what foods to avoid, what foods to consume, and specific alterations/deviations from the USDA or other regulatory body's approved dietary guidelines.
  'dietFeatures': prefix.sdo('dietFeatures'),
  // One of a set of differential diagnoses for the condition. Specifically, a closely-related or competing diagnosis typically considered later in the cognitive process whereby this medical condition is distinguished from others most likely responsible for a similar collection of signs and symptoms to reach the most parsimonious diagnosis or diagnoses in a patient.
  'differentialDiagnosis': prefix.sdo('differentialDiagnosis'),
  // Indicates whether an [[url]] that is associated with a [[JobPosting]] enables direct application for the job, via the posting website. A job posting is considered to have directApply of [[True]] if an application process for the specified job can be directly initiated via the url(s) given (noting that e.g. multiple internet domains might nevertheless be involved at an implementation level). A value of [[False]] is appropriate if there is no clear path to applying directly online for the specified job, navigating directly from the JobPosting url(s) supplied.
  'directApply': prefix.sdo('directApply'),
  // A director of e.g. tv, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip.
  'director': prefix.sdo('director'),
  // A director of e.g. tv, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
  'directors': prefix.sdo('directors'),
  // A sub property of description. A short description of the item used to disambiguate from other, similar items. Information from other properties (in particular, name) may be necessary for the description to be useful for disambiguation.
  'disambiguatingDescription': prefix.sdo('disambiguatingDescription'),
  // Any discount applied (to an Order).
  'discount': prefix.sdo('discount'),
  // Code used to redeem a discount.
  'discountCode': prefix.sdo('discountCode'),
  // The currency of the discount.Use standard formats: [ISO 4217 currency format](http://en.wikipedia.org/wiki/ISO_4217) e.g. \"USD\"; [Ticker symbol](https://en.wikipedia.org/wiki/List_of_cryptocurrencies) for cryptocurrencies e.g. \"BTC\"; well known names for [Local Exchange Tradings Systems](https://en.wikipedia.org/wiki/Local_exchange_trading_system) (LETS) and other currency types e.g. \"Ithaca HOUR\".
  'discountCurrency': prefix.sdo('discountCurrency'),
  // Specifies the CreativeWork associated with the UserComment.
  'discusses': prefix.sdo('discusses'),
  // A link to the page containing the comments of the CreativeWork.
  'discussionUrl': prefix.sdo('discussionUrl'),
  // Information about disease prevention.
  'diseasePreventionInfo': prefix.sdo('diseasePreventionInfo'),
  // Statistical information about the spread of a disease, either as [[WebContent]], or  described directly as a [[Dataset]], or the specific [[Observation]]s in the dataset. When a [[WebContent]] URL is  provided, the page indicated might also contain more such markup.
  'diseaseSpreadStatistics': prefix.sdo('diseaseSpreadStatistics'),
  // The date that this organization was dissolved.
  'dissolutionDate': prefix.sdo('dissolutionDate'),
  // The distance travelled, e.g. exercising or travelling.
  'distance': prefix.sdo('distance'),
  // One of a set of signs and symptoms that can be used to distinguish this diagnosis from others in the differential diagnosis.
  'distinguishingSign': prefix.sdo('distinguishingSign'),
  // A downloadable form of this dataset, at a specific location, in a specific format.
  'distribution': prefix.sdo('distribution'),
  // Statement on diversity policy by an [[Organization]] e.g. a [[NewsMediaOrganization]]. For a [[NewsMediaOrganization]], a statement describing the newsroom’s diversity policy on both staffing and sources, typically providing staffing data.
  'diversityPolicy': prefix.sdo('diversityPolicy'),
  // For an [[Organization]] (often but not necessarily a [[NewsMediaOrganization]]), a report on staffing diversity issues. In a news context this might be for example ASNE or RTDNA (US) reports, or self-reported.
  'diversityStaffingReport': prefix.sdo('diversityStaffingReport'),
  // Further documentation describing the Web API in more detail.
  'documentation': prefix.sdo('documentation'),
  // Indicates when shipping to a particular [[shippingDestination]] is not available.
  'doesNotShip': prefix.sdo('doesNotShip'),
  // Relates a property to a class that is (one of) the type(s) the property is expected to be used on.
  'domainIncludes': prefix.sdo('domainIncludes'),
  // Whether borrower is a resident of the jurisdiction where the property is located.
  'domiciledMortgage': prefix.sdo('domiciledMortgage'),
  // The time admission will commence.
  'doorTime': prefix.sdo('doorTime'),
  // A dosage form in which this drug/supplement is available, e.g. 'tablet', 'suspension', 'injection'.
  'dosageForm': prefix.sdo('dosageForm'),
  // A dosing schedule for the drug for a given population, either observed, recommended, or maximum dose based on the type used.
  'doseSchedule': prefix.sdo('doseSchedule'),
  // The unit of the dose, e.g. 'mg'.
  'doseUnit': prefix.sdo('doseUnit'),
  // The value of the dose, e.g. 500.
  'doseValue': prefix.sdo('doseValue'),
  // a type of payment made in cash during the onset of the purchase of an expensive good/service. The payment typically represents only a percentage of the full purchase price.
  'downPayment': prefix.sdo('downPayment'),
  // If the file can be downloaded, URL to download the binary.
  'downloadUrl': prefix.sdo('downloadUrl'),
  // The number of downvotes this question, answer or comment has received from the community.
  'downvoteCount': prefix.sdo('downvoteCount'),
  // The vasculature that the vein drains into.
  'drainsTo': prefix.sdo('drainsTo'),
  // The drive wheel configuration, i.e. which roadwheels will receive torque from the vehicle's engine via the drivetrain.
  'driveWheelConfiguration': prefix.sdo('driveWheelConfiguration'),
  // Where a rental car can be dropped off.
  'dropoffLocation': prefix.sdo('dropoffLocation'),
  // When a rental car can be dropped off.
  'dropoffTime': prefix.sdo('dropoffTime'),
  // Specifying a drug or medicine used in a medication procedure.
  'drug': prefix.sdo('drug'),
  // The class of drug this belongs to (e.g., statins).
  'drugClass': prefix.sdo('drugClass'),
  // The unit in which the drug is measured, e.g. '5 mg tablet'.
  'drugUnit': prefix.sdo('drugUnit'),
  // The Dun & Bradstreet DUNS number for identifying an organization or business person.
  'duns': prefix.sdo('duns'),
  // A therapy that duplicates or overlaps this one.
  'duplicateTherapy': prefix.sdo('duplicateTherapy'),
  // The duration of the item (movie, audio recording, event, etc.) in [ISO 8601 date format](http://en.wikipedia.org/wiki/ISO_8601).
  'duration': prefix.sdo('duration'),
  // The duration of the warranty promise. Common unitCode values are ANN for year, MON for months, or DAY for days.
  'durationOfWarranty': prefix.sdo('durationOfWarranty'),
  // A media object representing the circumstances while performing this direction.
  'duringMedia': prefix.sdo('duringMedia'),
  // The amount to be paid as a penalty in the event of early payment of the loan.
  'earlyPrepaymentPenalty': prefix.sdo('earlyPrepaymentPenalty'),
  // An [EIDR](https://eidr.org/) (Entertainment Identifier Registry) [[identifier]] representing a specific edit / edition for a work of film or television.For example, the motion picture known as \"Ghostbusters\" whose [[titleEIDR]] is \"10.5240/7EC7-228A-510A-053E-CBB8-J\", has several edits e.g. \"10.5240/1F2A-E1C5-680A-14C6-E76B-I\" and \"10.5240/8A35-3BEE-6497-5D12-9E4F-3\".Since schema.org types like [[Movie]] and [[TVEpisode]] can be used for both works and their multiple expressions, it is possible to use [[titleEIDR]] alone (for a general description), or alongside [[editEIDR]] for a more edit-specific description.
  'editEIDR': prefix.sdo('editEIDR'),
  // Specifies the Person who edited the CreativeWork.
  'editor': prefix.sdo('editor'),
  // For questions that are part of learning resources (e.g. Quiz), eduQuestionType indicates the format of question being given. Example: \"Multiple choice\", \"Open ended\", \"Flashcard\".
  'eduQuestionType': prefix.sdo('eduQuestionType'),
  // Educational background needed for the position or Occupation.
  'educationRequirements': prefix.sdo('educationRequirements'),
  // An alignment to an established educational framework.This property should not be used where the nature of the alignment can be described using a simple property, for example to express that a resource [[teaches]] or [[assesses]] a competency.
  'educationalAlignment': prefix.sdo('educationalAlignment'),
  // A description of the qualification, award, certificate, diploma or other educational credential awarded as a consequence of successful completion of this course or program.
  'educationalCredentialAwarded': prefix.sdo('educationalCredentialAwarded'),
  // The framework to which the resource being described is aligned.
  'educationalFramework': prefix.sdo('educationalFramework'),
  // The level in terms of progression through an educational or training context. Examples of educational levels include 'beginner', 'intermediate' or 'advanced', and formal sets of level indicators.
  'educationalLevel': prefix.sdo('educationalLevel'),
  // Similar to courseMode, The medium or means of delivery of the program as a whole. The value may either be a text label (e.g. \"online\", \"onsite\" or \"blended\"; \"synchronous\" or \"asynchronous\"; \"full-time\" or \"part-time\") or a URL reference to a term from a controlled vocabulary (e.g. https://ceds.ed.gov/element/001311#Asynchronous ).
  'educationalProgramMode': prefix.sdo('educationalProgramMode'),
  // An educationalRole of an EducationalAudience.
  'educationalRole': prefix.sdo('educationalRole'),
  // The purpose of a work in the context of education; for example, 'assignment', 'group work'.
  'educationalUse': prefix.sdo('educationalUse'),
  // The elevation of a location ([WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)). Values may be of the form 'NUMBER UNIT_OF_MEASUREMENT' (e.g., '1,000 m', '3,200 ft') while numbers alone should be assumed to be a value in meters.
  'elevation': prefix.sdo('elevation'),
  // The legal requirements such as citizenship, visa and other documentation required for an applicant to this job.
  'eligibilityToWorkRequirement': prefix.sdo('eligibilityToWorkRequirement'),
  // The type(s) of customers for which the given offer is valid.
  'eligibleCustomerType': prefix.sdo('eligibleCustomerType'),
  // The duration for which the given offer is valid.
  'eligibleDuration': prefix.sdo('eligibleDuration'),
  // The interval and unit of measurement of ordering quantities for which the offer or price specification is valid. This allows e.g. specifying that a certain freight charge is valid only for a certain quantity.
  'eligibleQuantity': prefix.sdo('eligibleQuantity'),
  // The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is valid.See also [[ineligibleRegion]].
  'eligibleRegion': prefix.sdo('eligibleRegion'),
  // The transaction volume, in a monetary unit, for which the offer or price specification is valid, e.g. for indicating a minimal purchasing volume, to express free shipping above a certain order volume, or to limit the acceptance of credit cards to purchases to a certain minimal amount.
  'eligibleTransactionVolume': prefix.sdo('eligibleTransactionVolume'),
  // Email address.
  'email': prefix.sdo('email'),
  // A URL pointing to a player for a specific video. In general, this is the information in the ```src``` element of an ```embed``` tag and should not be the same as the content of the ```loc``` tag.
  'embedUrl': prefix.sdo('embedUrl'),
  // Represents textual captioning from a [[MediaObject]], e.g. text of a 'meme'.
  'embeddedTextCaption': prefix.sdo('embeddedTextCaption'),
  // The CO2 emissions in g/km. When used in combination with a QuantitativeValue, put \"g/km\" into the unitText property of that value, since there is no UN/CEFACT Common Code for \"g/km\".
  'emissionsCO2': prefix.sdo('emissionsCO2'),
  // Someone working for this organization.
  'employee': prefix.sdo('employee'),
  // People working for this organization.
  'employees': prefix.sdo('employees'),
  // A description of the employer, career opportunities and work environment for this position.
  'employerOverview': prefix.sdo('employerOverview'),
  // Type of employment (e.g. full-time, part-time, contract, temporary, seasonal, internship).
  'employmentType': prefix.sdo('employmentType'),
  // Indicates the department, unit and/or facility where the employee reports and/or in which the job is to be performed.
  'employmentUnit': prefix.sdo('employmentUnit'),
  // Another BioChemEntity encoded by this one.
  'encodesBioChemEntity': prefix.sdo('encodesBioChemEntity'),
  // The CreativeWork encoded by this media object.
  'encodesCreativeWork': prefix.sdo('encodesCreativeWork'),
  // A media object that encodes this CreativeWork. This property is a synonym for associatedMedia.
  'encoding': prefix.sdo('encoding'),
  // Media type typically expressed using a MIME format (see [IANA site](http://www.iana.org/assignments/media-types/media-types.xhtml) and [MDN reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)) e.g. application/zip for a SoftwareApplication binary, audio/mpeg for .mp3 etc.).In cases where a [[CreativeWork]] has several media type representations, [[encoding]] can be used to indicate each [[MediaObject]] alongside particular [[encodingFormat]] information.Unregistered or niche encoding and file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia/Wikidata entry.
  'encodingFormat': prefix.sdo('encodingFormat'),
  // The supported encoding type(s) for an EntryPoint request.
  'encodingType': prefix.sdo('encodingType'),
  // A media object that encodes this CreativeWork.
  'encodings': prefix.sdo('encodings'),
  // The end date and time of the item (in [ISO 8601 date format](http://en.wikipedia.org/wiki/ISO_8601)).
  'endDate': prefix.sdo('endDate'),
  // The end time of the clip expressed as the number of seconds from the beginning of the work.
  'endOffset': prefix.sdo('endOffset'),
  // The endTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to end. For actions that span a period of time, when the action was performed. e.g. John wrote a book from January to *December*. For media, including audio and video, it's the time offset of the end of a clip within a larger file.Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
  'endTime': prefix.sdo('endTime'),
  // A sub property of participant. The person/organization being supported.
  'endorsee': prefix.sdo('endorsee'),
  // People or organizations that endorse the plan.
  'endorsers': prefix.sdo('endorsers'),
  // Specifies the most energy efficient class on the regulated EU energy consumption scale for the product category a product belongs to. For example, energy consumption for televisions placed on the market after January 1, 2020 is scaled from D to A+++.
  'energyEfficiencyScaleMax': prefix.sdo('energyEfficiencyScaleMax'),
  // Specifies the least energy efficient class on the regulated EU energy consumption scale for the product category a product belongs to. For example, energy consumption for televisions placed on the market after January 1, 2020 is scaled from D to A+++.
  'energyEfficiencyScaleMin': prefix.sdo('energyEfficiencyScaleMin'),
  // The volume swept by all of the pistons inside the cylinders of an internal combustion engine in a single movement. Typical unit code(s): CMQ for cubic centimeter, LTR for liters, INQ for cubic inches* Note 1: You can link to information about how the given value has been determined using the [[valueReference]] property.* Note 2: You can use [[minValue]] and [[maxValue]] to indicate ranges.
  'engineDisplacement': prefix.sdo('engineDisplacement'),
  // The power of the vehicle's engine.    Typical unit code(s): KWT for kilowatt, BHP for brake horsepower, N12 for metric horsepower (PS, with 1 PS = 735,49875 W)* Note 1: There are many different ways of measuring an engine's power. For an overview, see  [http://en.wikipedia.org/wiki/Horsepower#Engine_power_test_codes](http://en.wikipedia.org/wiki/Horsepower#Engine_power_test_codes).* Note 2: You can link to information about how the given value has been determined using the [[valueReference]] property.* Note 3: You can use [[minValue]] and [[maxValue]] to indicate ranges.
  'enginePower': prefix.sdo('enginePower'),
  // The type of engine or engines powering the vehicle.
  'engineType': prefix.sdo('engineType'),
  // A sub property of location. The entertainment business where the action occurred.
  'entertainmentBusiness': prefix.sdo('entertainmentBusiness'),
  // The characteristics of associated patients, such as age, gender, race etc.
  'epidemiology': prefix.sdo('epidemiology'),
  // An episode of a tv, radio or game media within a series or season.
  'episode': prefix.sdo('episode'),
  // Position of the episode within an ordered group of episodes.
  'episodeNumber': prefix.sdo('episodeNumber'),
  // An episode of a TV/radio series or season.
  'episodes': prefix.sdo('episodes'),
  // This ordering relation for qualitative values indicates that the subject is equal to the object.
  'equal': prefix.sdo('equal'),
  // For failed actions, more information on the cause of the failure.
  'error': prefix.sdo('error'),
  // The estimated cost of the supply or supplies consumed when performing instructions.
  'estimatedCost': prefix.sdo('estimatedCost'),
  // The estimated time the flight will take.
  'estimatedFlightDuration': prefix.sdo('estimatedFlightDuration'),
  // An estimated salary for a job posting or occupation, based on a variety of variables including, but not limited to industry, job title, and location. Estimated salaries  are often computed by outside organizations rather than the hiring organization, who may not have committed to the estimated value.
  'estimatedSalary': prefix.sdo('estimatedSalary'),
  // The condition, complication, or symptom whose risk is being estimated.
  'estimatesRiskOf': prefix.sdo('estimatesRiskOf'),
  // Statement about ethics policy, e.g. of a [[NewsMediaOrganization]] regarding journalistic and publishing practices, or of a [[Restaurant]], a page describing food source policies. In the case of a [[NewsMediaOrganization]], an ethicsPolicy is typically a statement describing the personal, organizational, and corporate standards of behavior expected by the organization.
  'ethicsPolicy': prefix.sdo('ethicsPolicy'),
  // Upcoming or past event associated with this place, organization, or action.
  'event': prefix.sdo('event'),
  // The eventAttendanceMode of an event indicates whether it occurs online, offline, or a mix.
  'eventAttendanceMode': prefix.sdo('eventAttendanceMode'),
  // Associates an [[Event]] with a [[Schedule]]. There are circumstances where it is preferable to share a schedule for a series of      repeating events rather than data on the individual events themselves. For example, a website or application might prefer to publish a schedule for a weekly      gym class rather than provide data on every event. A schedule could be processed by applications to add Fourthcoming events to a calendar. An [[Event]] that      is associated with a [[Schedule]] using this property should not have [[startDate]] or [[endDate]] properties. These are instead defined within the associated      [[Schedule]], this avoids any ambiguity for clients using the data. The property might have repeated values to specify different schedules, e.g. for different months      or seasons.
  'eventSchedule': prefix.sdo('eventSchedule'),
  // An eventStatus of an event represents its status; particularly useful when an event is cancelled or rescheduled.
  'eventStatus': prefix.sdo('eventStatus'),
  // Upcoming or past events associated with this place or organization.
  'events': prefix.sdo('events'),
  // Strength of evidence of the data used to formulate the guideline (enumerated).
  'evidenceLevel': prefix.sdo('evidenceLevel'),
  // Source of the data used to formulate the guidance, e.g. RCT, consensus opinion, etc.
  'evidenceOrigin': prefix.sdo('evidenceOrigin'),
  // A creative work that this work is an example/instance/realization/derivation of.
  'exampleOfWork': prefix.sdo('exampleOfWork'),
  // Defines a [[Date]] or [[DateTime]] during which a scheduled [[Event]] will not take place. The property allows exceptions to      a [[Schedule]] to be specified. If an exception is specified as a [[DateTime]] then only the event that would have started at that specific date and time      should be excluded from the schedule. If an exception is specified as a [[Date]] then any event that is scheduled for that 24 hour period should be      excluded from the schedule. This allows a whole day to be excluded from the schedule without having to itemise every scheduled event.
  'exceptDate': prefix.sdo('exceptDate'),
  // The difference between the price at which a broker or other intermediary buys and sells foreign currency.
  'exchangeRateSpread': prefix.sdo('exchangeRateSpread'),
  // Library file name e.g., mscorlib.dll, system.web.dll.
  'executableLibraryName': prefix.sdo('executableLibraryName'),
  // A sub property of location. The course where this action was taken.
  'exerciseCourse': prefix.sdo('exerciseCourse'),
  // A sub property of instrument. The exercise plan used on this action.
  'exercisePlan': prefix.sdo('exercisePlan'),
  // A sub property of instrument. The diet used in this action.
  'exerciseRelatedDiet': prefix.sdo('exerciseRelatedDiet'),
  // Type(s) of exercise or activity, such as strength training, flexibility training, aerobics, cardiac rehabilitation, etc.
  'exerciseType': prefix.sdo('exerciseType'),
  // exif data for this object.
  'exifData': prefix.sdo('exifData'),
  // The earliest date the package may arrive.
  'expectedArrivalFrom': prefix.sdo('expectedArrivalFrom'),
  // The latest date the package may arrive.
  'expectedArrivalUntil': prefix.sdo('expectedArrivalUntil'),
  // The likely outcome in either the short term or long term of the medical condition.
  'expectedPrognosis': prefix.sdo('expectedPrognosis'),
  // An Offer which must be accepted before the user can perform the Action. For example, the user may need to buy a movie before being able to watch it.
  'expectsAcceptanceOf': prefix.sdo('expectsAcceptanceOf'),
  // Indicates whether a [[JobPosting]] will accept experience (as indicated by [[OccupationalExperienceRequirements]]) in place of its formal educational qualifications (as indicated by [[educationRequirements]]). If true, indicates that satisfying one of these requirements is sufficient.
  'experienceInPlaceOfEducation': prefix.sdo('experienceInPlaceOfEducation'),
  // Description of skills and experience needed for the position or Occupation.
  'experienceRequirements': prefix.sdo('experienceRequirements'),
  // Medical expert advice related to the plan.
  'expertConsiderations': prefix.sdo('expertConsiderations'),
  // Date the content expires and is no longer useful or available. For example a [[VideoObject]] or [[NewsArticle]] whose availability or relevance is time-limited, or a [[ClaimReview]] fact check whose publisher wants to indicate that it may no longer be relevant (or helpful to highlight) after some date.
  'expires': prefix.sdo('expires'),
  // Tissue, organ, biological sample, etc in which activity of this gene has been observed experimentally. For example brain, digestive system.
  'expressedIn': prefix.sdo('expressedIn'),
  // Family name. In the U.S., the last name of a Person.
  'familyName': prefix.sdo('familyName'),
  // The number of grams of fat.
  'fatContent': prefix.sdo('fatContent'),
  // The fax number.
  'faxNumber': prefix.sdo('faxNumber'),
  // Features or modules provided by this application (and possibly required by other applications).
  'featureList': prefix.sdo('featureList'),
  // Description of fees, commissions, and other terms applied either to a class of financial product, or by a financial service organization.
  'feesAndCommissionsSpecification': prefix.sdo('feesAndCommissionsSpecification'),
  // The number of grams of fiber.
  'fiberContent': prefix.sdo('fiberContent'),
  // Media type, typically MIME format (see [IANA site](http://www.iana.org/assignments/media-types/media-types.xhtml)) of the content e.g. application/zip of a SoftwareApplication binary. In cases where a CreativeWork has several media type representations, 'encoding' can be used to indicate each MediaObject alongside particular fileFormat information. Unregistered or niche file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia entry.
  'fileFormat': prefix.sdo('fileFormat'),
  // Size of the application / package (e.g. 18MB). In the absence of a unit (MB, KB etc.), KB will be assumed.
  'fileSize': prefix.sdo('fileSize'),
  // A financial aid type or program which students may use to pay for tuition or fees associated with the program.
  'financialAidEligible': prefix.sdo('financialAidEligible'),
  // Indicates the first known occurence of a [[Claim]] in some [[CreativeWork]].
  'firstAppearance': prefix.sdo('firstAppearance'),
  // The date and place the work was first performed.
  'firstPerformance': prefix.sdo('firstPerformance'),
  // The distance of the flight.
  'flightDistance': prefix.sdo('flightDistance'),
  // The unique identifier for a flight including the airline IATA code. For example, if describing United flight 110, where the IATA code for United is 'UA', the flightNumber is 'UA110'.
  'flightNumber': prefix.sdo('flightNumber'),
  // The floor level for an [[Accommodation]] in a multi-storey building. Since counting  systems [vary internationally](https://en.wikipedia.org/wiki/Storey#Consecutive_number_floor_designations), the local system should be used where possible.
  'floorLevel': prefix.sdo('floorLevel'),
  // A floor limit is the amount of money above which credit card transactions must be authorized.
  'floorLimit': prefix.sdo('floorLimit'),
  // The size of the accommodation, e.g. in square meter or squarefoot.Typical unit code(s): MTK for square meter, FTK for square foot, or YDK for square yard
  'floorSize': prefix.sdo('floorSize'),
  // A sub property of object. The person or organization being followed.
  'followee': prefix.sdo('followee'),
  // The most generic uni-directional social relation.
  'follows': prefix.sdo('follows'),
  // Typical or recommended followup care after the procedure is performed.
  'followup': prefix.sdo('followup'),
  // A sub property of location. The specific food establishment where the action occurred.
  'foodEstablishment': prefix.sdo('foodEstablishment'),
  // A sub property of location. The specific food event where the action occurred.
  'foodEvent': prefix.sdo('foodEvent'),
  // Any precaution, guidance, contraindication, etc. related to consumption of specific foods while taking this drug.
  'foodWarning': prefix.sdo('foodWarning'),
  // A person who founded this organization.
  'founder': prefix.sdo('founder'),
  // A person who founded this organization.
  'founders': prefix.sdo('founders'),
  // The date that this organization was founded.
  'foundingDate': prefix.sdo('foundingDate'),
  // The place where the Organization was founded.
  'foundingLocation': prefix.sdo('foundingLocation'),
  // A flag to signal that the item, event, or place is accessible for free.
  'free': prefix.sdo('free'),
  // A monetary value above which (or equal to) the shipping rate becomes free. Intended to be used via an [[OfferShippingDetails]] with [[shippingSettingsLink]] matching this [[ShippingRateSettings]].
  'freeShippingThreshold': prefix.sdo('freeShippingThreshold'),
  // How often the dose is taken, e.g. 'daily'.
  'frequency': prefix.sdo('frequency'),
  // A sub property of location. The original location of the object or the agent before the action.
  'fromLocation': prefix.sdo('fromLocation'),
  // The capacity of the fuel tank or in the case of electric cars, the battery. If there are multiple components for storage, this should indicate the total of all storage of the same type.Typical unit code(s): LTR for liters, GLL of US gallons, GLI for UK / imperial gallons, AMH for ampere-hours (for electrical vehicles).
  'fuelCapacity': prefix.sdo('fuelCapacity'),
  // The amount of fuel consumed for traveling a particular distance or temporal duration with the given vehicle (e.g. liters per 100 km).* Note 1: There are unfortunately no standard unit codes for liters per 100 km.  Use [[unitText]] to indicate the unit of measurement, e.g. L/100 km.* Note 2: There are two ways of indicating the fuel consumption, [[fuelConsumption]] (e.g. 8 liters per 100 km) and [[fuelEfficiency]] (e.g. 30 miles per gallon). They are reciprocal.* Note 3: Often, the absolute value is useful only when related to driving speed (\"at 80 km/h\") or usage pattern (\"city traffic\"). You can use [[valueReference]] to link the value for the fuel consumption to another value.
  'fuelConsumption': prefix.sdo('fuelConsumption'),
  // The distance traveled per unit of fuel used; most commonly miles per gallon (mpg) or kilometers per liter (km/L).* Note 1: There are unfortunately no standard unit codes for miles per gallon or kilometers per liter. Use [[unitText]] to indicate the unit of measurement, e.g. mpg or km/L.* Note 2: There are two ways of indicating the fuel consumption, [[fuelConsumption]] (e.g. 8 liters per 100 km) and [[fuelEfficiency]] (e.g. 30 miles per gallon). They are reciprocal.* Note 3: Often, the absolute value is useful only when related to driving speed (\"at 80 km/h\") or usage pattern (\"city traffic\"). You can use [[valueReference]] to link the value for the fuel economy to another value.
  'fuelEfficiency': prefix.sdo('fuelEfficiency'),
  // The type of fuel suitable for the engine or engines of the vehicle. If the vehicle has only one engine, this property can be attached directly to the vehicle.
  'fuelType': prefix.sdo('fuelType'),
  // The degree of mobility the joint allows.
  'functionalClass': prefix.sdo('functionalClass'),
  // Indicates an item funded or sponsored through a [[Grant]].
  'fundedItem': prefix.sdo('fundedItem'),
  // A person or organization that supports (sponsors) something through some kind of financial contribution.
  'funder': prefix.sdo('funder'),
  // Video game which is played on this server.
  'game': prefix.sdo('game'),
  // An item is an object within the game world that can be collected by a player or, occasionally, a non-player character.
  'gameItem': prefix.sdo('gameItem'),
  // Real or fictional location of the game (or part of game).
  'gameLocation': prefix.sdo('gameLocation'),
  // The electronic systems used to play <a href=\"http://en.wikipedia.org/wiki/Category:Video_game_platforms\">video games</a>.
  'gamePlatform': prefix.sdo('gamePlatform'),
  // The server on which  it is possible to play the game.
  'gameServer': prefix.sdo('gameServer'),
  // Links to tips, tactics, etc.
  'gameTip': prefix.sdo('gameTip'),
  // Gender of something, typically a [[Person]], but possibly also fictional characters, animals, etc. While https://schema.org/Male and https://schema.org/Female may be used, text strings are also acceptable for people who do not identify as a binary gender. The [[gender]] property can also be used in an extended sense to cover e.g. the gender of sports teams. As with the gender of individuals, we do not try to enumerate all possibilities. A mixed-gender [[SportsTeam]] can be indicated with a text value of \"Mixed\".
  'gender': prefix.sdo('gender'),
  // Genre of the creative work, broadcast channel or group.
  'genre': prefix.sdo('genre'),
  // The geo coordinates of the place.
  'geo': prefix.sdo('geo'),
  // Represents a relationship between two geometries (or the places they represent), relating a containing geometry to a contained geometry. \"a contains b iff no points of b lie in the exterior of a, and at least one point of the interior of b lies in the interior of a\". As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoContains': prefix.sdo('geoContains'),
  // Represents a relationship between two geometries (or the places they represent), relating a geometry to another that covers it. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoCoveredBy': prefix.sdo('geoCoveredBy'),
  // Represents a relationship between two geometries (or the places they represent), relating a covering geometry to a covered geometry. \"Every point of b is a point of (the interior or boundary of) a\". As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoCovers': prefix.sdo('geoCovers'),
  // Represents a relationship between two geometries (or the places they represent), relating a geometry to another that crosses it: \"a crosses b: they have some but not all interior points in common, and the dimension of the intersection is less than that of at least one of them\". As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoCrosses': prefix.sdo('geoCrosses'),
  // Represents spatial relations in which two geometries (or the places they represent) are topologically disjoint: they have no point in common. They form a set of disconnected geometries.\" (a symmetric relationship, as defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM))
  'geoDisjoint': prefix.sdo('geoDisjoint'),
  // Represents spatial relations in which two geometries (or the places they represent) are topologically equal, as defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM). \"Two geometries are topologically equal if their interiors intersect and no part of the interior or boundary of one geometry intersects the exterior of the other\" (a symmetric relationship)
  'geoEquals': prefix.sdo('geoEquals'),
  // Represents spatial relations in which two geometries (or the places they represent) have at least one point in common. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoIntersects': prefix.sdo('geoIntersects'),
  // Indicates the GeoCoordinates at the centre of a GeoShape e.g. GeoCircle.
  'geoMidpoint': prefix.sdo('geoMidpoint'),
  // Represents a relationship between two geometries (or the places they represent), relating a geometry to another that geospatially overlaps it, i.e. they have some but not all points in common. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoOverlaps': prefix.sdo('geoOverlaps'),
  // Indicates the approximate radius of a GeoCircle (metres unless indicated otherwise via Distance notation).
  'geoRadius': prefix.sdo('geoRadius'),
  // Represents spatial relations in which two geometries (or the places they represent) touch: they have at least one boundary point in common, but no interior points.\" (a symmetric relationship, as defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM) )
  'geoTouches': prefix.sdo('geoTouches'),
  // Represents a relationship between two geometries (or the places they represent), relating a geometry to one that contains it, i.e. it is inside (i.e. within) its interior. As defined in [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM).
  'geoWithin': prefix.sdo('geoWithin'),
  // The geographic area associated with the audience.
  'geographicArea': prefix.sdo('geographicArea'),
  // Information about getting tested (for a [[MedicalCondition]]), e.g. in the context of a pandemic.
  'gettingTestedInfo': prefix.sdo('gettingTestedInfo'),
  // Given name. In the U.S., the first name of a Person.
  'givenName': prefix.sdo('givenName'),
  // The [Global Location Number](http://www.gs1.org/gln) (GLN, sometimes also referred to as International Location Number or ILN) of the respective organization, person, or place. The GLN is a 13-digit number used to identify parties and physical locations.
  'globalLocationNumber': prefix.sdo('globalLocationNumber'),
  // governmentBenefitsInfo provides information about government benefits associated with a SpecialAnnouncement.
  'governmentBenefitsInfo': prefix.sdo('governmentBenefitsInfo'),
  // The period of time after any due date that the borrower has to fulfil its obligations before a default (failure to pay) is deemed to have occurred.
  'gracePeriod': prefix.sdo('gracePeriod'),
  // The person, organization, contact point, or audience that has been granted this permission.
  'grantee': prefix.sdo('grantee'),
  // This ordering relation for qualitative values indicates that the subject is greater than the object.
  'greater': prefix.sdo('greater'),
  // This ordering relation for qualitative values indicates that the subject is greater than or equal to the object.
  'greaterOrEqual': prefix.sdo('greaterOrEqual'),
  // A Global Trade Item Number ([GTIN](https://www.gs1.org/standards/id-keys/gtin)). GTINs identify trade items, including products and services, using numeric identification codes. The [[gtin]] property generalizes the earlier [[gtin8]], [[gtin12]], [[gtin13]], and [[gtin14]] properties. The GS1 [digital link specifications](https://www.gs1.org/standards/Digital-Link/) express GTINs as URLs. A correct [[gtin]] value should be a valid GTIN, which means that it should be an all-numeric string of either 8, 12, 13 or 14 digits, or a \"GS1 Digital Link\" URL based on such a string. The numeric component should also have a [valid GS1 check digit](https://www.gs1.org/services/check-digit-calculator) and meet the other rules for valid GTINs. See also [GS1's GTIN Summary](http://www.gs1.org/barcodes/technical/idkeys/gtin) and [Wikipedia](https://en.wikipedia.org/wiki/Global_Trade_Item_Number) for more details. Left-padding of the gtin values is not required or encouraged.
  'gtin': prefix.sdo('gtin'),
  // The GTIN-12 code of the product, or the product to which the offer refers. The GTIN-12 is the 12-digit GS1 Identification Key composed of a U.P.C. Company Prefix, Item Reference, and Check Digit used to identify trade items. See [GS1 GTIN Summary](http://www.gs1.org/barcodes/technical/idkeys/gtin) for more details.
  'gtin12': prefix.sdo('gtin12'),
  // The GTIN-13 code of the product, or the product to which the offer refers. This is equivalent to 13-digit ISBN codes and EAN UCC-13. Former 12-digit UPC codes can be converted into a GTIN-13 code by simply adding a preceding zero. See [GS1 GTIN Summary](http://www.gs1.org/barcodes/technical/idkeys/gtin) for more details.
  'gtin13': prefix.sdo('gtin13'),
  // The GTIN-14 code of the product, or the product to which the offer refers. See [GS1 GTIN Summary](http://www.gs1.org/barcodes/technical/idkeys/gtin) for more details.
  'gtin14': prefix.sdo('gtin14'),
  // The GTIN-8 code of the product, or the product to which the offer refers. This code is also known as EAN/UCC-8 or 8-digit EAN. See [GS1 GTIN Summary](http://www.gs1.org/barcodes/technical/idkeys/gtin) for more details.
  'gtin8': prefix.sdo('gtin8'),
  // A medical guideline related to this entity.
  'guideline': prefix.sdo('guideline'),
  // Date on which this guideline's recommendation was made.
  'guidelineDate': prefix.sdo('guidelineDate'),
  // The medical conditions, treatments, etc. that are the subject of the guideline.
  'guidelineSubject': prefix.sdo('guidelineSubject'),
  // The typical delay between the receipt of the order and the goods either leaving the warehouse or being prepared for pickup, in case the delivery method is on site pickup. Typical properties: minValue, maxValue, unitCode (d for DAY).  This is by common convention assumed to mean business days (if a unitCode is used, coded as \"d\"), i.e. only counting days when the business normally operates.
  'handlingTime': prefix.sdo('handlingTime'),
  // Indicates a BioChemEntity that (in some sense) has this BioChemEntity as a part.
  'hasBioChemEntityPart': prefix.sdo('hasBioChemEntityPart'),
  // A symbolic representation of a BioChemEnity. For example, a nucleotide sequence of a Gene or an amino acid sequence of a Protein.
  'hasBioPolymerSequence': prefix.sdo('hasBioPolymerSequence'),
  // A broadcast channel of a broadcast service.
  'hasBroadcastChannel': prefix.sdo('hasBroadcastChannel'),
  // A Category code contained in this code set.
  'hasCategoryCode': prefix.sdo('hasCategoryCode'),
  // A course or class that is one of the learning opportunities that constitute an educational / occupational program. No information is implied about whether the course is mandatory or optional; no guarantee is implied about whether the course will be available to everyone on the program.
  'hasCourse': prefix.sdo('hasCourse'),
  // An offering of the course at a specific time and place or through specific media or mode of study or to a specific section of students.
  'hasCourseInstance': prefix.sdo('hasCourseInstance'),
  // A credential awarded to the Person or Organization.
  'hasCredential': prefix.sdo('hasCredential'),
  // A Defined Term contained in this term set.
  'hasDefinedTerm': prefix.sdo('hasDefinedTerm'),
  // Method used for delivery or shipping.
  'hasDeliveryMethod': prefix.sdo('hasDeliveryMethod'),
  // A permission related to the access to this document (e.g. permission to read or write an electronic document). For a public document, specify a grantee with an Audience with audienceType equal to \"public\".
  'hasDigitalDocumentPermission': prefix.sdo('hasDigitalDocumentPermission'),
  // Indicates whether some facility (e.g. [[FoodEstablishment]], [[CovidTestingFacility]]) offers a service that can be used by driving through in a car. In the case of [[CovidTestingFacility]] such facilities could potentially help with social distancing from other potentially-infected users.
  'hasDriveThroughService': prefix.sdo('hasDriveThroughService'),
  // Defines the energy efficiency Category (also known as \"class\" or \"rating\") for a product according to an international energy efficiency standard.
  'hasEnergyConsumptionDetails': prefix.sdo('hasEnergyConsumptionDetails'),
  // Defines the energy efficiency Category (which could be either a rating out of range of values or a yes/no certification) for a product according to an international energy efficiency standard.
  'hasEnergyEfficiencyCategory': prefix.sdo('hasEnergyEfficiencyCategory'),
  // Indicates the aspect or aspects specifically addressed in some [[HealthTopicContent]]. For example, that the content is an overview, or that it talks about treatment, self-care, treatments or their side-effects.
  'hasHealthAspect': prefix.sdo('hasHealthAspect'),
  // A URL to a map of the place.
  'hasMap': prefix.sdo('hasMap'),
  // A product measurement, for example the inseam of pants, the wheel size of a bicycle, or the gauge of a screw. Usually an exact measurement, but can also be a range of measurements for adjustable products, for example belts and ski bindings.
  'hasMeasurement': prefix.sdo('hasMeasurement'),
  // Either the actual menu as a structured representation, as text, or a URL of the menu.
  'hasMenu': prefix.sdo('hasMenu'),
  // A food or drink item contained in a menu or menu section.
  'hasMenuItem': prefix.sdo('hasMenuItem'),
  // A subgrouping of the menu (by dishes, course, serving time period, etc.).
  'hasMenuSection': prefix.sdo('hasMenuSection'),
  // Specifies a MerchantReturnPolicy that may be applicable.
  'hasMerchantReturnPolicy': prefix.sdo('hasMerchantReturnPolicy'),
  // Molecular function performed by this BioChemEntity; please use PropertyValue if you want to include any evidence.
  'hasMolecularFunction': prefix.sdo('hasMolecularFunction'),
  // The Person's occupation. For past professions, use Role for expressing dates.
  'hasOccupation': prefix.sdo('hasOccupation'),
  // Indicates an OfferCatalog listing for this Organization, Person, or Service.
  'hasOfferCatalog': prefix.sdo('hasOfferCatalog'),
  // Points-of-Sales operated by the organization or person.
  'hasPOS': prefix.sdo('hasPOS'),
  // Indicates an item or CreativeWork that is part of this item, or CreativeWork (in some sense).
  'hasPart': prefix.sdo('hasPart'),
  // Indicates a ProductReturnPolicy that may be applicable.
  'hasProductReturnPolicy': prefix.sdo('hasProductReturnPolicy'),
  // A common representation such as a protein sequence or chemical structure for this entity. For images use schema.org/image.
  'hasRepresentation': prefix.sdo('hasRepresentation'),
  // Indicates a [[Product]] that is a member of this [[ProductGroup]] (or [[ProductModel]]).
  'hasVariant': prefix.sdo('hasVariant'),
  // Headline of the article.
  'headline': prefix.sdo('headline'),
  // Specifying the health condition(s) of a patient, medical study, or other target audience.
  'healthCondition': prefix.sdo('healthCondition'),
  // Whether the coinsurance applies before or after deductible, etc. TODO: Is this a closed set?
  'healthPlanCoinsuranceOption': prefix.sdo('healthPlanCoinsuranceOption'),
  // Whether The rate of coinsurance expressed as a number between 0.0 and 1.0.
  'healthPlanCoinsuranceRate': prefix.sdo('healthPlanCoinsuranceRate'),
  // Whether The copay amount.
  'healthPlanCopay': prefix.sdo('healthPlanCopay'),
  // Whether the copay is before or after deductible, etc. TODO: Is this a closed set?
  'healthPlanCopayOption': prefix.sdo('healthPlanCopayOption'),
  // Whether The costs to the patient for services under this network or formulary.
  'healthPlanCostSharing': prefix.sdo('healthPlanCostSharing'),
  // TODO.
  'healthPlanDrugOption': prefix.sdo('healthPlanDrugOption'),
  // The tier(s) of drugs offered by this formulary or insurance plan.
  'healthPlanDrugTier': prefix.sdo('healthPlanDrugTier'),
  // The 14-character, HIOS-generated Plan ID number. (Plan IDs must be unique, even across different markets.)
  'healthPlanId': prefix.sdo('healthPlanId'),
  // The URL that goes directly to the plan brochure for the specific standard plan or plan variation.
  'healthPlanMarketingUrl': prefix.sdo('healthPlanMarketingUrl'),
  // Name or unique ID of network. (Networks are often reused across different insurance plans).
  'healthPlanNetworkId': prefix.sdo('healthPlanNetworkId'),
  // The tier(s) for this network.
  'healthPlanNetworkTier': prefix.sdo('healthPlanNetworkTier'),
  // The category or type of pharmacy associated with this cost sharing.
  'healthPlanPharmacyCategory': prefix.sdo('healthPlanPharmacyCategory'),
  // Indicates data describing a hospital, e.g. a CDC [[CDCPMDRecord]] or as some kind of [[Dataset]].
  'healthcareReportingData': prefix.sdo('healthcareReportingData'),
  // The height of the item.
  'height': prefix.sdo('height'),
  // The highest price of all offers available.Usage guidelines:* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
  'highPrice': prefix.sdo('highPrice'),
  // Organization offering the job position.
  'hiringOrganization': prefix.sdo('hiringOrganization'),
  // [[ArchiveOrganization]] that holds, keeps or maintains the [[ArchiveComponent]].
  'holdingArchive': prefix.sdo('holdingArchive'),
  // A contact location for a person's residence.
  'homeLocation': prefix.sdo('homeLocation'),
  // The home team in a sports event.
  'homeTeam': prefix.sdo('homeTeam'),
  // An honorific prefix preceding a Person's name such as Dr/Mrs/Mr.
  'honorificPrefix': prefix.sdo('honorificPrefix'),
  // An honorific suffix following a Person's name such as M.D. /PhD/MSCSW.
  'honorificSuffix': prefix.sdo('honorificSuffix'),
  // A hospital with which the physician or office is affiliated.
  'hospitalAffiliation': prefix.sdo('hospitalAffiliation'),
  // The organization (airline, travelers' club, etc.) the membership is made with.
  'hostingOrganization': prefix.sdo('hostingOrganization'),
  // The hours during which this service or contact is available.
  'hoursAvailable': prefix.sdo('hoursAvailable'),
  // How the procedure is performed.
  'howPerformed': prefix.sdo('howPerformed'),
  // An HTTP method that specifies the appropriate HTTP method for a request to an HTTP EntryPoint. Values are capitalized strings as used in HTTP.
  'httpMethod': prefix.sdo('httpMethod'),
  // IATA identifier for an airline or airport.
  'iataCode': prefix.sdo('iataCode'),
  // ICAO identifier for an airport.
  'icaoCode': prefix.sdo('icaoCode'),
  // The identifier property represents any kind of identifier for any kind of [[Thing]], such as ISBNs, GTIN codes, UUIDs etc. Schema.org provides dedicated properties for representing many of these, either as textual strings or as URL (URI) links. See [background notes](/docs/datamodel.html#identifierBg) for more details.
  'identifier': prefix.sdo('identifier'),
  // A physical examination that can identify this sign.
  'identifyingExam': prefix.sdo('identifyingExam'),
  // A diagnostic test that can identify this sign.
  'identifyingTest': prefix.sdo('identifyingTest'),
  // The illustrator of the book.
  'illustrator': prefix.sdo('illustrator'),
  // An image of the item. This can be a [[URL]] or a fully described [[ImageObject]].
  'image': prefix.sdo('image'),
  // Imaging technique used.
  'imagingTechnique': prefix.sdo('imagingTechnique'),
  // The album to which this recording belongs.
  'inAlbum': prefix.sdo('inAlbum'),
  // The CableOrSatelliteService offering the channel.
  'inBroadcastLineup': prefix.sdo('inBroadcastLineup'),
  // Non-proprietary identifier for molecular entity that can be used in printed and electronic data sources thus enabling easier linking of diverse data compilations.
  'inChI': prefix.sdo('inChI'),
  // InChIKey is a hashed version of the full InChI (using the SHA-256 algorithm).
  'inChIKey': prefix.sdo('inChIKey'),
  // A [[CategoryCodeSet]] that contains this category code.
  'inCodeSet': prefix.sdo('inCodeSet'),
  // A [[DefinedTermSet]] that contains this term.
  'inDefinedTermSet': prefix.sdo('inDefinedTermSet'),
  // The language of the content or performance or used in an action. Please use one of the language codes from the [IETF BCP 47 standard](http://tools.ietf.org/html/bcp47). See also [[availableLanguage]].
  'inLanguage': prefix.sdo('inLanguage'),
  // The playlist to which this recording belongs.
  'inPlaylist': prefix.sdo('inPlaylist'),
  // Indicates the [[productGroupID]] for a [[ProductGroup]] that this product [[isVariantOf]].
  'inProductGroupWithID': prefix.sdo('inProductGroupWithID'),
  // Are in-store returns offered? (for more advanced return methods use the [[returnMethod]] property)
  'inStoreReturnsOffered': prefix.sdo('inStoreReturnsOffered'),
  // Qualification, candidature, degree, application that Thesis supports.
  'inSupportOf': prefix.sdo('inSupportOf'),
  // Description of bonus and commission compensation aspects of the job.
  'incentiveCompensation': prefix.sdo('incentiveCompensation'),
  // Description of bonus and commission compensation aspects of the job.
  'incentives': prefix.sdo('incentives'),
  // Smaller compositions included in this work (e.g. a movement in a symphony).
  'includedComposition': prefix.sdo('includedComposition'),
  // A data catalog which contains this dataset (this property was previously 'catalog', preferred name is now 'includedInDataCatalog').
  'includedDataCatalog': prefix.sdo('includedDataCatalog'),
  // A data catalog which contains this dataset.
  'includedInDataCatalog': prefix.sdo('includedInDataCatalog'),
  // The insurance plans that cover this drug.
  'includedInHealthInsurancePlan': prefix.sdo('includedInHealthInsurancePlan'),
  // A modifiable or non-modifiable risk factor included in the calculation, e.g. age, coexisting condition.
  'includedRiskFactor': prefix.sdo('includedRiskFactor'),
  // Attraction located at destination.
  'includesAttraction': prefix.sdo('includesAttraction'),
  // Formularies covered by this plan.
  'includesHealthPlanFormulary': prefix.sdo('includesHealthPlanFormulary'),
  // Networks covered by this plan.
  'includesHealthPlanNetwork': prefix.sdo('includesHealthPlanNetwork'),
  // This links to a node or nodes indicating the exact quantity of the products included in  an [[Offer]] or [[ProductCollection]].
  'includesObject': prefix.sdo('includesObject'),
  // The condition, complication, etc. influenced by this factor.
  'increasesRiskOf': prefix.sdo('increasesRiskOf'),
  // The industry associated with the job position.
  'industry': prefix.sdo('industry'),
  // The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is not valid, e.g. a region where the transaction is not allowed.See also [[eligibleRegion]].
  'ineligibleRegion': prefix.sdo('ineligibleRegion'),
  // The actual infectious agent, such as a specific bacterium.
  'infectiousAgent': prefix.sdo('infectiousAgent'),
  // The class of infectious agent (bacteria, prion, etc.) that causes the disease.
  'infectiousAgentClass': prefix.sdo('infectiousAgentClass'),
  // A single ingredient used in the recipe, e.g. sugar, flour or garlic.
  'ingredients': prefix.sdo('ingredients'),
  // The individual who traces over the pencil drawings in ink after pencils are complete.
  'inker': prefix.sdo('inker'),
  // The place of attachment of a muscle, or what the muscle moves.
  'insertion': prefix.sdo('insertion'),
  // URL at which the app may be installed, if different from the URL of the item.
  'installUrl': prefix.sdo('installUrl'),
  // A person assigned to instruct or provide instructional assistance for the [[CourseInstance]].
  'instructor': prefix.sdo('instructor'),
  // The object that helped the agent perform the action. e.g. John wrote a book with *a pen*.
  'instrument': prefix.sdo('instrument'),
  // Quantitative measure gauging the degree of force involved in the exercise, for example, heartbeats per minute. May include the velocity of the movement.
  'intensity': prefix.sdo('intensity'),
  // Another drug that is known to interact with this drug in a way that impacts the effect of this drug or causes a risk to the patient. Note: disease interactions are typically captured as contraindications.
  'interactingDrug': prefix.sdo('interactingDrug'),
  // This property is deprecated, alongside the UserInteraction types on which it depended.
  'interactionCount': prefix.sdo('interactionCount'),
  // The WebSite or SoftwareApplication where the interactions took place.
  'interactionService': prefix.sdo('interactionService'),
  // The number of interactions for the CreativeWork using the WebSite or SoftwareApplication. The most specific child type of InteractionCounter should be used.
  'interactionStatistic': prefix.sdo('interactionStatistic'),
  // The Action representing the type of interaction. For up votes, +1s, etc. use [[LikeAction]]. For down votes use [[DislikeAction]]. Otherwise, use the most specific Action.
  'interactionType': prefix.sdo('interactionType'),
  // The predominant mode of learning supported by the learning resource. Acceptable values are 'active', 'expositive', or 'mixed'.
  'interactivityType': prefix.sdo('interactivityType'),
  // The interest rate, charged or paid, applicable to the financial product. Note: This is different from the calculated annualPercentageRate.
  'interestRate': prefix.sdo('interestRate'),
  // Used to indicate a specific claim contained, implied, translated or refined from the content of a [[MediaObject]] or other [[CreativeWork]]. The interpreting party can be indicated using [[claimInterpreter]].
  'interpretedAsClaim': prefix.sdo('interpretedAsClaim'),
  // The current approximate inventory level for the item or items.
  'inventoryLevel': prefix.sdo('inventoryLevel'),
  // Relates a property to a property that is its inverse. Inverse properties relate the same pairs of items to each other, but in reversed direction. For example, the 'alumni' and 'alumniOf' properties are inverseOf each other. Some properties don't have explicit inverses; in these situations RDFa and JSON-LD syntax for reverse properties can be used.
  'inverseOf': prefix.sdo('inverseOf'),
  // Whether the provider is accepting new patients.
  'isAcceptingNewPatients': prefix.sdo('isAcceptingNewPatients'),
  // A flag to signal that the item, event, or place is accessible for free.
  'isAccessibleForFree': prefix.sdo('isAccessibleForFree'),
  // A pointer to another product (or multiple products) for which this product is an accessory or spare part.
  'isAccessoryOrSparePartFor': prefix.sdo('isAccessoryOrSparePartFor'),
  // True if the drug is available in a generic form (regardless of name).
  'isAvailableGenerically': prefix.sdo('isAvailableGenerically'),
  // A resource from which this work is derived or from which it is a modification or adaption.
  'isBasedOn': prefix.sdo('isBasedOn'),
  // A resource that was used in the creation of this resource. This term can be repeated for multiple sources. For example, http://example.com/great-multiplication-intro.html.
  'isBasedOnUrl': prefix.sdo('isBasedOnUrl'),
  // A pointer to another product (or multiple products) for which this product is a consumable.
  'isConsumableFor': prefix.sdo('isConsumableFor'),
  // Another BioChemEntity encoding by this one.
  'isEncodedByBioChemEntity': prefix.sdo('isEncodedByBioChemEntity'),
  // Indicates whether this content is family friendly.
  'isFamilyFriendly': prefix.sdo('isFamilyFriendly'),
  // Was the offer accepted as a gift for someone other than the buyer.
  'isGift': prefix.sdo('isGift'),
  // Biological process this BioChemEntity is involved in; please use PropertyValue if you want to include any evidence.
  'isInvolvedInBiologicalProcess': prefix.sdo('isInvolvedInBiologicalProcess'),
  // True if the broadcast is of a live event.
  'isLiveBroadcast': prefix.sdo('isLiveBroadcast'),
  // Subcellular location where this BioChemEntity is located; please use PropertyValue if you want to include any evidence.
  'isLocatedInSubcellularLocation': prefix.sdo('isLocatedInSubcellularLocation'),
  // Indicates an item or CreativeWork that this item, or CreativeWork (in some sense), is part of.
  'isPartOf': prefix.sdo('isPartOf'),
  // Indicates a BioChemEntity that is (in some sense) a part of this BioChemEntity.
  'isPartOfBioChemEntity': prefix.sdo('isPartOfBioChemEntity'),
  // Indicates some accommodation that this floor plan describes.
  'isPlanForApartment': prefix.sdo('isPlanForApartment'),
  // True if this item's name is a proprietary/brand name (vs. generic name).
  'isProprietary': prefix.sdo('isProprietary'),
  // A pointer to another, somehow related product (or multiple products).
  'isRelatedTo': prefix.sdo('isRelatedTo'),
  // Whether the 3DModel allows resizing. For example, room layout applications often do not allow 3DModel elements to be resized to reflect reality.
  'isResizable': prefix.sdo('isResizable'),
  // A pointer to another, functionally similar product (or multiple products).
  'isSimilarTo': prefix.sdo('isSimilarTo'),
  // This can be marked 'true' to indicate that some published [[DeliveryTimeSettings]] or [[ShippingRateSettings]] are intended to apply to all [[OfferShippingDetails]] published by the same merchant, when referenced by a [[shippingSettingsLink]] in those settings. It is not meaningful to use a 'true' value for this property alongside a transitTimeLabel (for [[DeliveryTimeSettings]]) or shippingLabel (for [[ShippingRateSettings]]), since this property is for use with unlabelled settings.
  'isUnlabelledFallback': prefix.sdo('isUnlabelledFallback'),
  // Indicates the kind of product that this is a variant of. In the case of [[ProductModel]], this is a pointer (from a ProductModel) to a base product from which this product is a variant. It is safe to infer that the variant inherits all product features from the base model, unless defined locally. This is not transitive. In the case of a [[ProductGroup]], the group description also serves as a template, representing a set of Products that vary on explicitly defined, specific dimensions only (so it defines both a set of variants, as well as which values distinguish amongst those variants). When used with [[ProductGroup]], this property can apply to any [[Product]] included in the group.
  'isVariantOf': prefix.sdo('isVariantOf'),
  // The ISBN of the book.
  'isbn': prefix.sdo('isbn'),
  // The International Standard of Industrial Classification of All Economic Activities (ISIC), Revision 4 code for a particular organization, business person, or place.
  'isicV4': prefix.sdo('isicV4'),
  // The International Standard Recording Code for the recording.
  'isrcCode': prefix.sdo('isrcCode'),
  // The International Standard Serial Number (ISSN) that identifies this serial publication. You can repeat this property to identify different formats of, or the linking ISSN (ISSN-L) for, this serial publication.
  'issn': prefix.sdo('issn'),
  // Identifies the issue of publication; for example, \"iii\" or \"2\".
  'issueNumber': prefix.sdo('issueNumber'),
  // The organization issuing the ticket or permit.
  'issuedBy': prefix.sdo('issuedBy'),
  // The service through with the permit was granted.
  'issuedThrough': prefix.sdo('issuedThrough'),
  // The International Standard Musical Work Code for the composition.
  'iswcCode': prefix.sdo('iswcCode'),
  // An entity represented by an entry in a list or data feed (e.g. an 'artist' in a list of 'artists')’.
  'item': prefix.sdo('item'),
  // A predefined value from OfferItemCondition specifying the condition of the product or service, or the products or services included in the offer. Also used for product return policies to specify the condition of products accepted for returns.
  'itemCondition': prefix.sdo('itemCondition'),
  // The type of return fees for returns of defect products.
  'itemDefectReturnFees': prefix.sdo('itemDefectReturnFees'),
  // The method (from an enumeration) by which the customer obtains a return shipping label for a defect product.
  'itemDefectReturnLabelSource': prefix.sdo('itemDefectReturnLabelSource'),
  // Amount of shipping costs for defect product returns. Applicable when property [[itemDefectReturnFees]] equals [[ReturnShippingFees]].
  'itemDefectReturnShippingFeesAmount': prefix.sdo('itemDefectReturnShippingFeesAmount'),
  // For itemListElement values, you can use simple strings (e.g. \"Peter\", \"Paul\", \"Mary\"), existing entities, or use ListItem.Text values are best if the elements in the list are plain strings. Existing entities are best for a simple, unordered list of existing things in your data. ListItem is used with ordered lists when you want to provide additional context about the element in that list or when the same item might be in different places in different lists.Note: The order of elements in your mark-up is not sufficient for indicating the order or elements.  Use ListItem with a 'position' property in such cases.
  'itemListElement': prefix.sdo('itemListElement'),
  // Type of ordering (e.g. Ascending, Descending, Unordered).
  'itemListOrder': prefix.sdo('itemListOrder'),
  // Current location of the item.
  'itemLocation': prefix.sdo('itemLocation'),
  // An item being offered (or demanded). The transactional nature of the offer or demand is documented using [[businessFunction]], e.g. sell, lease etc. While several common expected types are listed explicitly in this definition, others can be used. Using a second type, such as Product or a subtype of Product, can clarify the nature of the offer.
  'itemOffered': prefix.sdo('itemOffered'),
  // The item that is being reviewed/rated.
  'itemReviewed': prefix.sdo('itemReviewed'),
  // Item(s) being shipped.
  'itemShipped': prefix.sdo('itemShipped'),
  // Destination(s) ( [[Place]] ) that make up a trip. For a trip where destination order is important use [[ItemList]] to specify that order (see examples).
  'itinerary': prefix.sdo('itinerary'),
  // Systematic method of naming chemical compounds as recommended by the International Union of Pure and Applied Chemistry (IUPAC).
  'iupacName': prefix.sdo('iupacName'),
  // Description of benefits associated with the job.
  'jobBenefits': prefix.sdo('jobBenefits'),
  // An indicator as to whether a position is available for an immediate start.
  'jobImmediateStart': prefix.sdo('jobImmediateStart'),
  // A (typically single) geographic location associated with the job position.
  'jobLocation': prefix.sdo('jobLocation'),
  // A description of the job location (e.g TELECOMMUTE for telecommute jobs).
  'jobLocationType': prefix.sdo('jobLocationType'),
  // The date on which a successful applicant for this job would be expected to start work. Choose a specific date in the future or use the jobImmediateStart property to indicate the position is to be filled as soon as possible.
  'jobStartDate': prefix.sdo('jobStartDate'),
  // The job title of the person (for example, Financial Manager).
  'jobTitle': prefix.sdo('jobTitle'),
  // Indicates a legal jurisdiction, e.g. of some legislation, or where some government service is based.
  'jurisdiction': prefix.sdo('jurisdiction'),
  // Keywords or tags used to describe this content. Multiple entries in a keywords list are typically delimited by commas.
  'keywords': prefix.sdo('keywords'),
  // A textual description of known damages, both repaired and unrepaired.
  'knownVehicleDamages': prefix.sdo('knownVehicleDamages'),
  // The most generic bi-directional social/work relation.
  'knows': prefix.sdo('knows'),
  // Of a [[Person]], and less typically of an [[Organization]], to indicate a topic that is known about - suggesting possible expertise but not implying it. We do not distinguish skill levels here, or relate this to educational content, events, objectives or [[JobPosting]] descriptions.
  'knowsAbout': prefix.sdo('knowsAbout'),
  // Of a [[Person]], and less typically of an [[Organization]], to indicate a known language. We do not distinguish skill levels or reading/writing/speaking/signing here. Use language codes from the [IETF BCP 47 standard](http://tools.ietf.org/html/bcp47).
  'knowsLanguage': prefix.sdo('knowsLanguage'),
  // Link to the drug's label details.
  'labelDetails': prefix.sdo('labelDetails'),
  // A sub property of participant. The owner of the real estate property.
  'landlord': prefix.sdo('landlord'),
  // A sub property of instrument. The language used on this action.
  'language': prefix.sdo('language'),
  // Date on which the content on this web page was last reviewed for accuracy and/or completeness.
  'lastReviewed': prefix.sdo('lastReviewed'),
  // The latitude of a location. For example ```37.42242``` ([WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)).
  'latitude': prefix.sdo('latitude'),
  // A schematic image showing the floorplan layout.
  'layoutImage': prefix.sdo('layoutImage'),
  // The predominant type or kind characterizing the learning resource. For example, 'presentation', 'handout'.
  'learningResourceType': prefix.sdo('learningResourceType'),
  // Length of the lease for some [[Accommodation]], either particular to some [[Offer]] or in some cases intrinsic to the property.
  'leaseLength': prefix.sdo('leaseLength'),
  // The official name of the organization, e.g. the registered company name.
  'legalName': prefix.sdo('legalName'),
  // The drug or supplement's legal status, including any controlled substance schedules that apply.
  'legalStatus': prefix.sdo('legalStatus'),
  // Indicates that this legislation (or part of a legislation) somehow transfers another legislation in a different legislative context. This is an informative link, and it has no legal value. For legally-binding links of transposition, use the <a href=\"/legislationTransposes\">legislationTransposes</a> property. For example an informative consolidated law of a European Union's member state \"applies\" the consolidated version of the European Directive implemented in it.
  'legislationApplies': prefix.sdo('legislationApplies'),
  // Another legislation that this legislation changes. This encompasses the notions of amendment, replacement, correction, repeal, or other types of change. This may be a direct change (textual or non-textual amendment) or a consequential or indirect change. The property is to be used to express the existence of a change relationship between two acts rather than the existence of a consolidated version of the text that shows the result of the change. For consolidation relationships, use the <a href=\"/legislationConsolidates\">legislationConsolidates</a> property.
  'legislationChanges': prefix.sdo('legislationChanges'),
  // Indicates another legislation taken into account in this consolidated legislation (which is usually the product of an editorial process that revises the legislation). This property should be used multiple times to refer to both the original version or the previous consolidated version, and to the legislations making the change.
  'legislationConsolidates': prefix.sdo('legislationConsolidates'),
  // The date of adoption or signature of the legislation. This is the date at which the text is officially aknowledged to be a legislation, even though it might not even be published or in force.
  'legislationDate': prefix.sdo('legislationDate'),
  // The point-in-time at which the provided description of the legislation is valid (e.g. : when looking at the law on the 2016-04-07 (= dateVersion), I get the consolidation of 2015-04-12 of the \"National Insurance Contributions Act 2015\")
  'legislationDateVersion': prefix.sdo('legislationDateVersion'),
  // An identifier for the legislation. This can be either a string-based identifier, like the CELEX at EU level or the NOR in France, or a web-based, URL/URI identifier, like an ELI (European Legislation Identifier) or an URN-Lex.
  'legislationIdentifier': prefix.sdo('legislationIdentifier'),
  // The jurisdiction from which the legislation originates.
  'legislationJurisdiction': prefix.sdo('legislationJurisdiction'),
  // Whether the legislation is currently in force, not in force, or partially in force.
  'legislationLegalForce': prefix.sdo('legislationLegalForce'),
  // The legal value of this legislation file. The same legislation can be written in multiple files with different legal values. Typically a digitally signed PDF have a \"stronger\" legal value than the HTML file of the same act.
  'legislationLegalValue': prefix.sdo('legislationLegalValue'),
  // The person or organization that originally passed or made the law : typically parliament (for primary legislation) or government (for secondary legislation). This indicates the \"legal author\" of the law, as opposed to its physical author.
  'legislationPassedBy': prefix.sdo('legislationPassedBy'),
  // An individual or organization that has some kind of responsibility for the legislation. Typically the ministry who is/was in charge of elaborating the legislation, or the adressee for potential questions about the legislation once it is published.
  'legislationResponsible': prefix.sdo('legislationResponsible'),
  // Indicates that this legislation (or part of legislation) fulfills the objectives set by another legislation, by passing appropriate implementation measures. Typically, some legislations of European Union's member states or regions transpose European Directives. This indicates a legally binding link between the 2 legislations.
  'legislationTransposes': prefix.sdo('legislationTransposes'),
  // The type of the legislation. Examples of values are \"law\", \"act\", \"directive\", \"decree\", \"regulation\", \"statutory instrument\", \"loi organique\", \"règlement grand-ducal\", etc., depending on the country.
  'legislationType': prefix.sdo('legislationType'),
  // An organization identifier that uniquely identifies a legal entity as defined in ISO 17442.
  'leiCode': prefix.sdo('leiCode'),
  // A sub property of participant. The person that lends the object being borrowed.
  'lender': prefix.sdo('lender'),
  // This ordering relation for qualitative values indicates that the subject is lesser than the object.
  'lesser': prefix.sdo('lesser'),
  // This ordering relation for qualitative values indicates that the subject is lesser than or equal to the object.
  'lesserOrEqual': prefix.sdo('lesserOrEqual'),
  // The individual who adds lettering, including speech balloons and sound effects, to artwork.
  'letterer': prefix.sdo('letterer'),
  // A license document that applies to this content, typically indicated by URL.
  'license': prefix.sdo('license'),
  // A line is a point-to-point path consisting of two or more points. A line is expressed as a series of two or more point objects separated by space.
  'line': prefix.sdo('line'),
  // Indicates the relationship type of a Web link.
  'linkRelationship': prefix.sdo('linkRelationship'),
  // An update to the LiveBlog.
  'liveBlogUpdate': prefix.sdo('liveBlogUpdate'),
  // Amount of mortgage mandate that can be converted into a proper mortgage at a later stage.
  'loanMortgageMandateAmount': prefix.sdo('loanMortgageMandateAmount'),
  // The amount of money to pay in a single payment.
  'loanPaymentAmount': prefix.sdo('loanPaymentAmount'),
  // Frequency of payments due, i.e. number of months between payments. This is defined as a frequency, i.e. the reciprocal of a period of time.
  'loanPaymentFrequency': prefix.sdo('loanPaymentFrequency'),
  // A form of paying back money previously borrowed from a lender. Repayment usually takes the form of periodic payments that normally include part principal plus interest in each payment.
  'loanRepaymentForm': prefix.sdo('loanRepaymentForm'),
  // The duration of the loan or credit agreement.
  'loanTerm': prefix.sdo('loanTerm'),
  // The type of a loan or credit.
  'loanType': prefix.sdo('loanType'),
  // The location of, for example, where an event is happening, where an organization is located, or where an action takes place.
  'location': prefix.sdo('location'),
  // The location where the CreativeWork was created, which may not be the same as the location depicted in the CreativeWork.
  'locationCreated': prefix.sdo('locationCreated'),
  // A full description of the lodging unit.
  'lodgingUnitDescription': prefix.sdo('lodgingUnitDescription'),
  // Textual description of the unit type (including suite vs. room, size of bed, etc.).
  'lodgingUnitType': prefix.sdo('lodgingUnitType'),
  // An associated logo.
  'logo': prefix.sdo('logo'),
  // The longitude of a location. For example ```-122.08585``` ([WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)).
  'longitude': prefix.sdo('longitude'),
  // A sub property of participant. The loser of the action.
  'loser': prefix.sdo('loser'),
  // The lowest price of all offers available.Usage guidelines:* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
  'lowPrice': prefix.sdo('lowPrice'),
  // The person who wrote the words.
  'lyricist': prefix.sdo('lyricist'),
  // The words in the song.
  'lyrics': prefix.sdo('lyrics'),
  // Indicates if this web page element is the main subject of the page.
  'mainContentOfPage': prefix.sdo('mainContentOfPage'),
  // Indicates the primary entity described in some page or other CreativeWork.
  'mainEntity': prefix.sdo('mainEntity'),
  // Indicates a page (or other CreativeWork) for which this thing is the main entity being described. See [background notes](/docs/datamodel.html#mainEntityBackground) for details.
  'mainEntityOfPage': prefix.sdo('mainEntityOfPage'),
  // A maintainer of a [[Dataset]], software package ([[SoftwareApplication]]), or other [[Project]]. A maintainer is a [[Person]] or [[Organization]] that manages contributions to, and/or publication of, some (typically complex) artifact. It is common for distributions of software and data to be based on \"upstream\" sources. When [[maintainer]] is applied to a specific version of something e.g. a particular version or packaging of a [[Dataset]], it is always  possible that the upstream source has a different maintainer. The [[isBasedOn]] property can be used to indicate such relationships between datasets to make the different maintenance roles clear. Similarly in the case of software, a package may have dedicated maintainers working on integration into software distributions such as Ubuntu, as well as upstream maintainers of the underlying work.
  'maintainer': prefix.sdo('maintainer'),
  // A pointer to products or services offered by the organization or person.
  'makesOffer': prefix.sdo('makesOffer'),
  // The manufacturer of the product.
  'manufacturer': prefix.sdo('manufacturer'),
  // A URL to a map of the place.
  'map': prefix.sdo('map'),
  // Indicates the kind of Map, from the MapCategoryType Enumeration.
  'mapType': prefix.sdo('mapType'),
  // A URL to a map of the place.
  'maps': prefix.sdo('maps'),
  // A marginOfError for an [[Observation]].
  'marginOfError': prefix.sdo('marginOfError'),
  // For a [[NewsMediaOrganization]], a link to the masthead page or a page listing top editorial management.
  'masthead': prefix.sdo('masthead'),
  // A material that something is made from, e.g. leather, wool, cotton, paper.
  'material': prefix.sdo('material'),
  // The quantity of the materials being described or an expression of the physical space they occupy.
  'materialExtent': prefix.sdo('materialExtent'),
  // A mathematical expression (e.g. 'x^2-3x=0') that may be solved for a specific variable, simplified, or transformed. This can take many formats, e.g. LaTeX, Ascii-Math, or math as you would write with a keyboard.
  'mathExpression': prefix.sdo('mathExpression'),
  // The highest price if the price is a range.
  'maxPrice': prefix.sdo('maxPrice'),
  // The upper value of some characteristic or property.
  'maxValue': prefix.sdo('maxValue'),
  // The total number of individuals that may attend an event or venue.
  'maximumAttendeeCapacity': prefix.sdo('maximumAttendeeCapacity'),
  // The maximum number of students who may be enrolled in the program.
  'maximumEnrollment': prefix.sdo('maximumEnrollment'),
  // Recommended intake of this supplement for a given population as defined by a specific recommending authority.
  'maximumIntake': prefix.sdo('maximumIntake'),
  // The maximum physical attendee capacity of an [[Event]] whose [[eventAttendanceMode]] is [[OfflineEventAttendanceMode]] (or the offline aspects, in the case of a [[MixedEventAttendanceMode]]).
  'maximumPhysicalAttendeeCapacity': prefix.sdo('maximumPhysicalAttendeeCapacity'),
  // The maximum physical attendee capacity of an [[Event]] whose [[eventAttendanceMode]] is [[OnlineEventAttendanceMode]] (or the online aspects, in the case of a [[MixedEventAttendanceMode]]).
  'maximumVirtualAttendeeCapacity': prefix.sdo('maximumVirtualAttendeeCapacity'),
  // Description of the meals that will be provided or available for purchase.
  'mealService': prefix.sdo('mealService'),
  // The measuredProperty of an [[Observation]], either a schema.org property, a property from other RDF-compatible systems e.g. W3C RDF Data Cube, or schema.org extensions such as [GS1's](https://www.gs1.org/voc/?show=properties).
  'measuredProperty': prefix.sdo('measuredProperty'),
  // The measuredValue of an [[Observation]].
  'measuredValue': prefix.sdo('measuredValue'),
  // A technique or technology used in a [[Dataset]] (or [[DataDownload]], [[DataCatalog]]),corresponding to the method used for measuring the corresponding variable(s) (described using [[variableMeasured]]). This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but rather as a high level summary for dataset discovery.For example, if [[variableMeasured]] is: molecule concentration, [[measurementTechnique]] could be: \"mass spectrometry\" or \"nmr spectroscopy\" or \"colorimetry\" or \"immunofluorescence\".If the [[variableMeasured]] is \"depression rating\", the [[measurementTechnique]] could be \"Zung Scale\" or \"HAM-D\" or \"Beck Depression Inventory\".If there are several [[variableMeasured]] properties recorded for some given data object, use a [[PropertyValue]] for each [[variableMeasured]] and attach the corresponding [[measurementTechnique]].
  'measurementTechnique': prefix.sdo('measurementTechnique'),
  // The specific biochemical interaction through which this drug or supplement produces its pharmacological effect.
  'mechanismOfAction': prefix.sdo('mechanismOfAction'),
  // Indicates a MediaManipulationRatingEnumeration classification of a media object (in the context of how it was published or shared).
  'mediaAuthenticityCategory': prefix.sdo('mediaAuthenticityCategory'),
  // In the context of a [[MediaReview]], indicates specific media item(s) that are grouped using a [[MediaReviewItem]].
  'mediaItemAppearance': prefix.sdo('mediaItemAppearance'),
  // The median value.
  'median': prefix.sdo('median'),
  // Medical audience for page.
  'medicalAudience': prefix.sdo('medicalAudience'),
  // A medical specialty of the provider.
  'medicalSpecialty': prefix.sdo('medicalSpecialty'),
  // The system of medicine that includes this MedicalEntity, for example 'evidence-based', 'homeopathic', 'chiropractic', etc.
  'medicineSystem': prefix.sdo('medicineSystem'),
  // Indicates that the vehicle meets the respective emission standard.
  'meetsEmissionStandard': prefix.sdo('meetsEmissionStandard'),
  // A member of an Organization or a ProgramMembership. Organizations can be members of organizations; ProgramMembership is typically for individuals.
  'member': prefix.sdo('member'),
  // An Organization (or ProgramMembership) to which this Person or Organization belongs.
  'memberOf': prefix.sdo('memberOf'),
  // A member of this organization.
  'members': prefix.sdo('members'),
  // A unique identifier for the membership.
  'membershipNumber': prefix.sdo('membershipNumber'),
  // The number of membership points earned by the member. If necessary, the unitText can be used to express the units the points are issued in. (e.g. stars, miles, etc.)
  'membershipPointsEarned': prefix.sdo('membershipPointsEarned'),
  // Minimum memory requirements.
  'memoryRequirements': prefix.sdo('memoryRequirements'),
  // Indicates that the CreativeWork contains a reference to, but is not necessarily about a concept.
  'mentions': prefix.sdo('mentions'),
  // Either the actual menu as a structured representation, as text, or a URL of the menu.
  'menu': prefix.sdo('menu'),
  // Additional menu item(s) such as a side dish of salad or side order of fries that can be added to this menu item. Additionally it can be a menu section containing allowed add-on menu items for this menu item.
  'menuAddOn': prefix.sdo('menuAddOn'),
  // 'merchant' is an out-dated term for 'seller'.
  'merchant': prefix.sdo('merchant'),
  // Specifies either a fixed return date or the number of days (from the delivery date) that a product can be returned. Used when the [[returnPolicyCategory]] property is specified as [[MerchantReturnFiniteReturnWindow]].
  'merchantReturnDays': prefix.sdo('merchantReturnDays'),
  // Specifies a Web page or service by URL, for product returns.
  'merchantReturnLink': prefix.sdo('merchantReturnLink'),
  // A CreativeWork attached to the message.
  'messageAttachment': prefix.sdo('messageAttachment'),
  // The total distance travelled by the particular vehicle since its initial production, as read from its odometer.Typical unit code(s): KMT for kilometers, SMI for statute miles
  'mileageFromOdometer': prefix.sdo('mileageFromOdometer'),
  // The lowest price if the price is a range.
  'minPrice': prefix.sdo('minPrice'),
  // The lower value of some characteristic or property.
  'minValue': prefix.sdo('minValue'),
  // The minimum payment required at this time.
  'minimumPaymentDue': prefix.sdo('minimumPaymentDue'),
  // For a [[NewsMediaOrganization]], a statement on coverage priorities, including any public agenda or stance on issues.
  'missionCoveragePrioritiesPolicy': prefix.sdo('missionCoveragePrioritiesPolicy'),
  // The model of the product. Use with the URL of a ProductModel or a textual representation of the model identifier. The URL of the ProductModel can be from an external source. It is recommended to additionally provide strong product identifiers via the gtin8/gtin13/gtin14 and mpn properties.
  'model': prefix.sdo('model'),
  // The release date of a vehicle model (often used to differentiate versions of the same make and model).
  'modelDate': prefix.sdo('modelDate'),
  // The date and time the reservation was modified.
  'modifiedTime': prefix.sdo('modifiedTime'),
  // The empirical formula is the simplest whole number ratio of all the atoms in a molecule.
  'molecularFormula': prefix.sdo('molecularFormula'),
  // This is the molecular weight of the entity being described, not of the parent. Units should be included in the form '&lt;Number&gt; &lt;unit&gt;', for example '12 amu' or as '&lt;QuantitativeValue&gt;.
  'molecularWeight': prefix.sdo('molecularWeight'),
  // The monoisotopic mass is the sum of the masses of the atoms in a molecule using the unbound, ground-state, rest mass of the principal (most abundant) isotope for each element instead of the isotopic average mass. Please include the units the form '&lt;Number&gt; &lt;unit&gt;', for example '770.230488 g/mol' or as '&lt;QuantitativeValue&gt;.
  'monoisotopicMolecularWeight': prefix.sdo('monoisotopicMolecularWeight'),
  // The minimum payment is the lowest amount of money that one is required to pay on a credit card statement each month.
  'monthlyMinimumRepaymentAmount': prefix.sdo('monthlyMinimumRepaymentAmount'),
  // Indicates the minimal number of months of experience required for a position.
  'monthsOfExperience': prefix.sdo('monthsOfExperience'),
  // The Manufacturer Part Number (MPN) of the product, or the product to which the offer refers.
  'mpn': prefix.sdo('mpn'),
  // Whether multiple values are allowed for the property.  Default is false.
  'multipleValues': prefix.sdo('multipleValues'),
  // The movement the muscle generates.
  'muscleAction': prefix.sdo('muscleAction'),
  // An arrangement derived from the composition.
  'musicArrangement': prefix.sdo('musicArrangement'),
  // The composer of the soundtrack.
  'musicBy': prefix.sdo('musicBy'),
  // The type of composition (e.g. overture, sonata, symphony, etc.).
  'musicCompositionForm': prefix.sdo('musicCompositionForm'),
  // A member of a music group&#x2014;for example, John, Paul, George, or Ringo.
  'musicGroupMember': prefix.sdo('musicGroupMember'),
  // Format of this release (the type of recording media used, ie. compact disc, digital media, LP, etc.).
  'musicReleaseFormat': prefix.sdo('musicReleaseFormat'),
  // The key, mode, or scale this composition uses.
  'musicalKey': prefix.sdo('musicalKey'),
  // The North American Industry Classification System (NAICS) code for a particular organization or business person.
  'naics': prefix.sdo('naics'),
  // The name of the item.
  'name': prefix.sdo('name'),
  // A position played, performed or filled by a person or organization, as part of an organization. For example, an athlete in a SportsTeam might play in the position named 'Quarterback'.
  'namedPosition': prefix.sdo('namedPosition'),
  // Nationality of the person.
  'nationality': prefix.sdo('nationality'),
  // The expected progression of the condition if it is not treated and allowed to progress naturally.
  'naturalProgression': prefix.sdo('naturalProgression'),
  // Indicates, in the context of a [[Review]] (e.g. framed as 'pro' vs 'con' considerations), negative considerations - either as unstructured text, or a list.
  'negativeNotes': prefix.sdo('negativeNotes'),
  // The underlying innervation associated with the muscle.
  'nerve': prefix.sdo('nerve'),
  // The neurological pathway extension that involves muscle control.
  'nerveMotor': prefix.sdo('nerveMotor'),
  // The total financial value of the person as calculated by subtracting assets from liabilities.
  'netWorth': prefix.sdo('netWorth'),
  // Indicates a page with news updates and guidelines. This could often be (but is not required to be) the main page containing [[SpecialAnnouncement]] markup on a site.
  'newsUpdatesAndGuidelines': prefix.sdo('newsUpdatesAndGuidelines'),
  // A link to the ListItem that follows the current one.
  'nextItem': prefix.sdo('nextItem'),
  // For a [[NewsMediaOrganization]] or other news-related [[Organization]], a statement explaining when authors of articles are not named in bylines.
  'noBylinesPolicy': prefix.sdo('noBylinesPolicy'),
  // This ordering relation for qualitative values indicates that the subject is not equal to the object.
  'nonEqual': prefix.sdo('nonEqual'),
  // The generic name of this drug or supplement.
  'nonProprietaryName': prefix.sdo('nonProprietaryName'),
  // nonprofit Status indicates the legal status of a non-profit organization in its primary place of business.
  'nonprofitStatus': prefix.sdo('nonprofitStatus'),
  // Range of acceptable values for a typical patient, when applicable.
  'normalRange': prefix.sdo('normalRange'),
  // Indicates the [NATO stock number](https://en.wikipedia.org/wiki/NATO_Stock_Number) (nsn) of a [[Product]].
  'nsn': prefix.sdo('nsn'),
  // The number of adults staying in the unit.
  'numAdults': prefix.sdo('numAdults'),
  // The number of children staying in the unit.
  'numChildren': prefix.sdo('numChildren'),
  // Indicates the number of constraints (not counting [[populationType]]) defined for a particular [[StatisticalPopulation]]. This helps applications understand if they have access to a sufficiently complete description of a [[StatisticalPopulation]].
  'numConstraints': prefix.sdo('numConstraints'),
  // The number of tracks in this album or playlist.
  'numTracks': prefix.sdo('numTracks'),
  // Indicates the total (available plus unavailable) number of accommodation units in an [[ApartmentComplex]], or the number of accommodation units for a specific [[FloorPlan]] (within its specific [[ApartmentComplex]]). See also [[numberOfAvailableAccommodationUnits]].
  'numberOfAccommodationUnits': prefix.sdo('numberOfAccommodationUnits'),
  // The number or type of airbags in the vehicle.
  'numberOfAirbags': prefix.sdo('numberOfAirbags'),
  // Indicates the number of available accommodation units in an [[ApartmentComplex]], or the number of accommodation units for a specific [[FloorPlan]] (within its specific [[ApartmentComplex]]). See also [[numberOfAccommodationUnits]].
  'numberOfAvailableAccommodationUnits': prefix.sdo('numberOfAvailableAccommodationUnits'),
  // The number of axles.Typical unit code(s): C62
  'numberOfAxles': prefix.sdo('numberOfAxles'),
  // The total integer number of bathrooms in a some [[Accommodation]], following real estate conventions as [documented in RESO](https://ddwiki.reso.org/display/DDW17/BathroomsTotalInteger+Field): \"The simple sum of the number of bathrooms. For example for a property with two Full Bathrooms and one Half Bathroom, the Bathrooms Total Integer will be 3.\". See also [[numberOfRooms]].
  'numberOfBathroomsTotal': prefix.sdo('numberOfBathroomsTotal'),
  // The total integer number of bedrooms in a some [[Accommodation]], [[ApartmentComplex]] or [[FloorPlan]].
  'numberOfBedrooms': prefix.sdo('numberOfBedrooms'),
  // The quantity of the given bed type available in the HotelRoom, Suite, House, or Apartment.
  'numberOfBeds': prefix.sdo('numberOfBeds'),
  // The number of credits or units awarded by a Course or required to complete an EducationalOccupationalProgram.
  'numberOfCredits': prefix.sdo('numberOfCredits'),
  // The number of doors.Typical unit code(s): C62
  'numberOfDoors': prefix.sdo('numberOfDoors'),
  // The number of employees in an organization e.g. business.
  'numberOfEmployees': prefix.sdo('numberOfEmployees'),
  // The number of episodes in this season or series.
  'numberOfEpisodes': prefix.sdo('numberOfEpisodes'),
  // The total number of forward gears available for the transmission system of the vehicle.Typical unit code(s): C62
  'numberOfForwardGears': prefix.sdo('numberOfForwardGears'),
  // Number of full bathrooms - The total number of full and ¾ bathrooms in an [[Accommodation]]. This corresponds to the [BathroomsFull field in RESO](https://ddwiki.reso.org/display/DDW17/BathroomsFull+Field).
  'numberOfFullBathrooms': prefix.sdo('numberOfFullBathrooms'),
  // The number of items in an ItemList. Note that some descriptions might not fully describe all items in a list (e.g., multi-page pagination); in such cases, the numberOfItems would be for the entire list.
  'numberOfItems': prefix.sdo('numberOfItems'),
  // The number of payments contractually required at origination to repay the loan. For monthly paying loans this is the number of months from the contractual first payment date to the maturity date.
  'numberOfLoanPayments': prefix.sdo('numberOfLoanPayments'),
  // The number of pages in the book.
  'numberOfPages': prefix.sdo('numberOfPages'),
  // Number of partial bathrooms - The total number of half and ¼ bathrooms in an [[Accommodation]]. This corresponds to the [BathroomsPartial field in RESO](https://ddwiki.reso.org/display/DDW17/BathroomsPartial+Field).
  'numberOfPartialBathrooms': prefix.sdo('numberOfPartialBathrooms'),
  // Indicate how many people can play this game (minimum, maximum, or range).
  'numberOfPlayers': prefix.sdo('numberOfPlayers'),
  // The number of owners of the vehicle, including the current one.Typical unit code(s): C62
  'numberOfPreviousOwners': prefix.sdo('numberOfPreviousOwners'),
  // The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business.Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue.
  'numberOfRooms': prefix.sdo('numberOfRooms'),
  // The number of seasons in this series.
  'numberOfSeasons': prefix.sdo('numberOfSeasons'),
  // A number associated with a role in an organization, for example, the number on an athlete's jersey.
  'numberedPosition': prefix.sdo('numberedPosition'),
  // Nutrition information about the recipe or menu item.
  'nutrition': prefix.sdo('nutrition'),
  // The object upon which the action is carried out, whose state is kept intact or changed. Also known as the semantic roles patient, affected or undergoer (which change their state) or theme (which doesn't). e.g. John read *a book*.
  'object': prefix.sdo('object'),
  // The observationDate of an [[Observation]].
  'observationDate': prefix.sdo('observationDate'),
  // The observedNode of an [[Observation]], often a [[StatisticalPopulation]].
  'observedNode': prefix.sdo('observedNode'),
  // The allowed total occupancy for the accommodation in persons (including infants etc). For individual accommodations, this is not necessarily the legal maximum but defines the permitted usage as per the contractual agreement (e.g. a double room used by a single person).Typical unit code(s): C62 for person
  'occupancy': prefix.sdo('occupancy'),
  //  The region/country for which this occupational description is appropriate. Note that educational requirements and qualifications can vary between jurisdictions.
  'occupationLocation': prefix.sdo('occupationLocation'),
  // A category describing the job, preferably using a term from a taxonomy such as [BLS O*NET-SOC](http://www.onetcenter.org/taxonomy.html), [ISCO-08](https://www.ilo.org/public/english/bureau/stat/isco/isco08/) or similar, with the property repeated for each applicable value. Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided.Note: for historical reasons, any textual label and formal code provided as a literal may be assumed to be from O*NET-SOC.
  'occupationalCategory': prefix.sdo('occupationalCategory'),
  // A description of the qualification, award, certificate, diploma or other occupational credential awarded as a consequence of successful completion of this course or program.
  'occupationalCredentialAwarded': prefix.sdo('occupationalCredentialAwarded'),
  // The number of offers for the product.
  'offerCount': prefix.sdo('offerCount'),
  // A pointer to the organization or person making the offer.
  'offeredBy': prefix.sdo('offeredBy'),
  // An offer to provide this item&#x2014;for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use [[businessFunction]] to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a [[Demand]]. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer.
  'offers': prefix.sdo('offers'),
  // Whether prescriptions can be delivered by mail.
  'offersPrescriptionByMail': prefix.sdo('offersPrescriptionByMail'),
  // The general opening hours for a business. Opening hours can be specified as a weekly time range, starting with days, then times per day. Multiple days can be listed with commas ',' separating each day. Day or time ranges are specified using a hyphen '-'.* Days are specified using the following two-letter combinations: ```Mo```, ```Tu```, ```We```, ```Th```, ```Fr```, ```Sa```, ```Su```.* Times are specified using 24:00 format. For example, 3pm is specified as ```15:00```, 10am as ```10:00```. * Here is an example: <code>&lt;time itemprop=\"openingHours\" datetime=&quot;Tu,Th 16:00-20:00&quot;&gt;Tuesdays and Thursdays 4-8pm&lt;/time&gt;</code>.* If a business is open 7 days a week, then it can be specified as <code>&lt;time itemprop=&quot;openingHours&quot; datetime=&quot;Mo-Su&quot;&gt;Monday through Sunday, all day&lt;/time&gt;</code>.
  'openingHours': prefix.sdo('openingHours'),
  // The opening hours of a certain place.
  'openingHoursSpecification': prefix.sdo('openingHoursSpecification'),
  // The opening hour of the place or service on the given day(s) of the week.
  'opens': prefix.sdo('opens'),
  // Operating systems supported (Windows 7, OSX 10.6, Android 1.6).
  'operatingSystem': prefix.sdo('operatingSystem'),
  // A sub property of participant. The opponent on this action.
  'opponent': prefix.sdo('opponent'),
  // A sub property of object. The options subject to this action.
  'option': prefix.sdo('option'),
  // Date order was placed.
  'orderDate': prefix.sdo('orderDate'),
  // The delivery of the parcel related to this order or order item.
  'orderDelivery': prefix.sdo('orderDelivery'),
  // The identifier of the order item.
  'orderItemNumber': prefix.sdo('orderItemNumber'),
  // The current status of the order item.
  'orderItemStatus': prefix.sdo('orderItemStatus'),
  // The identifier of the transaction.
  'orderNumber': prefix.sdo('orderNumber'),
  // The number of the item ordered. If the property is not set, assume the quantity is one.
  'orderQuantity': prefix.sdo('orderQuantity'),
  // The current status of the order.
  'orderStatus': prefix.sdo('orderStatus'),
  // The item ordered.
  'orderedItem': prefix.sdo('orderedItem'),
  // An organizer of an Event.
  'organizer': prefix.sdo('organizer'),
  // Shipper's address.
  'originAddress': prefix.sdo('originAddress'),
  // Describes, in a [[MediaReview]] when dealing with [[DecontextualizedContent]], background information that can contribute to better interpretation of the [[MediaObject]].
  'originalMediaContextDescription': prefix.sdo('originalMediaContextDescription'),
  // Link to the page containing an original version of the content, or directly to an online copy of the original [[MediaObject]] content, e.g. video file.
  'originalMediaLink': prefix.sdo('originalMediaLink'),
  // The vasculature the lymphatic structure originates, or afferents, from.
  'originatesFrom': prefix.sdo('originatesFrom'),
  // Any information related to overdose on a drug, including signs or symptoms, treatments, contact information for emergency response.
  'overdosage': prefix.sdo('overdosage'),
  // The date and time of obtaining the product.
  'ownedFrom': prefix.sdo('ownedFrom'),
  // The date and time of giving up ownership on the product.
  'ownedThrough': prefix.sdo('ownedThrough'),
  // For an [[Organization]] (often but not necessarily a [[NewsMediaOrganization]]), a description of organizational ownership structure; funding and grants. In a news/media setting, this is with particular reference to editorial independence.   Note that the [[funder]] is also available and can be used to make basic funder information machine-readable.
  'ownershipFundingInfo': prefix.sdo('ownershipFundingInfo'),
  // Products owned by the organization or person.
  'owns': prefix.sdo('owns'),
  // The page on which the work ends; for example \"138\" or \"xvi\".
  'pageEnd': prefix.sdo('pageEnd'),
  // The page on which the work starts; for example \"135\" or \"xiii\".
  'pageStart': prefix.sdo('pageStart'),
  // Any description of pages that is not separated into pageStart and pageEnd; for example, \"1-6, 9, 55\" or \"10-12, 46-49\".
  'pagination': prefix.sdo('pagination'),
  // A parent of this person.
  'parent': prefix.sdo('parent'),
  // The parent of a question, answer or item in general.
  'parentItem': prefix.sdo('parentItem'),
  // The larger organization that this organization is a [[subOrganization]] of, if any.
  'parentOrganization': prefix.sdo('parentOrganization'),
  // A broadcast service to which the broadcast service may belong to such as regional variations of a national channel.
  'parentService': prefix.sdo('parentService'),
  // Closest parent taxon of the taxon in question.
  'parentTaxon': prefix.sdo('parentTaxon'),
  // A parents of the person.
  'parents': prefix.sdo('parents'),
  // The episode to which this clip belongs.
  'partOfEpisode': prefix.sdo('partOfEpisode'),
  // The order is being paid as part of the referenced Invoice.
  'partOfInvoice': prefix.sdo('partOfInvoice'),
  // The overall order the items in this delivery were included in.
  'partOfOrder': prefix.sdo('partOfOrder'),
  // The season to which this episode belongs.
  'partOfSeason': prefix.sdo('partOfSeason'),
  // The series to which this episode or season belongs.
  'partOfSeries': prefix.sdo('partOfSeries'),
  // The anatomical or organ system that this structure is part of.
  'partOfSystem': prefix.sdo('partOfSystem'),
  // The TV series to which this episode or season belongs.
  'partOfTVSeries': prefix.sdo('partOfTVSeries'),
  // Identifies that this [[Trip]] is a subTrip of another Trip.  For example Day 1, Day 2, etc. of a multi-day trip.
  'partOfTrip': prefix.sdo('partOfTrip'),
  // Other co-agents that participated in the action indirectly. e.g. John wrote a book with *Steve*.
  'participant': prefix.sdo('participant'),
  // Number of people the reservation should accommodate.
  'partySize': prefix.sdo('partySize'),
  // The priority status assigned to a passenger for security or boarding (e.g. FastTrack or Priority).
  'passengerPriorityStatus': prefix.sdo('passengerPriorityStatus'),
  // The passenger's sequence number as assigned by the airline.
  'passengerSequenceNumber': prefix.sdo('passengerSequenceNumber'),
  // Changes in the normal mechanical, physical, and biochemical functions that are associated with this activity or condition.
  'pathophysiology': prefix.sdo('pathophysiology'),
  // A pattern that something has, for example 'polka dot', 'striped', 'Canadian flag'. Values are typically expressed as text, although links to controlled value schemes are also supported.
  'pattern': prefix.sdo('pattern'),
  // The permitted weight of passengers and cargo, EXCLUDING the weight of the empty vehicle.Typical unit code(s): KGM for kilogram, LBR for pound* Note 1: Many databases specify the permitted TOTAL weight instead, which is the sum of [[weight]] and [[payload]]* Note 2: You can indicate additional information in the [[name]] of the [[QuantitativeValue]] node.* Note 3: You may also link to a [[QualitativeValue]] node that provides additional information using [[valueReference]].* Note 4: Note that you can use [[minValue]] and [[maxValue]] to indicate ranges.
  'payload': prefix.sdo('payload'),
  // Cash, Credit Card, Cryptocurrency, Local Exchange Tradings System, etc.
  'paymentAccepted': prefix.sdo('paymentAccepted'),
  // The date that payment is due.
  'paymentDue': prefix.sdo('paymentDue'),
  // The date that payment is due.
  'paymentDueDate': prefix.sdo('paymentDueDate'),
  // The name of the credit card or other method of payment for the order.
  'paymentMethod': prefix.sdo('paymentMethod'),
  // An identifier for the method of payment used (e.g. the last 4 digits of the credit card).
  'paymentMethodId': prefix.sdo('paymentMethodId'),
  // The status of payment; whether the invoice has been paid or not.
  'paymentStatus': prefix.sdo('paymentStatus'),
  // The URL for sending a payment.
  'paymentUrl': prefix.sdo('paymentUrl'),
  // The individual who draws the primary narrative artwork.
  'penciler': prefix.sdo('penciler'),
  // The 10th percentile value.
  'percentile10': prefix.sdo('percentile10'),
  // The 25th percentile value.
  'percentile25': prefix.sdo('percentile25'),
  // The 75th percentile value.
  'percentile75': prefix.sdo('percentile75'),
  // The 90th percentile value.
  'percentile90': prefix.sdo('percentile90'),
  // The length of time it takes to perform instructions or a direction (not including time to prepare the supplies), in [ISO 8601 duration format](http://en.wikipedia.org/wiki/ISO_8601).
  'performTime': prefix.sdo('performTime'),
  // A performer at the event&#x2014;for example, a presenter, musician, musical group or actor.
  'performer': prefix.sdo('performer'),
  // Event that this person is a performer or participant in.
  'performerIn': prefix.sdo('performerIn'),
  // The main performer or performers of the event&#x2014;for example, a presenter, musician, or actor.
  'performers': prefix.sdo('performers'),
  // The type of permission granted the person, organization, or audience.
  'permissionType': prefix.sdo('permissionType'),
  // Permission(s) required to run the app (for example, a mobile app may require full internet access or may run only on wifi).
  'permissions': prefix.sdo('permissions'),
  // The target audience for this permit.
  'permitAudience': prefix.sdo('permitAudience'),
  // Indications regarding the permitted usage of the accommodation.
  'permittedUsage': prefix.sdo('permittedUsage'),
  // Indicates whether pets are allowed to enter the accommodation or lodging business. More detailed information can be put in a text value.
  'petsAllowed': prefix.sdo('petsAllowed'),
  // Representation of a text [[textValue]] using the specified [[speechToTextMarkup]]. For example the city name of Houston in IPA: /ˈhjuːstən/.
  'phoneticText': prefix.sdo('phoneticText'),
  // A photograph of this place.
  'photo': prefix.sdo('photo'),
  // Photographs of this place.
  'photos': prefix.sdo('photos'),
  // A description of the types of physical activity associated with the job. Defined terms such as those in O*net may be used, but note that there is no way to specify the level of ability as well as its nature when using a defined term.
  'physicalRequirement': prefix.sdo('physicalRequirement'),
  // Specific physiologic benefits associated to the plan.
  'physiologicalBenefits': prefix.sdo('physiologicalBenefits'),
  // Where a taxi will pick up a passenger or a rental car can be picked up.
  'pickupLocation': prefix.sdo('pickupLocation'),
  // When a taxi will pickup a passenger or a rental car can be picked up.
  'pickupTime': prefix.sdo('pickupTime'),
  // Indicates whether this game is multi-player, co-op or single-player.  The game can be marked as multi-player, co-op and single-player at the same time.
  'playMode': prefix.sdo('playMode'),
  // Player type required&#x2014;for example, Flash or Silverlight.
  'playerType': prefix.sdo('playerType'),
  // Number of players on the server.
  'playersOnline': prefix.sdo('playersOnline'),
  // A polygon is the area enclosed by a point-to-point path for which the starting and ending points are the same. A polygon is expressed as a series of four or more space delimited points where the first and final points are identical.
  'polygon': prefix.sdo('polygon'),
  // Indicates the populationType common to all members of a [[StatisticalPopulation]].
  'populationType': prefix.sdo('populationType'),
  // The position of an item in a series or sequence of items.
  'position': prefix.sdo('position'),
  // Indicates, in the context of a [[Review]] (e.g. framed as 'pro' vs 'con' considerations), positive considerations - either as unstructured text, or a list.
  'positiveNotes': prefix.sdo('positiveNotes'),
  // A possible unexpected and unfavorable evolution of a medical condition. Complications may include worsening of the signs or symptoms of the disease, extension of the condition to other organ systems, etc.
  'possibleComplication': prefix.sdo('possibleComplication'),
  // A possible treatment to address this condition, sign or symptom.
  'possibleTreatment': prefix.sdo('possibleTreatment'),
  // The post office box number for PO box addresses.
  'postOfficeBoxNumber': prefix.sdo('postOfficeBoxNumber'),
  // A description of the postoperative procedures, care, and/or followups for this device.
  'postOp': prefix.sdo('postOp'),
  // The postal code. For example, 94043.
  'postalCode': prefix.sdo('postalCode'),
  // First postal code in a range (included).
  'postalCodeBegin': prefix.sdo('postalCodeBegin'),
  // Last postal code in the range (included). Needs to be after [[postalCodeBegin]].
  'postalCodeEnd': prefix.sdo('postalCodeEnd'),
  // A defined range of postal codes indicated by a common textual prefix. Used for non-numeric systems such as UK.
  'postalCodePrefix': prefix.sdo('postalCodePrefix'),
  // A defined range of postal codes.
  'postalCodeRange': prefix.sdo('postalCodeRange'),
  // Indicates a potential Action, which describes an idealized action in which this thing would play an 'object' role.
  'potentialAction': prefix.sdo('potentialAction'),
  // Intended use of the BioChemEntity by humans.
  'potentialUse': prefix.sdo('potentialUse'),
  // A description of the workup, testing, and other preparations required before implanting this device.
  'preOp': prefix.sdo('preOp'),
  // A pointer from a previous, often discontinued variant of the product to its newer variant.
  'predecessorOf': prefix.sdo('predecessorOf'),
  // Pregnancy category of this drug.
  'pregnancyCategory': prefix.sdo('pregnancyCategory'),
  // Any precaution, guidance, contraindication, etc. related to this drug's use during pregnancy.
  'pregnancyWarning': prefix.sdo('pregnancyWarning'),
  // The length of time it takes to prepare the items to be used in instructions or a direction, in [ISO 8601 duration format](http://en.wikipedia.org/wiki/ISO_8601).
  'prepTime': prefix.sdo('prepTime'),
  // Typical preparation that a patient must undergo before having the procedure performed.
  'preparation': prefix.sdo('preparation'),
  // Link to prescribing information for the drug.
  'prescribingInfo': prefix.sdo('prescribingInfo'),
  // Indicates the status of drug prescription eg. local catalogs classifications or whether the drug is available by prescription or over-the-counter, etc.
  'prescriptionStatus': prefix.sdo('prescriptionStatus'),
  // A link to the ListItem that preceeds the current one.
  'previousItem': prefix.sdo('previousItem'),
  // Used in conjunction with eventStatus for rescheduled or cancelled events. This property contains the previously scheduled start date. For rescheduled events, the startDate property should be used for the newly scheduled start date. In the (rare) case of an event that has been postponed and rescheduled multiple times, this field may be repeated.
  'previousStartDate': prefix.sdo('previousStartDate'),
  // The offer price of a product, or of a price component when attached to PriceSpecification and its subtypes.Usage guidelines:* Use the [[priceCurrency]] property (with standard formats: [ISO 4217 currency format](http://en.wikipedia.org/wiki/ISO_4217) e.g. \"USD\"; [Ticker symbol](https://en.wikipedia.org/wiki/List_of_cryptocurrencies) for cryptocurrencies e.g. \"BTC\"; well known names for [Local Exchange Tradings Systems](https://en.wikipedia.org/wiki/Local_exchange_trading_system) (LETS) and other currency types e.g. \"Ithaca HOUR\") instead of including [ambiguous symbols](http://en.wikipedia.org/wiki/Dollar_sign#Currencies_that_use_the_dollar_or_peso_sign) such as '$' in the value.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.* Note that both [RDFa](http://www.w3.org/TR/xhtml-rdfa-primer/#using-the-content-attribute) and Microdata syntax allow the use of a \"content=\" attribute for publishing simple machine-readable values alongside more human-friendly formatting.* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.
  'price': prefix.sdo('price'),
  // This property links to all [[UnitPriceSpecification]] nodes that apply in parallel for the [[CompoundPriceSpecification]] node.
  'priceComponent': prefix.sdo('priceComponent'),
  // Identifies a price component (for example, a line item on an invoice), part of the total price for an offer.
  'priceComponentType': prefix.sdo('priceComponentType'),
  // The currency of the price, or a price component when attached to [[PriceSpecification]] and its subtypes.Use standard formats: [ISO 4217 currency format](http://en.wikipedia.org/wiki/ISO_4217) e.g. \"USD\"; [Ticker symbol](https://en.wikipedia.org/wiki/List_of_cryptocurrencies) for cryptocurrencies e.g. \"BTC\"; well known names for [Local Exchange Tradings Systems](https://en.wikipedia.org/wiki/Local_exchange_trading_system) (LETS) and other currency types e.g. \"Ithaca HOUR\".
  'priceCurrency': prefix.sdo('priceCurrency'),
  // The price range of the business, for example ```$$$```.
  'priceRange': prefix.sdo('priceRange'),
  // One or more detailed price specifications, indicating the unit price and delivery or payment charges.
  'priceSpecification': prefix.sdo('priceSpecification'),
  // Defines the type of a price specified for an offered product, for example a list price, a (temporary) sale price or a manufacturer suggested retail price. If multiple prices are specified for an offer the [[priceType]] property can be used to identify the type of each such specified price. The value of priceType can be specified as a value from enumeration PriceTypeEnumeration or as a free form text string for price types that are not already predefined in PriceTypeEnumeration.
  'priceType': prefix.sdo('priceType'),
  // The date after which the price is no longer available.
  'priceValidUntil': prefix.sdo('priceValidUntil'),
  // Indicates the main image on the page.
  'primaryImageOfPage': prefix.sdo('primaryImageOfPage'),
  // A preventative therapy used to prevent an initial occurrence of the medical condition, such as vaccination.
  'primaryPrevention': prefix.sdo('primaryPrevention'),
  // The number of the column in which the NewsArticle appears in the print edition.
  'printColumn': prefix.sdo('printColumn'),
  // The edition of the print product in which the NewsArticle appears.
  'printEdition': prefix.sdo('printEdition'),
  // If this NewsArticle appears in print, this field indicates the name of the page on which the article is found. Please note that this field is intended for the exact page name (e.g. A5, B18).
  'printPage': prefix.sdo('printPage'),
  // If this NewsArticle appears in print, this field indicates the print section in which the article appeared.
  'printSection': prefix.sdo('printSection'),
  // A description of the procedure involved in setting up, using, and/or installing the device.
  'procedure': prefix.sdo('procedure'),
  // The type of procedure, for example Surgical, Noninvasive, or Percutaneous.
  'procedureType': prefix.sdo('procedureType'),
  // Estimated processing time for the service using this channel.
  'processingTime': prefix.sdo('processingTime'),
  // Processor architecture required to run the application (e.g. IA64).
  'processorRequirements': prefix.sdo('processorRequirements'),
  // The person or organization who produced the work (e.g. music album, movie, tv/radio series etc.).
  'producer': prefix.sdo('producer'),
  // The tangible thing generated by the service, e.g. a passport, permit, etc.
  'produces': prefix.sdo('produces'),
  // Indicates a textual identifier for a ProductGroup.
  'productGroupID': prefix.sdo('productGroupID'),
  // The product identifier, such as ISBN. For example: ``` meta itemprop=\"productID\" content=\"isbn:123-456-789\" ```.
  'productID': prefix.sdo('productID'),
  // The productReturnDays property indicates the number of days (from purchase) within which relevant product return policy is applicable.
  'productReturnDays': prefix.sdo('productReturnDays'),
  // Indicates a Web page or service by URL, for product return.
  'productReturnLink': prefix.sdo('productReturnLink'),
  // The product or service this support contact point is related to (such as product support for a particular product line). This can be a specific product or product line (e.g. \"iPhone\") or a general category of products or services (e.g. \"smartphones\").
  'productSupported': prefix.sdo('productSupported'),
  // The production company or studio responsible for the item e.g. series, video game, episode etc.
  'productionCompany': prefix.sdo('productionCompany'),
  // The date of production of the item, e.g. vehicle.
  'productionDate': prefix.sdo('productionDate'),
  // Proficiency needed for this content; expected values: 'Beginner', 'Expert'.
  'proficiencyLevel': prefix.sdo('proficiencyLevel'),
  // Any membership in a frequent flyer, hotel loyalty program, etc. being applied to the reservation.
  'programMembershipUsed': prefix.sdo('programMembershipUsed'),
  // The program providing the membership.
  'programName': prefix.sdo('programName'),
  // Prerequisites for enrolling in the program.
  'programPrerequisites': prefix.sdo('programPrerequisites'),
  // The type of educational or occupational program. For example, classroom, internship, alternance, etc..
  'programType': prefix.sdo('programType'),
  // The computer programming language.
  'programmingLanguage': prefix.sdo('programmingLanguage'),
  // Indicates whether API is managed or unmanaged.
  'programmingModel': prefix.sdo('programmingModel'),
  // A commonly used identifier for the characteristic represented by the property, e.g. a manufacturer or a standard code for a property. propertyID can be(1) a prefixed string, mainly meant to be used with standards for product properties; (2) a site-specific, non-prefixed string (e.g. the primary key of the property or the vendor-specific id of the property), or (3)a URL indicating the type of the property, either pointing to an external vocabulary, or a Web resource that describes the property (e.g. a glossary entry).Standards bodies should promote a standard prefix for the identifiers of properties from their standards.
  'propertyID': prefix.sdo('propertyID'),
  // Proprietary name given to the diet plan, typically by its originator or creator.
  'proprietaryName': prefix.sdo('proprietaryName'),
  // The number of grams of protein.
  'proteinContent': prefix.sdo('proteinContent'),
  // The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller.
  'provider': prefix.sdo('provider'),
  // Indicates the mobility of a provided service (e.g. 'static', 'dynamic').
  'providerMobility': prefix.sdo('providerMobility'),
  // The BroadcastService offered on this channel.
  'providesBroadcastService': prefix.sdo('providesBroadcastService'),
  // The service provided by this channel.
  'providesService': prefix.sdo('providesService'),
  // A flag to signal that the [[Place]] is open to public visitors.  If this property is omitted there is no assumed default boolean value
  'publicAccess': prefix.sdo('publicAccess'),
  // Information about public transport closures.
  'publicTransportClosuresInfo': prefix.sdo('publicTransportClosuresInfo'),
  // A publication event associated with the item.
  'publication': prefix.sdo('publication'),
  // The type of the medical article, taken from the US NLM MeSH publication type catalog. See also [MeSH documentation](http://www.nlm.nih.gov/mesh/pubtypes.html).
  'publicationType': prefix.sdo('publicationType'),
  // An agent associated with the publication event.
  'publishedBy': prefix.sdo('publishedBy'),
  // A broadcast service associated with the publication event.
  'publishedOn': prefix.sdo('publishedOn'),
  // The publisher of the creative work.
  'publisher': prefix.sdo('publisher'),
  // The publishing division which published the comic.
  'publisherImprint': prefix.sdo('publisherImprint'),
  // The publishingPrinciples property indicates (typically via [[URL]]) a document describing the editorial principles of an [[Organization]] (or individual e.g. a [[Person]] writing a blog) that relate to their activities as a publisher, e.g. ethics or diversity policies. When applied to a [[CreativeWork]] (e.g. [[NewsArticle]]) the principles are those of the party primarily responsible for the creation of the [[CreativeWork]].While such policies are most typically expressed in natural language, sometimes related information (e.g. indicating a [[funder]]) can be expressed using schema.org terminology.
  'publishingPrinciples': prefix.sdo('publishingPrinciples'),
  // The date the item e.g. vehicle was purchased by the current owner.
  'purchaseDate': prefix.sdo('purchaseDate'),
  // Specific qualifications required for this role or Occupation.
  'qualifications': prefix.sdo('qualifications'),
  // Guidelines about quarantine rules, e.g. in the context of a pandemic.
  'quarantineGuidelines': prefix.sdo('quarantineGuidelines'),
  // A sub property of instrument. The query used on this action.
  'query': prefix.sdo('query'),
  // The task that a player-controlled character, or group of characters may complete in order to gain a reward.
  'quest': prefix.sdo('quest'),
  // A sub property of object. A question.
  'question': prefix.sdo('question'),
  // Relates a property to a class that constitutes (one of) the expected type(s) for values of the property.
  'rangeIncludes': prefix.sdo('rangeIncludes'),
  // The count of total number of ratings.
  'ratingCount': prefix.sdo('ratingCount'),
  // A short explanation (e.g. one to two sentences) providing background context and other information that led to the conclusion expressed in the rating. This is particularly applicable to ratings associated with \"fact check\" markup using [[ClaimReview]].
  'ratingExplanation': prefix.sdo('ratingExplanation'),
  // The rating for the content.Usage guidelines:* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
  'ratingValue': prefix.sdo('ratingValue'),
  // A person who reads (performs) the audiobook.
  'readBy': prefix.sdo('readBy'),
  // Whether or not a property is mutable.  Default is false. Specifying this for a property that also has a value makes it act similar to a \"hidden\" input in an HTML form.
  'readonlyValue': prefix.sdo('readonlyValue'),
  // A sub property of participant. The real estate agent involved in the action.
  'realEstateAgent': prefix.sdo('realEstateAgent'),
  // A sub property of instrument. The recipe/instructions used to perform the action.
  'recipe': prefix.sdo('recipe'),
  // The category of the recipe—for example, appetizer, entree, etc.
  'recipeCategory': prefix.sdo('recipeCategory'),
  // The cuisine of the recipe (for example, French or Ethiopian).
  'recipeCuisine': prefix.sdo('recipeCuisine'),
  // A single ingredient used in the recipe, e.g. sugar, flour or garlic.
  'recipeIngredient': prefix.sdo('recipeIngredient'),
  // A step in making the recipe, in the form of a single item (document, video, etc.) or an ordered list with HowToStep and/or HowToSection items.
  'recipeInstructions': prefix.sdo('recipeInstructions'),
  // The quantity produced by the recipe (for example, number of people served, number of servings, etc).
  'recipeYield': prefix.sdo('recipeYield'),
  // A sub property of participant. The participant who is at the receiving end of the action.
  'recipient': prefix.sdo('recipient'),
  // An organization that acknowledges the validity, value or utility of a credential. Note: recognition may include a process of quality assurance or accreditation.
  'recognizedBy': prefix.sdo('recognizedBy'),
  // If applicable, the organization that officially recognizes this entity as part of its endorsed system of medicine.
  'recognizingAuthority': prefix.sdo('recognizingAuthority'),
  // Strength of the guideline's recommendation (e.g. 'class I').
  'recommendationStrength': prefix.sdo('recommendationStrength'),
  // Recommended intake of this supplement for a given population as defined by a specific recommending authority.
  'recommendedIntake': prefix.sdo('recommendedIntake'),
  // The label that issued the release.
  'recordLabel': prefix.sdo('recordLabel'),
  // An audio recording of the work.
  'recordedAs': prefix.sdo('recordedAs'),
  // The Event where the CreativeWork was recorded. The CreativeWork may capture all or part of the event.
  'recordedAt': prefix.sdo('recordedAt'),
  // The CreativeWork that captured all or part of this Event.
  'recordedIn': prefix.sdo('recordedIn'),
  // The composition this track is a recording of.
  'recordingOf': prefix.sdo('recordingOf'),
  // The only way you get the money back in the event of default is the security. Recourse is where you still have the opportunity to go back to the borrower for the rest of the money.
  'recourseLoan': prefix.sdo('recourseLoan'),
  // The reference quantity for which a certain price applies, e.g. 1 EUR per 4 kWh of electricity. This property is a replacement for unitOfMeasurement for the advanced cases where the price does not relate to a standard unit.
  'referenceQuantity': prefix.sdo('referenceQuantity'),
  // The Order(s) related to this Invoice. One or more Orders may be combined into a single Invoice.
  'referencesOrder': prefix.sdo('referencesOrder'),
  // A refund type, from an enumerated list.
  'refundType': prefix.sdo('refundType'),
  // The anatomical or organ system drained by this vessel; generally refers to a specific part of an organ.
  'regionDrained': prefix.sdo('regionDrained'),
  // The regions where the media is allowed. If not specified, then it's assumed to be allowed everywhere. Specify the countries in [ISO 3166 format](http://en.wikipedia.org/wiki/ISO_3166).
  'regionsAllowed': prefix.sdo('regionsAllowed'),
  // Anatomical systems or structures that relate to the superficial anatomy.
  'relatedAnatomy': prefix.sdo('relatedAnatomy'),
  // A medical condition associated with this anatomy.
  'relatedCondition': prefix.sdo('relatedCondition'),
  // Any other drug related to this one, for example commonly-prescribed alternatives.
  'relatedDrug': prefix.sdo('relatedDrug'),
  // A link related to this web page, for example to other related web pages.
  'relatedLink': prefix.sdo('relatedLink'),
  // Related anatomical structure(s) that are not part of the system but relate or connect to it, such as vascular bundles associated with an organ system.
  'relatedStructure': prefix.sdo('relatedStructure'),
  // A medical therapy related to this anatomy.
  'relatedTherapy': prefix.sdo('relatedTherapy'),
  // The most generic familial relation.
  'relatedTo': prefix.sdo('relatedTo'),
  // The release date of a product or product model. This can be used to distinguish the exact variant of a product.
  'releaseDate': prefix.sdo('releaseDate'),
  // Description of what changed in this version.
  'releaseNotes': prefix.sdo('releaseNotes'),
  // The album this is a release of.
  'releaseOf': prefix.sdo('releaseOf'),
  // The place and time the release was issued, expressed as a PublicationEvent.
  'releasedEvent': prefix.sdo('releasedEvent'),
  // The Occupation for the JobPosting.
  'relevantOccupation': prefix.sdo('relevantOccupation'),
  // If applicable, a medical specialty in which this entity is relevant.
  'relevantSpecialty': prefix.sdo('relevantSpecialty'),
  // The number of attendee places for an event that remain unallocated.
  'remainingAttendeeCapacity': prefix.sdo('remainingAttendeeCapacity'),
  // Whether the terms for payment of interest can be renegotiated during the life of the loan.
  'renegotiableLoan': prefix.sdo('renegotiableLoan'),
  // Defines the number of times a recurring [[Event]] will take place
  'repeatCount': prefix.sdo('repeatCount'),
  // Defines the frequency at which [[Event]]s will occur according to a schedule [[Schedule]]. The intervals between      events should be defined as a [[Duration]] of time.
  'repeatFrequency': prefix.sdo('repeatFrequency'),
  // Number of times one should repeat the activity.
  'repetitions': prefix.sdo('repetitions'),
  // A sub property of object. The object that is being replaced.
  'replacee': prefix.sdo('replacee'),
  // A sub property of object. The object that replaces.
  'replacer': prefix.sdo('replacer'),
  // The URL at which a reply may be posted to the specified UserComment.
  'replyToUrl': prefix.sdo('replyToUrl'),
  // The number or other unique designator assigned to a Report by the publishing organization.
  'reportNumber': prefix.sdo('reportNumber'),
  // Indicates whether this image is representative of the content of the page.
  'representativeOfPage': prefix.sdo('representativeOfPage'),
  // Assets required to secure loan or credit repayments. It may take form of third party pledge, goods, financial instruments (cash, securities, etc.)
  'requiredCollateral': prefix.sdo('requiredCollateral'),
  // Audiences defined by a person's gender.
  'requiredGender': prefix.sdo('requiredGender'),
  // Audiences defined by a person's maximum age.
  'requiredMaxAge': prefix.sdo('requiredMaxAge'),
  // Audiences defined by a person's minimum age.
  'requiredMinAge': prefix.sdo('requiredMinAge'),
  // The required quantity of the item(s).
  'requiredQuantity': prefix.sdo('requiredQuantity'),
  // Component dependency requirements for application. This includes runtime environments and shared libraries that are not included in the application distribution package, but required to run the application (Examples: DirectX, Java or .NET runtime).
  'requirements': prefix.sdo('requirements'),
  // Indicates if use of the media require a subscription  (either paid or free). Allowed values are ```true``` or ```false``` (note that an earlier version had 'yes', 'no').
  'requiresSubscription': prefix.sdo('requiresSubscription'),
  // The thing -- flight, event, restaurant,etc. being reserved.
  'reservationFor': prefix.sdo('reservationFor'),
  // A unique identifier for the reservation.
  'reservationId': prefix.sdo('reservationId'),
  // The current status of the reservation.
  'reservationStatus': prefix.sdo('reservationStatus'),
  // A ticket associated with the reservation.
  'reservedTicket': prefix.sdo('reservedTicket'),
  // Responsibilities associated with this role or Occupation.
  'responsibilities': prefix.sdo('responsibilities'),
  // How often one should break from the activity.
  'restPeriods': prefix.sdo('restPeriods'),
  // Use [[MonetaryAmount]] to specify a fixed restocking fee for product returns, or use [[Number]] to specify a percentage of the product price paid by the customer.
  'restockingFee': prefix.sdo('restockingFee'),
  // The result produced in the action. e.g. John wrote *a book*.
  'result': prefix.sdo('result'),
  // A sub property of result. The Comment created or sent as a result of this action.
  'resultComment': prefix.sdo('resultComment'),
  // A sub property of result. The review that resulted in the performing of the action.
  'resultReview': prefix.sdo('resultReview'),
  // The type of return fees for purchased products (for any return reason)
  'returnFees': prefix.sdo('returnFees'),
  // The method (from an enumeration) by which the customer obtains a return shipping label for a product returned for any reason.
  'returnLabelSource': prefix.sdo('returnLabelSource'),
  // The type of return method offered, specified from an enumeration.
  'returnMethod': prefix.sdo('returnMethod'),
  // Specifies an applicable return policy (from an enumeration).
  'returnPolicyCategory': prefix.sdo('returnPolicyCategory'),
  // The country where the product has to be sent to for returns, for example \"Ireland\" using the [[name]] property of [[Country]]. You can also provide the two-letter [ISO 3166-1 alpha-2 country code](http://en.wikipedia.org/wiki/ISO_3166-1). Note that this can be different from the country where the product was originally shipped from or sent too.
  'returnPolicyCountry': prefix.sdo('returnPolicyCountry'),
  // Seasonal override of a return policy.
  'returnPolicySeasonalOverride': prefix.sdo('returnPolicySeasonalOverride'),
  // Amount of shipping costs for product returns (for any reason). Applicable when property [[returnFees]] equals [[ReturnShippingFees]].
  'returnShippingFeesAmount': prefix.sdo('returnShippingFeesAmount'),
  // A review of the item.
  'review': prefix.sdo('review'),
  // This Review or Rating is relevant to this part or facet of the itemReviewed.
  'reviewAspect': prefix.sdo('reviewAspect'),
  // The actual body of the review.
  'reviewBody': prefix.sdo('reviewBody'),
  // The count of total number of reviews.
  'reviewCount': prefix.sdo('reviewCount'),
  // The rating given in this review. Note that reviews can themselves be rated. The ```reviewRating``` applies to rating given by the review. The [[aggregateRating]] property applies to the review itself, as a creative work.
  'reviewRating': prefix.sdo('reviewRating'),
  // People or organizations that have reviewed the content on this web page for accuracy and/or completeness.
  'reviewedBy': prefix.sdo('reviewedBy'),
  // Review of the item.
  'reviews': prefix.sdo('reviews'),
  // A modifiable or non-modifiable factor that increases the risk of a patient contracting this condition, e.g. age,  coexisting condition.
  'riskFactor': prefix.sdo('riskFactor'),
  // Specific physiologic risks associated to the diet plan.
  'risks': prefix.sdo('risks'),
  // A role played, performed or filled by a person or organization. For example, the team of creators for a comic book might fill the roles named 'inker', 'penciller', and 'letterer'; or an athlete in a SportsTeam might play in the position named 'Quarterback'.
  'roleName': prefix.sdo('roleName'),
  // The permitted total weight of cargo and installations (e.g. a roof rack) on top of the vehicle.Typical unit code(s): KGM for kilogram, LBR for pound* Note 1: You can indicate additional information in the [[name]] of the [[QuantitativeValue]] node.* Note 2: You may also link to a [[QualitativeValue]] node that provides additional information using [[valueReference]]* Note 3: Note that you can use [[minValue]] and [[maxValue]] to indicate ranges.
  'roofLoad': prefix.sdo('roofLoad'),
  // The response (yes, no, maybe) to the RSVP.
  'rsvpResponse': prefix.sdo('rsvpResponse'),
  // The vasculature the lymphatic structure runs, or efferents, to.
  'runsTo': prefix.sdo('runsTo'),
  // Runtime platform or script interpreter dependencies (Example - Java v1, Python2.3, .Net Framework 3.0).
  'runtime': prefix.sdo('runtime'),
  // Runtime platform or script interpreter dependencies (Example - Java v1, Python2.3, .Net Framework 3.0).
  'runtimePlatform': prefix.sdo('runtimePlatform'),
  // The RxCUI drug identifier from RXNORM.
  'rxcui': prefix.sdo('rxcui'),
  // Any potential safety concern associated with the supplement. May include interactions with other drugs and foods, pregnancy, breastfeeding, known adverse reactions, and documented efficacy of the supplement.
  'safetyConsideration': prefix.sdo('safetyConsideration'),
  // The currency (coded using [ISO 4217](http://en.wikipedia.org/wiki/ISO_4217) ) used for the main salary information in this job posting or for this employee.
  'salaryCurrency': prefix.sdo('salaryCurrency'),
  // The expected salary upon completing the training.
  'salaryUponCompletion': prefix.sdo('salaryUponCompletion'),
  // URL of a reference Web page that unambiguously indicates the item's identity. E.g. the URL of the item's Wikipedia page, Wikidata entry, or official website.
  'sameAs': prefix.sdo('sameAs'),
  // What type of code sample: full (compile ready) solution, code snippet, inline code, scripts, template.
  'sampleType': prefix.sdo('sampleType'),
  // The number of grams of saturated fat.
  'saturatedFatContent': prefix.sdo('saturatedFatContent'),
  // Indicates the timezone for which the time(s) indicated in the [[Schedule]] are given. The value provided should be among those listed in the IANA Time Zone Database.
  'scheduleTimezone': prefix.sdo('scheduleTimezone'),
  // The date the invoice is scheduled to be paid.
  'scheduledPaymentDate': prefix.sdo('scheduledPaymentDate'),
  // The time the object is scheduled to.
  'scheduledTime': prefix.sdo('scheduledTime'),
  // Indicates (by URL or string) a particular version of a schema used in some CreativeWork. This property was created primarily to    indicate the use of a specific schema.org release, e.g. ```10.0``` as a simple string, or more explicitly via URL, ```https://schema.org/docs/releases.html#v10.0```. There may be situations in which other schemas might usefully be referenced this way, e.g. ```http://dublincore.org/specifications/dublin-core/dces/1999-07-02/``` but this has not been carefully explored in the community.
  'schemaVersion': prefix.sdo('schemaVersion'),
  // Information about school closures.
  'schoolClosuresInfo': prefix.sdo('schoolClosuresInfo'),
  // The number of screens in the movie theater.
  'screenCount': prefix.sdo('screenCount'),
  // A link to a screenshot image of the app.
  'screenshot': prefix.sdo('screenshot'),
  // Indicates the date on which the current structured data was generated / published. Typically used alongside [[sdPublisher]]
  'sdDatePublished': prefix.sdo('sdDatePublished'),
  // A license document that applies to this structured data, typically indicated by URL.
  'sdLicense': prefix.sdo('sdLicense'),
  // Indicates the party responsible for generating and publishing the current structured data markup, typically in cases where the structured data is derived automatically from existing published content but published on a different site. For example, student projects and open data initiatives often re-publish existing content with more explicitly structured metadata. The[[sdPublisher]] property helps make such practices more explicit.
  'sdPublisher': prefix.sdo('sdPublisher'),
  // A season in a media series.
  'season': prefix.sdo('season'),
  // Position of the season within an ordered group of seasons.
  'seasonNumber': prefix.sdo('seasonNumber'),
  // A season in a media series.
  'seasons': prefix.sdo('seasons'),
  // The location of the reserved seat (e.g., 27).
  'seatNumber': prefix.sdo('seatNumber'),
  // The row location of the reserved seat (e.g., B).
  'seatRow': prefix.sdo('seatRow'),
  // The section location of the reserved seat (e.g. Orchestra).
  'seatSection': prefix.sdo('seatSection'),
  // The number of persons that can be seated (e.g. in a vehicle), both in terms of the physical space available, and in terms of limitations set by law.Typical unit code(s): C62 for persons
  'seatingCapacity': prefix.sdo('seatingCapacity'),
  // The type/class of the seat.
  'seatingType': prefix.sdo('seatingType'),
  // A preventative therapy used to prevent reoccurrence of the medical condition after an initial episode of the condition.
  'secondaryPrevention': prefix.sdo('secondaryPrevention'),
  // A description of any security clearance requirements of the job.
  'securityClearanceRequirement': prefix.sdo('securityClearanceRequirement'),
  // The type of security screening the passenger is subject to.
  'securityScreening': prefix.sdo('securityScreening'),
  // A pointer to products or services sought by the organization or person (demand).
  'seeks': prefix.sdo('seeks'),
  // An entity which offers (sells / leases / lends / loans) the services / goods.  A seller may also be a provider.
  'seller': prefix.sdo('seller'),
  // A sub property of participant. The participant who is at the sending end of the action.
  'sender': prefix.sdo('sender'),
  // A description of any sensory requirements and levels necessary to function on the job, including hearing and vision. Defined terms such as those in O*net may be used, but note that there is no way to specify the level of ability as well as its nature when using a defined term.
  'sensoryRequirement': prefix.sdo('sensoryRequirement'),
  // The neurological pathway extension that inputs and sends information to the brain or spinal cord.
  'sensoryUnit': prefix.sdo('sensoryUnit'),
  // The serial number or any alphanumeric identifier of a particular product. When attached to an offer, it is a shortcut for the serial number of the product included in the offer.
  'serialNumber': prefix.sdo('serialNumber'),
  // A possible serious complication and/or serious side effect of this therapy. Serious adverse outcomes include those that are life-threatening; result in death, disability, or permanent damage; require hospitalization or prolong existing hospitalization; cause congenital anomalies or birth defects; or jeopardize the patient and may require medical or surgical intervention to prevent one of the outcomes in this definition.
  'seriousAdverseOutcome': prefix.sdo('seriousAdverseOutcome'),
  // Status of a game server.
  'serverStatus': prefix.sdo('serverStatus'),
  // The cuisine of the restaurant.
  'servesCuisine': prefix.sdo('servesCuisine'),
  // The geographic area where the service is provided.
  'serviceArea': prefix.sdo('serviceArea'),
  // The audience eligible for this service.
  'serviceAudience': prefix.sdo('serviceAudience'),
  // The location (e.g. civic structure, local business, etc.) where a person can go to access the service.
  'serviceLocation': prefix.sdo('serviceLocation'),
  // The operating organization, if different from the provider.  This enables the representation of services that are provided by an organization, but operated by another organization like a subcontractor.
  'serviceOperator': prefix.sdo('serviceOperator'),
  // The tangible thing generated by the service, e.g. a passport, permit, etc.
  'serviceOutput': prefix.sdo('serviceOutput'),
  // The phone number to use to access the service.
  'servicePhone': prefix.sdo('servicePhone'),
  // The address for accessing the service by mail.
  'servicePostalAddress': prefix.sdo('servicePostalAddress'),
  // The number to access the service by text message.
  'serviceSmsNumber': prefix.sdo('serviceSmsNumber'),
  // The type of service being offered, e.g. veterans' benefits, emergency relief, etc.
  'serviceType': prefix.sdo('serviceType'),
  // The website to access the service.
  'serviceUrl': prefix.sdo('serviceUrl'),
  // The serving size, in terms of the number of volume or mass.
  'servingSize': prefix.sdo('servingSize'),
  // The [SHA-2](https://en.wikipedia.org/wiki/SHA-2) SHA256 hash of the content of the item. For example, a zero-length input has value 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  'sha256': prefix.sdo('sha256'),
  // A CreativeWork such as an image, video, or audio clip shared as part of this posting.
  'sharedContent': prefix.sdo('sharedContent'),
  // indicates (possibly multiple) shipping destinations. These can be defined in several ways e.g. postalCode ranges.
  'shippingDestination': prefix.sdo('shippingDestination'),
  // Indicates information about the shipping policies and options associated with an [[Offer]].
  'shippingDetails': prefix.sdo('shippingDetails'),
  // Label to match an [[OfferShippingDetails]] with a [[ShippingRateSettings]] (within the context of a [[shippingSettingsLink]] cross-reference).
  'shippingLabel': prefix.sdo('shippingLabel'),
  // The shipping rate is the cost of shipping to the specified destination. Typically, the maxValue and currency values (of the [[MonetaryAmount]]) are most appropriate.
  'shippingRate': prefix.sdo('shippingRate'),
  // Link to a page containing [[ShippingRateSettings]] and [[DeliveryTimeSettings]] details.
  'shippingSettingsLink': prefix.sdo('shippingSettingsLink'),
  // A sibling of the person.
  'sibling': prefix.sdo('sibling'),
  // A sibling of the person.
  'siblings': prefix.sdo('siblings'),
  // A sign detected by the test.
  'signDetected': prefix.sdo('signDetected'),
  // A sign or symptom of this condition. Signs are objective or physically observable manifestations of the medical condition while symptoms are the subjective experience of the medical condition.
  'signOrSymptom': prefix.sdo('signOrSymptom'),
  // The significance associated with the superficial anatomy; as an example, how characteristics of the superficial anatomy can suggest underlying medical conditions or courses of treatment.
  'significance': prefix.sdo('significance'),
  // One of the more significant URLs on the page. Typically, these are the non-navigation links that are clicked on the most.
  'significantLink': prefix.sdo('significantLink'),
  // The most significant URLs on the page. Typically, these are the non-navigation links that are clicked on the most.
  'significantLinks': prefix.sdo('significantLinks'),
  // A standardized size of a product or creative work, specified either through a simple textual string (for example 'XL', '32Wx34L'), a  QuantitativeValue with a unitCode, or a comprehensive and structured [[SizeSpecification]]; in other cases, the [[width]], [[height]], [[depth]] and [[weight]] properties may be more applicable.
  'size': prefix.sdo('size'),
  // The size group (also known as \"size type\") for a product's size. Size groups are common in the fashion industry to define size segments and suggested audiences for wearable products. Multiple values can be combined, for example \"men's big and tall\", \"petite maternity\" or \"regular\"
  'sizeGroup': prefix.sdo('sizeGroup'),
  // The size system used to identify a product's size. Typically either a standard (for example, \"GS1\" or \"ISO-EN13402\"), country code (for example \"US\" or \"JP\"), or a measuring system (for example \"Metric\" or \"Imperial\").
  'sizeSystem': prefix.sdo('sizeSystem'),
  // A statement of knowledge, skill, ability, task or any other assertion expressing a competency that is desired or required to fulfill this role or to work in this occupation.
  'skills': prefix.sdo('skills'),
  // The Stock Keeping Unit (SKU), i.e. a merchant-specific identifier for a product or service, or the product to which the offer refers.
  'sku': prefix.sdo('sku'),
  // A slogan or motto associated with the item.
  'slogan': prefix.sdo('slogan'),
  // A specification in form of a line notation for describing the structure of chemical species using short ASCII strings.  Double bond stereochemistry \\ indicators may need to be escaped in the string in formats where the backslash is an escape character.
  'smiles': prefix.sdo('smiles'),
  // Indicates whether it is allowed to smoke in the place, e.g. in the restaurant, hotel or hotel room.
  'smokingAllowed': prefix.sdo('smokingAllowed'),
  // The number of milligrams of sodium.
  'sodiumContent': prefix.sdo('sodiumContent'),
  // Additional content for a software application.
  'softwareAddOn': prefix.sdo('softwareAddOn'),
  // Software application help.
  'softwareHelp': prefix.sdo('softwareHelp'),
  // Component dependency requirements for application. This includes runtime environments and shared libraries that are not included in the application distribution package, but required to run the application (Examples: DirectX, Java or .NET runtime).
  'softwareRequirements': prefix.sdo('softwareRequirements'),
  // Version of the software instance.
  'softwareVersion': prefix.sdo('softwareVersion'),
  // The Organization on whose behalf the creator was working.
  'sourceOrganization': prefix.sdo('sourceOrganization'),
  // The neurological pathway that originates the neurons.
  'sourcedFrom': prefix.sdo('sourcedFrom'),
  // The \"spatial\" property can be used in cases when more specific properties(e.g. [[locationCreated]], [[spatialCoverage]], [[contentLocation]]) are not known to be appropriate.
  'spatial': prefix.sdo('spatial'),
  // The spatialCoverage of a CreativeWork indicates the place(s) which are the focus of the content. It is a subproperty of      contentLocation intended primarily for more technical and detailed materials. For example with a Dataset, it indicates      areas that the dataset describes: a dataset of New York weather would have spatialCoverage which was the place: the state of New York.
  'spatialCoverage': prefix.sdo('spatialCoverage'),
  // Indicates sections of a Web page that are particularly 'speakable' in the sense of being highlighted as being especially appropriate for text-to-speech conversion. Other sections of a page may also be usefully spoken in particular circumstances; the 'speakable' property serves to indicate the parts most likely to be generally useful for speech.The *speakable* property can be repeated an arbitrary number of times, with three kinds of possible 'content-locator' values:1.) *id-value* URL references - uses *id-value* of an element in the page being annotated. The simplest use of *speakable* has (potentially relative) URL values, referencing identified sections of the document concerned.2.) CSS Selectors - addresses content in the annotated page, eg. via class attribute. Use the [[cssSelector]] property.3.)  XPaths - addresses content via XPaths (assuming an XML view of the content). Use the [[xpath]] property.For more sophisticated markup of speakable sections beyond simple ID references, either CSS selectors or XPath expressions to pick out document section(s) as speakable. For thiswe define a supporting type, [[SpeakableSpecification]]  which is defined to be a possible value of the *speakable* property.
  'speakable': prefix.sdo('speakable'),
  // Any special commitments associated with this job posting. Valid entries include VeteranCommit, MilitarySpouseCommit, etc.
  'specialCommitments': prefix.sdo('specialCommitments'),
  // The special opening hours of a certain place.Use this to explicitly override general opening hours brought in scope by [[openingHoursSpecification]] or [[openingHours]].
  'specialOpeningHoursSpecification': prefix.sdo('specialOpeningHoursSpecification'),
  // One of the domain specialities to which this web page's content applies.
  'specialty': prefix.sdo('specialty'),
  // Form of markup used. eg. [SSML](https://www.w3.org/TR/speech-synthesis11) or [IPA](https://www.wikidata.org/wiki/Property:P898).
  'speechToTextMarkup': prefix.sdo('speechToTextMarkup'),
  // The speed range of the vehicle. If the vehicle is powered by an engine, the upper limit of the speed range (indicated by [[maxValue]] should be the maximum speed achievable under regular conditions.Typical unit code(s): KMH for km/h, HM for mile per hour (0.447 04 m/s), KNT for knot*Note 1: Use [[minValue]] and [[maxValue]] to indicate the range. Typically, the minimal value is zero.* Note 2: There are many different ways of measuring the speed range. You can link to information about how the given value has been determined using the [[valueReference]] property.
  'speed': prefix.sdo('speed'),
  // The (e.g. fictional) character, Person or Organization to whom the quotation is attributed within the containing CreativeWork.
  'spokenByCharacter': prefix.sdo('spokenByCharacter'),
  // A person or organization that supports a thing through a pledge, promise, or financial contribution. e.g. a sponsor of a Medical Study or a corporate sponsor of an event.
  'sponsor': prefix.sdo('sponsor'),
  // A type of sport (e.g. Baseball).
  'sport': prefix.sdo('sport'),
  // A sub property of location. The sports activity location where this action occurred.
  'sportsActivityLocation': prefix.sdo('sportsActivityLocation'),
  // A sub property of location. The sports event where this action occurred.
  'sportsEvent': prefix.sdo('sportsEvent'),
  // A sub property of participant. The sports team that participated on this action.
  'sportsTeam': prefix.sdo('sportsTeam'),
  // The person's spouse.
  'spouse': prefix.sdo('spouse'),
  // The stage of the condition, if applicable.
  'stage': prefix.sdo('stage'),
  // The stage represented as a number, e.g. 3.
  'stageAsNumber': prefix.sdo('stageAsNumber'),
  // An official rating for a lodging business or food establishment, e.g. from national associations or standards bodies. Use the author property to indicate the rating organization, e.g. as an Organization with name such as (e.g. HOTREC, DEHOGA, WHR, or Hotelstars).
  'starRating': prefix.sdo('starRating'),
  // The start date and time of the item (in [ISO 8601 date format](http://en.wikipedia.org/wiki/ISO_8601)).
  'startDate': prefix.sdo('startDate'),
  // The start time of the clip expressed as the number of seconds from the beginning of the work.
  'startOffset': prefix.sdo('startOffset'),
  // The startTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to start. For actions that span a period of time, when the action was performed. e.g. John wrote a book from *January* to December. For media, including audio and video, it's the time offset of the start of a clip within a larger file.Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
  'startTime': prefix.sdo('startTime'),
  // The status of the study (enumerated).
  'status': prefix.sdo('status'),
  // The position of the steering wheel or similar device (mostly for cars).
  'steeringPosition': prefix.sdo('steeringPosition'),
  // A single step item (as HowToStep, text, document, video, etc.) or a HowToSection.
  'step': prefix.sdo('step'),
  // The stepValue attribute indicates the granularity that is expected (and required) of the value in a PropertyValueSpecification.
  'stepValue': prefix.sdo('stepValue'),
  // A single step item (as HowToStep, text, document, video, etc.) or a HowToSection (originally misnamed 'steps'; 'step' is preferred).
  'steps': prefix.sdo('steps'),
  // Storage requirements (free space required).
  'storageRequirements': prefix.sdo('storageRequirements'),
  // The street address. For example, 1600 Amphitheatre Pkwy.
  'streetAddress': prefix.sdo('streetAddress'),
  // The units of an active ingredient's strength, e.g. mg.
  'strengthUnit': prefix.sdo('strengthUnit'),
  // The value of an active ingredient's strength, e.g. 325.
  'strengthValue': prefix.sdo('strengthValue'),
  // The name given to how bone physically connects to each other.
  'structuralClass': prefix.sdo('structuralClass'),
  // A medical study or trial related to this entity.
  'study': prefix.sdo('study'),
  // Specifics about the observational study design (enumerated).
  'studyDesign': prefix.sdo('studyDesign'),
  // The location in which the study is taking/took place.
  'studyLocation': prefix.sdo('studyLocation'),
  // A subject of the study, i.e. one of the medical conditions, therapies, devices, drugs, etc. investigated by the study.
  'studySubject': prefix.sdo('studySubject'),
  // This is a StupidProperty! - for testing only
  'stupidProperty': prefix.sdo('stupidProperty'),
  // An Event that is part of this event. For example, a conference event includes many presentations, each of which is a subEvent of the conference.
  'subEvent': prefix.sdo('subEvent'),
  // Events that are a part of this event. For example, a conference event includes many presentations, each subEvents of the conference.
  'subEvents': prefix.sdo('subEvents'),
  // A relationship between two organizations where the first includes the second, e.g., as a subsidiary. See also: the more specific 'department' property.
  'subOrganization': prefix.sdo('subOrganization'),
  // The individual reservations included in the package. Typically a repeated property.
  'subReservation': prefix.sdo('subReservation'),
  // The substage, e.g. 'a' for Stage IIIa.
  'subStageSuffix': prefix.sdo('subStageSuffix'),
  // Component (sub-)structure(s) that comprise this anatomical structure.
  'subStructure': prefix.sdo('subStructure'),
  // A component test of the panel.
  'subTest': prefix.sdo('subTest'),
  // Identifies a [[Trip]] that is a subTrip of this Trip.  For example Day 1, Day 2, etc. of a multi-day trip.
  'subTrip': prefix.sdo('subTrip'),
  // A CreativeWork or Event about this Thing.
  'subjectOf': prefix.sdo('subjectOf'),
  // Languages in which subtitles/captions are available, in [IETF BCP 47 standard format](http://tools.ietf.org/html/bcp47).
  'subtitleLanguage': prefix.sdo('subtitleLanguage'),
  // A pointer from a newer variant of a product  to its previous, often discontinued predecessor.
  'successorOf': prefix.sdo('successorOf'),
  // The number of grams of sugar.
  'sugarContent': prefix.sdo('sugarContent'),
  // The age or age range for the intended audience or person, for example 3-12 months for infants, 1-5 years for toddlers.
  'suggestedAge': prefix.sdo('suggestedAge'),
  // An answer (possibly one of several, possibly incorrect) to a Question, e.g. on a Question/Answer site.
  'suggestedAnswer': prefix.sdo('suggestedAnswer'),
  // The suggested gender of the intended person or audience, for example \"male\", \"female\", or \"unisex\".
  'suggestedGender': prefix.sdo('suggestedGender'),
  // Maximum recommended age in years for the audience or user.
  'suggestedMaxAge': prefix.sdo('suggestedMaxAge'),
  // A suggested range of body measurements for the intended audience or person, for example inseam between 32 and 34 inches or height between 170 and 190 cm. Typically found on a size chart for wearable products.
  'suggestedMeasurement': prefix.sdo('suggestedMeasurement'),
  // Minimum recommended age in years for the audience or user.
  'suggestedMinAge': prefix.sdo('suggestedMinAge'),
  // Indicates a dietary restriction or guideline for which this recipe or menu item is suitable, e.g. diabetic, halal etc.
  'suitableForDiet': prefix.sdo('suitableForDiet'),
  // An event that this event is a part of. For example, a collection of individual music performances might each have a music festival as their superEvent.
  'superEvent': prefix.sdo('superEvent'),
  // Relates a term (i.e. a property, class or enumeration) to one that supersedes it.
  'supersededBy': prefix.sdo('supersededBy'),
  // A sub-property of instrument. A supply consumed when performing instructions or a direction.
  'supply': prefix.sdo('supply'),
  // The area to which the artery supplies blood.
  'supplyTo': prefix.sdo('supplyTo'),
  // Supporting data for a SoftwareApplication.
  'supportingData': prefix.sdo('supportingData'),
  // A material used as a surface in some artwork, e.g. Canvas, Paper, Wood, Board, etc.
  'surface': prefix.sdo('surface'),
  // Indicates a target EntryPoint for an Action.
  'target': prefix.sdo('target'),
  // A sub property of object. The collection target of the action.
  'targetCollection': prefix.sdo('targetCollection'),
  // The description of a node in an established educational framework.
  'targetDescription': prefix.sdo('targetDescription'),
  // The name of a node in an established educational framework.
  'targetName': prefix.sdo('targetName'),
  // Type of app development: phone, Metro style, desktop, XBox, etc.
  'targetPlatform': prefix.sdo('targetPlatform'),
  // Characteristics of the population for which this is intended, or which typically uses it, e.g. 'adults'.
  'targetPopulation': prefix.sdo('targetPopulation'),
  // Target Operating System / Product to which the code applies.  If applies to several versions, just the product name can be used.
  'targetProduct': prefix.sdo('targetProduct'),
  // The URL of a node in an established educational framework.
  'targetUrl': prefix.sdo('targetUrl'),
  // The Tax / Fiscal ID of the organization or person, e.g. the TIN in the US or the CIF/NIF in Spain.
  'taxID': prefix.sdo('taxID'),
  // The taxonomic rank of this taxon given preferably as a URI from a controlled vocabulary – (typically the ranks from TDWG TaxonRank ontology or equivalent Wikidata URIs).
  'taxonRank': prefix.sdo('taxonRank'),
  // The taxonomic grouping of the organism that expresses, encodes, or in someway related to the BioChemEntity.
  'taxonomicRange': prefix.sdo('taxonomicRange'),
  // The item being described is intended to help a person learn the competency or learning outcome defined by the referenced term.
  'teaches': prefix.sdo('teaches'),
  // The telephone number.
  'telephone': prefix.sdo('telephone'),
  // The \"temporal\" property can be used in cases where more specific properties(e.g. [[temporalCoverage]], [[dateCreated]], [[dateModified]], [[datePublished]]) are not known to be appropriate.
  'temporal': prefix.sdo('temporal'),
  // The temporalCoverage of a CreativeWork indicates the period that the content applies to, i.e. that it describes, either as a DateTime or as a textual string indicating a time period in [ISO 8601 time interval format](https://en.wikipedia.org/wiki/ISO_8601#Time_intervals). In      the case of a Dataset it will typically indicate the relevant time period in a precise notation (e.g. for a 2011 census dataset, the year 2011 would be written \"2011/2012\"). Other forms of content e.g. ScholarlyArticle, Book, TVSeries or TVEpisode may indicate their temporalCoverage in broader terms - textually or via well-known URL.      Written works such as books may sometimes have precise temporal coverage too, e.g. a work set in 1939 - 1945 can be indicated in ISO 8601 interval format format via \"1939/1945\".Open-ended date ranges can be written with \"..\" in place of the end date. For example, \"2015-11/..\" indicates a range beginning in November 2015 and with no specified final date. This is tentative and might be updated in future when ISO 8601 is officially updated.
  'temporalCoverage': prefix.sdo('temporalCoverage'),
  // A code that identifies this [[DefinedTerm]] within a [[DefinedTermSet]]
  'termCode': prefix.sdo('termCode'),
  // The amount of time in a term as defined by the institution. A term is a length of time where students take one or more classes. Semesters and quarters are common units for term.
  'termDuration': prefix.sdo('termDuration'),
  // Human-readable terms of service documentation.
  'termsOfService': prefix.sdo('termsOfService'),
  // The number of times terms of study are offered per year. Semesters and quarters are common units for term. For example, if the student can only take 2 semesters for the program in one year, then termsPerYear should be 2.
  'termsPerYear': prefix.sdo('termsPerYear'),
  // The textual content of this CreativeWork.
  'text': prefix.sdo('text'),
  // Text value being annotated.
  'textValue': prefix.sdo('textValue'),
  // Thumbnail image for an image or video.
  'thumbnail': prefix.sdo('thumbnail'),
  // A thumbnail image relevant to the Thing.
  'thumbnailUrl': prefix.sdo('thumbnailUrl'),
  // The exchange traded instrument associated with a Corporation object. The tickerSymbol is expressed as an exchange and an instrument name separated by a space character. For the exchange component of the tickerSymbol attribute, we recommend using the controlled vocabulary of Market Identifier Codes (MIC) specified in ISO15022.
  'tickerSymbol': prefix.sdo('tickerSymbol'),
  // The unique identifier for the ticket.
  'ticketNumber': prefix.sdo('ticketNumber'),
  // Reference to an asset (e.g., Barcode, QR code image or PDF) usable for entrance.
  'ticketToken': prefix.sdo('ticketToken'),
  // The seat associated with the ticket.
  'ticketedSeat': prefix.sdo('ticketedSeat'),
  // The time of day the program normally runs. For example, \"evenings\".
  'timeOfDay': prefix.sdo('timeOfDay'),
  // Approximate or typical time it takes to work with or through this learning resource for the typical intended target audience, e.g. 'PT30M', 'PT1H25M'.
  'timeRequired': prefix.sdo('timeRequired'),
  // The expected length of time to complete the program if attending full-time.
  'timeToComplete': prefix.sdo('timeToComplete'),
  // The type of tissue sample required for the test.
  'tissueSample': prefix.sdo('tissueSample'),
  // The title of the job.
  'title': prefix.sdo('title'),
  // An [EIDR](https://eidr.org/) (Entertainment Identifier Registry) [[identifier]] representing at the most general/abstract level, a work of film or television.For example, the motion picture known as \"Ghostbusters\" has a titleEIDR of  \"10.5240/7EC7-228A-510A-053E-CBB8-J\". This title (or work) may have several variants, which EIDR calls \"edits\". See [[editEIDR]].Since schema.org types like [[Movie]] and [[TVEpisode]] can be used for both works and their multiple expressions, it is possible to use [[titleEIDR]] alone (for a general description), or alongside [[editEIDR]] for a more edit-specific description.
  'titleEIDR': prefix.sdo('titleEIDR'),
  // A sub property of location. The final location of the object or the agent after the action.
  'toLocation': prefix.sdo('toLocation'),
  // A sub property of recipient. The recipient who was directly sent the message.
  'toRecipient': prefix.sdo('toRecipient'),
  // A [[HyperTocEntry]] can have a [[tocContinuation]] indicated, which is another [[HyperTocEntry]] that would be the default next item to play or render.
  'tocContinuation': prefix.sdo('tocContinuation'),
  // Indicates a [[HyperTocEntry]] in a [[HyperToc]].
  'tocEntry': prefix.sdo('tocEntry'),
  // The permitted vertical load (TWR) of a trailer attached to the vehicle. Also referred to as Tongue Load Rating (TLR) or Vertical Load Rating (VLR)Typical unit code(s): KGM for kilogram, LBR for pound* Note 1: You can indicate additional information in the [[name]] of the [[QuantitativeValue]] node.* Note 2: You may also link to a [[QualitativeValue]] node that provides additional information using [[valueReference]].* Note 3: Note that you can use [[minValue]] and [[maxValue]] to indicate ranges.
  'tongueWeight': prefix.sdo('tongueWeight'),
  // A sub property of instrument. An object used (but not consumed) when performing instructions or a direction.
  'tool': prefix.sdo('tool'),
  // The torque (turning force) of the vehicle's engine.Typical unit code(s): NU for newton metre (N m), F17 for pound-force per foot, or F48 for pound-force per inch* Note 1: You can link to information about how the given value has been determined (e.g. reference RPM) using the [[valueReference]] property.* Note 2: You can use [[minValue]] and [[maxValue]] to indicate ranges.
  'torque': prefix.sdo('torque'),
  // The number of positions open for this job posting. Use a positive integer. Do not use if the number of positions is unclear or not known.
  'totalJobOpenings': prefix.sdo('totalJobOpenings'),
  // The total amount due.
  'totalPaymentDue': prefix.sdo('totalPaymentDue'),
  // The total price for the reservation or ticket, including applicable taxes, shipping, etc.Usage guidelines:* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
  'totalPrice': prefix.sdo('totalPrice'),
  // The total time required to perform instructions or a direction (including time to prepare the supplies), in [ISO 8601 duration format](http://en.wikipedia.org/wiki/ISO_8601).
  'totalTime': prefix.sdo('totalTime'),
  // A page providing information on how to book a tour of some [[Place]], such as an [[Accommodation]] or [[ApartmentComplex]] in a real estate setting, as well as other kinds of tours as appropriate.
  'tourBookingPage': prefix.sdo('tourBookingPage'),
  // Attraction suitable for type(s) of tourist. eg. Children, visitors from a particular country, etc.
  'touristType': prefix.sdo('touristType'),
  // A music recording (track)&#x2014;usually a single song. If an ItemList is given, the list should contain items of type MusicRecording.
  'track': prefix.sdo('track'),
  // Shipper tracking number.
  'trackingNumber': prefix.sdo('trackingNumber'),
  // Tracking url for the parcel delivery.
  'trackingUrl': prefix.sdo('trackingUrl'),
  // A music recording (track)&#x2014;usually a single song.
  'tracks': prefix.sdo('tracks'),
  // The trailer of a movie or tv/radio series, season, episode, etc.
  'trailer': prefix.sdo('trailer'),
  // The permitted weight of a trailer attached to the vehicle.Typical unit code(s): KGM for kilogram, LBR for pound* Note 1: You can indicate additional information in the [[name]] of the [[QuantitativeValue]] node.* Note 2: You may also link to a [[QualitativeValue]] node that provides additional information using [[valueReference]].* Note 3: Note that you can use [[minValue]] and [[maxValue]] to indicate ranges.
  'trailerWeight': prefix.sdo('trailerWeight'),
  // The name of the train (e.g. The Orient Express).
  'trainName': prefix.sdo('trainName'),
  // The unique identifier for the train.
  'trainNumber': prefix.sdo('trainNumber'),
  // The estimated salary earned while in the program.
  'trainingSalary': prefix.sdo('trainingSalary'),
  // The number of grams of trans fat.
  'transFatContent': prefix.sdo('transFatContent'),
  // If this MediaObject is an AudioObject or VideoObject, the transcript of that object.
  'transcript': prefix.sdo('transcript'),
  // The typical delay the order has been sent for delivery and the goods reach the final customer. Typical properties: minValue, maxValue, unitCode (d for DAY).
  'transitTime': prefix.sdo('transitTime'),
  // Label to match an [[OfferShippingDetails]] with a [[DeliveryTimeSettings]] (within the context of a [[shippingSettingsLink]] cross-reference).
  'transitTimeLabel': prefix.sdo('transitTimeLabel'),
  // The work that this work has been translated from. e.g. 物种起源 is a translationOf “On the Origin of Species”
  'translationOfWork': prefix.sdo('translationOfWork'),
  // Organization or person who adapts a creative work to different languages, regional differences and technical requirements of a target market, or that translates during some event.
  'translator': prefix.sdo('translator'),
  // How the disease spreads, either as a route or vector, for example 'direct contact', 'Aedes aegypti', etc.
  'transmissionMethod': prefix.sdo('transmissionMethod'),
  // Information about travel bans, e.g. in the context of a pandemic.
  'travelBans': prefix.sdo('travelBans'),
  // Specifics about the trial design (enumerated).
  'trialDesign': prefix.sdo('trialDesign'),
  // The anatomical or organ system that the vein flows into; a larger structure that the vein connects to.
  'tributary': prefix.sdo('tributary'),
  // The type of bed to which the BedDetail refers, i.e. the type of bed available in the quantity indicated by quantity.
  'typeOfBed': prefix.sdo('typeOfBed'),
  // The product that this structured value is referring to.
  'typeOfGood': prefix.sdo('typeOfGood'),
  // The typical expected age range, e.g. '7-9', '11-'.
  'typicalAgeRange': prefix.sdo('typicalAgeRange'),
  // The number of credits or units a full-time student would be expected to take in 1 term however 'term' is defined by the institution.
  'typicalCreditsPerTerm': prefix.sdo('typicalCreditsPerTerm'),
  // A medical test typically performed given this condition.
  'typicalTest': prefix.sdo('typicalTest'),
  // The person or organization the reservation or ticket is for.
  'underName': prefix.sdo('underName'),
  // The unit of measurement given using the UN/CEFACT Common Code (3 characters) or a URL. Other codes than the UN/CEFACT Common Code may be used with a prefix followed by a colon.
  'unitCode': prefix.sdo('unitCode'),
  // A string or text indicating the unit of measurement. Useful if you cannot provide a standard unit code for<a href='unitCode'>unitCode</a>.
  'unitText': prefix.sdo('unitText'),
  // For an [[Organization]] (typically a [[NewsMediaOrganization]]), a statement about policy on use of unnamed sources and the decision process required.
  'unnamedSourcesPolicy': prefix.sdo('unnamedSourcesPolicy'),
  // The number of grams of unsaturated fat.
  'unsaturatedFatContent': prefix.sdo('unsaturatedFatContent'),
  // Date when this media object was uploaded to this site.
  'uploadDate': prefix.sdo('uploadDate'),
  // The number of upvotes this question, answer or comment has received from the community.
  'upvoteCount': prefix.sdo('upvoteCount'),
  // URL of the item.
  'url': prefix.sdo('url'),
  // An url template (RFC6570) that will be used to construct the target of the execution of the action.
  'urlTemplate': prefix.sdo('urlTemplate'),
  // The schema.org [[usageInfo]] property indicates further information about a [[CreativeWork]]. This property is applicable both to works that are freely available and to those that require payment or other transactions. It can reference additional information e.g. community expectations on preferred linking and citation conventions, as well as purchasing details. For something that can be commercially licensed, usageInfo can provide detailed, resource-specific information about licensing options.This property can be used alongside the license property which indicates license(s) applicable to some piece of content. The usageInfo property can provide information about other licensing options, e.g. acquiring commercial usage rights for an image that is also available under non-commercial creative commons licenses.
  'usageInfo': prefix.sdo('usageInfo'),
  // A condition the test is used to diagnose.
  'usedToDiagnose': prefix.sdo('usedToDiagnose'),
  // The number of interactions for the CreativeWork using the WebSite or SoftwareApplication.
  'userInteractionCount': prefix.sdo('userInteractionCount'),
  // Device used to perform the test.
  'usesDevice': prefix.sdo('usesDevice'),
  // The standard for interpreting thePlan ID. The preferred is \"HIOS\". See the Centers for Medicare & Medicaid Services for more details.
  'usesHealthPlanIdStandard': prefix.sdo('usesHealthPlanIdStandard'),
  // Text of an utterances (spoken words, lyrics etc.) that occurs at a certain section of a media object, represented as a [[HyperTocEntry]].
  'utterances': prefix.sdo('utterances'),
  // The duration of validity of a permit or similar thing.
  'validFor': prefix.sdo('validFor'),
  // The date when the item becomes valid.
  'validFrom': prefix.sdo('validFrom'),
  // The geographic area where a permit or similar thing is valid.
  'validIn': prefix.sdo('validIn'),
  // The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours.
  'validThrough': prefix.sdo('validThrough'),
  // The date when the item is no longer valid.
  'validUntil': prefix.sdo('validUntil'),
  // The value of the quantitative value or property value node.* For [[QuantitativeValue]] and [[MonetaryAmount]], the recommended type for values is 'Number'.* For [[PropertyValue]], it can be 'Text;', 'Number', 'Boolean', or 'StructuredValue'.* Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similiar Unicode symbols.* Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
  'value': prefix.sdo('value'),
  // Specifies whether the applicable value-added tax (VAT) is included in the price specification or not.
  'valueAddedTaxIncluded': prefix.sdo('valueAddedTaxIncluded'),
  // Specifies the allowed range for number of characters in a literal value.
  'valueMaxLength': prefix.sdo('valueMaxLength'),
  // Specifies the minimum allowed range for number of characters in a literal value.
  'valueMinLength': prefix.sdo('valueMinLength'),
  // Indicates the name of the PropertyValueSpecification to be used in URL templates and form encoding in a manner analogous to HTML's input@name.
  'valueName': prefix.sdo('valueName'),
  // Specifies a regular expression for testing literal values according to the HTML spec.
  'valuePattern': prefix.sdo('valuePattern'),
  // A secondary value that provides additional information on the original value, e.g. a reference temperature or a type of measurement.
  'valueReference': prefix.sdo('valueReference'),
  // Whether the property must be filled in to complete the action.  Default is false.
  'valueRequired': prefix.sdo('valueRequired'),
  // The variableMeasured property can indicate (repeated as necessary) the  variables that are measured in some dataset, either described as text or as pairs of identifier and description using PropertyValue.
  'variableMeasured': prefix.sdo('variableMeasured'),
  // Originally named [[variablesMeasured]], The [[variableMeasured]] property can indicate (repeated as necessary) the  variables that are measured in some dataset, either described as text or as pairs of identifier and description using PropertyValue.
  'variablesMeasured': prefix.sdo('variablesMeasured'),
  // A description of the variant cover    \tfor the issue, if the issue is a variant printing. For example, \"Bryan Hitch    \tVariant Cover\" or \"2nd Printing Variant\".
  'variantCover': prefix.sdo('variantCover'),
  // Indicates the property or properties by which the variants in a [[ProductGroup]] vary, e.g. their size, color etc. Schema.org properties can be referenced by their short name e.g. \"color\"; terms defined elsewhere can be referenced with their URIs.
  'variesBy': prefix.sdo('variesBy'),
  // The Value-added Tax ID of the organization or person.
  'vatID': prefix.sdo('vatID'),
  // A short text indicating the configuration of the vehicle, e.g. '5dr hatchback ST 2.5 MT 225 hp' or 'limited edition'.
  'vehicleConfiguration': prefix.sdo('vehicleConfiguration'),
  // Information about the engine or engines of the vehicle.
  'vehicleEngine': prefix.sdo('vehicleEngine'),
  // The Vehicle Identification Number (VIN) is a unique serial number used by the automotive industry to identify individual motor vehicles.
  'vehicleIdentificationNumber': prefix.sdo('vehicleIdentificationNumber'),
  // The color or color combination of the interior of the vehicle.
  'vehicleInteriorColor': prefix.sdo('vehicleInteriorColor'),
  // The type or material of the interior of the vehicle (e.g. synthetic fabric, leather, wood, etc.). While most interior types are characterized by the material used, an interior type can also be based on vehicle usage or target audience.
  'vehicleInteriorType': prefix.sdo('vehicleInteriorType'),
  // The release date of a vehicle model (often used to differentiate versions of the same make and model).
  'vehicleModelDate': prefix.sdo('vehicleModelDate'),
  // The number of passengers that can be seated in the vehicle, both in terms of the physical space available, and in terms of limitations set by law.Typical unit code(s): C62 for persons.
  'vehicleSeatingCapacity': prefix.sdo('vehicleSeatingCapacity'),
  // Indicates whether the vehicle has been used for special purposes, like commercial rental, driving school, or as a taxi. The legislation in many countries requires this information to be revealed when offering a car for sale.
  'vehicleSpecialUsage': prefix.sdo('vehicleSpecialUsage'),
  // The type of component used for transmitting the power from a rotating power source to the wheels or other relevant component(s) (\"gearbox\" for cars).
  'vehicleTransmission': prefix.sdo('vehicleTransmission'),
  // 'vendor' is an earlier term for 'seller'.
  'vendor': prefix.sdo('vendor'),
  // Disclosure about verification and fact-checking processes for a [[NewsMediaOrganization]] or other fact-checking [[Organization]].
  'verificationFactCheckingPolicy': prefix.sdo('verificationFactCheckingPolicy'),
  // The version of the CreativeWork embodied by a specified resource.
  'version': prefix.sdo('version'),
  // An embedded video object.
  'video': prefix.sdo('video'),
  // The type of screening or video broadcast used (e.g. IMAX, 3D, SD, HD, etc.).
  'videoFormat': prefix.sdo('videoFormat'),
  // The frame size of the video.
  'videoFrameSize': prefix.sdo('videoFrameSize'),
  // The quality of the video.
  'videoQuality': prefix.sdo('videoQuality'),
  // Identifies the volume of publication or multi-part work; for example, \"iii\" or \"2\".
  'volumeNumber': prefix.sdo('volumeNumber'),
  // Any FDA or other warnings about the drug (text or URL).
  'warning': prefix.sdo('warning'),
  // The warranty promise(s) included in the offer.
  'warranty': prefix.sdo('warranty'),
  // The warranty promise(s) included in the offer.
  'warrantyPromise': prefix.sdo('warrantyPromise'),
  // The scope of the warranty promise.
  'warrantyScope': prefix.sdo('warrantyScope'),
  // The time when a passenger can check into the flight online.
  'webCheckinTime': prefix.sdo('webCheckinTime'),
  // The URL for a feed, e.g. associated with a podcast series, blog, or series of date-stamped updates. This is usually RSS or Atom.
  'webFeed': prefix.sdo('webFeed'),
  // The weight of the product or person.
  'weight': prefix.sdo('weight'),
  // The permitted total weight of the loaded vehicle, including passengers and cargo and the weight of the empty vehicle.Typical unit code(s): KGM for kilogram, LBR for pound* Note 1: You can indicate additional information in the [[name]] of the [[QuantitativeValue]] node.* Note 2: You may also link to a [[QualitativeValue]] node that provides additional information using [[valueReference]].* Note 3: Note that you can use [[minValue]] and [[maxValue]] to indicate ranges.
  'weightTotal': prefix.sdo('weightTotal'),
  // The distance between the centers of the front and rear wheels.Typical unit code(s): CMT for centimeters, MTR for meters, INH for inches, FOT for foot/feet
  'wheelbase': prefix.sdo('wheelbase'),
  // The width of the item.
  'width': prefix.sdo('width'),
  // A sub property of participant. The winner of the action.
  'winner': prefix.sdo('winner'),
  // The number of words in the text of the Article.
  'wordCount': prefix.sdo('wordCount'),
  // Example/instance/realization/derivation of the concept of this creative work. eg. The paperback edition, first edition, or eBook.
  'workExample': prefix.sdo('workExample'),
  // A work featured in some event, e.g. exhibited in an ExhibitionEvent.       Specific subproperties are available for workPerformed (e.g. a play), or a workPresented (a Movie at a ScreeningEvent).
  'workFeatured': prefix.sdo('workFeatured'),
  // The typical working hours for this job (e.g. 1st shift, night shift, 8am-5pm).
  'workHours': prefix.sdo('workHours'),
  // A contact location for a person's place of work.
  'workLocation': prefix.sdo('workLocation'),
  // A work performed in some event, for example a play performed in a TheaterEvent.
  'workPerformed': prefix.sdo('workPerformed'),
  // The movie presented during this event.
  'workPresented': prefix.sdo('workPresented'),
  // A work that is a translation of the content of this work. e.g. 西遊記 has an English workTranslation “Journey to the West”,a German workTranslation “Monkeys Pilgerfahrt” and a Vietnamese  translation Tây du ký bình khảo.
  'workTranslation': prefix.sdo('workTranslation'),
  // Quantitative measure of the physiologic output of the exercise; also referred to as energy expenditure.
  'workload': prefix.sdo('workload'),
  // Organizations that the person works for.
  'worksFor': prefix.sdo('worksFor'),
  // The lowest value allowed in this rating system. If worstRating is omitted, 1 is assumed.
  'worstRating': prefix.sdo('worstRating'),
  // An XPath, e.g. of a [[SpeakableSpecification]] or [[WebPageElement]]. In the latter case, multiple matches within a page can constitute a single conceptual \"Web page element\".
  'xpath': prefix.sdo('xpath'),
  // The year an [[Accommodation]] was constructed. This corresponds to the [YearBuilt field in RESO](https://ddwiki.reso.org/display/DDW17/YearBuilt+Field).
  'yearBuilt': prefix.sdo('yearBuilt'),
  // The size of the business in annual revenue.
  'yearlyRevenue': prefix.sdo('yearlyRevenue'),
  // The age of the business.
  'yearsInOperation': prefix.sdo('yearsInOperation'),
  // The quantity that results by performing instructions. For example, a paper airplane, 10 personalized candles.
  'yield': prefix.sdo('yield'),
}



/* SHACL
 * -----
 */
export const sh = {
  // The base class of validation results, typically not instantiated directly.
  'AbstractResult': prefix.sh('AbstractResult'),
  // A constraint component that can be used to test whether a value node conforms to all members of a provided list of shapes.
  'AndConstraintComponent': prefix.sh('AndConstraintComponent'),
  // The node kind of all blank nodes.
  'BlankNode': prefix.sh('BlankNode'),
  // The node kind of all blank nodes or IRIs.
  'BlankNodeOrIRI': prefix.sh('BlankNodeOrIRI'),
  // The node kind of all blank nodes or literals.
  'BlankNodeOrLiteral': prefix.sh('BlankNodeOrLiteral'),
  // A constraint component that can be used to verify that each value node is an instance of a given type.
  'ClassConstraintComponent': prefix.sh('ClassConstraintComponent'),
  // A constraint component that can be used to indicate that focus nodes must only have values for those properties that have been explicitly enumerated via sh:property/sh:path.
  'ClosedConstraintComponent': prefix.sh('ClosedConstraintComponent'),
  // The class of constraint components.
  'ConstraintComponent': prefix.sh('ConstraintComponent'),
  // A constraint component that can be used to restrict the datatype of all value nodes.
  'DatatypeConstraintComponent': prefix.sh('DatatypeConstraintComponent'),
  // A constraint component that can be used to verify that the set of value nodes is disjoint with the the set of nodes that have the focus node as subject and the value of a given property as predicate.
  'DisjointConstraintComponent': prefix.sh('DisjointConstraintComponent'),
  // A constraint component that can be used to verify that the set of value nodes is equal to the set of nodes that have the focus node as subject and the value of a given property as predicate.
  'EqualsConstraintComponent': prefix.sh('EqualsConstraintComponent'),
  // A constraint component that can be used to verify that a given node expression produces true for all value nodes.
  'ExpressionConstraintComponent': prefix.sh('ExpressionConstraintComponent'),
  // The class of SHACL functions.
  'Function': prefix.sh('Function'),
  // A constraint component that can be used to verify that one of the value nodes is a given RDF node.
  'HasValueConstraintComponent': prefix.sh('HasValueConstraintComponent'),
  // The node kind of all IRIs.
  'IRI': prefix.sh('IRI'),
  // The node kind of all IRIs or literals.
  'IRIOrLiteral': prefix.sh('IRIOrLiteral'),
  // A constraint component that can be used to exclusively enumerate the permitted value nodes.
  'InConstraintComponent': prefix.sh('InConstraintComponent'),
  // The severity for an informational validation result.
  'Info': prefix.sh('Info'),
  // The class of constraints backed by a JavaScript function.
  'JSConstraint': prefix.sh('JSConstraint'),
  // A constraint component with the parameter sh:js linking to a sh:JSConstraint containing a sh:script.
  'JSConstraintComponent': prefix.sh('JSConstraintComponent'),
  // Abstract base class of resources that declare an executable JavaScript.
  'JSExecutable': prefix.sh('JSExecutable'),
  // The class of SHACL functions that execute a JavaScript function when called.
  'JSFunction': prefix.sh('JSFunction'),
  // Represents a JavaScript library, typically identified by one or more URLs of files to include.
  'JSLibrary': prefix.sh('JSLibrary'),
  // The class of SHACL rules expressed using JavaScript.
  'JSRule': prefix.sh('JSRule'),
  // The class of targets that are based on JavaScript functions.
  'JSTarget': prefix.sh('JSTarget'),
  // The (meta) class for parameterizable targets that are based on JavaScript functions.
  'JSTargetType': prefix.sh('JSTargetType'),
  // A SHACL validator based on JavaScript. This can be used to declare SHACL constraint components that perform JavaScript-based validation when used.
  'JSValidator': prefix.sh('JSValidator'),
  // A constraint component that can be used to enumerate language tags that all value nodes must have.
  'LanguageInConstraintComponent': prefix.sh('LanguageInConstraintComponent'),
  // A constraint component that can be used to verify that each value node is smaller than all the nodes that have the focus node as subject and the value of a given property as predicate.
  'LessThanConstraintComponent': prefix.sh('LessThanConstraintComponent'),
  // A constraint component that can be used to verify that every value node is smaller than all the nodes that have the focus node as subject and the value of a given property as predicate.
  'LessThanOrEqualsConstraintComponent': prefix.sh('LessThanOrEqualsConstraintComponent'),
  // The node kind of all literals.
  'Literal': prefix.sh('Literal'),
  // A constraint component that can be used to restrict the maximum number of value nodes.
  'MaxCountConstraintComponent': prefix.sh('MaxCountConstraintComponent'),
  // A constraint component that can be used to restrict the range of value nodes with a maximum exclusive value.
  'MaxExclusiveConstraintComponent': prefix.sh('MaxExclusiveConstraintComponent'),
  // A constraint component that can be used to restrict the range of value nodes with a maximum inclusive value.
  'MaxInclusiveConstraintComponent': prefix.sh('MaxInclusiveConstraintComponent'),
  // A constraint component that can be used to restrict the maximum string length of value nodes.
  'MaxLengthConstraintComponent': prefix.sh('MaxLengthConstraintComponent'),
  // A constraint component that can be used to restrict the minimum number of value nodes.
  'MinCountConstraintComponent': prefix.sh('MinCountConstraintComponent'),
  // A constraint component that can be used to restrict the range of value nodes with a minimum exclusive value.
  'MinExclusiveConstraintComponent': prefix.sh('MinExclusiveConstraintComponent'),
  // A constraint component that can be used to restrict the range of value nodes with a minimum inclusive value.
  'MinInclusiveConstraintComponent': prefix.sh('MinInclusiveConstraintComponent'),
  // A constraint component that can be used to restrict the minimum string length of value nodes.
  'MinLengthConstraintComponent': prefix.sh('MinLengthConstraintComponent'),
  // A constraint component that can be used to verify that all value nodes conform to the given node shape.
  'NodeConstraintComponent': prefix.sh('NodeConstraintComponent'),
  // The class of all node kinds, including sh:BlankNode, sh:IRI, sh:Literal or the combinations of these: sh:BlankNodeOrIRI, sh:BlankNodeOrLiteral, sh:IRIOrLiteral.
  'NodeKind': prefix.sh('NodeKind'),
  // A constraint component that can be used to restrict the RDF node kind of each value node.
  'NodeKindConstraintComponent': prefix.sh('NodeKindConstraintComponent'),
  // A node shape is a shape that specifies constraint that need to be met with respect to focus nodes.
  'NodeShape': prefix.sh('NodeShape'),
  // A constraint component that can be used to verify that value nodes do not conform to a given shape.
  'NotConstraintComponent': prefix.sh('NotConstraintComponent'),
  // A constraint component that can be used to restrict the value nodes so that they conform to at least one out of several provided shapes.
  'OrConstraintComponent': prefix.sh('OrConstraintComponent'),
  // The class of parameter declarations, consisting of a path predicate and (possibly) information about allowed value type, cardinality and other characteristics.
  'Parameter': prefix.sh('Parameter'),
  // Superclass of components that can take parameters, especially functions and constraint components.
  'Parameterizable': prefix.sh('Parameterizable'),
  // A constraint component that can be used to verify that every value node matches a given regular expression.
  'PatternConstraintComponent': prefix.sh('PatternConstraintComponent'),
  // The class of prefix declarations, consisting of pairs of a prefix with a namespace.
  'PrefixDeclaration': prefix.sh('PrefixDeclaration'),
  // A constraint component that can be used to verify that all value nodes conform to the given property shape.
  'PropertyConstraintComponent': prefix.sh('PropertyConstraintComponent'),
  // Instances of this class represent groups of property shapes that belong together.
  'PropertyGroup': prefix.sh('PropertyGroup'),
  // A property shape is a shape that specifies constraints on the values of a focus node for a given property or path.
  'PropertyShape': prefix.sh('PropertyShape'),
  // A constraint component that can be used to verify that a specified maximum number of value nodes conforms to a given shape.
  'QualifiedMaxCountConstraintComponent': prefix.sh('QualifiedMaxCountConstraintComponent'),
  // A constraint component that can be used to verify that a specified minimum number of value nodes conforms to a given shape.
  'QualifiedMinCountConstraintComponent': prefix.sh('QualifiedMinCountConstraintComponent'),
  // A class of result annotations, which define the rules to derive the values of a given annotation property as extra values for a validation result.
  'ResultAnnotation': prefix.sh('ResultAnnotation'),
  // The class of SHACL rules. Never instantiated directly.
  'Rule': prefix.sh('Rule'),
  // The class of SPARQL executables that are based on an ASK query.
  'SPARQLAskExecutable': prefix.sh('SPARQLAskExecutable'),
  // The class of validators based on SPARQL ASK queries. The queries are evaluated for each value node and are supposed to return true if the given node conforms.
  'SPARQLAskValidator': prefix.sh('SPARQLAskValidator'),
  // The class of constraints based on SPARQL SELECT queries.
  'SPARQLConstraint': prefix.sh('SPARQLConstraint'),
  // A constraint component that can be used to define constraints based on SPARQL queries.
  'SPARQLConstraintComponent': prefix.sh('SPARQLConstraintComponent'),
  // The class of SPARQL executables that are based on a CONSTRUCT query.
  'SPARQLConstructExecutable': prefix.sh('SPARQLConstructExecutable'),
  // The class of resources that encapsulate a SPARQL query.
  'SPARQLExecutable': prefix.sh('SPARQLExecutable'),
  // A function backed by a SPARQL query - either ASK or SELECT.
  'SPARQLFunction': prefix.sh('SPARQLFunction'),
  // The class of SHACL rules based on SPARQL CONSTRUCT queries.
  'SPARQLRule': prefix.sh('SPARQLRule'),
  // The class of SPARQL executables based on a SELECT query.
  'SPARQLSelectExecutable': prefix.sh('SPARQLSelectExecutable'),
  // The class of validators based on SPARQL SELECT queries. The queries are evaluated for each focus node and are supposed to produce bindings for all focus nodes that do not conform.
  'SPARQLSelectValidator': prefix.sh('SPARQLSelectValidator'),
  // The class of targets that are based on SPARQL queries.
  'SPARQLTarget': prefix.sh('SPARQLTarget'),
  // The (meta) class for parameterizable targets that are based on SPARQL queries.
  'SPARQLTargetType': prefix.sh('SPARQLTargetType'),
  // The class of SPARQL executables based on a SPARQL UPDATE.
  'SPARQLUpdateExecutable': prefix.sh('SPARQLUpdateExecutable'),
  // The class of validation result severity levels, including violation and warning levels.
  'Severity': prefix.sh('Severity'),
  // A shape is a collection of constraints that may be targeted for certain nodes.
  'Shape': prefix.sh('Shape'),
  // The base class of targets such as those based on SPARQL queries.
  'Target': prefix.sh('Target'),
  // The (meta) class for parameterizable targets.\tInstances of this are instantiated as values of the sh:target property.
  'TargetType': prefix.sh('TargetType'),
  // A constraint component that can be used to specify that no pair of value nodes may use the same language tag.
  'UniqueLangConstraintComponent': prefix.sh('UniqueLangConstraintComponent'),
  // The class of SHACL validation reports.
  'ValidationReport': prefix.sh('ValidationReport'),
  // The class of validation results.
  'ValidationResult': prefix.sh('ValidationResult'),
  // The class of validators, which provide instructions on how to process a constraint definition. This class serves as base class for the SPARQL-based validators and other possible implementations.
  'Validator': prefix.sh('Validator'),
  // The severity for a violation validation result.
  'Violation': prefix.sh('Violation'),
  // The severity for a warning validation result.
  'Warning': prefix.sh('Warning'),
  // A constraint component that can be used to restrict the value nodes so that they conform to exactly one out of several provided shapes.
  'XoneConstraintComponent': prefix.sh('XoneConstraintComponent'),
  // The (single) value of this property must be a list of path elements, representing the elements of alternative paths.
  'alternativePath': prefix.sh('alternativePath'),
  // RDF list of shapes to validate the value nodes against.
  'and': prefix.sh('and'),
  // The annotation property that shall be set.
  'annotationProperty': prefix.sh('annotationProperty'),
  // The (default) values of the annotation property.
  'annotationValue': prefix.sh('annotationValue'),
  // The name of the SPARQL variable from the SELECT clause that shall be used for the values.
  'annotationVarName': prefix.sh('annotationVarName'),
  // The SPARQL ASK query to execute.
  'ask': prefix.sh('ask'),
  // The type that all value nodes must have.
  'class': prefix.sh('class'),
  // If set to true then the shape is closed.
  'closed': prefix.sh('closed'),
  // The shapes that the focus nodes need to conform to before a rule is executed on them.
  'condition': prefix.sh('condition'),
  // True if the validation did not produce any validation results, and false otherwise.
  'conforms': prefix.sh('conforms'),
  // The SPARQL CONSTRUCT query to execute.
  'construct': prefix.sh('construct'),
  // Specifies an RDF datatype that all value nodes must have.
  'datatype': prefix.sh('datatype'),
  // If set to true then all nodes conform to this.
  'deactivated': prefix.sh('deactivated'),
  // Links a resource with its namespace prefix declarations.
  'declare': prefix.sh('declare'),
  // A default value for a property, for example for user interface tools to pre-populate input fields.
  'defaultValue': prefix.sh('defaultValue'),
  // Human-readable descriptions for the property in the context of the surrounding shape.
  'description': prefix.sh('description'),
  // Links a result with other results that provide more details, for example to describe violations against nested shapes.
  'detail': prefix.sh('detail'),
  // Specifies a property where the set of values must be disjoint with the value nodes.
  'disjoint': prefix.sh('disjoint'),
  // An entailment regime that indicates what kind of inferencing is required by a shapes graph.
  'entailment': prefix.sh('entailment'),
  // Specifies a property that must have the same values as the value nodes.
  'equals': prefix.sh('equals'),
  // The node expression that must return true for the value nodes.
  'expression': prefix.sh('expression'),
  // The shape that all input nodes of the expression need to conform to.
  'filterShape': prefix.sh('filterShape'),
  // An optional flag to be used with regular expression pattern matching.
  'flags': prefix.sh('flags'),
  // The focus node that was validated when the result was produced.
  'focusNode': prefix.sh('focusNode'),
  // Can be used to link to a property group to indicate that a property shape belongs to a group of related property shapes.
  'group': prefix.sh('group'),
  // Specifies a value that must be among the value nodes.
  'hasValue': prefix.sh('hasValue'),
  // An optional RDF list of properties that are also permitted in addition to those explicitly enumerated via sh:property/sh:path.
  'ignoredProperties': prefix.sh('ignoredProperties'),
  // Specifies a list of allowed values so that each value node must be among the members of the given list.
  'in': prefix.sh('in'),
  // A list of node expressions that shall be intersected.
  'intersection': prefix.sh('intersection'),
  // The (single) value of this property represents an inverse path (object to subject).
  'inversePath': prefix.sh('inversePath'),
  // Constraints expressed in JavaScript.
  'js': prefix.sh('js'),
  // The name of the JavaScript function to execute.
  'jsFunctionName': prefix.sh('jsFunctionName'),
  // Declares which JavaScript libraries are needed to execute this.
  'jsLibrary': prefix.sh('jsLibrary'),
  // Declares the URLs of a JavaScript library. This should be the absolute URL of a JavaScript file. Implementations may redirect those to local files.
  'jsLibraryURL': prefix.sh('jsLibraryURL'),
  // Outlines how human-readable labels of instances of the associated Parameterizable shall be produced. The values can contain {?paramName} as placeholders for the actual values of the given parameter.
  'labelTemplate': prefix.sh('labelTemplate'),
  // Specifies a list of language tags that all value nodes must have.
  'languageIn': prefix.sh('languageIn'),
  // Specifies a property that must have smaller values than the value nodes.
  'lessThan': prefix.sh('lessThan'),
  // Specifies a property that must have smaller or equal values than the value nodes.
  'lessThanOrEquals': prefix.sh('lessThanOrEquals'),
  // Specifies the maximum number of values in the set of value nodes.
  'maxCount': prefix.sh('maxCount'),
  // Specifies the maximum exclusive value of each value node.
  'maxExclusive': prefix.sh('maxExclusive'),
  // Specifies the maximum inclusive value of each value node.
  'maxInclusive': prefix.sh('maxInclusive'),
  // Specifies the maximum string length of each value node.
  'maxLength': prefix.sh('maxLength'),
  // A human-readable message (possibly with placeholders for variables) explaining the cause of the result.
  'message': prefix.sh('message'),
  // Specifies the minimum number of values in the set of value nodes.
  'minCount': prefix.sh('minCount'),
  // Specifies the minimum exclusive value of each value node.
  'minExclusive': prefix.sh('minExclusive'),
  // Specifies the minimum inclusive value of each value node.
  'minInclusive': prefix.sh('minInclusive'),
  // Specifies the minimum string length of each value node.
  'minLength': prefix.sh('minLength'),
  // Human-readable labels for the property in the context of the surrounding shape.
  'name': prefix.sh('name'),
  // The namespace associated with a prefix in a prefix declaration.
  'namespace': prefix.sh('namespace'),
  // Specifies the node shape that all value nodes must conform to.
  'node': prefix.sh('node'),
  // Specifies the node kind (e.g. IRI or literal) each value node.
  'nodeKind': prefix.sh('nodeKind'),
  // The validator(s) used to evaluate a constraint in the context of a node shape.
  'nodeValidator': prefix.sh('nodeValidator'),
  // The node expression producing the input nodes of a filter shape expression.
  'nodes': prefix.sh('nodes'),
  // Specifies a shape that the value nodes must not conform to.
  'not': prefix.sh('not'),
  // An expression producing the nodes that shall be inferred as objects.
  'object': prefix.sh('object'),
  // The (single) value of this property represents a path that is matched one or more times.
  'oneOrMorePath': prefix.sh('oneOrMorePath'),
  // Indicates whether a parameter is optional.
  'optional': prefix.sh('optional'),
  // Specifies a list of shapes so that the value nodes must conform to at least one of the shapes.
  'or': prefix.sh('or'),
  // Specifies the relative order of this compared to its siblings. For example use 0 for the first, 1 for the second.
  'order': prefix.sh('order'),
  // The parameters of a function or constraint component.
  'parameter': prefix.sh('parameter'),
  // Specifies the property path of a property shape.
  'path': prefix.sh('path'),
  // Specifies a regular expression pattern that the string representations of the value nodes must match.
  'pattern': prefix.sh('pattern'),
  // An expression producing the properties that shall be inferred as predicates.
  'predicate': prefix.sh('predicate'),
  // The prefix of a prefix declaration.
  'prefix': prefix.sh('prefix'),
  // The prefixes that shall be applied before parsing the associated SPARQL query.
  'prefixes': prefix.sh('prefixes'),
  // Links a shape to its property shapes.
  'property': prefix.sh('property'),
  // The validator(s) used to evaluate a constraint in the context of a property shape.
  'propertyValidator': prefix.sh('propertyValidator'),
  // The maximum number of value nodes that can conform to the shape.
  'qualifiedMaxCount': prefix.sh('qualifiedMaxCount'),
  // The minimum number of value nodes that must conform to the shape.
  'qualifiedMinCount': prefix.sh('qualifiedMinCount'),
  // The shape that a specified number of values must conform to.
  'qualifiedValueShape': prefix.sh('qualifiedValueShape'),
  // Can be used to mark the qualified value shape to be disjoint with its sibling shapes.
  'qualifiedValueShapesDisjoint': prefix.sh('qualifiedValueShapesDisjoint'),
  // The validation results contained in a validation report.
  'result': prefix.sh('result'),
  // Links a SPARQL validator with zero or more sh:ResultAnnotation instances, defining how to derive additional result properties based on the variables of the SELECT query.
  'resultAnnotation': prefix.sh('resultAnnotation'),
  // Human-readable messages explaining the cause of the result.
  'resultMessage': prefix.sh('resultMessage'),
  // The path of a validation result, based on the path of the validated property shape.
  'resultPath': prefix.sh('resultPath'),
  // The severity of the result, e.g. warning.
  'resultSeverity': prefix.sh('resultSeverity'),
  // The expected type of values returned by the associated function.
  'returnType': prefix.sh('returnType'),
  // The rules linked to a shape.
  'rule': prefix.sh('rule'),
  // The SPARQL SELECT query to execute.
  'select': prefix.sh('select'),
  // Defines the severity that validation results produced by a shape must have. Defaults to sh:Violation.
  'severity': prefix.sh('severity'),
  // Shapes graphs that should be used when validating this data graph.
  'shapesGraph': prefix.sh('shapesGraph'),
  // If true then the validation engine was certain that the shapes graph has passed all SHACL syntax requirements during the validation process.
  'shapesGraphWellFormed': prefix.sh('shapesGraphWellFormed'),
  // The constraint that was validated when the result was produced.
  'sourceConstraint': prefix.sh('sourceConstraint'),
  // The constraint component that is the source of the result.
  'sourceConstraintComponent': prefix.sh('sourceConstraintComponent'),
  // The shape that is was validated when the result was produced.
  'sourceShape': prefix.sh('sourceShape'),
  // Links a shape with SPARQL constraints.
  'sparql': prefix.sh('sparql'),
  // An expression producing the resources that shall be inferred as subjects.
  'subject': prefix.sh('subject'),
  // Suggested shapes graphs for this ontology. The values of this property may be used in the absence of specific sh:shapesGraph statements.
  'suggestedShapesGraph': prefix.sh('suggestedShapesGraph'),
  // Links a shape to a target specified by an extension language, for example instances of sh:SPARQLTarget.
  'target': prefix.sh('target'),
  // Links a shape to a class, indicating that all instances of the class must conform to the shape.
  'targetClass': prefix.sh('targetClass'),
  // Links a shape to individual nodes, indicating that these nodes must conform to the shape.
  'targetNode': prefix.sh('targetNode'),
  // Links a shape to a property, indicating that all all objects of triples that have the given property as their predicate must conform to the shape.
  'targetObjectsOf': prefix.sh('targetObjectsOf'),
  // Links a shape to a property, indicating that all subjects of triples that have the given property as their predicate must conform to the shape.
  'targetSubjectsOf': prefix.sh('targetSubjectsOf'),
  // A node expression that represents the current focus node.
  'this': prefix.sh('this'),
  // A list of node expressions that shall be used together.
  'union': prefix.sh('union'),
  // Specifies whether all node values must have a unique (or no) language tag.
  'uniqueLang': prefix.sh('uniqueLang'),
  // The SPARQL UPDATE to execute.
  'update': prefix.sh('update'),
  // The validator(s) used to evaluate constraints of either node or property shapes.
  'validator': prefix.sh('validator'),
  // An RDF node that has caused the result.
  'value': prefix.sh('value'),
  // Specifies a list of shapes so that the value nodes must conform to exactly one of the shapes.
  'xone': prefix.sh('xone'),
  // The (single) value of this property represents a path that is matched zero or more times.
  'zeroOrMorePath': prefix.sh('zeroOrMorePath'),
  // The (single) value of this property represents a path that is matched zero or one times.
  'zeroOrOnePath': prefix.sh('zeroOrOnePath'),
}



/* Simple Knowledge Organization System (SKOS)
 * -------------------------------------------
 */
export const skos = {
  // A meaningful collection of concepts.
  'Collection': prefix.skos('Collection'),
  // An idea or notion; a unit of thought.
  'Concept': prefix.skos('Concept'),
  // A set of concepts, optionally including statements about semantic relationships between those concepts.
  'ConceptScheme': prefix.skos('ConceptScheme'),
  // An ordered collection of concepts, where both the grouping and the ordering are meaningful.
  'OrderedCollection': prefix.skos('OrderedCollection'),
  // The range of skos:altLabel is the class of RDF plain literals.
  'altLabel': prefix.skos('altLabel'),
  // skos:broadMatch is used to state a hierarchical mapping link between two conceptual resources in different concept schemes.
  'broadMatch': prefix.skos('broadMatch'),
  // Broader concepts are typically rendered as parents in a concept hierarchy (tree).
  'broader': prefix.skos('broader'),
  // skos:broaderTransitive is a transitive superproperty of skos:broader.
  'broaderTransitive': prefix.skos('broaderTransitive'),
  // A note about a modification to a concept.
  'changeNote': prefix.skos('changeNote'),
  // skos:closeMatch is used to link two concepts that are sufficiently similar that they can be used interchangeably in some information retrieval applications. In order to avoid the possibility of \"compound errors\" when combining mappings across more than two concept schemes, skos:closeMatch is not declared to be a transitive property.
  'closeMatch': prefix.skos('closeMatch'),
  // A statement or formal explanation of the meaning of a concept.
  'definition': prefix.skos('definition'),
  // A note for an editor, translator or maintainer of the vocabulary.
  'editorialNote': prefix.skos('editorialNote'),
  // skos:exactMatch is disjoint with each of the properties skos:broadMatch and skos:relatedMatch.
  'exactMatch': prefix.skos('exactMatch'),
  // An example of the use of a concept.
  'example': prefix.skos('example'),
  // Relates, by convention, a concept scheme to a concept which is topmost in the broader/narrower concept hierarchies for that scheme, providing an entry point to these hierarchies.
  'hasTopConcept': prefix.skos('hasTopConcept'),
  // The range of skos:hiddenLabel is the class of RDF plain literals.
  'hiddenLabel': prefix.skos('hiddenLabel'),
  // A note about the past state/use/meaning of a concept.
  'historyNote': prefix.skos('historyNote'),
  // Relates a resource (for example a concept) to a concept scheme in which it is included.
  'inScheme': prefix.skos('inScheme'),
  // These concept mapping relations mirror semantic relations, and the data model defined below is similar (with the exception of skos:exactMatch) to the data model defined for semantic relations. A distinct vocabulary is provided for concept mapping relations, to provide a convenient way to differentiate links within a concept scheme from links between concept schemes. However, this pattern of usage is not a formal requirement of the SKOS data model, and relies on informal definitions of best practice.
  'mappingRelation': prefix.skos('mappingRelation'),
  // Relates a collection to one of its members.
  'member': prefix.skos('member'),
  // For any resource, every item in the list given as the value of the      skos:memberList property is also a value of the skos:member property.
  'memberList': prefix.skos('memberList'),
  // skos:narrowMatch is used to state a hierarchical mapping link between two conceptual resources in different concept schemes.
  'narrowMatch': prefix.skos('narrowMatch'),
  // Narrower concepts are typically rendered as children in a concept hierarchy (tree).
  'narrower': prefix.skos('narrower'),
  // skos:narrowerTransitive is a transitive superproperty of skos:narrower.
  'narrowerTransitive': prefix.skos('narrowerTransitive'),
  // A notation, also known as classification code, is a string of characters such as \"T58.5\" or \"303.4833\" used to uniquely identify a concept within the scope of a given concept scheme.
  'notation': prefix.skos('notation'),
  // A general note, for any purpose.
  'note': prefix.skos('note'),
  // A resource has no more than one value of skos:prefLabel per language tag, and no more than one value of skos:prefLabel without language tag.
  'prefLabel': prefix.skos('prefLabel'),
  // skos:related is disjoint with skos:broaderTransitive
  'related': prefix.skos('related'),
  // skos:relatedMatch is used to state an associative mapping link between two conceptual resources in different concept schemes.
  'relatedMatch': prefix.skos('relatedMatch'),
  // A note that helps to clarify the meaning and/or the use of a concept.
  'scopeNote': prefix.skos('scopeNote'),
  // Links a concept to a concept related by meaning.
  'semanticRelation': prefix.skos('semanticRelation'),
  // Relates a concept to the concept scheme that it is a top level concept of.
  'topConceptOf': prefix.skos('topConceptOf'),
}



/*
 * XML Schema Datatypes (XSD)
 * --------------------------
 */
export const xsd = {
  'ENTITY': prefix.xsd('ENTITY'),
  'ID': prefix.xsd('ID'),
  'IDREF': prefix.xsd('IDREF'),
  'IDREFS': prefix.xsd('IDREFS'),
  'NCName': prefix.xsd('NCName'),
  'NMTOKEN': prefix.xsd('NMTOKEN'),
  'NMTOKENS': prefix.xsd('NMTOKENS'),
  'NOTATION': prefix.xsd('NOTATION'),
  'Name': prefix.xsd('Name'),
  'QName': prefix.xsd('QName'),
  'anyType': prefix.xsd('anyType'),
  'anyURI': prefix.xsd('anyURI'),
  'base64Binary': prefix.xsd('base64Binary'),
  'boolean': prefix.xsd('boolean'),
  'byte': prefix.xsd('byte'),
  'date': prefix.xsd('date'),
  'dayTimeDuration': prefix.xsd('dayTimeDuration'),
  'dateTime': prefix.xsd('dateTime'),
  'dateTimeStamp': prefix.xsd('dateTimeStamp'),
  'decimal': prefix.xsd('decimal'),
  'double': prefix.xsd('double'),
  'duration': prefix.xsd('duration'),
  'float': prefix.xsd('float'),
  'gDay': prefix.xsd('gDay'),
  'gMonth': prefix.xsd('gMonth'),
  'gMonthDay': prefix.xsd('gMonthDay'),
  'gYear': prefix.xsd('gYear'),
  'gYearMonth': prefix.xsd('gYearMonth'),
  'hexBinary': prefix.xsd('hexBinary'),
  'int': prefix.xsd('int'),
  'integer': prefix.xsd('integer'),
  'language': prefix.xsd('language'),
  'long': prefix.xsd('long'),
  'negativeInteger': prefix.xsd('negativeInteger'),
  'nonNegativeInteger': prefix.xsd('nonNegativeInteger'),
  'nonPositiveInteger': prefix.xsd('nonPositiveInteger'),
  'normalizedString': prefix.xsd('normalizedString'),
  'positiveInteger': prefix.xsd('positiveInteger'),
  'short': prefix.xsd('short'),
  'string': prefix.xsd('string'),
  'time': prefix.xsd('time'),
  'token': prefix.xsd('token'),
  'unsignedByte': prefix.xsd('unsignedByte'),
  'unsignedInt': prefix.xsd('unsignedInt'),
  'unsignedLong': prefix.xsd('unsignedLong'),
  'unsignedShort': prefix.xsd('unsignedShort'),
  'yearMonthDuration': prefix.xsd('yearMonthDuration'),
}
