#!/bin/bash
set -e
echo "running RDF 2 EDM ETL"
cmdFile=./commands

CLASSPATH=
for jar in `ls lib/*.jar`
do
  CLASSPATH=$CLASSPATH:$jar
done
CLASSPATH=$CLASSPATH

PROCS=${PROCS:-5};

RDF2EDM="java -Djava.util.logging.config.file=\"logging.properties\" -Dsun.net.inetaddr.ttl=0 ${JVM_ARGS} -cp classes:${CLASSPATH} eu.europeana.commonculture.lod.rdf2edmxml.Rdf2EdmCl"

rm -f ${cmdFile}
if [ -n "${SOURCE_DATASET}" ] && [ -n "${DESTINATION_DATASET}" ]; then
    # We've manually set (at least) the SOURCE_DATASET and DESTINATION_DATASET env variables. Assuming we only want to run this one sub-etl
    echo "${RDF2EDM} -input_file /data/${DESTINATION_DATASET}.ttl -output_file /data/${DESTINATION_DATASET}.xml.zip" >> ${cmdFile}
else
    while read line; do
        SOURCE_DATASET=$(echo "${line}" | awk -F"\t" '{print $1}')
        DESTINATION_DATASET=$(echo "${line}" | awk -F"\t" '{print $2}')
        if [ -z "${SOURCE_DATASET}" ] || [ -z "${DESTINATION_DATASET}" ]; then
            # a sanity check, to make sure the configuration file is tab delimited
            echo "Could not detect template variable in configuration.tsv file. Is the file really tab-delimited?"
            exit 1
        fi
        LOCAL_QUERY=$(echo "${line}" | awk -F"\t" '{print $3}')
        echo "${RDF2EDM} -input_file /data/${DESTINATION_DATASET}.ttl -output_file /data/${DESTINATION_DATASET}.xml.zip" >> ${cmdFile}

    done < <(cat ./configuratie.tsv | sed  1d)
fi

NUMJOBS=$(cat ${cmdFile} | wc -l)
echo "Running maximum ${PROCS} jobs in parallel. Total number of sub-ETLs: ${NUMJOBS}"
JOB_TIMEOUT=21600 # 6 hours in seconds
set +e # do not exit when a sub-etl fails. That way we still send the assets and log relevant info
parallel --timeout ${JOB_TIMEOUT} --joblog ./joblog --halt now,fail=1 --jobs ${PROCS} --tagstring "{#}" < ${cmdFile}
SUB_ETLS_EXIT_CODE="$?"
set -e # exit on failures again

exit ${SUB_ETLS_EXIT_CODE}
