#!/bin/bash
set -e
echo "running RDF 2 EDM ETL"

CLASSPATH=
for jar in `ls cc-lod-crawler-DockerApplication/lib/*.jar`
do
  CLASSPATH=$CLASSPATH:$jar
done
CLASSPATH=$CLASSPATH

RDF2EDM="java -Djava.util.logging.config.file=\"logging.properties\" -Dsun.net.inetaddr.ttl=0 ${JVM_ARGS} -cp classes:${CLASSPATH} eu.europeana.commonculture.lod.rdf2edmxml.Rdf2EdmCl"

${RDF2EDM} -input_file ../../data/rdf/${DESTINATION_DATASET}.ttl -output_file ../../data/rdf/${DESTINATION_DATASET}.xml.zip
