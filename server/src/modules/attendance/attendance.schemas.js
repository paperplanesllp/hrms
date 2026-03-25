import { z } from "zod";

export const markSchema = z.object({
  date: z.string().min(10).optional(), // Optional - will default to today if not provided
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  checkInLatitude: z.number().optional(), // Employee's GPS latitude at check-in
  checkInLongitude: z.number().optional() // Employee's GPS longitude at check-in
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