import { asyncHandler } from "../../utils/asyncHandler.js";
import * as spotifyService from "./spotify.service.js";

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await spotifyService.getSpotifySettings(req.user.companyId, req.user.id);
  res.json(settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await spotifyService.updateSpotifySettings(
    req.user.companyId,
    req.user.id,
    req.body
  );

  res.json({
    message: "Spotify Wellness settings updated",
    settings,
  });
});
