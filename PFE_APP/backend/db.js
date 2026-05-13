const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'estl_grades.db'));

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function migrateUsersTable() {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!row || row.sql.includes("'admin'")) return;

  // Recreate users table to add admin to role constraint
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(`
    BEGIN;
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'admin')),
      name TEXT NOT NULL
    );
    INSERT INTO users_new SELECT * FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    COMMIT;
  `);
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('Migrated users table to support admin role.');
}

function migrateClassesSupport() {
  // Add classes table if missing
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS teacher_classes (
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      PRIMARY KEY (teacher_id, class_id)
    );
  `);

  // Add class_id column to students if missing
  const cols = db.prepare("PRAGMA table_info(students)").all();
  if (!cols.some(c => c.name === 'class_id')) {
    db.exec('ALTER TABLE students ADD COLUMN class_id INTEGER REFERENCES classes(id)');
    console.log('Added class_id column to students table.');
  }
}

function initializeDatabase() {
  migrateUsersTable();

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'admin')),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_number TEXT UNIQUE NOT NULL,
      filiere TEXT NOT NULL,
      niveau TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      coefficient INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      note REAL NOT NULL CHECK(note >= 0 AND note <= 20),
      semestre TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, subject_id, semestre)
    );

    CREATE TABLE IF NOT EXISTS teacher_subjects (
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      PRIMARY KEY (teacher_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS teacher_classes (
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      PRIMARY KEY (teacher_id, class_id)
    );
  `);

  migrateClassesSupport();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    // Ensure admin user exists
    const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
    if (!adminExists) {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)").run(
        'admin', adminPassword, 'admin', 'Administrateur'
      );
      console.log('Admin user created.');
    }

    // Assign all subjects to any teacher that has no assignments yet
    const teachersWithoutSubjects = db.prepare(`
      SELECT u.id FROM users u
      WHERE u.role = 'teacher'
      AND NOT EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = u.id)
    `).all();

    if (teachersWithoutSubjects.length > 0) {
      const allSubjects = db.prepare('SELECT id FROM subjects').all();
      const insertTS = db.prepare('INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)');
      for (const t of teachersWithoutSubjects) {
        for (const s of allSubjects) {
          insertTS.run(t.id, s.id);
        }
      }
      console.log('Assigned all subjects to existing teachers.');
    }

    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding database...');

  const adminPassword   = bcrypt.hashSync('admin123', 10);
  const teacherPassword = bcrypt.hashSync('prof123', 10);
  const studentPassword = bcrypt.hashSync('etud123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)
  `);

  insertUser.run('admin', adminPassword, 'admin', 'Administrateur');
  const teacherResult = insertUser.run('prof1', teacherPassword, 'teacher', 'Prof. Mohammed Alami');
  const teacherId = teacherResult.lastInsertRowid;

  const etud1Result = insertUser.run('etud1', studentPassword, 'student', 'Ahmed Bennani');
  const etud2Result = insertUser.run('etud2', studentPassword, 'student', 'Fatima Zahra El Mansouri');
  const etud3Result = insertUser.run('etud3', studentPassword, 'student', 'Youssef Tazi');

  const insertClass = db.prepare('INSERT INTO classes (name) VALUES (?)');
  const classGI  = insertClass.run('Génie Informatique');
  const classCDL = insertClass.run('CDL');
  const classGE  = insertClass.run('Génie Électrique');

  const insertStudent = db.prepare(`
    INSERT INTO students (user_id, student_number, filiere, niveau, class_id) VALUES (?, ?, ?, ?, ?)
  `);

  const s1 = insertStudent.run(etud1Result.lastInsertRowid, '2024001', 'Génie Informatique', '2ème Année', classGI.lastInsertRowid);
  const s2 = insertStudent.run(etud2Result.lastInsertRowid, '2024002', 'Génie Informatique', '2ème Année', classGI.lastInsertRowid);
  const s3 = insertStudent.run(etud3Result.lastInsertRowid, '2024003', 'Génie Électrique', '1ère Année', classGE.lastInsertRowid);

  const insertSubject = db.prepare(`
    INSERT INTO subjects (name, coefficient) VALUES (?, ?)
  `);

  const math = insertSubject.run('Mathématiques', 3);
  const info = insertSubject.run('Informatique', 4);
  const phys = insertSubject.run('Physique', 2);
  const angl = insertSubject.run('Anglais', 1);
  const fran = insertSubject.run('Français', 1);

  // Assign all subjects to the seeded teacher
  const insertTS = db.prepare('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)');
  for (const subjectId of [math, info, phys, angl, fran].map(s => s.lastInsertRowid)) {
    insertTS.run(teacherId, subjectId);
  }

  const insertGrade = db.prepare(`
    INSERT INTO grades (student_id, subject_id, teacher_id, note, semestre) VALUES (?, ?, ?, ?, ?)
  `);

  // Student 1 - S1
  insertGrade.run(s1.lastInsertRowid, math.lastInsertRowid, teacherId, 14.5, 'S1');
  insertGrade.run(s1.lastInsertRowid, info.lastInsertRowid, teacherId, 17.0, 'S1');
  insertGrade.run(s1.lastInsertRowid, phys.lastInsertRowid, teacherId, 12.0, 'S1');
  insertGrade.run(s1.lastInsertRowid, angl.lastInsertRowid, teacherId, 15.0, 'S1');
  insertGrade.run(s1.lastInsertRowid, fran.lastInsertRowid, teacherId, 13.5, 'S1');

  // Student 1 - S2
  insertGrade.run(s1.lastInsertRowid, math.lastInsertRowid, teacherId, 15.0, 'S2');
  insertGrade.run(s1.lastInsertRowid, info.lastInsertRowid, teacherId, 18.5, 'S2');
  insertGrade.run(s1.lastInsertRowid, phys.lastInsertRowid, teacherId, 13.0, 'S2');

  // Student 2 - S1
  insertGrade.run(s2.lastInsertRowid, math.lastInsertRowid, teacherId, 11.0, 'S1');
  insertGrade.run(s2.lastInsertRowid, info.lastInsertRowid, teacherId, 13.5, 'S1');
  insertGrade.run(s2.lastInsertRowid, phys.lastInsertRowid, teacherId, 9.5, 'S1');
  insertGrade.run(s2.lastInsertRowid, angl.lastInsertRowid, teacherId, 16.0, 'S1');

  console.log('Database seeded successfully!');
}

initializeDatabase();

module.exports = db;
