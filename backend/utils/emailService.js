const nodemailer = require('nodemailer');
const axios = require('axios');

class EmailService {
  constructor() {
    // Support both Google OAuth2 and App Password methods
    let authConfig;
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
      // Method 1: Google Cloud OAuth2 (Recommended)
      console.log('✓ Using Google OAuth2 for email authentication');
      authConfig = {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
      };
    } else if (process.env.EMAIL_PASS) {
      // Method 2: Gmail App Password (Simple)
      console.log('✓ Using Gmail app password for email authentication');
      authConfig = {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      };
    } else {
      console.warn('⚠ No email configuration found. Email features will be disabled.');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: authConfig
    });
  }

  async sendVerificationEmail(email, userId, verificationToken) {
    if (!this.transporter) {
      console.warn('⚠ Email transporter not configured. Skipping verification email.');
      return { success: false, error: 'Email not configured' };
    }

    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}&userId=${userId}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'RideShare <noreply@rideshare.com>',
      to: email,
      subject: 'Verify Your Email - RideShare',
      html: `
        <h1>Welcome to RideShare!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationLink}" style="display:inline-block;padding:10px 20px;background-color:#4CAF50;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Email sending error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendRideNotification(email, notificationType, rideDetails) {
    let subject, message;
    
    switch (notificationType) {
      case 'RIDE_CREATED':
        subject = 'Ride Created Successfully';
        message = `Your ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} has been created.`;
        break;
      case 'RIDE_BOOKED':
        subject = 'New Ride Booking';
        message = `A passenger has booked your ride. Departure: ${rideDetails.departureTime}`;
        break;
      case 'BOOKING_CONFIRMED':
        subject = 'Booking Confirmed';
        message = `Your booking for the ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} is confirmed.`;
        break;
      case 'RIDE_STARTED':
        subject = 'Ride Started';
        message = `Your ride has started. Have a safe journey!`;
        break;
      case 'RIDE_COMPLETED':
        subject = 'Ride Completed';
        message = `Your ride has been completed. Thank you for using RideShare!`;
        break;
      case 'PAYMENT_RECEIVED':
        subject = 'Payment Received';
        message = `Payment of $${rideDetails.amount} has been received for ride ${rideDetails.rideID}.`;
        break;
      case 'RIDE_CANCELLED':
        subject = 'Ride Cancelled';
        message = `The ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} has been cancelled.`;
        break;
      default:
        subject = 'RideShare Notification';
        message = 'You have a new notification from RideShare.';
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'RideShare <noreply@rideshare.com>',
      to: email,
      subject: subject,
      html: `
        <h2>${subject}</h2>
        <p>${message}</p>
        <hr>
        <h3>Ride Details:</h3>
        <ul>
          ${rideDetails.rideID ? `<li><strong>Ride ID:</strong> ${rideDetails.rideID}</li>` : ''}
          ${rideDetails.startLocation ? `<li><strong>From:</strong> ${rideDetails.startLocation}</li>` : ''}
          ${rideDetails.endLocation ? `<li><strong>To:</strong> ${rideDetails.endLocation}</li>` : ''}
          ${rideDetails.departureTime ? `<li><strong>Departure:</strong> ${rideDetails.departureTime}</li>` : ''}
          ${rideDetails.price ? `<li><strong>Price:</strong> $${rideDetails.price}</li>` : ''}
        </ul>
        <p>Thank you for using RideShare!</p>
      `
    };

    try {
      // Send via nodemailer
      await this.transporter.sendMail(mailOptions);
      
      // Also trigger n8n webhook if configured
      if (process.env.N8N_WEBHOOK_URL) {
        await this.triggerN8nWebhook({
          email,
          notificationType,
          subject,
          message,
          rideDetails
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Email notification error:', error);
      throw new Error('Failed to send notification');
    }
  }

  async triggerN8nWebhook(data) {
    try {
      await axios.post(process.env.N8N_WEBHOOK_URL, data, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('n8n webhook error:', error.message);
      // Don't throw - n8n is optional
    }
  }

  async sendSOSAlert(email, alertDetails) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'RideShare <noreply@rideshare.com>',
      to: email,
      subject: '🆘 EMERGENCY - SOS Alert Triggered',
      html: `
        <h1 style="color:red;">🆘 EMERGENCY ALERT</h1>
        <p><strong>An SOS alert has been triggered!</strong></p>
        <h3>Alert Details:</h3>
        <ul>
          <li><strong>Ride ID:</strong> ${alertDetails.rideID}</li>
          <li><strong>Passenger ID:</strong> ${alertDetails.passengerID}</li>
          <li><strong>Location:</strong> ${alertDetails.location}</li>
          <li><strong>Coordinates:</strong> ${alertDetails.latitude}, ${alertDetails.longitude}</li>
          <li><strong>Time:</strong> ${alertDetails.timestamp}</li>
        </ul>
        <p><strong>Authorities have been notified.</strong></p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      
      // Notify emergency services via n8n
      if (process.env.N8N_WEBHOOK_URL) {
        await this.triggerN8nWebhook({
          type: 'SOS_ALERT',
          alertDetails
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('SOS email error:', error);
      throw new Error('Failed to send SOS alert');
    }
  }
}

module.exports = new EmailService();
