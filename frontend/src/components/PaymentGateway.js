/**
 * PaymentGateway.js — Unified Payment Component
 *
 * Supports:
 *  - UPI via Razorpay Checkout (real modal, real payment)
 *  - MetaMask Sepolia ETH (real blockchain transaction to escrow)
 *
 * Escrow model: money held until ride completes, then auto-released to driver.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Stepper, Step, StepLabel, Divider, Paper,
} from '@mui/material';
import {
  AccountBalance, CurrencyBitcoin, CheckCircle, Lock, LockOpen,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

const ESCROW_ETH_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9C0583E4e8F9';
const INR_TO_ETH_RATE = 200000; // 1 ETH = ₹2,00,000 (approximate, update as needed)

// Load Razorpay script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const STEPS_UPI = ['Create Order', 'Pay via UPI', 'Held in Escrow'];
const STEPS_ETH = ['Connect MetaMask', 'Switch to Sepolia', 'Send to Escrow', 'Confirmed'];

/**
 * PaymentGateway
 * @param {object} props
 * @param {string} props.bookingID
 * @param {string} props.rideID
 * @param {number} props.amount — amount in INR
 * @param {'upi'|'ethereum'} props.method
 * @param {string} props.driverWallet — driver's Sepolia wallet (for ETH)
 * @param {function} props.onSuccess — called when payment held in escrow
 * @param {function} props.onError
 */
export default function PaymentGateway({ bookingID, rideID, amount, method, driverWallet, onSuccess, onError }) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const ethAmount = (amount / INR_TO_ETH_RATE).toFixed(6);

  // ── UPI via Razorpay ──────────────────────────────────────────────────────
  const handleUPIPayment = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.');
      setStep(1);

      // Step 2: Create order on backend
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingID, rideID, amount, currency: 'INR' }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create order');

      // Simulated payment (no real Razorpay key)
      if (orderData.simulated) {
        setStep(2);
        await new Promise(r => setTimeout(r, 800));
        setDone(true);
        enqueueSnackbar(`₹${amount} secured in escrow (demo mode). Will release to driver after ride.`, { variant: 'success' });
        onSuccess?.({ method: 'upi', simulated: true, amount });
        return;
      }

      // Step 3: Open real Razorpay Checkout
      await new Promise((resolve, reject) => {
        const options = {
          key: orderData.keyID,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderID,
          name: 'RideShare Escrow',
          description: `Ride Booking - Held until completion`,
          image: '🚗',
          theme: { color: '#0891B2' },
          handler: async (response) => {
            try {
              // Step 4: Verify payment with backend
              setStep(2);
              const verifyRes = await fetch('/api/payments/verify-razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingID,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyData.success) throw new Error('Payment verification failed');

              setDone(true);
              enqueueSnackbar(`₹${amount} held in escrow! Will be released to driver after ride completion.`, { variant: 'success' });
              onSuccess?.({ method: 'upi', paymentID: response.razorpay_payment_id, amount });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── MetaMask Sepolia ETH ──────────────────────────────────────────────────
  const handleETHPayment = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Check MetaMask
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed. Please install MetaMask extension.');
      }
      setStep(1);

      // Step 2: Request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const fromAddress = accounts[0];

      // Step 3: Switch to Sepolia (chainId: 0xaa36a7 = 11155111)
      setStep(2);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          // Sepolia not added, add it
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
        } else {
          throw switchErr;
        }
      }

      // Step 4: Send ETH to escrow
      setStep(3);
      const weiHex = '0x' + BigInt(Math.floor(parseFloat(ethAmount) * 1e18)).toString(16);

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
          to: ESCROW_ETH_ADDRESS,
          value: weiHex,
          gas: '0x5208', // 21000
        }],
      });

      // Step 5: Record on backend
      await fetch('/api/payments/record-eth-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookingID,
          rideID,
          txHash,
          ethAmount,
          inrAmount: amount,
          driverWallet: driverWallet || '',
        }),
      });

      setDone(true);
      enqueueSnackbar(`${ethAmount} SepoliaETH locked in escrow! Tx: ${txHash.slice(0, 12)}...`, { variant: 'success' });
      onSuccess?.({ method: 'ethereum', txHash, ethAmount, inrAmount: amount });
    } catch (err) {
      setError(err.message || 'ETH payment failed');
      onError?.(err.message);
      enqueueSnackbar(err.message || 'ETH payment failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <CheckCircle sx={{ fontSize: 56, color: '#059669', mb: 1 }} />
        <Typography variant="h6" color="text.primary" fontWeight={700}>Payment Secured!</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {method === 'upi' ? `₹${amount}` : `${ethAmount} ETH`} held in escrow
        </Typography>
        <Chip
          icon={<Lock sx={{ fontSize: 14 }} />}
          label="Releases to driver after ride completion"
          size="small"
          sx={{ mt: 1.5, bgcolor: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' }}
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* Escrow Info Banner */}
      <Alert
        severity="info"
        icon={<Lock />}
        sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(3,105,161,0.08)', color: 'text.primary', border: '1px solid rgba(3,105,161,0.2)' }}
      >
        <Typography variant="subtitle2" fontWeight={700}>Escrow Payment System</Typography>
        <Typography variant="caption">
          Your payment is locked until the ride completes — just like Ola/Uber.
          {method === 'upi' && ` ₹${amount} will be held securely.`}
          {method === 'ethereum' && ` ${ethAmount} SepoliaETH → escrow wallet.`}
        </Typography>
      </Alert>

      {/* Steps */}
      <Stepper activeStep={step} sx={{ mb: 2.5 }} alternativeLabel>
        {(method === 'upi' ? STEPS_UPI : STEPS_ETH).map(label => (
          <Step key={label}><StepLabel><Typography variant="caption">{label}</Typography></StepLabel></Step>
        ))}
      </Stepper>

      {/* Amount display */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: 'rgba(8,145,178,0.04)' }}>
        <Typography variant="caption" color="text.secondary">Amount to secure in escrow</Typography>
        <Typography variant="h5" fontWeight={800} color="primary.main">₹{amount}</Typography>
        {method === 'ethereum' && (
          <Typography variant="caption" color="text.secondary">≈ {ethAmount} SepoliaETH</Typography>
        )}
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {method === 'upi' && `Escrow held via Razorpay until driver completes ride`}
          {method === 'ethereum' && `Escrow wallet: ${ESCROW_ETH_ADDRESS.slice(0,8)}...${ESCROW_ETH_ADDRESS.slice(-6)}`}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Pay Button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        startIcon={loading
          ? <CircularProgress size={18} color="inherit" />
          : method === 'upi'
            ? <AccountBalance />
            : <CurrencyBitcoin />
        }
        onClick={method === 'upi' ? handleUPIPayment : handleETHPayment}
        sx={{
          borderRadius: 3,
          py: 1.5,
          fontWeight: 700,
          background: method === 'upi'
            ? 'linear-gradient(135deg, #0891B2, #7C3AED)'
            : 'linear-gradient(135deg, #F59E0B, #EF4444)',
          boxShadow: method === 'upi'
            ? '0 4px 20px rgba(8,145,178,0.35)'
            : '0 4px 20px rgba(239,68,68,0.35)',
          '&:hover': { transform: 'translateY(-1px)' },
        }}
      >
        {loading
          ? 'Processing...'
          : method === 'upi'
            ? `Pay ₹${amount} via Razorpay UPI`
            : `Send ${ethAmount} ETH to Escrow`
        }
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
        <LockOpen sx={{ fontSize: 10, verticalAlign: 'middle' }} /> Payment auto-releases to driver after ride completion
      </Typography>
    </Box>
  );
}
