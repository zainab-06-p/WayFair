#!/bin/bash
set -e

NETWORK_DIR=~/fabric-samples/test-network
CHANNEL=ridechannel
CC_NAME=rideshare
CC_VERSION=2.2
CC_SEQUENCE=1
# Address the peer container will use to reach the chaincode server
# host.docker.internal resolves to the host machine from inside Docker
CC_SERVER_ADDRESS="host.docker.internal:9999"

cd "$NETWORK_DIR"
export PATH=$PATH:$(pwd)/../bin
export FABRIC_CFG_PATH=$(pwd)/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$(pwd)/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

ORDERER_CA=$(pwd)/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
ORG1_PEER_TLS=$(pwd)/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
ORG2_PEER_TLS=$(pwd)/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

echo "=== Step 1: Package chaincode (ccaas format) ==="
rm -rf /tmp/rideshare-pkg && mkdir -p /tmp/rideshare-pkg

# ccaas builder expects connection.json inside code.tar.gz
# and metadata.json at the top level of the package tar.gz
cat > /tmp/rideshare-pkg/connection.json <<EOF
{
  "address": "${CC_SERVER_ADDRESS}",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

cat > /tmp/rideshare-pkg/metadata.json <<EOF
{
  "type": "ccaas",
  "label": "${CC_NAME}_${CC_VERSION}"
}
EOF

cd /tmp/rideshare-pkg
tar czf code.tar.gz connection.json
tar czf /tmp/${CC_NAME}_${CC_VERSION}.tar.gz metadata.json code.tar.gz
cd "$NETWORK_DIR"
echo "✅ Package: /tmp/${CC_NAME}_${CC_VERSION}.tar.gz"

echo ""
echo "=== Step 2: Install on Org1 ==="
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_PEER_TLS
export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install /tmp/${CC_NAME}_${CC_VERSION}.tar.gz 2>&1

echo ""
echo "=== Step 3: Get Package ID ==="
CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>&1 | grep "Package ID:" | grep "$CC_NAME" | head -1 | sed 's/Package ID: //' | sed 's/, Label.*//')
echo "Package ID: $CC_PACKAGE_ID"

if [ -z "$CC_PACKAGE_ID" ]; then
  echo "❌ Failed to get package ID. Check peer logs."
  exit 1
fi

echo ""
echo "=== Step 4: Install on Org2 ==="
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG2_PEER_TLS
export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install /tmp/${CC_NAME}_${CC_VERSION}.tar.gz 2>&1

ORDERER_FLAGS="-o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA"

echo ""
echo "=== Step 5: Approve for Org2 ==="
peer lifecycle chaincode approveformyorg \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE \
  $ORDERER_FLAGS 2>&1

echo ""
echo "=== Step 6: Approve for Org1 ==="
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_PEER_TLS
export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$CC_PACKAGE_ID" --sequence $CC_SEQUENCE \
  $ORDERER_FLAGS 2>&1

echo ""
echo "=== Step 7: Check commit readiness ==="
peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE $ORDERER_FLAGS --output json 2>&1

echo ""
echo "=== Step 8: Commit chaincode ==="
peer lifecycle chaincode commit \
  --channelID "$CHANNEL" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE $ORDERER_FLAGS \
  --peerAddresses localhost:7051 --tlsRootCertFiles $ORG1_PEER_TLS \
  --peerAddresses localhost:9051 --tlsRootCertFiles $ORG2_PEER_TLS \
  2>&1

echo ""
echo "=== Step 9: Verify ==="
peer lifecycle chaincode querycommitted --channelID "$CHANNEL" 2>&1

echo ""
echo "======================================================"
echo "✅ Chaincode committed! Package ID: $CC_PACKAGE_ID"
echo "======================================================"
echo ""
echo "Now update check-and-start-chaincode.sh with:"
echo "  CC_PACKAGE_ID=\"$CC_PACKAGE_ID\""
echo ""
echo "Then run:"
echo "  wsl -d Ubuntu bash /mnt/d/HF/scripts/check-and-start-chaincode.sh"
