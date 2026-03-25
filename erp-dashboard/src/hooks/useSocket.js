import { initializeSocket } from '../lib/socket.js';

/**
 * Hook to get the socket instance
 * Returns the initialized socket connection
 */
export const useSocket = () => {
  try {
    const socket = initializeSocket();
    return socket;
  } catch (error) {
    console.error('Error getting socket instance:', error);
    return null;
  }
};
