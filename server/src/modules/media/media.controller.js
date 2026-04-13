import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { env } from "../../config/env.js";
import {
  uploadImageBufferToCloudinary,
  uploadFileBufferToCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No image file received.");
  }

  const result = await uploadImageBufferToCloudinary(req.file, {
    folder: env.CLOUDINARY_IMAGE_FOLDER,
    publicIdPrefix: `image_${req.user?.id || "public"}`,
  });

  return res.status(StatusCodes.CREATED).json({
    success: true,
    data: {
      secure_url: result.secure_url,
      public_id: result.public_id,
    },
  });
});

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No file received.");
  }

  const result = await uploadFileBufferToCloudinary(req.file, {
    folder: env.CLOUDINARY_FILE_FOLDER,
    publicIdPrefix: `file_${req.user?.id || "public"}`,
  });

  return res.status(StatusCodes.CREATED).json({
    success: true,
    data: {
      secure_url: result.secure_url,
      public_id: result.public_id,
    },
  });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { public_id: publicId, resource_type: resourceType = "auto" } = req.body || {};

  if (!publicId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "public_id is required.");
  }

  const result = await deleteFromCloudinary(publicId, resourceType);

  return res.status(StatusCodes.OK).json({
    success: true,
    data: {
      public_id: result.public_id,
      result: result.result,
      resource_type: result.resource_type,
    },
  });
});
