// src/config/config.js
export const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier'
};

const config = {
  // Removed JWT configuration
  HARDCODED_ADMIN: {
    email: 'kinyuastanzo6759@gmail.com',
    password: 'Kinyua01'
  },
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
  APP_VERSION: '1.0.0',
  SECURITY: {
    PASSWORD_MIN_LENGTH: 4,  // Reduced for development
    PASSWORD_REQUIREMENTS: {
      UPPERCASE: false,  // Disabled for development
      LOWERCASE: false,
      NUMBERS: false,
      SPECIAL_CHARS: false
    }
  }
};

export default config;