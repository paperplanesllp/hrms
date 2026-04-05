import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(payload) {
  if (!env.ACCESS_TOKEN_SECRET) throw new Error("ACCESS_TOKEN_SECRET missing");
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRES });
}

export function signRefreshToken(payload) {
  if (!env.REFRESH_TOKEN_SECRET) throw new Error("REFRESH_TOKEN_SECRET missing");
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
}