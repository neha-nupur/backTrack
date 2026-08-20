const AppError = require('../utils/appError');

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return next(new AppError('College email is required.', 400, 'MISSING_EMAIL'));
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return next(new AppError('Please provide a valid email address format.', 400, 'INVALID_EMAIL_FORMAT'));
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return next(new AppError('Password is required.', 400, 'MISSING_PASSWORD'));
  }

  req.body.email = normalizedEmail;
  req.body.password = password.trim();
  next();
};

module.exports = {
  validateLoginInput,
};
