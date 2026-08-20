const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const eventRoutes = require('./eventRoutes');

const router = express.Router();

// Mount API routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/events', eventRoutes);

// Architectural route placeholders for future phases
// router.use('/challenges', challengeRoutes);
// router.use('/participants', participantRoutes);
// router.use('/results', resultRoutes);

module.exports = router;
