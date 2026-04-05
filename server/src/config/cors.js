const allowedOrigins = [
  "https://www.thehrsaathi.com",
  "https://thehrsaathi.com",
  "https://hrms-mu-puce.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};