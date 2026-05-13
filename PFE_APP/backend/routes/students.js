const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware: teacher only
function teacherOnly(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Accès refusé. Réservé aux enseignants.' });
  }
  next();
}

// GET /api/students - list all students with user info
router.get('/', teacherOnly, (req, res) => {
  try {
    const students = db.prepare(`
      SELECT
        s.id,
        s.student_number,
        s.filiere,
        s.niveau,
        u.id as user_id,
        u.name,
        u.username
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY u.name ASC
    `).all();

    return res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
