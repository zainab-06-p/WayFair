# 🚗 WayFair — Decentralized Rideshare Platform

<div align="center">

![WayFair](https://img.shields.io/badge/WayFair-Rideshare-06B6D4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE4LjkyIDZjLS4wMS4wNC0xLjk2IDUuNS0xLjk2IDUuNUg3LjA0TDUuMDggNmgtMS41TDEgMTZoMjJMMTkuNDIgNmgtLjVMMTguOTIgNnoiLz48L3N2Zz4=)
![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger-Fabric-2F3134?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![Go](https://img.shields.io/badge/Go-Chaincode-00ADD8?style=for-the-badge&logo=go)

**A blockchain-secured, community-driven rideshare application built on Hyperledger Fabric**

[Live Demo](#) · [Smart Contract Docs](#-smart-contract-chaincode-docs) · [Setup Guide](#-setup-guide)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Smart Contract Docs](#-smart-contract-chaincode-docs)
- [Setup Guide](#-setup-guide)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)

---

## 🌟 Overview

WayFair is a **decentralized ridesharing platform** that combines community carpooling with the transparency of blockchain technology. Every ride, booking, and payment is recorded immutably on Hyperledger Fabric, ensuring trust and accountability.

### Key Differentiators
| Feature | WayFair | Traditional Rideshare |
|---|---|---|
| Payment Records | Blockchain (immutable) | Centralized DB |
| User Documents | IPFS (decentralized) | Cloud storage |
| Trust System | On-chain sponsorship | Rating only |
| Privacy | Pseudo-IDs (hashed keys) | Full identity |
| Payments | Cash / UPI / ETH | Card only |

---

## ✨ Features

### 🔐 Security & Trust
- **Blockchain-secured rides** — every ride lifecycle recorded on Hyperledger Fabric
- **OTP verification** — Uber-style 6-digit OTP gates ride start (passenger → driver)
- **Driver Sponsorship System** — experienced drivers (Trust Score ≥ 400) vouch for new drivers with shared accountability
- **SOS Emergency Alerts** — real-time location + driver info sent to emergency contact via email
- **Pseudo-ID privacy** — users identified by hashed keys, not names, on-chain

### 🚘 Ride Experience
- **Real-time map** — OpenStreetMap + OSRM routing with live polyline preview
- **Live ride tracking** — Socket.IO-powered real-time GPS updates
- **Carpool & Solo** modes — flexible ride types
- **Custom fare** — drivers set any fare from ₹1–₹10,000 per seat
- **Driver/Passenger profiles** — mutual name, photo, and vehicle info visible after booking

### 💳 Payments
- **Razorpay** — INR payments with test mode support
- **Ethereum (ETH)** — crypto payments via MetaMask
- **Cash / UPI** — offline payment tracking on-chain
- **Payment deferred** — pay only when ride starts (not at booking)

### 👥 Community
- **Referral system** — real-time referral code validation and reward tracking
- **Feedback & ratings** — post-ride reviews recorded on blockchain
- **Blockchain Explorer** — public transparency dashboard for all transactions
- **Chat** — in-app messaging between driver and passenger per ride

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  React 18 + MUI v5 + Framer Motion + React Leaflet + Socket.IO  │
│  Deployed on: Vercel                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS + WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                      API LAYER (Node.js)                         │
│  Express.js REST API + Socket.IO Server                          │
│  Auth: JWT + MetaMask Signature Verification                     │
│  File Storage: IPFS via Pinata                                   │
│  Email: Google OAuth2 Gmail API                                  │
│  Payments: Razorpay SDK + Web3.js ETH                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Fabric SDK (gRPC)
┌───────────────────────────▼─────────────────────────────────────┐
│                  BLOCKCHAIN LAYER                                 │
│  Hyperledger Fabric v2.x                                        │
│  Channel: ridechannel                                            │
│  Chaincode: rideshare (Go) — External Chaincode v1.1            │
│  Org: Org1MSP | Peer: localhost:7051                            │
│  Orderer: localhost:7050 | CA: localhost:7054                   │
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    STORAGE LAYER                                  │
│  IPFS (Pinata) — user documents & profile pictures              │
│  Local JSON fallback — rides/bookings/payments (dev mode)       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow — Booking a Ride
```
Passenger searches → Filters by location (Haversine, ≤20km)
    → Selects ride → POST /api/bookings/create
    → Backend: BookRide chaincode tx → OTP generated (6-digit)
    → Socket.IO: OTP sent to passenger room
    → Driver: enters OTP via dialog → POST /api/rides/verify-otp
    → Backend: StartRide chaincode tx → ride.status = "started"
    → Post-ride: Pay Now → Razorpay/ETH/Cash
    → RecordTransaction chaincode tx → immutable payment record
```

---

## 📁 Project Structure

```
WayFair/
├── backend/                    # Node.js Express API
│   ├── routes/
│   │   ├── auth.js            # Registration, login (JWT + MetaMask)
│   │   ├── rides.js           # Ride CRUD + OTP verification
│   │   ├── bookings.js        # Booking creation + OTP generation
│   │   ├── payment.js         # Razorpay + ETH payment processing
│   │   ├── sos.js             # SOS alert + emergency email
│   │   ├── referral.js        # Referral code validation & rewards
│   │   ├── users.js           # User profiles (public + wallet)
│   │   ├── feedback.js        # Ratings & reviews
│   │   ├── sponsorship.js     # Driver sponsorship management
│   │   ├── explorer.js        # Blockchain explorer data
│   │   ├── admin.js           # Admin dashboard APIs
│   │   ├── routing.js         # OSRM route calculation
│   │   └── ipfs.js            # IPFS upload proxy
│   ├── utils/
│   │   ├── fabricHelper.js    # Fabric SDK wrapper (submit/evaluate)
│   │   ├── fabricClient.js    # Fabric gateway connection
│   │   ├── emailService.js    # Gmail OAuth2 transactional email
│   │   ├── ipfsClient.js      # Pinata IPFS client
│   │   ├── razorpayClient.js  # Razorpay SDK instance
│   │   └── crypto.js          # Key generation & signing
│   ├── sockets/
│   │   └── chat.js            # Socket.IO chat + live location
│   ├── server.js              # Express app entry point
│   └── .env.example           # Environment variable template
│
├── chaincode/                  # Hyperledger Fabric Smart Contract (Go)
│   ├── main.go                # Full chaincode — 1355 lines
│   └── go.mod                 # Go module dependencies
│
├── frontend/                   # React 18 SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.js           # Landing page
│   │   │   ├── LoginPage.js          # MetaMask + stored-key login
│   │   │   ├── RegisterPage.js       # Multi-step registration + emergency contact
│   │   │   ├── DashboardPage.js      # Role-based dashboard router
│   │   │   ├── ProfilePage.js        # User profile + IPFS documents
│   │   │   ├── ReferralPage.js       # Referral code sharing + live updates
│   │   │   ├── BlockchainExplorer.js # Public transaction explorer
│   │   │   ├── LiveRidePage.js       # Real-time GPS tracking
│   │   │   ├── RideDetailsPage.js    # Full ride info + actions
│   │   │   ├── ChatPage.js           # In-ride messaging
│   │   │   ├── driver/
│   │   │   │   ├── CreateRidePage.js # Map-based ride creation
│   │   │   │   ├── MyRidesPage.js    # Ride management + OTP verification
│   │   │   │   └── SponsorshipPage.js# Sponsorship management
│   │   │   └── passenger/
│   │   │       ├── SearchRidePage.js # Location search + map results
│   │   │       └── MyBookingsPage.js # Booking management + payment + OTP
│   │   ├── components/
│   │   │   ├── Navbar.js             # Responsive navigation
│   │   │   ├── SOSButton.js          # Emergency SOS trigger
│   │   │   ├── OTPVerifyDialog.js    # Driver OTP input dialog
│   │   │   ├── PaymentDialog.js      # Multi-method payment flow
│   │   │   ├── FeedbackDialog.js     # Post-ride review
│   │   │   └── LocationAutocomplete.js # Nominatim location search
│   │   ├── context/
│   │   │   ├── AuthContext.js        # JWT auth state management
│   │   │   └── SocketContext.js      # Socket.IO connection provider
│   │   └── hooks/
│   │       └── useMetaMask.js        # MetaMask wallet hook
│   └── vercel.json                   # Vercel SPA routing config
│
├── network/                    # Hyperledger Fabric network config
│   ├── network.sh             # Network management script
│   ├── docker/                # Docker compose files
│   ├── configtx/              # Channel configuration
│   └── organizations/         # Crypto materials & connection profiles
│
├── scripts/                    # Automation scripts
│   ├── check-and-start-chaincode.sh  # Start external chaincode
│   ├── approve-commit-chaincode.sh   # Deploy chaincode to channel
│   └── redeploy-chaincode.sh         # Update chaincode
│
└── n8n-workflows/              # n8n automation (optional)
    └── rideshare-notifications.json  # Email workflow definition
```

---

## 📜 Smart Contract (Chaincode) Docs

The chaincode is written in **Go** using `hyperledger/fabric-contract-api-go`. It manages all on-chain state for the rideshare platform.

### Data Models

#### `User`
```go
type User struct {
    UserID           string `json:"userID"`
    PseudoID         string `json:"pseudoID"`       // Hashed public key
    WalletAddress    string `json:"walletAddress"`  // MetaMask address
    Role             string `json:"role"`            // "driver" | "passenger"
    Email            string `json:"email"`
    EmailVerified    bool   `json:"emailVerified"`
    IPFSHash         string `json:"ipfsHash"`        // Profile docs on IPFS
    RegistrationDate string `json:"registrationDate"`
    IsActive         bool   `json:"isActive"`
    IsBlocked        bool   `json:"isBlocked"`
}
```

#### `Ride`
```go
type Ride struct {
    RideID         string   `json:"rideID"`
    DriverID       string   `json:"driverID"`
    StartLocation  Location `json:"startLocation"`
    EndLocation    Location `json:"endLocation"`
    DepartureTime  string   `json:"departureTime"`
    AvailableSeats int      `json:"availableSeats"`
    PricePerSeat   float64  `json:"pricePerSeat"`
    RideType       string   `json:"rideType"`   // "solo" | "carpool"
    Status         string   `json:"status"`     // "created" → "started" → "completed"
    Passengers     []string `json:"passengers"`
}
```

#### `Booking`
```go
type Booking struct {
    BookingID   string  `json:"bookingID"`
    RideID      string  `json:"rideID"`
    PassengerID string  `json:"passengerID"`
    SeatsBooked int     `json:"seatsBooked"`
    TotalPrice  float64 `json:"totalPrice"`
    Status      string  `json:"status"` // "booked" → "started" → "completed"
}
```

#### `TrustScore`
```go
type TrustScore struct {
    DriverID           string `json:"driverID"`
    TrustScore         int    `json:"trustScore"`    // 0–1000
    TrustLevel         string `json:"trustLevel"`    // "Restricted"→"Bronze"→"Silver"→"Gold"→"Platinum"
    MaxSponsorships    int    `json:"maxSponsorships"`
    ActiveSponsorships int    `json:"activeSponsorships"`
}
```

### Chaincode Functions

#### User Management
| Function | Args | Description |
|---|---|---|
| `RegisterUser` | userID, pseudoID, role, email, ipfsHash | Register with stored keys |
| `RegisterWalletUser` | userID, walletAddress, role, email, ipfsHash | Register with MetaMask |
| `VerifyUserEmail` | userID | Activate account after email verification |
| `GetUser` | userID | Fetch user by ID |
| `GetUserByWallet` | walletAddress | Fetch MetaMask user |
| `BlockUser` | userID | Admin: block a user |

#### Ride Lifecycle
| Function | Args | Description |
|---|---|---|
| `CreateRide` | rideID, driverID, coords, time, seats, price, type | Create a new ride |
| `BookRide` | bookingID, rideID, passengerID, seats, pickup, drop | Book seats on a ride |
| `StartRide` | rideID | Mark ride as started (after OTP) |
| `EndRide` | rideID | Mark ride as completed |
| `CancelRide` | rideID | Cancel an unstarted ride |
| `CancelBooking` | bookingID | Cancel booking + restore seats |
| `GetAllRides` | — | List all rides (for explorer) |

#### Payments & Feedback
| Function | Args | Description |
|---|---|---|
| `RecordTransaction` | txID, bookingID, rideID, from, to, amount, method, ethHash | Record payment |
| `SubmitFeedback` | feedbackID, rideID, bookingID, fromID, toID, rating, comment | Submit review |
| `GetUserFeedback` | userID | Get all reviews for a user |

#### Sponsorship System
| Function | Args | Description |
|---|---|---|
| `CreateSponsorshipRequest` | sponsorshipID, sponsorID, sponseeID | New driver requests sponsor |
| `AcceptSponsorship` | sponsorshipID | Sponsor accepts (sets 90-day probation) |
| `RecordAccountabilityEvent` | eventID, sponsorshipID, type, impact | Log sponsee behavior |
| `CompleteProbation` | sponsorshipID | End probation period |
| `GetDriverTrustScore` | driverID | Get trust metrics |

#### Trust Level Thresholds
| Score | Level | Max Sponsorships |
|---|---|---|
| 0–199 | Restricted | 0 |
| 200–399 | Bronze | 1 |
| 400–599 | Silver | 2 |
| 600–799 | Gold | 3 |
| 800–1000 | Platinum | 5 |

#### SOS
| Function | Args | Description |
|---|---|---|
| `TriggerSOS` | alertID, rideID, bookingID, passengerID, lat, lng, addr | Create SOS alert on-chain |
| `ResolveSOSAlert` | alertID | Mark alert as resolved |

---

## 🚀 Setup Guide

### Prerequisites
```bash
# Required software
Node.js 20.x LTS
Go 1.21+
Docker Desktop (for Hyperledger Fabric)
Git
```

### 1. Clone the Repository
```bash
git clone https://github.com/zainab-06-p/WayFair.git
cd WayFair
```

### 2. Configure Environment Variables
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:
```env
# Hyperledger Fabric
ENABLE_FABRIC=true
FABRIC_CHANNEL_NAME=ridechannel
FABRIC_CHAINCODE_NAME=rideshare
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_ORDERER_ENDPOINT=localhost:7050

# IPFS (Pinata)
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret

# Email (Gmail OAuth2)
EMAIL_USER=your@gmail.com
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Auth
JWT_SECRET=your_32char_secret

# Payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret

# Server
PORT=5000
NODE_ENV=development
```

### 3. Start Hyperledger Fabric Network
```bash
cd network

# Start the network (creates channel, joins peers)
./network.sh up

# Deploy the external chaincode
cd ..
./scripts/check-and-start-chaincode.sh
./scripts/approve-commit-chaincode.sh
```

### 4. Start the Backend
```bash
cd backend
npm install
node server.js
# API available at http://localhost:5000
```

### 5. Start the Frontend
```bash
cd frontend
npm install
npm start
# App available at http://localhost:3000
```

### 6. Quick Start (All together)
```bash
# Terminal 1 — Fabric Network
cd network && ./network.sh up

# Terminal 2 — External Chaincode
cd chaincode && ./rideshare-chaincode.exe -peer.address localhost:7052

# Terminal 3 — Backend
cd backend && node server.js

# Terminal 4 — Frontend
cd frontend && npm start
```

> **Note:** If Fabric is not available, set `ENABLE_FABRIC=false` in `.env`. The app uses local JSON file fallbacks (`local-data.json`) for development.

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

### Authentication
```
POST   /auth/register          # Register new user (stored keys)
POST   /auth/register-wallet   # Register with MetaMask
POST   /auth/login             # Login with stored keys
POST   /auth/login-wallet      # Login with MetaMask signature
GET    /auth/verify-email/:token # Email verification
```

### Rides
```
POST   /rides/create           # Create a ride (driver)
GET    /rides/my-rides         # Get driver's rides
GET    /rides/:rideID          # Get ride details
POST   /rides/start            # Start a ride (after OTP)
POST   /rides/end              # End a ride
POST   /rides/cancel           # Cancel a ride
POST   /rides/verify-otp       # Verify passenger OTP
POST   /rides/update-location  # Update live GPS location
```

### Bookings
```
POST   /bookings/create        # Book a ride
GET    /bookings/my/bookings   # Passenger's bookings
GET    /bookings/ride/:rideID  # All bookings for a ride
POST   /bookings/cancel        # Cancel a booking
GET    /bookings/:bookingID/otp # Get booking OTP (passenger)
```

### Payments
```
POST   /payment/create-order   # Create Razorpay order
POST   /payment/verify         # Verify Razorpay payment
POST   /payment/pay-eth        # Record ETH payment
POST   /payment/pay-cash       # Record cash/UPI payment
GET    /payment/history        # Payment history
```

### Users
```
GET    /users/profile          # Current user profile
GET    /users/:userID/wallet   # Get user's wallet address
GET    /users/:userID/public   # Public profile (name, pic, vehicle)
```

### SOS
```
POST   /sos/trigger            # Trigger SOS alert
POST   /sos/resolve            # Resolve SOS alert
```

### Referrals
```
GET    /referral/my-code       # Get personal referral code
POST   /referral/validate      # Validate a referral code
POST   /referral/apply         # Apply a referral code
```

---

## 🔧 Environment Variables

Full reference — see `backend/.env.example`:

| Variable | Required | Description |
|---|---|---|
| `ENABLE_FABRIC` | Yes | `true` for blockchain, `false` for local fallback |
| `FABRIC_CHANNEL_NAME` | Yes | Fabric channel (default: `ridechannel`) |
| `FABRIC_PEER_ENDPOINT` | Yes | Peer gRPC endpoint |
| `PINATA_API_KEY` | Yes | Pinata IPFS API key |
| `PINATA_SECRET_KEY` | Yes | Pinata IPFS secret |
| `JWT_SECRET` | Yes | 32+ char random string |
| `EMAIL_USER` | Yes | Gmail address for notifications |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | Yes | OAuth2 refresh token |
| `RAZORPAY_KEY_ID` | Yes | Razorpay key (test: `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay secret |
| `N8N_WEBHOOK_URL` | No | n8n webhook for email automation |
| `PORT` | No | Server port (default: `5000`) |

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard:
# REACT_APP_API_URL=https://your-backend-url
# REACT_APP_SOCKET_URL=https://your-backend-url
```

The `vercel.json` is pre-configured for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Backend → Railway / Render
1. Connect GitHub repo to [Railway](https://railway.app)
2. Set root directory to `backend/`
3. Add all `.env` variables in the dashboard
4. Start command: `node server.js`

### Fabric Network → VPS (Ubuntu 22.04)
```bash
# Minimum: 4GB RAM, 2 vCPU (AWS t3.medium or DigitalOcean Basic)
sudo apt install docker.io docker-compose nodejs npm golang

git clone https://github.com/zainab-06-p/WayFair.git
cd WayFair/network && ./network.sh up
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, MUI v5, Framer Motion, React Leaflet, Socket.IO Client |
| **Backend** | Node.js, Express.js, Socket.IO, JWT, Web3.js |
| **Blockchain** | Hyperledger Fabric v2.x, Go chaincode |
| **Payments** | Razorpay (INR), Ethereum via MetaMask |
| **Storage** | IPFS via Pinata (documents), Local JSON (dev fallback) |
| **Email** | Google Gmail API via OAuth2 |
| **Maps** | OpenStreetMap + Nominatim + OSRM routing |
| **Deployment** | Vercel (frontend), Railway/Render (backend) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
Built with ❤️ · Powered by Hyperledger Fabric · © 2026 WayFair
</div>
