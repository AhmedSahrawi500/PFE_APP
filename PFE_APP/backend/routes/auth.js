const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Check password
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Build token payload
    const payload = {
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
    };

    // If student, add student profile info
    if (user.role === 'student') {
      const studentProfile = db
        .prepare('SELECT * FROM students WHERE user_id = ?')
        .get(user.id);

      if (studentProfile) {
        payload.student_id = studentProfile.id;
        payload.student_number = studentProfile.student_number;
        payload.filiere = studentProfile.filiere;
        payload.niveau = studentProfile.niveau;
      }
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      token,
      user: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
