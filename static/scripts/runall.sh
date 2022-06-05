# Convenience script to run a specific transformation on a specific dataset within the dockerized pipeline 

# Requirements:
# - Docker containers build:
#	docker build -f ./config/docker/Dockerfile -t edm-conversie-etl .
#	docker build -f ./crawler/Dockerfile -t edm-conversie-crawler .
# - TRIPLYDB_TOKEN set as environment variable (get your API token via user settings
#   on https://data.netwerkdigitaalerfgoed.nl/ and put it in your .bashrc file) 
# - Run from root of repository, eg. bash ./static/scripts/runall.sh

if [ $# = 0 ]; then
  echo "Please pass the config script configured for the dataset you want to process..."
  exit
fi
SCRIPT_PATH=$(dirname $(realpath -s $0))
source $SCRIPT_PATH/$1

if [[ -z "${SOURCE_DATASET}" || -z "${DESTINATION_DATASET}" || -z "${LOCAL_QUERY}" || -z "${VALIDATION_REPORT}" ]]; then
	echo "ERROR: one or more environment variables not set, see Readme.md for more details"
	exit
fi

if [[ -z "${TRIPLYDB_TOKEN}" ]]; then
   echo "WARNING: TRIPLYDB_TOKEN not set, this could cause problems for converting larger datasets (variant 3)"
fi

# make "shared" directory in working directory $PWD
mkdir -p $PWD/work

echo "1 - Get dataset"
docker run --rm \
	  -v $PWD/work:/home/triply/data \
	  -e LOCAL_QUERY=${LOCAL_QUERY} \
	  -e SOURCE_DATASET=${SOURCE_DATASET} \
	  -e DESTINATION_DATASET=${DESTINATION_DATASET} \
	  -e VALIDATION_REPORT=${VALIDATION_REPORT} \
	  -e MODE=acceptance \
	  --name edm-conversie-project-acceptance \
	  edm-conversie-etl \
	  ./config/runEtl.sh main

echo "2 - Transform dataset"
docker run --rm \
	  -v $PWD/work/rdf:/data \
	  -e LOCAL_QUERY=${LOCAL_QUERY} \
	  -e SOURCE_DATASET=${SOURCE_DATASET} \
	  -e DESTINATION_DATASET=${DESTINATION_DATASET} \
	  -e MODE=acceptance \
	  --name edm-conversie-project-acceptance \
	  edm-conversie-crawler \
	  ./rdf2edm.sh

if [[ -z "${TRIPLYDB_TOKEN}" ]]; then
   echo "TRIPLYDB_TOKEN not set, skipping the upload to TriplyDB"
   echo ""
   echo "$SOURCE_DATASET was transformed to EDM RDF, available in work/rdf/$DESTINATION_DATASET.xml.zip."
   exit
fi

echo "3 - Store dataset"

docker run --rm \
      -v $PWD/work:/home/triply/data \
      -e TRIPLYDB_TOKEN=${TRIPLYDB_TOKEN} \
      -e LOCAL_QUERY=${LOCAL_QUERY} \
      -e SOURCE_DATASET=${SOURCE_DATASET} \
      -e DESTINATION_DATASET=${DESTINATION_DATASET} \
      -e MODE=acceptance \
      --name edm-conversie-project-acceptance \
      edm-conversie-etl \
      ./config/runEtl.sh after

echo ""
echo "$SOURCE_DATASET was transformed to EDM RDF, available in the $DESTINATION_DATASET dataset in TriplyDB and the file work/rdf/$DESTINATION_DATASET.xml.zip."