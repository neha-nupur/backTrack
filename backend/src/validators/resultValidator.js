const mongoose = require('mongoose');

const validateEventId = (req, res, next) => {
  const { eventId } = req.params;
  
  if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Event ID format',
      errorCode: 'INVALID_ID_FORMAT'
    });
  }
  
  next();
};

const validateParticipantId = (req, res, next) => {
  const { participantId } = req.params;
  
  if (participantId && !mongoose.Types.ObjectId.isValid(participantId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Participant ID format',
      errorCode: 'INVALID_ID_FORMAT'
    });
  }
  
  next();
};

const validatePaginationAndFilters = (req, res, next) => {
  const { page, limit, eventId } = req.query;
  
  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer',
        errorCode: 'INVALID_PAGINATION'
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be an integer between 1 and 100',
        errorCode: 'INVALID_PAGINATION'
      });
    }
  }
  
  if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event filter ID format',
      errorCode: 'INVALID_ID_FORMAT'
    });
  }
  
  next();
};

module.exports = {
  validateEventId,
  validateParticipantId,
  validatePaginationAndFilters
};
