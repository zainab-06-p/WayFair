#!/bin/bash
set -e

cd ~/fabric-samples/test-network
export PATH=$PATH:$(pwd)/../bin
export FABRIC_CFG_PATH=$(pwd)/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$(pwd)/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=$(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

echo "=== Chaincode committed on ridechannel ==="
peer lifecycle chaincode querycommitted --channelID ridechannel 2>&1

echo ""
echo "=== Starting external chaincode service ==="

# Kill any old instance
pkill -f rideshare-chaincode 2>/dev/null || true
sleep 1

# Get the package ID
CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>&1 | grep "Package ID:" | grep "rideshare" | head -1 | sed 's/Package ID: //' | sed 's/, Label.*//')
echo "Package ID: $CC_PACKAGE_ID"

if [ -z "$CC_PACKAGE_ID" ]; then
  CC_PACKAGE_ID="rideshare_2.2:04624ba185a52fea8ba9069768b0a1ff0993a12410887926ce5d9256459f875a"
  echo "Using hardcoded package ID: $CC_PACKAGE_ID"
fi

# Override: always use the package ID matching the committed chaincode
# (the ID embedded in the peer's external builder connection.json)
CC_PACKAGE_ID="rideshare_2.2:04624ba185a52fea8ba9069768b0a1ff0993a12410887926ce5d9256459f875a"
echo "Using committed package ID: $CC_PACKAGE_ID"

# Start chaincode service in a clean environment (no peer TLS vars)
env -i \
  HOME="$HOME" \
  PATH="$PATH" \
  CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  CHAINCODE_ID="$CC_PACKAGE_ID" \
  CORE_CHAINCODE_ID_NAME="$CC_PACKAGE_ID" \
  nohup /tmp/rideshare-chaincode > /tmp/cc.log 2>&1 &

sleep 2

# Verify it's listening
if ss -tlnp | grep -q 9999; then
  echo "✅ Chaincode service running on 0.0.0.0:9999"
else
  echo "❌ Chaincode service failed to start. Log:"
  cat /tmp/cc.log
  exit 1
fi
