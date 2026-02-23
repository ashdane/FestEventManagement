const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const transporter = nodemailer.createTransport({ service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendTicketMail = async (userEmail, eventName, ticket) => {
    try {
        const qrCode = await QRCode.toDataURL(ticket.ticketId);
        const mailContent = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Welcome to Felicity! Here is your ticket for ${eventName}`,
            html: `
                <p>You are officially registered for <strong>${eventName}</strong>.</p>
                <p><strong>Your ticket ID:</strong> ${ticket.ticketId}</p>
            `,
            attachments: [
                {
                    filename: 'ticket-qr.png',
                    content: qrCode.split('base64,')[1],
                    encoding: 'base64'
                }
            ]
        };
        await transporter.sendMail(mailContent);
    } catch (error) {
        throw new Error('Email failed to be sent');
    }
};

module.exports = { sendTicketMail }
