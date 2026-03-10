#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  RideShare Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"

# Check prerequisites
echo -e "\n${BLUE}Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose is required but not installed.${NC}" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v go >/dev/null 2>&1 || { echo -e "${RED}Go is required but not installed.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ All prerequisites met${NC}"

# Setup Hyperledger Fabric Network
echo -e "\n${BLUE}Step 1: Setting up Hyperledger Fabric Network...${NC}"
cd network

if [ ! -d "bin" ]; then
    echo "Downloading Hyperledger Fabric binaries..."
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
fi

echo "Starting network..."
./network.sh down
./network.sh up createChannel -c ridechannel -ca

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start network${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Network started${NC}"

# Deploy Chaincode
echo -e "\n${BLUE}Step 2: Deploying Chaincode...${NC}"
cd ../chaincode
go mod tidy
cd ../network

./network.sh deployCC -ccn ridecontract -ccp ../chaincode -ccl go

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy chaincode${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode deployed${NC}"

# Setup Backend
echo -e "\n${BLUE}Step 3: Setting up Backend...${NC}"
cd ../backend

if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo -e "${RED}⚠ Please edit backend/.env with your configuration${NC}"
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install backend dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend setup complete${NC}"

# Setup Frontend
echo -e "\n${BLUE}Step 4: Setting up Frontend...${NC}"
cd ../frontend

if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
fi

npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install frontend dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}To start the application:${NC}"
echo -e "1. Start backend:  ${GREEN}cd backend && npm start${NC}"
echo -e "2. Start frontend: ${GREEN}cd frontend && npm start${NC}"
echo -e "\n${BLUE}Optional - Start n8n:${NC}"
echo -e "${GREEN}docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n${NC}"

echo -e "\n${BLUE}Access:${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Backend:  ${GREEN}http://localhost:5000${NC}"
echo -e "n8n:      ${GREEN}http://localhost:5678${NC}"

echo -e "\n${RED}⚠ Remember to configure:${NC}"
echo -e "  - backend/.env (Pinata keys, email credentials)"
echo -e "  - n8n workflows (import from n8n-workflows/)"
