const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const errorHandler = require('./middleware/errorHandler');
const { authenticateUser } = require('./middleware/authMiddleware');

// Student 1 & Shared Core Routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

// Student 4 Operations Routes
const taskRoutes = require('./routes/taskRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Student 5 Modules Routes
const notificationRoutes = require('./routes/notificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const wfhRoutes = require('./routes/wfhRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const recruitmentRoutes = require('./routes/recruitmentRoutes');
const leaveRoutes = require('./routes/leaveRoutes');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Gzip / Deflate Response Compression for fast network delivery
app.use(compression({
  threshold: 1024
}));

// CORS configuration: support local Vite frontend and configurable origin
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev mode for team testing
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-employee-id', 'x-user-role', 'x-user-id']
}));

// Request Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (Public)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'THYO SOFTECH PVT LTD - HRMS Monolith',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes (Public Login & Session endpoints)
app.use('/api/auth', authRoutes);

// Public applicant endpoint for ATS
// Candidate can submit application without requiring HR login
app.post('/api/recruitment/public-apply', (req, res, next) => {
  const recruitmentController = require('./controllers/recruitmentController');
  const { validateApplyJob } = require('./validators/recruitmentValidator');
  validateApplyJob(req, res, () => recruitmentController.applyForJob(req, res, next));
});

// Authentication & Identity Guard (validates Bearer JWT against PostgreSQL)
app.use(authenticateUser);

// Core HR & Operations Routes (Preserved untouched)
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/task-reports', reportRoutes);

// Student 5 Specific Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/wfh', wfhRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/leaves', leaveRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
