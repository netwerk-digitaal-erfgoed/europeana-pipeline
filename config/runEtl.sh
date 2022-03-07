#!/bin/bash
set -e
echo "Running ETL"
cmdFile=./commands
if [ -z "${RATT_VERBOSITY}" ]; then
    RATT_VERBOSITY="--verbose"
fi
RATT_ARGS="${RATT_VERBOSITY}"

if [ -d "/home/triply/data" ]; then
    RATT_ARGS+=" --data-dir /home/triply/data"
fi
rm -f ./joblog #clear log file

TARGET=${1}
if [ "${TARGET}" = "main" ]; then
  ETL="lib/main.js"
elif [ "${TARGET}" = "after" ]; then
  ETL="lib/after.js"
else
  echo "Argument ${TARGET} not recognized"
  exit 1
fi

RATT_CMD="yarn ratt ${RATT_ARGS} ${ETL}"

PROCS=${PROCS:-5};
rm -f ${cmdFile}
if [ -n "${SOURCE_DATASET}" ] && [ -n "${DESTINATION_DATASET}" ]; then
    # We've manually set (at least) the YEAR and TEMPLATE env variables. Assuming we only want to run this one sub-etl
    echo "SOURCE_DATASET=${SOURCE_DATASET} DESTINATION_DATASET=${DESTINATION_DATASET} LOCAL_QUERY=${LOCAL_QUERY} ${RATT_CMD}" >> ${cmdFile}
else
    while read line; do
        SOURCE_DATASET=$(echo "${line}" | awk -F"\t" '{print $1}')
        DESTINATION_DATASET=$(echo "${line}" | awk -F"\t" '{print $2}')
        if [ -z "${SOURCE_DATASET}" ] || [-z "${DESTINATION_DATASET}" ]; then
            # a sanity check, to make sure the configuration file is tab delimited
            echo "Could not detect template variable in configuration.tsv file. Is the file really tab-delimited?"
            exit 1
        fi
        LOCAL_QUERY=$(echo "${line}" | awk -F"\t" '{print $3}')
        echo "SOURCE_DATASET=${SOURCE_DATASET} DESTINATION_DATASET=${DESTINATION_DATASET} LOCAL_QUERY=${LOCAL_QUERY} ${RATT_CMD}" >> ${cmdFile}

    done < <(cat ./configuratie.tsv | sed  1d)
fi

NUMJOBS=$(cat ${cmdFile} | wc -l)
echo "Running maximum ${PROCS} jobs in parallel. Total number of sub-ETLs: ${NUMJOBS}"
JOB_TIMEOUT=21600 # 6 hours in seconds
set +e # do not exit when a sub-etl fails. That way we still send the assets and log relevant info
parallel --timeout ${JOB_TIMEOUT} --joblog ./joblog --halt now,fail=1 --verbose --jobs ${PROCS} --tagstring "{#}" < ${cmdFile}
SUB_ETLS_EXIT_CODE="$?"
set -e # exit on failures again

exit ${SUB_ETLS_EXIT_CODE}
