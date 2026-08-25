const Participant = require('../models/Participant');
const AppError = require('../utils/appError');
const { PARTICIPANT_STATUS } = require('../constants/status');
const bcrypt = require('bcryptjs');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Format participant document for administrative response
 */
const formatParticipant = (doc) => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * List participants with search, status filtering, and pagination
 */
const listParticipants = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const filter = {};

  // Status filtering
  if (query.status) {
    filter.status = query.status;
  }

  // Case-insensitive search on name or email
  if (query.search && query.search.trim()) {
    const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [total, docs] = await Promise.all([
    Participant.countDocuments(filter),
    Participant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    participants: docs.map(formatParticipant),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Get a single participant by ID
 */
const getParticipantById = async (id) => {
  const participant = await Participant.findById(id);
  if (!participant) {
    throw new AppError('Participant not found.', 404, 'PARTICIPANT_NOT_FOUND');
  }
  return formatParticipant(participant);
};

/**
 * Create a new participant
 */
const createParticipant = async ({ name, email, status = PARTICIPANT_STATUS.ACTIVE }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if participant with email already exists
  const existing = await Participant.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError('A participant with this email already exists.', 409, 'DUPLICATE_EMAIL');
  }

  try {
    const participant = await Participant.create({
      name: name.trim(),
      email: normalizedEmail,
      status: status || PARTICIPANT_STATUS.ACTIVE,
    });
    return formatParticipant(participant);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('A participant with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }
    throw err;
  }
};

/**
 * Update an existing participant (name, email, status)
 */
const updateParticipant = async (id, fields) => {
  const participant = await Participant.findById(id);
  if (!participant) {
    throw new AppError('Participant not found.', 404, 'PARTICIPANT_NOT_FOUND');
  }

  if (fields.email) {
    const normalizedEmail = fields.email.toLowerCase().trim();
    if (normalizedEmail !== participant.email) {
      const existing = await Participant.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });
      if (existing) {
        throw new AppError('A participant with this email already exists.', 409, 'DUPLICATE_EMAIL');
      }
      participant.email = normalizedEmail;
    }
  }

  if (fields.name) {
    participant.name = fields.name.trim();
  }

  if (fields.status) {
    participant.status = fields.status;
  }

  try {
    const saved = await participant.save();
    return formatParticipant(saved);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('A participant with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }
    throw err;
  }
};

/**
 * Update participant status (ACTIVE / DISABLED)
 */
const updateParticipantStatus = async (id, status) => {
  const participant = await Participant.findById(id);
  if (!participant) {
    throw new AppError('Participant not found.', 404, 'PARTICIPANT_NOT_FOUND');
  }

  participant.status = status;
  const saved = await participant.save();
  return formatParticipant(saved);
};

/**
 * Delete a participant
 */
const deleteParticipant = async (id) => {
  const participant = await Participant.findByIdAndDelete(id);
  if (!participant) {
    throw new AppError('Participant not found.', 404, 'PARTICIPANT_NOT_FOUND');
  }
  return { id: participant._id, email: participant.email, name: participant.name };
};

/**
 * Bulk create participants from JSON import
 */
const bulkCreateParticipants = async (participantsArray) => {
  let importedCount = 0;
  let skippedCount = 0;
  const errors = [];
  const results = [];

  for (let i = 0; i < participantsArray.length; i++) {
    const item = participantsArray[i];
    const { name, email, password } = item;
    
    if (!name || !email || !password) {
      skippedCount++;
      errors.push({ email: email || `Row ${i+1}`, reason: 'Missing required fields (name, email, password)' });
      continue;
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Check if participant exists
      const existing = await Participant.findOne({ email: normalizedEmail });
      if (existing) {
        skippedCount++;
        errors.push({ email: normalizedEmail, reason: 'Participant already exists' });
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create participant
      const participant = await Participant.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        status: PARTICIPANT_STATUS.ACTIVE,
      });

      results.push(formatParticipant(participant));
      importedCount++;
    } catch (err) {
      skippedCount++;
      errors.push({ email: normalizedEmail, reason: err.message || 'Database error' });
    }
  }

  return {
    total: participantsArray.length,
    imported: importedCount,
    skipped: skippedCount,
    errors,
    results,
  };
};

module.exports = {
  listParticipants,
  getParticipantById,
  createParticipant,
  updateParticipant,
  updateParticipantStatus,
  deleteParticipant,
  bulkCreateParticipants,
};
