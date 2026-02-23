const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use SendGrid/Mailgun
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendTicketEmail = async (userEmail, eventName, ticket) => {
    try {
        // Generate QR code based on the unique Ticket ID
        const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticketId);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Your Ticket for ${eventName}`,
            html: `
                <h2>Registration Confirmed</h2>
                <p>You are officially registered for <strong>${eventName}</strong>.</p>
                <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                <p>Please present the QR code attached below at the venue.</p>
            `,
            attachments: [
                {
                    filename: 'ticket-qr.png',
                    content: qrCodeDataUrl.split("base64,")[1],
                    encoding: 'base64'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Failed to send ticket email:', error);
        throw new Error('Email dispatch failed');
    }
};