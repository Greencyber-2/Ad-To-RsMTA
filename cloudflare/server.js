const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Worker configuration
const WORKER_URL = 'https://still-base-3ac7.dns555104.workers.dev';
const WORKER_TIMEOUT = 15000; // 15 seconds timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const fetchOptions = {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'RsMTA-Ads-Server',
    'Accept': 'application/json'
  },
  timeout: WORKER_TIMEOUT
};

// Enhanced logging
function logRequest(req) {
  const logData = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    params: req.params,
    query: req.query,
    body: req.body ? (typeof req.body === 'object' ? 
      JSON.stringify(req.body).substring(0, 200) + '...' : req.body.toString().substring(0, 200) + '...') : null
  };
  console.log(`[${new Date().toISOString()}] Request:`, logData);
}

// Enhanced error handling with retry mechanism
async function handleWorkerRequest(url, options, res) {
  let attempt = 0;
  const startTime = Date.now();
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WORKER_TIMEOUT);
      
      console.log(`[Worker Request] Attempt ${attempt} to ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      console.log(`[Worker Response] ${response.status} in ${responseTime}ms`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Worker responded with status ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return res.status(response.status).json(data);
      
    } catch (error) {
      console.error(`[Worker Error] Attempt ${attempt}:`, error.message);
      
      if (attempt === MAX_RETRIES || error.name !== 'AbortError') {
        const errorTime = Date.now() - startTime;
        
        if (error.name === 'AbortError') {
          return res.status(504).json({ 
            success: false,
            error: 'Request timeout',
            message: 'The worker did not respond in time.'
          });
        }
        
        return res.status(502).json({ 
          success: false,
          error: 'Worker communication failed',
          message: error.message || 'An error occurred while processing your request',
          details: process.env.NODE_ENV === 'development' ? {
            stack: error.stack,
            url,
            method: options.method
          } : undefined
        });
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
}

// API Routes
const apiRoutes = express.Router();

// Log all API requests
apiRoutes.use((req, res, next) => {
  logRequest(req);
  next();
});

// GET all ads
apiRoutes.get('/ads', async (req, res) => {
  await handleWorkerRequest(`${WORKER_URL}/api/ads`, {
    ...fetchOptions,
    method: 'GET'
  }, res);
});

// POST new ad
apiRoutes.post('/ads', async (req, res) => {
  // Validate required fields
  const requiredFields = ['title', 'price', 'description', 'category'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missingFields
    });
  }
  
  // Process images
  try {
    if (req.body.images && !Array.isArray(req.body.images)) {
      req.body.images = [req.body.images];
    }
    
    await handleWorkerRequest(`${WORKER_URL}/api/ads`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(req.body)
    }, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to process images',
      message: error.message
    });
  }
});

// GET single ad
apiRoutes.get('/ads/:id', async (req, res) => {
  const id = req.params.id;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ad ID'
    });
  }
  
  await handleWorkerRequest(`${WORKER_URL}/api/ads/${id}`, {
    ...fetchOptions,
    method: 'GET'
  }, res);
});

// PUT update ad
apiRoutes.put('/ads/:id', async (req, res) => {
  const id = req.params.id;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ad ID'
    });
  }
  
  // Validate required fields
  const requiredFields = ['title', 'price', 'description', 'category'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missingFields
    });
  }
  
  await handleWorkerRequest(`${WORKER_URL}/api/ads/${id}`, {
    ...fetchOptions,
    method: 'PUT',
    body: JSON.stringify(req.body)
  }, res);
});

// DELETE ad
apiRoutes.delete('/ads/:id', async (req, res) => {
  const id = req.params.id;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ad ID'
    });
  }
  
  await handleWorkerRequest(`${WORKER_URL}/api/ads/${id}`, {
    ...fetchOptions,
    method: 'DELETE'
  }, res);
});

// Mount API routes
app.use('/api', apiRoutes);

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Server Error] ${err.message}`, {
    path: req.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Config] Worker URL: ${WORKER_URL}`);
  console.log(`[Config] Timeout: ${WORKER_TIMEOUT}ms`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});