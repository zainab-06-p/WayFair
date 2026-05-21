import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Stepper, Step, StepLabel, Divider, Paper } from '@mui/material';
import { AccountBalance, CurrencyBitcoin, CheckCircle, MonetizationOn } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

const INR_TO_ETH_RATE = 200000;

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

const STEPS_UPI = ['Create Order', 'Pay via UPI', 'Confirmed'];
const STEPS_ETH = ['Connect Wallet', 'Send ETH', 'Confirmed'];
const STEPS_CASH = ['Record Cash'];

export default function PaymentGateway({ bookingID, rideID, amount, method, driverWallet, onSuccess, onError }) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const apiBase = process.env.REACT_APP_API_URL || '';
  const ethAmount = (amount / INR_TO_ETH_RATE).toFixed(6);
  const steps = method === 'upi' ? STEPS_UPI : method === 'ethereum' ? STEPS_ETH : STEPS_CASH;

  const handleUPIPayment = async () => {
    setLoading(true); setError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay. Check your internet connection.');
      setStep(1);
      const orderRes = await fetch(`${apiBase}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingID, rideID, amount, currency: 'INR' }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create order');
      if (orderData.simulated) {
        setStep(2);
        await new Promise(r => setTimeout(r, 800));
        setDone(true);
        enqueueSnackbar(`Payment of Rs.${amount} recorded (demo).`, { variant: 'success' });
        onSuccess?.({ method: 'upi', simulated: true, amount });
        return;
      }
      await new Promise((resolve, reject) => {
        const options = {
          key: orderData.keyID, amount: orderData.amount, currency: orderData.currency,
          order_id: orderData.orderID, name: 'WayFair Rideshare', theme: { color: '#0891B2' },
          handler: async (response) => {
            try {
              setStep(2);
              const vRes = await fetch(`${apiBase}/api/payments/verify-razorpay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, bookingID }),
              });
              const vData = await vRes.json();
              if (!vData.success) throw new Error('Payment verification failed');
              setDone(true);
              enqueueSnackbar(`Rs.${amount} paid!`, { variant: 'success' });
              onSuccess?.({ method: 'upi', paymentID: response.razorpay_payment_id, amount });
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (err) { setError(err.message); onError?.(err.message); enqueueSnackbar(err.message, { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const handleETHPayment = async () => {
    setLoading(true); setError('');
    try {
      if (typeof window.ethereum === 'undefined') throw new Error('MetaMask not installed. Install it from metamask.io');
      setStep(1);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const fromAddress = accounts[0];
      if (!fromAddress) throw new Error('No MetaMask account found. Unlock MetaMask.');
      if (!driverWallet || driverWallet.length < 10) throw new Error('Driver ETH wallet not set. Driver must add wallet in profile.');
      const ethNum = parseFloat(ethAmount);
      if (isNaN(ethNum) || ethNum <= 0) throw new Error('Invalid ETH amount.');
      const weiHex = '0x' + BigInt(Math.round(ethNum * 1e18)).toString(16);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: driverWallet, value: weiHex, gas: '0x5208' }],
      });
      if (!txHash) throw new Error('Transaction rejected by MetaMask.');
      setStep(2);
      const recordRes = await fetch(`${apiBase}/api/payments/record-eth-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingID, rideID, txHash, ethAmount, inrAmount: amount, driverWallet }),
      });
      const recordData = await recordRes.json();
      if (!recordData.success) throw new Error(recordData.error || 'Failed to record ETH payment');
      setDone(true);
      enqueueSnackbar(`${ethAmount} ETH sent to driver! Tx: ${txHash.slice(0, 10)}...`, { variant: 'success' });
      onSuccess?.({ method: 'ethereum', txHash, ethAmount, inrAmount: amount });
    } catch (err) { const msg = err.message || 'ETH payment failed'; setError(msg); onError?.(msg); enqueueSnackbar(msg, { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const handleCashPayment = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiBase}/api/payments/direct-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingID, rideID, amount, method: 'cash' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to record cash payment');
      setDone(true);
      enqueueSnackbar('Cash payment recorded on blockchain!', { variant: 'success' });
      onSuccess?.({ method: 'cash', amount });
    } catch (err) { setError(err.message); onError?.(err.message); enqueueSnackbar(err.message, { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const handlePay = method === 'upi' ? handleUPIPayment : method === 'ethereum' ? handleETHPayment : handleCashPayment;

  if (done) return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <CheckCircle sx={{ fontSize: 56, color: '#059669', mb: 1 }} />
      <Typography variant="h6" fontWeight={700}>Payment Complete!</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {method === 'upi' ? `Rs.${amount} paid via UPI` : method === 'ethereum' ? `${ethAmount} ETH sent to driver` : `Rs.${amount} cash recorded`}
      </Typography>
    </Box>
  );

  return (
    <Box>
      <Stepper activeStep={step} sx={{ mb: 2.5 }} alternativeLabel>
        {steps.map(label => <Step key={label}><StepLabel><Typography variant="caption">{label}</Typography></StepLabel></Step>)}
      </Stepper>
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: 'rgba(8,145,178,0.04)' }}>
        <Typography variant="caption" color="text.secondary">Amount to pay</Typography>
        <Typography variant="h5" fontWeight={800} color="primary.main">Rs.{amount}</Typography>
        {method === 'ethereum' && (
          <Box mt={0.5}>
            <Typography variant="caption" color="text.secondary">approx. {ethAmount} ETH</Typography><br />
            <Typography variant="caption" sx={{ color: driverWallet ? '#475569' : '#EF4444' }}>
              {driverWallet ? `Driver wallet: ${driverWallet.slice(0,8)}...${driverWallet.slice(-6)}` : 'Driver ETH wallet not configured'}
            </Typography>
          </Box>
        )}
        {method === 'cash' && <Typography variant="caption" color="text.secondary">Hand cash to driver — records on blockchain</Typography>}
        <Divider sx={{ my: 1 }} />
      </Paper>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      <Button fullWidth variant="contained" size="large" disabled={loading}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : method === 'upi' ? <AccountBalance /> : method === 'ethereum' ? <CurrencyBitcoin /> : <MonetizationOn />}
        onClick={handlePay}
        sx={{ borderRadius: 3, py: 1.5, fontWeight: 700, background: method === 'upi' ? 'linear-gradient(135deg, #0891B2, #7C3AED)' : method === 'ethereum' ? 'linear-gradient(135deg, #F59E0B, #EF4444)' : 'linear-gradient(135deg, #059669, #0891B2)', '&:hover': { transform: 'translateY(-1px)' } }}
      >
        {loading ? 'Processing...' : method === 'upi' ? `Pay Rs.${amount} via UPI` : method === 'ethereum' ? `Send ${ethAmount} ETH to Driver` : `Record Rs.${amount} Cash Payment`}
      </Button>
    </Box>
  );
}
