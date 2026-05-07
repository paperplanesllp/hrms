import api from "../../lib/api.js";

export const userService = {
  unlockAccount(userId) {
    return api.patch(`/users/${userId}/unlock`);
  },
};
