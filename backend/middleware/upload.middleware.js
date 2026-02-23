const multer = require('multer');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const clean = (v) => (v || '').trim();

// Configure Cloudinary using your .env credentials
cloudinary.config({
  cloud_name: clean(process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME),
  api_key: clean(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY),
  api_secret: clean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET)
});

const hasCloudinaryCreds =
  clean(process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME) &&
  clean(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY) &&
  clean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET);

const storage = hasCloudinaryCreds
  ? new CloudinaryStorage({
      cloudinary,
      params: { folder: 'felicity_payments', allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'svg'] }
    })
  : multer.diskStorage({
      destination: (_, __, cb) => {
        fs.mkdirSync('uploads', { recursive: true });
        cb(null, 'uploads/');
      },
      filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    });

// Export the initialized multer instance
module.exports = multer({ storage });
