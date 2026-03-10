import { useState, useEffect } from 'react';
import Web3 from 'web3';

export const useMetaMask = () => {
  const [account, setAccount] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Auto-connect on mount if previously connected
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);

      // Check if already connected
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
          }
        })
        .catch((err) => {
          console.error('Error checking accounts:', err);
        });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Connect to MetaMask
  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask extension.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setIsLoading(false);
        return accounts[0];
      }
    } catch (err) {
      console.error('Error connecting to MetaMask:', err);
      setError(err.message || 'Failed to connect to MetaMask');
      setIsLoading(false);
      return null;
    }

    setIsLoading(false);
    return null;
  };

  // Disconnect from MetaMask
  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
  };

  // Sign a message
  const signMessage = async (message) => {
    if (!web3 || !account) {
      setError('Please connect MetaMask first');
      return null;
    }

    try {
      const signature = await web3.eth.personal.sign(message, account, '');
      return signature;
    } catch (err) {
      console.error('Error signing message:', err);
      setError(err.message || 'Failed to sign message');
      return null;
    }
  };

  // Get balance
  const getBalance = async () => {
    if (!web3 || !account) {
      return '0';
    }

    try {
      const balance = await web3.eth.getBalance(account);
      return web3.utils.fromWei(balance, 'ether');
    } catch (err) {
      console.error('Error getting balance:', err);
      return '0';
    }
  };

  return {
    account,
    web3,
    isConnected,
    isLoading,
    error,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connect,
    disconnect,
    signMessage,
    getBalance,
  };
};
