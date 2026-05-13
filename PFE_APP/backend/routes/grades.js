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

// GET /api/grades/subjects - returns teacher's assigned subjects (all if admin)
router.get('/subjects', (req, res) => {
  try {
    let subjects;
    if (req.user.role === 'teacher') {
      subjects = db.prepare(`
        SELECT s.* FROM subjects s
        JOIN teacher_subjects ts ON s.id = ts.subject_id
        WHERE ts.teacher_id = ?
        ORDER BY s.name ASC
      `).all(req.user.id);
    } else {
      subjects = db.prepare('SELECT * FROM subjects ORDER BY name ASC').all();
    }
    return res.json(subjects);
  } catch (err) {
    console.error('Get subjects error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/grades/student/:studentId - get all grades for a student
// Teacher can access any student; student can only access their own
router.get('/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const user = req.user;

  try {
    // Authorization check
    if (user.role === 'student') {
      if (!user.student_id || String(user.student_id) !== String(studentId)) {
        return res.status(403).json({ message: 'Accès non autorisé.' });
      }
    }

    const grades = db.prepare(`
      SELECT
        g.id,
        g.note,
        g.semestre,
        g.created_at,
        s.id as subject_id,
        s.name as subject_name,
        s.coefficient,
        u.name as teacher_name,
        g.teacher_id
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN users u ON g.teacher_id = u.id
      WHERE g.student_id = ?
      ORDER BY g.semestre ASC, s.name ASC
    `).all(studentId);

    return res.json(grades);
  } catch (err) {
    console.error('Get grades error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/grades - add a grade (teacher only)
router.post('/', teacherOnly, (req, res) => {
  const { student_id, subject_id, note, semestre } = req.body;
  const teacherId = req.user.id;

  if (!student_id || !subject_id || note === undefined || note === null || !semestre) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  const noteNum = parseFloat(note);
  if (isNaN(noteNum) || noteNum < 0 || noteNum > 20) {
    return res.status(400).json({ message: 'La note doit être entre 0 et 20.' });
  }

  if (!['S1', 'S2', 'S3', 'S4'].includes(semestre)) {
    return res.status(400).json({ message: 'Semestre invalide. Utilisez S1, S2, S3 ou S4.' });
  }

  try {
    // Check if student exists
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ message: 'Étudiant non trouvé.' });
    }

    // Check if subject exists
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject_id);
    if (!subject) {
      return res.status(404).json({ message: 'Matière non trouvée.' });
    }

    // Verify teacher is assigned to this subject
    const assigned = db.prepare(
      'SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?'
    ).get(teacherId, subject_id);
    if (!assigned) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à noter cette matière.' });
    }

    // Check for duplicate (student + subject + semestre must be unique)
    const existing = db.prepare(
      'SELECT * FROM grades WHERE student_id = ? AND subject_id = ? AND semestre = ?'
    ).get(student_id, subject_id, semestre);

    if (existing) {
      return res.status(409).json({
        message: `Une note existe déjà pour cette matière en ${semestre}. Utilisez la modification.`,
      });
    }

    const result = db.prepare(`
      INSERT INTO grades (student_id, subject_id, teacher_id, note, semestre)
      VALUES (?, ?, ?, ?, ?)
    `).run(student_id, subject_id, teacherId, noteNum, semestre);

    // Return the newly created grade with joined info
    const newGrade = db.prepare(`
      SELECT
        g.id,
        g.note,
        g.semestre,
        g.created_at,
        s.id as subject_id,
        s.name as subject_name,
        s.coefficient,
        u.name as teacher_name,
        g.teacher_id
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN users u ON g.teacher_id = u.id
      WHERE g.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json(newGrade);
  } catch (err) {
    console.error('Add grade error:', err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        message: 'Une note existe déjà pour cette matière et ce semestre.',
      });
    }
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/grades/:id - update a grade (teacher only)
router.put('/:id', teacherOnly, (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  if (note === undefined || note === null) {
    return res.status(400).json({ message: 'La note est requise.' });
  }

  const noteNum = parseFloat(note);
  if (isNaN(noteNum) || noteNum < 0 || noteNum > 20) {
    return res.status(400).json({ message: 'La note doit être entre 0 et 20.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM grades WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Note non trouvée.' });
    }

    db.prepare('UPDATE grades SET note = ? WHERE id = ?').run(noteNum, id);

    const updatedGrade = db.prepare(`
      SELECT
        g.id,
        g.note,
        g.semestre,
        g.created_at,
        s.id as subject_id,
        s.name as subject_name,
        s.coefficient,
        u.name as teacher_name,
        g.teacher_id
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN users u ON g.teacher_id = u.id
      WHERE g.id = ?
    `).get(id);

    return res.json(updatedGrade);
  } catch (err) {
    console.error('Update grade error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE /api/grades/:id - delete a grade (teacher only)
router.delete('/:id', teacherOnly, (req, res) => {
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM grades WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Note non trouvée.' });
    }

    db.prepare('DELETE FROM grades WHERE id = ?').run(id);

    return res.json({ message: 'Note supprimée avec succès.', id: parseInt(id) });
  } catch (err) {
    console.error('Delete grade error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
