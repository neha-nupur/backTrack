const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

// Mount API routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

// Architectural route placeholders for future phases
// router.use('/events', eventRoutes);
// router.use('/challenges', challengeRoutes);
// router.use('/participants', participantRoutes);
// router.use('/results', resultRoutes);

module.exports = router;
