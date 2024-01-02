const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: 'Vous avez atteint la limite de requêtes. Réessayez plus tard.',
  });
  
  module.exports = limiter;