#!/bin/bash
# Run this when chaincode is already installed but needs approve+commit (e.g. after network.sh down)
set -e

NETWORK_DIR=~/fabric-samples/test-network
CHANNEL=ridechannel
CC_NAME=rideshare
CC_VERSION=2.2
CC_SEQUENCE=1

cd "$NETWORK_DIR"
export PATH=$PATH:$(pwd)/../bin
export FABRIC_CFG_PATH=$(pwd)/../config/
export CORE_PEER_TLS_ENABLED=true

ORDERER_CA=$(pwd)/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
ORG1_PEER_TLS=$(pwd)/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
ORG2_PEER_TLS=$(pwd)/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
ORDERER_FLAGS="-o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA"

# ---- Org1 context ----
setOrg1() {
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_PEER_TLS
  export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  export CORE_PEER_ADDRESS=localhost:7051
}

# ---- Org2 context ----
setOrg2() {
  export CORE_PEER_LOCALMSPID="Org2MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=$ORG2_PEER_TLS
  export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
  export CORE_PEER_ADDRESS=localhost:9051
}

setOrg1
echo "=== Installed chaincode ==="
peer lifecycle chaincode queryinstalled 2>&1

CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>&1 | grep "Package ID:" | grep "$CC_NAME" | head -1 | sed 's/Package ID: //' | sed 's/, Label.*//')
echo "Using Package ID: $CC_PACKAGE_ID"

if [ -z "$CC_PACKAGE_ID" ]; then
  echo "❌ No installed chaincode found. Run redeploy-chaincode.sh first."
  exit 1
fi

echo ""
echo "=== Approve for Org2 ==="
setOrg2
peer lifecycle chaincode approveformyorg \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE \
  $ORDERER_FLAGS 2>&1

echo ""
echo "=== Approve for Org1 ==="
setOrg1
peer lifecycle chaincode approveformyorg \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE \
  $ORDERER_FLAGS 2>&1

echo ""
echo "=== Check commit readiness ==="
peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE $ORDERER_FLAGS --output json 2>&1

echo ""
echo "=== Commit chaincode ==="
peer lifecycle chaincode commit \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE $ORDERER_FLAGS \
  --peerAddresses localhost:7051 --tlsRootCertFiles $ORG1_PEER_TLS \
  --peerAddresses localhost:9051 --tlsRootCertFiles $ORG2_PEER_TLS \
  2>&1

echo ""
echo "=== Verify ==="
setOrg1
peer lifecycle chaincode querycommitted --channelID "$CHANNEL" 2>&1

echo ""
echo "======================================================"
echo "✅ Done! Package ID: $CC_PACKAGE_ID"
echo "Update check-and-start-chaincode.sh with this Package ID if it differs."
echo "======================================================"
