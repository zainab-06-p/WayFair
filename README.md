# Decentralized Cab Application - Hyperledger Fabric

A blockchain-based cab booking application supporting one-to-one rides and carpooling, built on Hyperledger Fabric with IPFS storage and pseudonymous authentication.

## Features

- **Blockchain-Based**: Built on Hyperledger Fabric
- **Dual Service Modes**: One-to-one rides and carpooling
- **Payment Options**: Cash, UPI, and ETH (Ethereum)
- **Pseudonymous Authentication**: Privacy-preserving login system
- **IPFS Storage**: User documents and data stored on Pinata IPFS
- **Email Verification**: Legitimate authentication via email
- **Real-time Chat**: Driver-Passenger communication
- **SOS System**: Emergency alerts for passenger safety
- **Map Integration**: Leaflet.js with open-source routing
- **Email Notifications**: Using n8n for automated workflows

## Architecture

```
├── network/              # Hyperledger Fabric network configuration
├── chaincode/           # Smart contracts (Go)
├── backend/             # Node.js API server
├── frontend/            # Web application
├── n8n-workflows/       # Email notification workflows
└── scripts/             # Deployment and management scripts
```

## On-Chain Operations

The following operations are recorded on the blockchain:
- User/Driver registration (hashed identity)
- Ride creation by drivers
- Ride booking by passengers
- Ride start and end timestamps
- SOS alerts
- Ride cancellations
- Payment transactions

## Prerequisites

- Docker and Docker Compose (v2.0+)
- Node.js (v16+)
- Go (v1.19+)
- Hyperledger Fabric binaries (v2.5+)
- MetaMask browser extension (for ETH payments)

## Quick Start

### 1. Setup Hyperledger Fabric Network

```bash
cd network
./network.sh up createChannel -c ridechannel -ca
./network.sh deployCC -ccn ridecontract -ccp ../chaincode -ccl go
```

### 2. Start Backend Server

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm start
```

### 4. Setup n8n (Optional - for email notifications)

```bash
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

Then import workflows from `n8n-workflows/` directory.

## Configuration

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env)**
```env
PORT=5000
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ride-notifications
JWT_SECRET=your_secure_jwt_secret
SALT_ROUNDS=10
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WEBSOCKET_URL=ws://localhost:5000
REACT_APP_LEAFLET_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
REACT_APP_ROUTING_API=https://router.project-osrm.org/route/v1/driving/
```

## How It Works

### 1. User Registration Flow

1. User visits registration page
2. Enters personal details (name, age, gender, email)
3. For drivers: uploads license, vehicle papers, profile pic
4. Files uploaded to Pinata IPFS
5. Email verification sent
6. User confirms email
7. Pseudonymous ID generated (hashed public key)
8. Registration recorded on blockchain with IPFS hash
9. User receives unique ID

### 2. Pseudonymous Authentication

- Uses cryptographic key pairs (similar to MetaMask)
- Private key stored locally (encrypted)
- Public key hash used as pseudonymous identifier
- No personal data revealed during transactions
- Authentication challenge signed with private key

### 3. Ride Creation (Driver)

1. Driver logs in with pseudonymous auth
2. Creates ride with route, price, seats
3. Ride details stored on blockchain
4. Email notification sent via n8n
5. Ride appears on passenger search

### 4. Ride Booking (Passenger)

1. Passenger searches rides using map
2. Selects ride and books
3. Booking recorded on blockchain
4. Both parties notified via email
5. Real-time chat enabled
6. SOS button activated

### 5. Ride Execution

1. Driver starts ride → on-chain event
2. Real-time location tracking
3. Passenger can trigger SOS if needed
4. Driver ends ride → on-chain event
5. Payment processed (Cash/UPI/ETH)
6. Transaction recorded on blockchain

### 6. Payment Flow

- **Cash/UPI**: Pseudonymous transaction record on-chain
- **ETH**: Smart contract payment with MetaMask
- All payments verified and recorded
- Email receipts sent via n8n

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/login` - Pseudonymous login
- `POST /api/auth/challenge` - Get authentication challenge

### Rides
- `POST /api/rides/create` - Create ride (driver)
- `GET /api/rides/search` - Search available rides
- `POST /api/rides/book` - Book a ride
- `POST /api/rides/start` - Start ride
- `POST /api/rides/end` - End ride
- `POST /api/rides/cancel` - Cancel ride

### Emergency
- `POST /api/sos/trigger` - Trigger SOS alert

### Chat
- `WebSocket /ws/chat` - Real-time chat

### IPFS
- `POST /api/ipfs/upload` - Upload to IPFS
- `GET /api/ipfs/:hash` - Retrieve from IPFS

## Security Features

1. **Pseudonymous Identity**: No personal data in transactions
2. **Email Verification**: Legitimate user validation
3. **Blockchain Immutability**: Tamper-proof ride records
4. **IPFS Storage**: Decentralized document storage
5. **Encrypted Communication**: Secure chat system
6. **SOS System**: Emergency response mechanism

## Tech Stack

- **Blockchain**: Hyperledger Fabric 2.5
- **Chaincode**: Go
- **Backend**: Node.js, Express
- **Frontend**: React, Material-UI
- **Maps**: Leaflet.js, OpenStreetMap
- **Storage**: Pinata IPFS
- **Real-time**: WebSocket (Socket.io)
- **Automation**: n8n
- **Payments**: Web3.js (for ETH)

## Testing

```bash
# Test chaincode
cd chaincode
go test

# Test backend
cd backend
npm test

# Test frontend
cd frontend
npm test
```

## Troubleshooting

### Fabric Network Issues
```bash
cd network
./network.sh down
./network.sh up createChannel -c ridechannel -ca
```

### Chaincode Issues
```bash
./network.sh deployCC -ccn ridecontract -ccp ../chaincode -ccl go -ccv 2.0 -ccs 2
```

### Port Conflicts
- Fabric peers: 7051, 9051
- Backend: 5000
- Frontend: 3000
- n8n: 5678

## License

MIT

## Support

For issues, please create a GitHub issue or contact support@decentralizedcab.com
