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
      from: process.env.EMAIL_FROM || 'WayFair <noreply@wayfair.app>',
      to: email,
      subject: '✅ Verify Your Email - WayFair',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #F8FAFC; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">
          <div style="background: linear-gradient(135deg, #06B6D4, #8B5CF6); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">🚗 WayFair</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your trusted ride companion</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0F172A; font-size: 20px;">Welcome aboard! Please verify your email.</h2>
            <p style="color: #475569;">Click the button below to verify your email address and activate your WayFair account.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #06B6D4, #8B5CF6); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #64748B; font-size: 14px;">Or copy this link: <a href="${verificationLink}">${verificationLink}</a></p>
            <p style="color: #94A3B8; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
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
    if (!this.transporter) {
      console.warn('⚠ Email transporter not configured. Skipping ride notification.');
      return { success: false };
    }

    let subject, message, emoji;
    
    switch (notificationType) {
      case 'RIDE_CREATED':
        subject = 'Ride Created Successfully';
        emoji = '🚗';
        message = `Your ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} has been created successfully.`;
        break;
      case 'RIDE_BOOKED':
        subject = 'New Ride Booking';
        emoji = '📅';
        message = `A passenger has booked your ride. Departure: ${rideDetails.departureTime}`;
        break;
      case 'BOOKING_CONFIRMED':
        subject = 'Booking Confirmed';
        emoji = '✅';
        message = `Your booking for the ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} is confirmed.`;
        break;
      case 'RIDE_STARTED':
        subject = 'Ride Started';
        emoji = '🚀';
        message = `Your ride has started. Have a safe journey! Show your OTP to the driver if asked.`;
        break;
      case 'RIDE_COMPLETED':
        subject = 'Ride Completed';
        emoji = '🏁';
        message = `Your ride has been completed. Thank you for using WayFair!`;
        break;
      case 'PAYMENT_RECEIVED':
        subject = 'Payment Received';
        emoji = '💰';
        message = `Payment of ₹${rideDetails.amount} has been received for ride ${rideDetails.rideID}.`;
        break;
      case 'RIDE_CANCELLED':
        subject = 'Ride Cancelled';
        emoji = '❌';
        message = `The ride from ${rideDetails.startLocation} to ${rideDetails.endLocation} has been cancelled.`;
        break;
      default:
        subject = 'WayFair Notification';
        emoji = '🔔';
        message = 'You have a new notification from WayFair.';
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'WayFair <noreply@wayfair.app>',
      to: email,
      subject: `${emoji} ${subject} — WayFair`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #F8FAFC; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">
          <div style="background: linear-gradient(135deg, #06B6D4, #8B5CF6); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">${emoji} ${subject}</h1>
          </div>
          <div style="padding: 28px;">
            <p style="color: #0F172A; font-size: 16px;">${message}</p>
            ${rideDetails.rideID || rideDetails.startLocation ? `
              <div style="background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-top: 16px;">
                <h3 style="color: #06B6D4; margin: 0 0 12px;">Ride Details</h3>
                ${rideDetails.rideID ? `<p style="margin: 4px 0; color: #475569;"><strong>Ride ID:</strong> ${rideDetails.rideID}</p>` : ''}
                ${rideDetails.startLocation ? `<p style="margin: 4px 0; color: #475569;"><strong>From:</strong> ${rideDetails.startLocation}</p>` : ''}
                ${rideDetails.endLocation ? `<p style="margin: 4px 0; color: #475569;"><strong>To:</strong> ${rideDetails.endLocation}</p>` : ''}
                ${rideDetails.departureTime ? `<p style="margin: 4px 0; color: #475569;"><strong>Departure:</strong> ${rideDetails.departureTime}</p>` : ''}
                ${rideDetails.price ? `<p style="margin: 4px 0; color: #475569;"><strong>Price:</strong> ₹${rideDetails.price}</p>` : ''}
              </div>` : ''}
            <p style="color: #94A3B8; font-size: 13px; margin-top: 24px;">Thank you for using WayFair!</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      if (process.env.N8N_WEBHOOK_URL) {
        await this.triggerN8nWebhook({ email, notificationType, subject, message, rideDetails });
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
    }
  }

  async sendSOSAlert(email, alertDetails) {
    if (!this.transporter) {
      console.warn('⚠ Email transporter not configured. SOS email skipped.');
      return { success: false };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'WayFair <noreply@wayfair.app>',
      to: email,
      subject: '🆘 EMERGENCY — SOS Alert Triggered on WayFair',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border-radius: 16px; overflow: hidden; border: 2px solid #EF4444;">
          <div style="background: #DC2626; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🆘 EMERGENCY ALERT</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">An SOS has been triggered on WayFair</p>
          </div>
          <div style="padding: 28px; background: #FFF5F5;">
            <p style="color: #0F172A; font-weight: 700; font-size: 16px;">A passenger has triggered an emergency alert.</p>
            <div style="background: white; border: 1px solid #FCA5A5; border-radius: 12px; padding: 16px; margin-top: 16px;">
              <h3 style="color: #DC2626; margin: 0 0 12px;">Alert Details</h3>
              <p style="margin: 4px 0; color: #475569;"><strong>Passenger:</strong> ${alertDetails.passengerName || alertDetails.passengerID}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Ride ID:</strong> ${alertDetails.rideID}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Location:</strong> ${alertDetails.location}</p>
              <p style="margin: 4px 0;"><strong>📍 Live Location:</strong> <a href="${alertDetails.googleMapsLink}" style="color: #DC2626; font-weight: 700;">Open in Google Maps</a></p>
              <p style="margin: 4px 0; color: #475569;"><strong>Time:</strong> ${new Date(alertDetails.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      if (process.env.N8N_WEBHOOK_URL) {
        await this.triggerN8nWebhook({ type: 'SOS_ALERT', alertDetails });
      }
      return { success: true };
    } catch (error) {
      console.error('SOS email error:', error);
      throw new Error('Failed to send SOS alert');
    }
  }

  // ── NEW: Send emergency contact alert ────────────────────────────────────────
  async sendEmergencyContactAlert(emergencyContact, alertDetails) {
    if (!this.transporter) {
      console.warn('⚠ Email transporter not configured. Emergency contact email skipped.');
      return { success: false };
    }

    if (!emergencyContact?.email) {
      console.warn('ℹ️  Emergency contact has no email address. Skipping.');
      return { success: false, reason: 'No email' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'WayFair <noreply@wayfair.app>',
      to: emergencyContact.email,
      subject: `🆘 URGENT: ${alertDetails.passengerName || 'Your contact'} needs help — WayFair Emergency Alert`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border-radius: 16px; overflow: hidden; border: 3px solid #DC2626;">
          <div style="background: #DC2626; padding: 28px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">🆘 EMERGENCY ALERT</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 16px;">
              <strong>${alertDetails.passengerName || 'Your contact'}</strong> has triggered an SOS on WayFair
            </p>
          </div>
          
          <div style="padding: 28px; background: #FFF5F5;">
            <p style="color: #0F172A; font-size: 15px; font-weight: 700; margin: 0 0 16px;">
              Dear ${emergencyContact.name},<br><br>
              This is an urgent alert from WayFair. <strong>${alertDetails.passengerName}</strong> has pressed the SOS emergency button while on a ride. Please take immediate action.
            </p>

            <!-- LIVE LOCATION -->
            <div style="background: #DC2626; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
              <p style="color: white; margin: 0 0 10px; font-size: 13px; text-transform: uppercase; font-weight: 700;">📍 Live Location</p>
              <a href="${alertDetails.googleMapsLink}" style="display: inline-block; background: white; color: #DC2626; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; font-size: 16px;">
                🗺️ Open Live Location in Google Maps
              </a>
              <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 8px 0 0;">
                Lat: ${alertDetails.latitude}, Lng: ${alertDetails.longitude}
              </p>
            </div>

            <!-- PASSENGER INFO -->
            <div style="background: white; border: 1px solid #FCA5A5; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #DC2626; margin: 0 0 12px; font-size: 16px;">👤 Passenger Information</h3>
              <p style="margin: 4px 0; color: #475569;"><strong>Name:</strong> ${alertDetails.passengerName || 'N/A'}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Email:</strong> ${alertDetails.passengerEmail || 'N/A'}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Alert Time:</strong> ${new Date(alertDetails.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>

            <!-- DRIVER INFO -->
            <div style="background: white; border: 1px solid #FCA5A5; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #DC2626; margin: 0 0 12px; font-size: 16px;">🚗 Driver Information</h3>
              <p style="margin: 4px 0; color: #475569;"><strong>Driver Name:</strong> ${alertDetails.driverName || 'Unknown'}</p>
              ${alertDetails.vehicleInfo ? `<p style="margin: 4px 0; color: #475569;"><strong>Vehicle:</strong> ${alertDetails.vehicleInfo}</p>` : ''}
              ${alertDetails.licensePlate ? `<p style="margin: 4px 0; color: #475569;"><strong>License Plate:</strong> <span style="font-weight: 800; font-size: 16px; background: #F1F5F9; padding: 2px 8px; border-radius: 4px;">${alertDetails.licensePlate}</span></p>` : ''}
              <p style="margin: 4px 0; color: #475569;"><strong>Ride:</strong> ${alertDetails.rideFrom || 'N/A'} → ${alertDetails.rideTo || 'N/A'}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Ride ID:</strong> <code>${alertDetails.rideID}</code></p>
            </div>

            <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #DC2626; font-weight: 700;">⚠️ Please try to contact ${alertDetails.passengerName} immediately and call emergency services (112) if needed.</p>
            </div>
          </div>

          <div style="background: #F8FAFC; padding: 16px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #94A3B8; font-size: 12px; margin: 0;">This alert was automatically sent by WayFair Safety System. Ride ID: ${alertDetails.rideID}</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Emergency contact alert sent to ${emergencyContact.email}`);
      return { success: true };
    } catch (error) {
      console.error('Emergency contact email error:', error);
      return { success: false, error: error.message };
    }
  }

  // ── NEW: Send OTP email to passenger ─────────────────────────────────────────
  async sendOTPEmail(email, otp, bookingID, rideDetails = {}) {
    if (!this.transporter) return { success: false };

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'WayFair <noreply@wayfair.app>',
      to: email,
      subject: '🔐 Your Ride OTP — WayFair',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; background: #F8FAFC; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">
          <div style="background: linear-gradient(135deg, #06B6D4, #8B5CF6); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🔐 Your Ride OTP</h1>
          </div>
          <div style="padding: 28px; text-align: center;">
            <p style="color: #475569; margin: 0 0 16px;">Share this OTP with your driver to start the ride.</p>
            <div style="background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1)); border: 2px solid rgba(139,92,246,0.3); border-radius: 16px; padding: 24px; display: inline-block; margin: 16px auto;">
              <p style="font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #06B6D4; margin: 0; font-family: monospace;">${otp}</p>
            </div>
            <p style="color: #94A3B8; font-size: 13px; margin: 16px 0 0;">Do not share this OTP with anyone other than your driver.</p>
            ${rideDetails.from ? `<p style="color: #475569; font-size: 14px;">Ride: ${rideDetails.from} → ${rideDetails.to}</p>` : ''}
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('OTP email error:', error);
      return { success: false };
    }
  }
}

module.exports = new EmailService();
