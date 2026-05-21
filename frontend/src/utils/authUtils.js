/**
 * getActiveUser() — returns the currently logged-in user's identity data
 * regardless of whether they logged in via:
 *   (a) Stored Keys (keyData) — email/pseudonym registered users
 *   (b) MetaMask wallet (walletData) — wallet-registered users
 *
 * Priority: walletData (if current session is wallet) > keyData (stored keys)
 * Determination: if localStorage 'user' has walletAddress set, it's a wallet session.
 */
export function getActiveUser() {
  try {
    const sessionUser = JSON.parse(localStorage.getItem('user') || 'null');

    // Wallet session: user object has a walletAddress
    if (sessionUser?.walletAddress) {
      const walletData = JSON.parse(localStorage.getItem('walletData') || '{}');
      return {
        userID:        sessionUser.userID || walletData.userID || sessionUser.walletAddress,
        walletAddress: sessionUser.walletAddress,
        role:          sessionUser.role || walletData.role || localStorage.getItem('userRole') || 'passenger',
        authMethod:    'wallet',
        pseudoID:      sessionUser.walletAddress, // wallet IS their pseudoID
        publicKey:     null,
        privateKey:    null,
      };
    }

    // Stored-keys session: read from keyData
    const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');
    if (keyData.userID || keyData.pseudoID) {
      return {
        userID:        sessionUser?.userID || keyData.userID,
        walletAddress: null,
        role:          sessionUser?.role || keyData.role || localStorage.getItem('userRole') || 'passenger',
        authMethod:    'storedKeys',
        pseudoID:      keyData.pseudoID,
        publicKey:     keyData.publicKey,
        privateKey:    keyData.privateKey,
      };
    }

    // Fallback — return whatever we have in session
    return {
      userID:     sessionUser?.userID || '',
      role:       sessionUser?.role || localStorage.getItem('userRole') || 'passenger',
      authMethod: 'unknown',
    };
  } catch (_) {
    return { userID: '', role: 'passenger', authMethod: 'unknown' };
  }
}

/**
 * isWalletUser() — quick check if current session is a MetaMask wallet login
 */
export function isWalletUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return !!(u?.walletAddress);
  } catch (_) { return false; }
}

/**
 * getUserID() — shortcut to get the current user's ID
 */
export function getUserID() {
  return getActiveUser().userID;
}

/**
 * getUserRole() — shortcut to get role
 */
export function getUserRole() {
  return getActiveUser().role;
}
