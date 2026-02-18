const express = require('express');
const path = require('path');
const { Resend } = require('resend');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { firstName, lastName, email, phone, service, message } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !phone) {
    return res.status(400).json({ error: 'Please fill out all required fields.' });
  }

  const fullName = `${firstName} ${lastName}`;
  const serviceLine = service || 'Not specified';
  const messageLine = message || 'No details provided';

  // Send SMS via Twilio
  const smsPromise = twilioClient.messages.create({
    body: `New Lead from Ultra Marble Website!\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nService: ${serviceLine}\nDetails: ${messageLine}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.OWNER_PHONE_NUMBER
  });

  // Send Email via Resend
  const emailPromise = resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Ultra Marble <onboarding@resend.dev>',
    to: [process.env.OWNER_EMAIL],
    subject: `New Quote Request - ${serviceLine} - ${fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e; border-bottom: 2px solid #c9a96e; padding-bottom: 10px;">
          New Quote Request
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #555; width: 120px;">Name</td>
            <td style="padding: 10px;">${fullName}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Email</td>
            <td style="padding: 10px;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #555;">Phone</td>
            <td style="padding: 10px;"><a href="tel:${phone}">${phone}</a></td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Service</td>
            <td style="padding: 10px;">${serviceLine}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #555; vertical-align: top;">Details</td>
            <td style="padding: 10px;">${messageLine}</td>
          </tr>
        </table>
        <p style="margin-top: 24px; color: #999; font-size: 12px;">
          Sent from the Ultra Marble website contact form
        </p>
      </div>
    `
  });

  try {
    const results = await Promise.allSettled([smsPromise, emailPromise]);

    const smsResult = results[0];
    const emailResult = results[1];

    if (smsResult.status === 'rejected') {
      console.error('SMS failed:', smsResult.reason?.message || smsResult.reason);
    }
    if (emailResult.status === 'rejected') {
      console.error('Email failed:', emailResult.reason?.message || emailResult.reason);
    }

    // Succeed if at least one notification went through
    if (smsResult.status === 'fulfilled' || emailResult.status === 'fulfilled') {
      return res.json({ success: true });
    }

    return res.status(500).json({ error: 'Failed to send notifications. Please call us directly.' });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please call us directly.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
