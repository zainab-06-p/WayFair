const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

class FabricClient {
  constructor() {
    this.wallet = null;
    this.gateway = null;
    this.network = null;
    this.contract = null;
    this._initPromise = null;
  }

  async initialize() {
    // Prevent concurrent initializations
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInitialize().catch(err => {
      this._initPromise = null; // allow retry on failure
      throw err;
    });
    return this._initPromise;
  }

  async _doInitialize() {
    try {
      // Load connection profile
      const ccpPath = path.resolve(process.cwd(), process.env.CONNECTION_PROFILE_PATH || 
        '../network/organizations/peerOrganizations/org1.rideshare.com/connection-org1.json');
      
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      // Create wallet
      const walletPath = path.join(process.cwd(), process.env.WALLET_PATH || 'wallet');
      this.wallet = await Wallets.newFileSystemWallet(walletPath);

      // Check if admin exists
      const adminExists = await this.wallet.get('admin');
      if (!adminExists) {
        await this.enrollAdmin(ccp);
      }

      // Connect to gateway
      this.gateway = new Gateway();
      await this.gateway.connect(ccp, {
        wallet: this.wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get network and contract
      this.network = await this.gateway.getNetwork(process.env.CHANNEL_NAME || 'ridechannel');
      this.contract = this.network.getContract(process.env.CHAINCODE_NAME || 'ridecontract');

      console.log('✅ Connected to Hyperledger Fabric network');
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to network: ${error}`);
      throw error;
    }
  }

  async enrollAdmin(ccp) {
    try {
      // Get the first CA from certificateAuthorities
      const caName = Object.keys(ccp.certificateAuthorities)[0];
      const caInfo = ccp.certificateAuthorities[caName];
      const caTLSCACerts = Array.isArray(caInfo.tlsCACerts.pem) 
        ? caInfo.tlsCACerts.pem[0] 
        : caInfo.tlsCACerts.pem;
      const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

      const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: process.env.MSP_ID || 'Org1MSP',
        type: 'X.509',
      };
      await this.wallet.put('admin', x509Identity);
      console.log('✅ Admin enrolled successfully');
    } catch (error) {
      console.error(`❌ Failed to enroll admin: ${error}`);
      throw error;
    }
  }

  async submitTransaction(functionName, ...args) {
    try {
      await this.initialize();
      const result = await this.contract.submitTransaction(functionName, ...args);
      return result.toString();
    } catch (error) {
      console.error(`❌ Transaction failed: ${error}`);
      throw error;
    }
  }

  async evaluateTransaction(functionName, ...args) {
    try {
      await this.initialize();
      const result = await this.contract.evaluateTransaction(functionName, ...args);
      const str = result.toString();
      return str || 'null';
    } catch (error) {
      console.error(`❌ Query failed: ${error}`);
      throw error;
    }
  }

  async disconnect() {
    if (this.gateway) {
      await this.gateway.disconnect();
      console.log('✅ Disconnected from Hyperledger Fabric network');
    }
  }
}

module.exports = new FabricClient();
