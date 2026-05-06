import dotenv from "dotenv";

// ✅ Just load from default location (server/.env)
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  SERVER_URL: process.env.SERVER_URL || "http://localhost:3000",

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  JWT_ACCESS_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES || "7d",

  COOKIE_SECURE: String(process.env.COOKIE_SECURE || "false") === "true",

  SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD,
  SUPERADMIN_ENABLED: String(process.env.SUPERADMIN_ENABLED || "false") === "true",
  SUPERADMIN_ALLOWED_IPS: process.env.SUPERADMIN_ALLOWED_IPS || "",

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_PROFILE_FOLDER: process.env.CLOUDINARY_PROFILE_FOLDER || "hrms/profile-images",
  CLOUDINARY_CHAT_FOLDER: process.env.CLOUDINARY_CHAT_FOLDER || "hrms/chat-media",

  SOCKET_IO_PATH: process.env.SOCKET_IO_PATH || "/socket.io/",

  DEFAULT_SHIFT_START: "09:30",
  DEFAULT_SHIFT_END: "18:30"
};
