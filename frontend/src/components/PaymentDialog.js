import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment
} from '@mui/material';
import { Payment, AccountBalance, CurrencyRupee, CurrencyBitcoin } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Web3 from 'web3';

const PaymentDialog = ({ open, onClose, booking, ride, onPaymentSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [upiId, setUpiId] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [processing, setProcessing] = useState(false);

  const amount = booking?.totalPrice || 0;

  const handlePayment = async () => {
    setProcessing(true);

    try {
      if (paymentMethod === 'upi' && !upiId) {
        throw new Error('Please enter UPI ID');
      }

      if (paymentMethod === 'ethereum' && !ethAddress) {
        throw new Error('Please enter Ethereum address');
      }

      let transactionHash = '';

      // Handle Ethereum payment
      if (paymentMethod === 'ethereum') {
        if (typeof window.ethereum === 'undefined') {
          throw new Error('MetaMask not installed');
        }

        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        // Convert INR to ETH (mock conversion rate: 1 ETH = 200,000 INR)
        const ethAmount = (amount / 200000).toFixed(6);
        const weiAmount = web3.utils.toWei(ethAmount, 'ether');

        // Send transaction
        const tx = await web3.eth.sendTransaction({
          from: fromAddress,
          to: ethAddress,
          value: weiAmount,
          gas: 21000
        });

        transactionHash = tx.transactionHash;
        enqueueSnackbar(`ETH Payment successful! TX: ${transactionHash.substring(0, 10)}...`, { variant: 'success' });
      } else if (paymentMethod === 'upi') {
        // For UPI, in real app you would integrate with payment gateway
        transactionHash = 'UPI_' + Date.now();
        enqueueSnackbar('UPI payment initiated! Please complete payment in your UPI app', { variant: 'info' });
      } else {
        // Cash payment
        transactionHash = 'CASH_' + Date.now();
        enqueueSnackbar('Cash payment recorded', { variant: 'success' });
      }

      // Record payment on blockchain
      const response = await fetch('/api/payments/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingID: booking.bookingID,
          rideID: ride.rideID,
          amount,
          paymentMethod,
          transactionHash,
          upiId: paymentMethod === 'upi' ? upiId : undefined,
          ethAddress: paymentMethod === 'ethereum' ? ethAddress : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      enqueueSnackbar(error.message || 'Payment failed', { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Payment color="primary" />
          <Typography variant="h6">Complete Payment</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6">Amount to Pay: ?{amount}</Typography>
          {ride && (
            <Typography variant="caption">
              Ride from {ride.startLocation?.address} to {ride.endLocation?.address}
            </Typography>
          )}
        </Alert>

        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">Select Payment Method</FormLabel>
          <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <FormControlLabel
              value="cash"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CurrencyRupee />
                  <Typography>Cash Payment</Typography>
                </Box>
              }
            />

            <FormControlLabel
              value="upi"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalance />
                  <Typography>UPI Payment</Typography>
                </Box>
              }
            />

            <FormControlLabel
              value="ethereum"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CurrencyBitcoin />
                  <Typography>Ethereum Payment</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {paymentMethod === 'upi' && (
          <TextField
            fullWidth
            label="Enter UPI ID"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountBalance />
                </InputAdornment>
              )
            }}
            helperText="Enter the UPI ID where payment should be sent"
          />
        )}

        {paymentMethod === 'ethereum' && (
          <Box>
            <TextField
              fullWidth
              label="Driver's Ethereum Address"
              placeholder="0x..."
              value={ethAddress}
              onChange={(e) => setEthAddress(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CurrencyBitcoin />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />
            <Alert severity="warning">
              <Typography variant="caption">
                Conversion Rate: 1 ETH ? ?2,00,000<br />
                You will pay: {(amount / 200000).toFixed(6)} ETH
              </Typography>
            </Alert>
          </Box>
        )}

        {paymentMethod === 'cash' && (
          <Alert severity="info">
            <Typography variant="body2">
              Please pay the driver in cash before completing the ride.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handlePayment}
          disabled={processing}
          startIcon={processing ? <CircularProgress size={20} /> : <Payment />}
        >
          {processing ? 'Processing...' : `Pay ?${amount}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
