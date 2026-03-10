#!/bin/bash

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx
export VERBOSE=false

. scripts/utils.sh

function clearContainers() {
  CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /hyperledger/) {print $1}')
  if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
    infoln "No containers available for deletion"
  else
    docker rm -f $CONTAINER_IDS
  fi
}

function removeUnwantedImages() {
  DOCKER_IMAGE_IDS=$(docker images | awk '($1 ~ /dev-peer.*/) {print $3}')
  if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
    infoln "No images available for deletion"
  else
    docker rmi -f $DOCKER_IMAGE_IDS
  fi
}

function networkUp() {
  checkPrereqs
  
  if [ ! -d "organizations/peerOrganizations" ]; then
    createOrgs
  fi

  COMPOSE_FILES="-f docker/docker-compose-net.yaml"
  COMPOSE_FILES="${COMPOSE_FILES} -f docker/docker-compose-couch.yaml"
  COMPOSE_FILES="${COMPOSE_FILES} -f docker/docker-compose-ca.yaml"

  IMAGE_TAG=$IMAGETAG docker-compose ${COMPOSE_FILES} up -d 2>&1

  docker ps -a
  if [ $? -ne 0 ]; then
    fatalln "Unable to start network"
  fi
}

function createChannel() {
  scripts/createChannel.sh $CHANNEL_NAME $CLI_DELAY $MAX_RETRY $VERBOSE
  if [ $? -ne 0 ]; then
    fatalln "Create channel failed"
  fi
}

function deployCC() {
  scripts/deployCC.sh $CHANNEL_NAME $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION $CC_SEQUENCE $CC_INIT_FCN $CC_END_POLICY $CC_COLL_CONFIG $CLI_DELAY $MAX_RETRY $VERBOSE

  if [ $? -ne 0 ]; then
    fatalln "Deploying chaincode failed"
  fi
}

function networkDown() {
  COMPOSE_BASE_FILES="-f docker/docker-compose-net.yaml -f docker/docker-compose-couch.yaml -f docker/docker-compose-ca.yaml"
  
  docker-compose ${COMPOSE_BASE_FILES} down --volumes --remove-orphans
  
  if [ "$MODE" != "restart" ]; then
    clearContainers
    removeUnwantedImages
    docker volume prune -f
    docker network prune -f
    
    if [ -d "organizations" ]; then
      rm -rf organizations
    fi
    if [ -d "channel-artifacts" ]; then
      rm -rf channel-artifacts
    fi
    if [ -d "system-genesis-block" ]; then
      rm -rf system-genesis-block
    fi
  fi
}

function createOrgs() {
  if [ -d "organizations/peerOrganizations" ]; then
    rm -Rf organizations/peerOrganizations && rm -Rf organizations/ordererOrganizations
  fi

  cryptogen generate --config=./organizations/cryptogen/crypto-config-org1.yaml --output="organizations"
  cryptogen generate --config=./organizations/cryptogen/crypto-config-org2.yaml --output="organizations"
  cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer.yaml --output="organizations"

  infoln "Generating CCP files for Org1 and Org2"
  ./organizations/ccp-generate.sh
}

OS_ARCH=$(echo "$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')
IMAGETAG="2.5.0"
CA_IMAGETAG="1.5.5"
CHANNEL_NAME="ridechannel"
CC_NAME="ridecontract"
CC_SRC_LANGUAGE="go"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_INIT_FCN="NA"
CC_END_POLICY="NA"
CC_COLL_CONFIG="NA"
CLI_DELAY=3
MAX_RETRY=5
VERBOSE=false

MODE=$1
shift

if [[ $# -ge 1 ]] ; then
  key="$1"
  while [[ $# -ge 1 ]] ; do
    key="$1"
    case $key in
      -c )
        CHANNEL_NAME="$2"
        shift
        ;;
      -ca )
        CRYPTO="Certificate Authorities"
        ;;
      -r )
        MAX_RETRY="$2"
        shift
        ;;
      -d )
        CLI_DELAY="$2"
        shift
        ;;
      -s )
        DATABASE="$2"
        shift
        ;;
      -ccl )
        CC_SRC_LANGUAGE="$2"
        shift
        ;;
      -ccn )
        CC_NAME="$2"
        shift
        ;;
      -ccv )
        CC_VERSION="$2"
        shift
        ;;
      -ccs )
        CC_SEQUENCE="$2"
        shift
        ;;
      -ccp )
        CC_SRC_PATH="$2"
        shift
        ;;
      -verbose )
        VERBOSE=true
        ;;
      * )
        errorln "Unknown flag: $key"
        exit 1
        ;;
    esac
    shift
  done
fi

if [ "$MODE" == "up" ]; then
  infoln "Starting ride sharing network"
  networkUp
elif [ "$MODE" == "createChannel" ]; then
  infoln "Creating channel '${CHANNEL_NAME}'."
  createChannel
elif [ "$MODE" == "down" ]; then
  infoln "Stopping network"
  networkDown
elif [ "$MODE" == "restart" ]; then
  infoln "Restarting network"
  networkDown
  networkUp
elif [ "$MODE" == "deployCC" ]; then
  infoln "deploying chaincode on channel '${CHANNEL_NAME}'"
  deployCC
else
  printHelp
  exit 1
fi
