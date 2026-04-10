import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

const isConfigured =
  Boolean(env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(env.CLOUDINARY_API_KEY) &&
  Boolean(env.CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export const isCloudinaryConfigured = () => isConfigured;

export const uploadProfileImageToCloudinary = async (filePath, userId) => {
  return cloudinary.uploader.upload(filePath, {
    folder: env.CLOUDINARY_PROFILE_FOLDER,
    public_id: `${userId}_${Date.now()}`,
    overwrite: true,
    resource_type: "image",
  });
};

export const uploadChatMediaToCloudinary = async (filePath, userId, mimetype = "application/octet-stream") => {
  return cloudinary.uploader.upload(filePath, {
    folder: env.CLOUDINARY_CHAT_FOLDER,
    public_id: `${userId}_${Date.now()}`,
    resource_type: "auto",
    use_filename: false,
    overwrite: false,
  });
};
