const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// signup handler
exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name: (name || '').trim(), email, passwordHash: hash });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({
      userId: user._id,
      token,
      user: {
        name: user.name || user.email.split('@')[0],
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// login handler
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({
      userId: user._id,
      token,
      user: {
        name: user.name || user.email.split('@')[0],
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
