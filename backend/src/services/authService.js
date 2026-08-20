const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Participant = require('../models/Participant');
const { getMasterPasswordHash } = require('./settingsService');
const env = require('../config/env');
const AppError = require('../utils/appError');
const ROLES = require('../constants/roles');
const { PARTICIPANT_STATUS } = require('../constants/status');

/**
 * Generate JWT Token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    {
      sub: userId.toString(),
      role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN || '8h',
    }
  );
};

/**
 * Verify JWT Token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Authentication session expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
  }
};

/**
 * Authenticate Admin User
 */
const authenticateAdmin = async (email, password) => {
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

  if (!admin) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken(admin._id, ROLES.ADMIN);

  const safeAdmin = {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };

  return { user: safeAdmin, token };
};

/**
 * Authenticate Participant User
 * Uses DB-backed master password hash (with env fallback for Phase 1 compatibility)
 */
const authenticateParticipant = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const participant = await Participant.findOne({ email: normalizedEmail });

  // 1. Check if participant email exists
  if (!participant) {
    throw new AppError('This email is not registered for the event.', 401, 'UNREGISTERED_EMAIL');
  }

  // 2. Check if participant account is active
  if (participant.status !== PARTICIPANT_STATUS.ACTIVE) {
    throw new AppError('This participant account is disabled.', 401, 'ACCOUNT_DISABLED');
  }

  // 3. Compare password against DB-backed Master Password Hash
  const masterHash = await getMasterPasswordHash();

  let isMasterPasswordValid = false;

  if (masterHash) {
    isMasterPasswordValid = await bcrypt.compare(password, masterHash);
  } else {
    // Development fallback if hash is missing from both DB and environment
    isMasterPasswordValid = password === 'EVENT@2026';
  }

  if (!isMasterPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken(participant._id, ROLES.PARTICIPANT);

  const safeParticipant = {
    id: participant._id,
    name: participant.name,
    email: participant.email,
    status: participant.status,
    role: ROLES.PARTICIPANT,
  };

  return { user: safeParticipant, token };
};

/**
 * Fetch authenticated user identity by ID and Role
 */
const getUserById = async (userId, role) => {
  if (role === ROLES.ADMIN) {
    const admin = await Admin.findById(userId);
    if (!admin) {
      throw new AppError('Admin user account no longer exists.', 401, 'USER_NOT_FOUND');
    }
    return {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }

  if (role === ROLES.PARTICIPANT) {
    const participant = await Participant.findById(userId);
    if (!participant) {
      throw new AppError('Participant user account no longer exists.', 401, 'USER_NOT_FOUND');
    }
    if (participant.status !== PARTICIPANT_STATUS.ACTIVE) {
      throw new AppError('This participant account is disabled.', 401, 'ACCOUNT_DISABLED');
    }
    return {
      id: participant._id,
      name: participant.name,
      email: participant.email,
      status: participant.status,
      role: ROLES.PARTICIPANT,
    };
  }

  throw new AppError('Invalid user authorization role.', 403, 'FORBIDDEN_ROLE');
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateAdmin,
  authenticateParticipant,
  getUserById,
};
