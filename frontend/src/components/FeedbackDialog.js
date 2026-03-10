import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Rating,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import { Feedback, Star } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const FeedbackDialog = ({ open, onClose, booking, ride, targetUser, onFeedbackSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      enqueueSnackbar('Please provide a rating', { variant: 'warning' });
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/feedback/submit', {
        rideID: ride?.rideID,
        bookingID: booking?.bookingID,
        toUserID: targetUser.userID,
        rating,
        review
      });

      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
      onFeedbackSuccess();
      onClose();
    } catch (error) {
      console.error('Feedback error:', error);
      enqueueSnackbar(error.response?.data?.error || error.message || 'Failed to submit feedback', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!targetUser) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Feedback color="primary" />
          <Typography variant="h6">Rate Your Experience</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main' }}
            src={targetUser.profilePicture}
          >
            {targetUser.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6">{targetUser.name}</Typography>
          <Chip
            label={targetUser.role === 'driver' ? 'Driver' : 'Passenger'}
            color={targetUser.role === 'driver' ? 'primary' : 'secondary'}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            How was your ride?
          </Typography>
          <Rating
            value={rating}
            onChange={(event, newValue) => setRating(newValue)}
            size="large"
            icon={<Star fontSize="inherit" />}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {rating === 5 && 'Excellent!'}
            {rating === 4 && 'Very Good'}
            {rating === 3 && 'Good'}
            {rating === 2 && 'Fair'}
            {rating === 1 && 'Poor'}
            {rating === 0 && 'Tap to rate'}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Write a review (optional)"
          placeholder={`Share your experience with ${targetUser.name}...`}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          helperText={`${review.length}/500 characters`}
          inputProps={{ maxLength: 500 }}
        />

        {ride && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Ride Details
            </Typography>
            <Typography variant="body2">
              From: {ride.startLocation?.address || 'N/A'}
            </Typography>
            <Typography variant="body2">
              To: {ride.endLocation?.address || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Date: {new Date(ride.pickupTime).toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Skip
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          startIcon={submitting ? <CircularProgress size={20} /> : <Feedback />}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
