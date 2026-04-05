import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./utils/cronJobs.js";
import { initializeSocket } from "./utils/socket.js";
import { createServer } from "http";

const app = createApp();
const server = createServer(app);

await connectDB();

// Initialize Socket.IO
initializeSocket(server);

// Start cron jobs for automated reminders
startCronJobs();

server.listen(env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${env.PORT}`);
  console.log(`🔌 Socket.IO initialized for real-time notifications`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${env.PORT} is already in use. Trying port ${env.PORT + 1}...`);
    server.listen(env.PORT + 1, () => {
      console.log(`✅ Server running on http://localhost:${env.PORT + 1}`);
      console.log(`🔌 Socket.IO initialized for real-time notifications`);
    });
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});