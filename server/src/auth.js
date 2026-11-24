const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'dev-only-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
}

// Puts req.userId on the request, or answers 401. Every readings/reports route uses it,
// so a user can only ever reach their own rows.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  try {
    req.userId = jwt.verify(token, secret).id;
    next();
  } catch {
    res.status(401).json({ error: 'Please log in.' });
  }
}

module.exports = { signToken, requireAuth };
