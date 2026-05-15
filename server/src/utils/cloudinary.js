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

export const uploadNewsImageToCloudinary = async (filePath, options = {}) => {
  return cloudinary.uploader.upload(filePath, {
    folder: env.CLOUDINARY_NEWS_FOLDER,
    public_id: `news_${options.newsId || Date.now()}`,
    resource_type: "image",
    use_filename: false,
    overwrite: false,
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
};

const uploadBuffer = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(file.buffer);
  });
};

export const uploadImageBufferToCloudinary = async (file, options = {}) => {
  return uploadBuffer(file, {
    folder: options.folder,
    public_id: `${options.publicIdPrefix || "image"}_${Date.now()}`,
    resource_type: "image",
    use_filename: false,
    overwrite: false,
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
};

export const uploadFileBufferToCloudinary = async (file, options = {}) => {
  return uploadBuffer(file, {
    folder: options.folder,
    public_id: `${options.publicIdPrefix || "file"}_${Date.now()}`,
    resource_type: "auto",
    use_filename: false,
    overwrite: false,
  });
};

export const deleteFromCloudinary = async (publicId, resourceType = "auto") => {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });

  return {
    public_id: publicId,
    resource_type: resourceType,
    result: result?.result,
  };
};

export const createSignedCloudinaryUrl = (publicId, options = {}) => {
  const expiresAt = Math.floor(Date.now() / 1000) + (options.expiresInSeconds || 15 * 60);

  return cloudinary.url(publicId, {
    resource_type: options.resourceType || "auto",
    type: options.deliveryType || "upload",
    secure: true,
    sign_url: true,
    expires_at: expiresAt,
    flags: options.download ? "attachment" : undefined,
  });
};

export { cloudinary };
