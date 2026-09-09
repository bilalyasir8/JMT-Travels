/**
 * JMT TRAVELS — Database Configuration & Production Mode Manager
 * Handles MongoDB Atlas connection lifecycle, readiness status, and production mode rules.
 */

const mongoose = require('mongoose');

// Modes: 'mongodb' or 'local' (derived from DATABASE_MODE or NODE_ENV)
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_MODE = process.env.DATABASE_MODE || (NODE_ENV === 'production' ? 'mongodb' : 'auto');

let isConnected = false;
let connectionError = null;

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (NODE_ENV === 'production' || DATABASE_MODE === 'mongodb') {
      const msg = '[FATAL DB ERROR] MONGODB_URI is required in production / mongodb mode, but none was provided.';
      console.error(msg);
      connectionError = new Error(msg);
      isConnected = false;
      return false;
    } else {
      console.log('[DB Config] MONGODB_URI not provided. Local development fallback mode active.');
      isConnected = false;
      return false;
    }
  }

  try {
    // Mongoose connection options
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: NODE_ENV !== 'production' // Index building optimization for production
    });

    isConnected = true;
    connectionError = null;
    console.log('====================================================');
    console.log('🍃 MongoDB Atlas Database Connected Successfully!');
    console.log(`📍 Environment: ${NODE_ENV} | Mode: ${DATABASE_MODE}`);
    console.log('====================================================');
    return true;
  } catch (err) {
    connectionError = err;
    isConnected = false;
    console.error('[DB Error] MongoDB connection failure:', err.message);

    if (NODE_ENV === 'production' || DATABASE_MODE === 'mongodb') {
      console.error('[CRITICAL] Production database unavailable. Database operations will fail safely with 503.');
    }
    return false;
  }
}

function isProductionDBRequired() {
  const env = process.env.NODE_ENV || 'development';
  const mode = process.env.DATABASE_MODE || (env === 'production' ? 'mongodb' : 'auto');
  return env === 'production' || mode === 'mongodb';
}

function getStatus() {
  const env = process.env.NODE_ENV || 'development';
  const mode = process.env.DATABASE_MODE || (env === 'production' ? 'mongodb' : 'auto');
  return {
    isConnected,
    isProduction: isProductionDBRequired(),
    error: connectionError ? connectionError.message : null,
    mode,
    env
  };
}

// Transaction Helper for atomic operations
async function withTransaction(fn) {
  if (!isConnected) {
    // If running in development local fallback mode, execute directly
    return await fn(null);
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  connectMongoDB,
  getStatus,
  isProductionDBRequired,
  withTransaction,
  mongoose
};
