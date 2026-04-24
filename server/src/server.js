import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./utils/cronJobs.js";
import { initializeSocket } from "./utils/socket.js";
import { cleanupMissingImages } from "./modules/news/news.service.js";
import { createServer } from "http";

const app = createApp();
const server = createServer(app);

await connectDB();

// Initialize Socket.IO
initializeSocket(server);

// Clean up news items with missing images
await cleanupMissingImages();

// Start cron jobs for automated reminders
startCronJobs();

server.listen(env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${env.PORT}`);
  console.log(`🔌 Socket.IO initialized for real-time notifications`);
  console.log(`🔌 Socket.IO path: ${env.SOCKET_IO_PATH}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${env.PORT} is already in use. Stop the existing backend process and restart so Socket.IO stays on the expected port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});