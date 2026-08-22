const express = require('express');
const { getHealthStatus } = require('../controllers/healthController');

const router = express.Router();

router.get('/', getHealthStatus);
router.get('/health', getHealthStatus);

module.exports = router;

