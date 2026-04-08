import { z } from "zod";

/**
 * Schema for check-in/check-out requests
 * 
 * SECURITY: Time fields (checkIn, checkOut) are IGNORED if sent from frontend.
 * Time is ALWAYS generated server-side using getCurrentServerTime().
 * Frontend can only send location data.
 */
export const markSchema = z.object({
  // Geolocation - Optional in payload (fallbacks to latest tracked user location)
  checkInLatitude: z.coerce.number().optional(), // Employee's GPS latitude
  checkInLongitude: z.coerce.number().optional(), // Employee's GPS longitude
  checkInAccuracy: z.coerce.number().optional(), // GPS accuracy in meters
  
  // Audit trail only (NOT used for time recording)
  // deviceTime is sent for fraud detection but NOT stored as official time
  deviceTime: z.string().optional(), // Client device time (for audit comparison only)
  
  // These fields from old implementation - WILL BE IGNORED if sent
  // checkIn: IGNORED (use server time)
  // checkOut: IGNORED (use server time)
  // date: IGNORED if sent
});

export const checkOutSchema = z.object({
  // Geolocation - Optional in payload (fallbacks to latest tracked user location)
  checkOutLatitude: z.coerce.number().optional(), // Employee's GPS latitude at checkout
  checkOutLongitude: z.coerce.number().optional(), // Employee's GPS longitude at checkout
  checkOutAccuracy: z.coerce.number().optional(), // GPS accuracy in meters
  
  // Audit trail only
  deviceTime: z.string().optional(), // Client device time (for audit comparison only)
  
  // These fields from old implementation - WILL BE IGNORED if sent
  // checkOut: IGNORED (use server time)
});

export const adminEditShiftSchema = z.object({
  userId: z.string().min(10),
  date: z.string().min(10),
  shiftStart: z.string().min(4),
  shiftEnd: z.string().min(4)
});

export const editAttendanceSchema = z.object({
  userId: z.string().min(10),
  date: z.string().min(10),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.string().optional()
});