import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories
const newsUploadsDir = path.join(__dirname, "../../uploads/news");
const policyUploadsDir = path.join(__dirname, "../../uploads/policy");
const profileImagesDir = path.join(__dirname, "../../uploads/profile-images");

if (!fs.existsSync(newsUploadsDir)) {
  fs.mkdirSync(newsUploadsDir, { recursive: true });
}
if (!fs.existsSync(policyUploadsDir)) {
  fs.mkdirSync(policyUploadsDir, { recursive: true });
}
if (!fs.existsSync(profileImagesDir)) {
  fs.mkdirSync(profileImagesDir, { recursive: true });
}

// News storage
const newsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, newsUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Policy storage
const policyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, policyUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Profile image storage
const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileImagesDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${ext}`);
  }
});

// Documents storage
const documentsUploadsDir = path.join(__dirname, "../../uploads/documents");
if (!fs.existsSync(documentsUploadsDir)) {
  fs.mkdirSync(documentsUploadsDir, { recursive: true });
}

const documentsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, images, DOC, and DOCX are allowed."));
  }
};


// File filters
const imageFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."));
  }
};

// Profile image filter - stricter: only jpg, jpeg, png, webp - max 5MB
const profileImageFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, JPEG, PNG, and WebP images are allowed."));
  }
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Invalid file extension. Use .jpg, .jpeg, .png, or .webp"));
  }
  
  cb(null, true);
};

const policyFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/msword", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, PDFs, and Word documents are allowed."));
  }
};

// Create multer instances
export const uploadNews = multer({
  storage: newsStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadPolicy = multer({
  storage: policyStorage,
  fileFilter: policyFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Profile image upload - max 5MB
export const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: profileImageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Documents upload - max 10MB
export const uploadDocuments = multer({
  storage: documentsStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export default uploadNews;

