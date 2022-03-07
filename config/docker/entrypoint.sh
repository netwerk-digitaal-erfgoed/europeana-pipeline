#!/bin/bash
set -e
# With this flag the ratt runner detects that it should only render once all the way at the end
export CI=true

#print statements as they are executed
[[ -n $DEBUG_ENTRYPOINT ]] && set -x

case ${1} in
  app:run)
    #make sure the output dir is accessible
    chown ${ETL_USER}:${ETL_USER} ${ETL_DATA_DIR}
    ./config/runEtl.sh
    ;;
  app:test)
    npm run test
    ;;

  app:help)
    echo "Available options:"
    echo " app:run            - Runs the etl (default)"
    echo " app:help           - Displays the help"
    echo " [command]          - Execute the specified command, eg. bash."
    ;;
  *)
    exec "$@"
    ;;
esac

exit 0
