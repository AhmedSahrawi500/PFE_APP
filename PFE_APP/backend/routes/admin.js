const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
}

router.use(adminOnly);

// ─── GET /api/admin/subjects ───────────────────────────────────────────────────
router.get('/subjects', (req, res) => {
  try {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY name ASC').all();
    return res.json(subjects);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── GET /api/admin/teachers ───────────────────────────────────────────────────
router.get('/teachers', (req, res) => {
  try {
    const teachers = db.prepare(`
      SELECT u.id, u.username, u.name
      FROM users u
      WHERE u.role = 'teacher'
      ORDER BY u.name ASC
    `).all();

    const getSubjects = db.prepare(`
      SELECT s.id, s.name, s.coefficient
      FROM teacher_subjects ts
      JOIN subjects s ON ts.subject_id = s.id
      WHERE ts.teacher_id = ?
      ORDER BY s.name ASC
    `);

    const result = teachers.map(t => ({
      ...t,
      subjects: getSubjects.all(t.id),
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── POST /api/admin/teachers ──────────────────────────────────────────────────
router.post('/teachers', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ message: 'Nom d\'utilisateur, mot de passe et nom complet sont requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      "INSERT INTO users (username, password, role, name) VALUES (?, ?, 'teacher', ?)"
    ).run(username, hashed, name);

    return res.status(201).json({
      id: result.lastInsertRowid,
      username,
      name,
      subjects: [],
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà utilisé.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── DELETE /api/admin/teachers/:id ───────────────────────────────────────────
router.delete('/teachers/:id', (req, res) => {
  const { id } = req.params;
  try {
    const teacher = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Enseignant non trouvé.' });
    }

    db.prepare('DELETE FROM grades WHERE teacher_id = ?').run(id);
    db.prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?').run(id);
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Enseignant non trouvé.' });
    }
    return res.json({ message: 'Enseignant supprimé avec succès.', id: parseInt(id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── PUT /api/admin/teachers/:id/subjects ─────────────────────────────────────
// Replaces the full subject assignment for a teacher
router.put('/teachers/:id/subjects', (req, res) => {
  const { id } = req.params;
  const { subject_ids } = req.body;

  if (!Array.isArray(subject_ids)) {
    return res.status(400).json({ message: 'subject_ids doit être un tableau.' });
  }

  try {
    const teacher = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Enseignant non trouvé.' });
    }

    db.prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?').run(id);
    const insert = db.prepare('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)');
    for (const sid of subject_ids) {
      insert.run(parseInt(id), parseInt(sid));
    }

    const subjects = db.prepare(`
      SELECT s.id, s.name, s.coefficient
      FROM teacher_subjects ts
      JOIN subjects s ON ts.subject_id = s.id
      WHERE ts.teacher_id = ?
      ORDER BY s.name ASC
    `).all(id);

    return res.json({ id: parseInt(id), subjects });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── GET /api/admin/classes ────────────────────────────────────────────────────
router.get('/classes', (req, res) => {
  try {
    const classes = db.prepare('SELECT * FROM classes ORDER BY name ASC').all();

    const getTeachers = db.prepare(`
      SELECT u.id, u.name FROM users u
      JOIN teacher_classes tc ON u.id = tc.teacher_id
      WHERE tc.class_id = ?
      ORDER BY u.name ASC
    `);

    const getStudents = db.prepare(`
      SELECT s.id, u.name, s.student_number FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ?
      ORDER BY u.name ASC
    `);

    const result = classes.map(c => ({
      ...c,
      teachers: getTeachers.all(c.id),
      students: getStudents.all(c.id),
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── POST /api/admin/classes ───────────────────────────────────────────────────
router.post('/classes', (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: 'Le nom de la classe est requis.' });

  try {
    const result = db.prepare('INSERT INTO classes (name) VALUES (?)').run(name);
    return res.status(201).json({ id: result.lastInsertRowid, name, teachers: [], students: [] });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Une classe avec ce nom existe déjà.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── DELETE /api/admin/classes/:id ────────────────────────────────────────────
router.delete('/classes/:id', (req, res) => {
  const { id } = req.params;
  try {
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!cls) return res.status(404).json({ message: 'Classe non trouvée.' });

    // Unassign students from this class before deleting
    db.prepare('UPDATE students SET class_id = NULL WHERE class_id = ?').run(id);
    db.prepare('DELETE FROM classes WHERE id = ?').run(id);
    return res.json({ message: 'Classe supprimée.', id: parseInt(id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── PUT /api/admin/classes/:id/teachers ──────────────────────────────────────
// Replaces all teacher assignments for a class
router.put('/classes/:id/teachers', (req, res) => {
  const { id } = req.params;
  const { teacher_ids } = req.body;
  if (!Array.isArray(teacher_ids)) {
    return res.status(400).json({ message: 'teacher_ids doit être un tableau.' });
  }

  try {
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!cls) return res.status(404).json({ message: 'Classe non trouvée.' });

    db.prepare('DELETE FROM teacher_classes WHERE class_id = ?').run(id);
    const insert = db.prepare('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)');
    for (const tid of teacher_ids) {
      insert.run(parseInt(tid), parseInt(id));
    }

    const teachers = db.prepare(`
      SELECT u.id, u.name FROM users u
      JOIN teacher_classes tc ON u.id = tc.teacher_id
      WHERE tc.class_id = ? ORDER BY u.name ASC
    `).all(id);

    return res.json({ id: parseInt(id), teachers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── PUT /api/admin/classes/:id/students ──────────────────────────────────────
// Assigns a set of students to this class (moves them from any other class)
router.put('/classes/:id/students', (req, res) => {
  const { id } = req.params;
  const { student_ids } = req.body;
  if (!Array.isArray(student_ids)) {
    return res.status(400).json({ message: 'student_ids doit être un tableau.' });
  }

  try {
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!cls) return res.status(404).json({ message: 'Classe non trouvée.' });

    // Remove previously assigned students from this class
    db.prepare('UPDATE students SET class_id = NULL WHERE class_id = ?').run(id);

    // Assign selected students to this class (overwrites their previous class)
    const update = db.prepare('UPDATE students SET class_id = ? WHERE id = ?');
    for (const sid of student_ids) {
      update.run(parseInt(id), parseInt(sid));
    }

    const students = db.prepare(`
      SELECT s.id, u.name, s.student_number FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ? ORDER BY u.name ASC
    `).all(id);

    return res.json({ id: parseInt(id), students });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── GET /api/admin/students ───────────────────────────────────────────────────
router.get('/students', (req, res) => {
  try {
    const students = db.prepare(`
      SELECT s.id, s.student_number, s.filiere, s.niveau, s.class_id,
             u.id as user_id, u.name, u.username,
             c.name as class_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY u.name ASC
    `).all();
    return res.json(students);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── POST /api/admin/students ──────────────────────────────────────────────────
router.post('/students', (req, res) => {
  const { username, password, name, student_number, filiere, niveau } = req.body;
  if (!username || !password || !name || !student_number || !filiere || !niveau) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const userResult = db.prepare(
      "INSERT INTO users (username, password, role, name) VALUES (?, ?, 'student', ?)"
    ).run(username, hashed, name);

    const userId = userResult.lastInsertRowid;

    const studentResult = db.prepare(
      'INSERT INTO students (user_id, student_number, filiere, niveau) VALUES (?, ?, ?, ?)'
    ).run(userId, student_number, filiere, niveau);

    return res.status(201).json({
      id: studentResult.lastInsertRowid,
      user_id: userId,
      username,
      name,
      student_number,
      filiere,
      niveau,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur ou numéro étudiant est déjà utilisé.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── DELETE /api/admin/students/:id ───────────────────────────────────────────
// id here is students.id (not users.id)
router.delete('/students/:id', (req, res) => {
  const { id } = req.params;
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) {
      return res.status(404).json({ message: 'Étudiant non trouvé.' });
    }

    // Explicitly delete grades, then student row, then user
    db.prepare('DELETE FROM grades WHERE student_id = ?').run(id);
    db.prepare('DELETE FROM students WHERE id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(student.user_id);
    return res.json({ message: 'Étudiant supprimé avec succès.', id: parseInt(id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
