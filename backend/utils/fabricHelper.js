/**
 * Fabric Helper - Provides optional blockchain integration
 * When ENABLE_FABRIC=false, stores data in-memory AND on disk so restarts don't wipe data
 */

const fs = require('fs');
const path = require('path');
const fabricClient = require('./fabricClient');

// ---------- Persistence ----------
const PERSIST_FILE = path.join(__dirname, '..', 'local-data.json');

function loadLocalData() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf8'));
      global.users       = new Map(raw.users       || []);
      global.walletUsers = new Map(raw.walletUsers || []);
      global.rides       = new Map(raw.rides       || []);
      global.bookings    = new Map(raw.bookings    || []);
      global.transactions= new Map(raw.transactions|| []);
      global.sosAlerts   = new Map(raw.sosAlerts   || []);
      global.feedbacks   = new Map(raw.feedbacks   || []);
      console.log(`✅ Local data loaded from disk (${global.walletUsers.size} wallet users, ${global.users.size} users, ${global.rides.size} rides)`);
    }
  } catch (e) {
    console.warn('⚠️  Could not load local-data.json:', e.message);
  }
}

function persistLocalData() {
  try {
    const data = {
      users:        Array.from((global.users       || new Map()).entries()),
      walletUsers:  Array.from((global.walletUsers || new Map()).entries()),
      rides:        Array.from((global.rides       || new Map()).entries()),
      bookings:     Array.from((global.bookings    || new Map()).entries()),
      transactions: Array.from((global.transactions|| new Map()).entries()),
      sosAlerts:    Array.from((global.sosAlerts   || new Map()).entries()),
      feedbacks:    Array.from((global.feedbacks   || new Map()).entries()),
    };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('⚠️  Could not persist local-data.json:', e.message);
  }
}

// In-memory storage when Fabric is disabled
global.rides        = global.rides        || new Map();
global.bookings     = global.bookings     || new Map();
global.transactions = global.transactions || new Map();
global.sosAlerts    = global.sosAlerts    || new Map();
global.walletUsers  = global.walletUsers  || new Map();
global.users        = global.users        || new Map();
global.feedbacks    = global.feedbacks    || new Map();

// Load persisted data on module load
loadLocalData();

const isFabricEnabled = () => process.env.ENABLE_FABRIC !== 'false';

/**
 * Submit a transaction to blockchain (if enabled) or store locally
 */
async function submitTransaction(functionName, ...args) {
  if (isFabricEnabled()) {
    try {
      return await fabricClient.submitTransaction(functionName, ...args);
    } catch (error) {
      console.warn(`⚠️  Blockchain transaction failed (${functionName}):`, error.message);
      console.log('ℹ️  Falling back to local storage');
    }
  }
  
  // Local storage fallback
  return handleLocalStorage(functionName, ...args);
}

/**
 * Evaluate a transaction (read from blockchain or local storage)
 */
async function evaluateTransaction(functionName, ...args) {
  if (isFabricEnabled()) {
    try {
      return await fabricClient.evaluateTransaction(functionName, ...args);
    } catch (error) {
      console.warn(`⚠️  Blockchain query failed (${functionName}):`, error.message);
      console.log('ℹ️  Falling back to local storage');
    }
  }
  
  // Local storage fallback
  return handleLocalQuery(functionName, ...args);
}

/**
 * Handle local storage for different transaction types
 */
function handleLocalStorage(functionName, ...args) {
  console.log(`ℹ️  Local storage: ${functionName}`, args[0]);
  
  switch (functionName) {
    case 'RegisterUser': {
      const [userID, pseudoID, role, email, ipfsHash, emergencyContactJSON] = args;
      global.users = global.users || new Map();
      global.users.set(userID, {
        userID,
        pseudoID,
        role,
        email,
        ipfsHash,
        emailVerified: true,
        isActive: true,
        emergencyContact: emergencyContactJSON ? (() => { try { return JSON.parse(emergencyContactJSON); } catch(_) { return null; } })() : null,
        createdAt: new Date().toISOString()
      });
      persistLocalData();
      return Promise.resolve();
    }

    case 'RegisterWalletUser': {
      const [userID, walletAddress, role, email, ipfsHash, emergencyContactJSON] = args;
      global.walletUsers = global.walletUsers || new Map();
      const walletUser = {
        userID,
        walletAddress: walletAddress.toLowerCase(),
        role,
        email,
        ipfsHash,
        emailVerified: true,
        isActive: true,
        isBlocked: false,
        emergencyContact: emergencyContactJSON ? (() => { try { return JSON.parse(emergencyContactJSON); } catch(_) { return null; } })() : null,
        createdAt: new Date().toISOString()
      };
      global.walletUsers.set(walletAddress.toLowerCase(), walletUser);
      persistLocalData();
      return Promise.resolve();
    }

    case 'VerifyUserEmail': {
      const [userID] = args;
      // Update email-registered users
      global.users = global.users || new Map();
      const user = global.users.get(userID);
      if (user) {
        user.emailVerified = true;
        user.isActive = true;
        global.users.set(userID, user);
      }
      // Also update wallet-registered users (find by userID)
      global.walletUsers = global.walletUsers || new Map();
      for (const [wallet, wUser] of global.walletUsers.entries()) {
        if (wUser.userID === userID) {
          wUser.emailVerified = true;
          wUser.isActive = true;
          global.walletUsers.set(wallet, wUser);
          break;
        }
      }
      persistLocalData();
      return Promise.resolve();
    }

    case 'CreateRide': {
      const [rideID, driverID, driverPseudoID, ...rideData] = args;
      global.rides.set(rideID, {
        rideID,
        driverID,
        driverPseudoID,
        startLat: rideData[0],
        startLng: rideData[1],
        startAddress: rideData[2],
        endLat: rideData[3],
        endLng: rideData[4],
        endAddress: rideData[5],
        departureTime: rideData[6],
        availableSeats: parseInt(rideData[7]),
        pricePerSeat: parseFloat(rideData[8]),
        rideType: rideData[9] || 'solo',
        status: 'scheduled',
        bookings: [],
        createdAt: new Date().toISOString()
      });
      persistLocalData();
      return Promise.resolve();
    }

    case 'BookRide': {
      const [bookingID, rideID, passengerID, ...bookingData] = args;
      // bookingData: [passengerPseudoID, seatsBooked, pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress, paymentMethod(optional)]
      const rideForBooking = global.rides.get(rideID);
      const seatsBooked = parseInt(bookingData[1]) || 1;
      const pricePerSeat = rideForBooking ? parseFloat(rideForBooking.pricePerSeat) || 0 : 0;
      global.bookings.set(bookingID, {
        bookingID,
        rideID,
        passengerID,
        passengerPseudoID: bookingData[0],
        seatsBooked,
        pickupLat: bookingData[2],
        pickupLng: bookingData[3],
        pickupAddress: bookingData[4],
        dropLat: bookingData[5],
        dropLng: bookingData[6],
        dropAddress: bookingData[7],
        paymentMethod: bookingData[8] || 'cash',
        totalPrice: pricePerSeat * seatsBooked,
        status: 'booked',
        bookedAt: new Date().toISOString()
      });
      
      // Update ride's available seats
      if (rideForBooking) {
        rideForBooking.availableSeats = (rideForBooking.availableSeats || 0) - seatsBooked;
        if (!Array.isArray(rideForBooking.bookings)) rideForBooking.bookings = [];
        rideForBooking.bookings.push(bookingID);
        global.rides.set(rideID, rideForBooking);
      }
      persistLocalData();
      return Promise.resolve();
    }
   
    case 'StartRide':
    case 'EndRide':
    case 'CancelRide': {
      const [rideID] = args;
      const ride = global.rides.get(rideID);
      if (ride) {
        ride.status = functionName === 'StartRide' ? 'in-progress' : 
                      functionName === 'EndRide' ? 'completed' : 'cancelled';
        global.rides.set(rideID, ride);
      }
      persistLocalData();
      return Promise.resolve();
    }
    
    case 'CancelBooking': {
      const [bookingID] = args;
      const booking = global.bookings.get(bookingID);
      if (booking) {
        booking.status = 'cancelled';
        global.bookings.set(bookingID, booking);
        
        // Restore seats to ride
        const ride = global.rides.get(booking.rideID);
        if (ride) {
          ride.availableSeats += booking.seatsBooked;
          global.rides.set(booking.rideID, ride);
        }
      }
      persistLocalData();
      return Promise.resolve();
    }

    case 'RecordTransaction': {
      // Args match chaincode: [txnID, bookingID, rideID, fromPseudoID, toPseudoID, amount, paymentMethod, ethTxHash]
      const [txnID, bookingID, rideID, fromUserID, toUserID, amount, paymentMethod, ethTxHash] = args;
      global.transactions.set(txnID, {
        transactionID: txnID,
        txnID,
        bookingID: bookingID || '',
        rideID: rideID || '',
        fromUserID: fromUserID || '',
        toUserID: toUserID || '',
        amount: parseFloat(amount || '0'),
        paymentMethod: paymentMethod || 'cash',
        status: 'completed',
        timestamp: new Date().toISOString()
      });
      persistLocalData();
      return Promise.resolve();
    }
    
    case 'SubmitFeedback': {
      const [feedbackID, rideID, bookingID, fromUserID, toUserID, rating, comment] = args;
      global.feedbacks = global.feedbacks || new Map();
      // Always store under a FEEDBACK_ prefixed key so GetUserFeedback / GetRideFeedback can find it
      const fbKey = feedbackID.startsWith('FEEDBACK_') ? feedbackID : ('FEEDBACK_' + feedbackID);
      global.feedbacks.set(fbKey, {
        feedbackID: fbKey,
        rideID,
        bookingID,
        fromUserID,
        toUserID,
        rating: parseInt(rating),
        review: comment || '',
        comment: comment || '',
        xpAwarded: 10,
        timestamp: new Date().toISOString()
      });
      persistLocalData();
      return Promise.resolve();
    }

    case 'TriggerSOS': {
      // args: alertID, rideID, bookingID, passengerID, pseudoID, lat, lng, address
      const [alertID, rideID, bookingID, passengerID, pseudoID, lat, lng, address] = args;
      global.sosAlerts.set(alertID, {
        alertID,
        rideID,
        bookingID,
        passengerID,
        passengerPseudoID: pseudoID,
        location: { latitude: parseFloat(lat) || 0, longitude: parseFloat(lng) || 0, address: address || '' },
        timestamp: new Date().toISOString(),
        status: 'active'
      });
      persistLocalData();
      return Promise.resolve();
    }

    default:
      console.warn(`⚠️  Unhandled local storage function: ${functionName}`);
      return Promise.resolve();
  }
}

/**
 * Handle local queries for read operations
 */
function handleLocalQuery(functionName, ...args) {
  console.log(`ℹ️  Local query: ${functionName}`, args[0]);
  
  switch (functionName) {
    case 'GetUser': {
      const [userID] = args;
      // Check email-registered users first
      const user = global.users?.get(userID);
      if (user) return Promise.resolve(JSON.stringify(user));
      // Also search wallet users by userID
      for (const wu of (global.walletUsers || new Map()).values()) {
        if (wu.userID === userID) return Promise.resolve(JSON.stringify(wu));
      }
      return Promise.resolve(JSON.stringify(null));
    }

    case 'GetUserByWallet': {
      const [walletAddress] = args;
      global.walletUsers = global.walletUsers || new Map();
      const walletUser = global.walletUsers.get(walletAddress.toLowerCase());
      return Promise.resolve(walletUser ? JSON.stringify(walletUser) : JSON.stringify(null));
    }

    case 'GetUserByPseudoID': {
      const [pID] = args;
      global.users = global.users || new Map();
      for (const u of global.users.values()) {
        if (u.pseudoID === pID) return Promise.resolve(JSON.stringify(u));
      }
      return Promise.resolve(JSON.stringify(null));
    }
    
    case 'GetRide': {
      const [rideID] = args;
      const ride = global.rides.get(rideID);
      return Promise.resolve(ride ? JSON.stringify(ride) : JSON.stringify(null));
    }
    
    case 'GetAllRides': {
      const rides = Array.from(global.rides.values());
      return Promise.resolve(JSON.stringify(rides));
    }

    case 'GetAllUsers': {
      // Merge email-registered users and wallet-registered users
      const allUsers = [];
      const seen = new Set();
      for (const u of (global.users || new Map()).values()) {
        if (!seen.has(u.userID)) { seen.add(u.userID); allUsers.push(u); }
      }
      for (const u of (global.walletUsers || new Map()).values()) {
        if (!seen.has(u.userID)) { seen.add(u.userID); allUsers.push(u); }
      }
      return Promise.resolve(JSON.stringify(allUsers));
    }

    case 'GetBookingsByPassenger': {
      const [passengerID] = args;
      const byPassenger = Array.from((global.bookings || new Map()).values())
        .filter(b => b.passengerID === passengerID);
      return Promise.resolve(JSON.stringify(byPassenger));
    }

    case 'GetRideBookings': {
      const [targetRideID] = args;
      const byRide = Array.from((global.bookings || new Map()).values())
        .filter(b => b.rideID === targetRideID);
      return Promise.resolve(JSON.stringify(byRide));
    }

    case 'GetAllBookings': {
      const allBookings = Array.from((global.bookings || new Map()).values());
      return Promise.resolve(JSON.stringify(allBookings));
    }

    case 'GetAllTransactions': {
      const allTxns = Array.from((global.transactions || new Map()).values());
      return Promise.resolve(JSON.stringify(allTxns));
    }

    case 'GetAllFeedback': {
      const allFeedback = Array.from((global.feedbacks || new Map()).values());
      return Promise.resolve(JSON.stringify(allFeedback));
    }

    case 'GetAllSOSAlerts': {
      const allSOS = Array.from((global.sosAlerts || new Map()).values());
      return Promise.resolve(JSON.stringify(allSOS));
    }

    case 'GetUserFeedback': {
      const [targetUID] = args;
      const userFeedback = Array.from((global.feedbacks || new Map()).values())
        .filter(f => f.toUserID === targetUID);
      return Promise.resolve(JSON.stringify(userFeedback));
    }

    case 'GetRideFeedback': {
      const [targetRideID] = args;
      const rideFeedback = Array.from((global.feedbacks || new Map()).values())
        .filter(f => f.rideID === targetRideID);
      return Promise.resolve(JSON.stringify(rideFeedback));
    }
    
    case 'GetBooking': {
      const [bookingID] = args;
      const booking = global.bookings.get(bookingID);
      return Promise.resolve(booking ? JSON.stringify(booking) : JSON.stringify(null));
    }
    
    default:
      console.warn(`⚠️  Unhandled local query function: ${functionName}`);
      return Promise.resolve(JSON.stringify(null));
  }
}

module.exports = {
  submitTransaction,
  evaluateTransaction,
  isFabricEnabled
};
