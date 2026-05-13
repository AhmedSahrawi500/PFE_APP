import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import Navbar from '../components/Navbar.jsx';
import GradeTable, { calcWeightedAverage } from '../components/GradeTable.jsx';
import { UsersIcon, ArrowLeftIcon, TrashIcon, EditIcon, PlusIcon, WarningIcon, CheckIcon } from '../components/Icons.jsx';

const SEMESTRES = ['S1', 'S2', 'S3', 'S4'];

export default function TeacherDashboard() {
  const { authFetch } = useAuth();

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [activeSemestre, setActiveSemestre] = useState('S1');

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Form state
  const [formSubject, setFormSubject]     = useState('');
  const [formSemestre, setFormSemestre]   = useState('S1');
  const [formNote, setFormNote]           = useState('');
  const [editingGrade, setEditingGrade]   = useState(null); // grade object
  const [formError, setFormError]         = useState('');
  const [formSuccess, setFormSuccess]     = useState('');
  const [formLoading, setFormLoading]     = useState(false);

  // Confirm delete
  const [deletingId, setDeletingId]       = useState(null);

  // Search students
  const [searchQuery, setSearchQuery]     = useState('');

  // ─── Load students & subjects on mount ──────────────────────────────────────
  useEffect(() => {
    async function fetchInitial() {
      try {
        const [studRes, subRes] = await Promise.all([
          authFetch('/api/students'),
          authFetch('/api/grades/subjects'),
        ]);
        const studData = await studRes.json();
        const subData  = await subRes.json();
        setStudents(studData);
        setSubjects(subData);
        if (subData.length > 0) setFormSubject(String(subData[0].id));
      } catch (e) {
        console.error('Failed to load initial data', e);
      } finally {
        setLoadingStudents(false);
      }
    }
    fetchInitial();
  }, []);

  // ─── Load grades when student selected ──────────────────────────────────────
  const loadGrades = useCallback(async (studentId) => {
    if (!studentId) return;
    setLoadingGrades(true);
    try {
      const res = await authFetch(`/api/grades/student/${studentId}`);
      const data = await res.json();
      setGrades(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load grades', e);
      setGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  }, [authFetch]);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setGrades([]);
    setEditingGrade(null);
    setFormError('');
    setFormSuccess('');
    loadGrades(student.id);
  };

  // ─── Form reset ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormSubject(subjects.length > 0 ? String(subjects[0].id) : '');
    setFormSemestre(activeSemestre);
    setFormNote('');
    setEditingGrade(null);
    setFormError('');
    setFormSuccess('');
  };

  // ─── Start editing a grade ───────────────────────────────────────────────────
  const startEdit = (grade) => {
    setEditingGrade(grade);
    setFormSubject(String(grade.subject_id));
    setFormSemestre(grade.semestre);
    setFormNote(String(grade.note));
    setFormError('');
    setFormSuccess('');
    // scroll to form
    document.getElementById('grade-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ─── Submit (add or update) ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const noteNum = parseFloat(formNote);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > 20) {
      setFormError('La note doit être un nombre entre 0 et 20.');
      return;
    }

    setFormLoading(true);
    try {
      let res, data;
      if (editingGrade) {
        // PUT update
        res = await authFetch(`/api/grades/${editingGrade.id}`, {
          method: 'PUT',
          body: JSON.stringify({ note: noteNum }),
        });
        data = await res.json();
        if (!res.ok) { setFormError(data.message); setFormLoading(false); return; }
        setGrades(prev => prev.map(g => g.id === data.id ? data : g));
        setFormSuccess('Note modifiée avec succès.');
      } else {
        // POST new
        res = await authFetch('/api/grades', {
          method: 'POST',
          body: JSON.stringify({
            student_id: selectedStudent.id,
            subject_id: parseInt(formSubject),
            note: noteNum,
            semestre: formSemestre,
          }),
        });
        data = await res.json();
        if (!res.ok) { setFormError(data.message); setFormLoading(false); return; }
        setGrades(prev => [...prev, data]);
        setFormSuccess('Note ajoutée avec succès.');
        setActiveSemestre(formSemestre);
      }
      setEditingGrade(null);
      setFormNote('');
    } catch (err) {
      setFormError('Erreur de connexion au serveur.');
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (gradeId) => {
    setDeletingId(gradeId);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await authFetch(`/api/grades/${deletingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message);
      } else {
        setGrades(prev => prev.filter(g => g.id !== deletingId));
        setFormSuccess('Note supprimée avec succès.');
        if (editingGrade?.id === deletingId) resetForm();
      }
    } catch {
      setFormError('Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Derived: filter grades by semestre ─────────────────────────────────────
  const gradesForSemestre = grades.filter(g => g.semestre === activeSemestre);

  // ─── Filtered students ───────────────────────────────────────────────────────
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_number.includes(searchQuery) ||
    s.filiere.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Available subjects for form (not yet graded in that semestre) ───────────
  const gradedSubjectIds = grades
    .filter(g => g.semestre === formSemestre)
    .map(g => g.subject_id);

  const availableSubjects = editingGrade
    ? subjects
    : subjects.filter(s => !gradedSubjectIds.includes(s.id));

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.layout}>
        {/* ── Left Panel: Students ─────────────────────────────────────────── */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h2 style={styles.sidebarTitle}>
              <UsersIcon size={18} color="currentColor" style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Étudiants
            </h2>
            <span style={styles.countBadge}>{students.length}</span>
          </div>

          <div style={styles.searchWrap}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {loadingStudents ? (
            <div style={styles.loadingBox}><div className="spinner" /></div>
          ) : (
            <ul style={styles.studentList}>
              {filteredStudents.length === 0 && (
                <li style={styles.noResults}>Aucun étudiant trouvé.</li>
              )}
              {filteredStudents.map(student => (
                <li
                  key={student.id}
                  style={{
                    ...styles.studentItem,
                    ...(selectedStudent?.id === student.id ? styles.studentItemActive : {}),
                  }}
                  onClick={() => selectStudent(student)}
                >
                  <div style={styles.studentAvatar}>
                    {student.name[0]}
                  </div>
                  <div style={styles.studentInfo}>
                    <span style={styles.studentName}>{student.name}</span>
                    <span style={styles.studentMeta}>{student.student_number} · {student.filiere}</span>
                    <span style={styles.studentNiveau}>{student.niveau}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Right Panel: Grades ──────────────────────────────────────────── */}
        <main style={styles.main}>
          {!selectedStudent ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}><ArrowLeftIcon size={56} color="#c5cae9" /></div>
              <h3 style={styles.emptyStateTitle}>Sélectionnez un étudiant</h3>
              <p style={styles.emptyStateText}>
                Cliquez sur un étudiant dans la liste pour afficher et gérer ses notes.
              </p>
            </div>
          ) : (
            <div className="fade-in">
              {/* Student header */}
              <div style={styles.studentHeader}>
                <div style={styles.studentHeaderLeft}>
                  <div style={styles.studentHeaderAvatar}>
                    {selectedStudent.name[0]}
                  </div>
                  <div>
                    <h2 style={styles.studentHeaderName}>{selectedStudent.name}</h2>
                    <p style={styles.studentHeaderMeta}>
                      N° {selectedStudent.student_number} · {selectedStudent.filiere} · {selectedStudent.niveau}
                    </p>
                  </div>
                </div>
                <div style={styles.studentHeaderRight}>
                  {SEMESTRES.map(s => {
                    const sGrades = grades.filter(g => g.semestre === s);
                    const avg = calcWeightedAverage(sGrades);
                    return (
                      <div key={s} style={styles.semStat}>
                        <span style={styles.semStatLabel}>{s}</span>
                        <span style={styles.semStatValue}>
                          {avg !== null ? `${avg}/20` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Semestre tabs */}
              <div style={styles.tabs}>
                {SEMESTRES.map(s => (
                  <button
                    key={s}
                    style={{
                      ...styles.tab,
                      ...(activeSemestre === s ? styles.tabActive : {}),
                    }}
                    onClick={() => { setActiveSemestre(s); setFormSemestre(s); }}
                  >
                    Semestre {s}
                    {grades.filter(g => g.semestre === s).length > 0 && (
                      <span style={styles.tabBadge}>
                        {grades.filter(g => g.semestre === s).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Grades table */}
              {loadingGrades ? (
                <div style={styles.loadingBox}><div className="spinner" /></div>
              ) : (
                <GradeTable
                  grades={gradesForSemestre}
                  isTeacher={true}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  editingId={editingGrade?.id}
                />
              )}

              {/* ── Add / Edit Grade Form ────────────────────────────────── */}
              <div id="grade-form" style={styles.formCard}>
                <h3 style={styles.formTitle}>
                  {editingGrade
                    ? <><EditIcon size={18} color="#1a237e" style={{ marginRight: 8, verticalAlign: 'middle' }} />Modifier la note</>
                    : <><PlusIcon size={18} color="#1a237e" style={{ marginRight: 8, verticalAlign: 'middle' }} />Ajouter une note</>
                  }
                </h3>

                {formError && (
                  <div style={styles.formError}><WarningIcon size={15} color="#c62828" style={{ marginRight: 6, flexShrink: 0 }} />{formError}</div>
                )}
                {formSuccess && (
                  <div style={styles.formSuccess}><CheckIcon size={15} color="#2e7d32" style={{ marginRight: 6, flexShrink: 0 }} />{formSuccess}</div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.formRow}>
                    {/* Subject selector */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Matière</label>
                      {editingGrade ? (
                        <input
                          type="text"
                          value={editingGrade.subject_name}
                          disabled
                          style={{ ...styles.formInput, background: '#f5f5f5', color: '#757575' }}
                        />
                      ) : (
                        <select
                          value={formSubject}
                          onChange={e => setFormSubject(e.target.value)}
                          required
                          style={styles.formInput}
                          disabled={availableSubjects.length === 0}
                        >
                          {availableSubjects.length === 0 ? (
                            <option>Toutes les matières notées</option>
                          ) : (
                            availableSubjects.map(s => (
                              <option key={s.id} value={String(s.id)}>
                                {s.name} (coef. {s.coefficient})
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>

                    {/* Semestre selector */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Semestre</label>
                      {editingGrade ? (
                        <input
                          type="text"
                          value={editingGrade.semestre}
                          disabled
                          style={{ ...styles.formInput, background: '#f5f5f5', color: '#757575' }}
                        />
                      ) : (
                        <select
                          value={formSemestre}
                          onChange={e => setFormSemestre(e.target.value)}
                          required
                          style={styles.formInput}
                        >
                          {SEMESTRES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Note input */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Note /20</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        value={formNote}
                        onChange={e => setFormNote(e.target.value)}
                        placeholder="Ex: 14.5"
                        required
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <div style={styles.formActions}>
                    <button
                      type="submit"
                      disabled={formLoading || (!editingGrade && availableSubjects.length === 0)}
                      style={{
                        ...styles.btnPrimary,
                        opacity: (formLoading || (!editingGrade && availableSubjects.length === 0)) ? 0.6 : 1,
                        cursor: (formLoading || (!editingGrade && availableSubjects.length === 0)) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {formLoading
                        ? 'En cours...'
                        : editingGrade
                          ? 'Enregistrer les modifications'
                          : 'Ajouter la note'}
                    </button>

                    {editingGrade && (
                      <button
                        type="button"
                        onClick={resetForm}
                        style={styles.btnSecondary}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deletingId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} className="fade-in">
            <div style={styles.modalIcon}><TrashIcon size={48} color="#c62828" /></div>
            <h3 style={styles.modalTitle}>Confirmer la suppression</h3>
            <p style={styles.modalText}>
              Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.
            </p>
            <div style={styles.modalActions}>
              <button onClick={confirmDelete} style={styles.btnDanger}>
                Oui, supprimer
              </button>
              <button onClick={() => setDeletingId(null)} style={styles.btnSecondary}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
  },
  layout: {
    display: 'flex',
    flex: 1,
    maxWidth: 1400,
    margin: '0 auto',
    width: '100%',
    padding: '24px 16px',
    gap: 24,
    alignItems: 'flex-start',
  },
  // ── Sidebar ──
  sidebar: {
    width: 300,
    flexShrink: 0,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    position: 'sticky',
    top: 88,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #1a237e, #283593)',
    color: '#fff',
  },
  sidebarTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
  },
  countBadge: {
    background: '#f9a825',
    color: '#1a237e',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  searchWrap: {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
  },
  searchInput: {
    width: '100%',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '0.875rem',
    outline: 'none',
    color: '#212121',
  },
  studentList: {
    listStyle: 'none',
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
  },
  noResults: {
    padding: '24px 20px',
    textAlign: 'center',
    color: '#9e9e9e',
    fontSize: '0.875rem',
  },
  studentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #f5f5f5',
    transition: 'background 0.15s',
  },
  studentItemActive: {
    background: '#e8eaf6',
    borderLeft: '4px solid #1a237e',
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a237e, #3949ab)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
    flexShrink: 0,
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  studentName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: '#1a237e',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  studentMeta: {
    fontSize: '0.75rem',
    color: '#757575',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  studentNiveau: {
    fontSize: '0.75rem',
    color: '#9e9e9e',
  },
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 0',
  },
  // ── Main ──
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  emptyState: {
    background: '#fff',
    borderRadius: 12,
    padding: '80px 40px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyStateIcon: {
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#757575',
    fontSize: '0.9375rem',
  },
  studentHeader: {
    background: 'linear-gradient(135deg, #1a237e, #283593)',
    borderRadius: 12,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 12px rgba(26,35,126,0.2)',
    flexWrap: 'wrap',
    gap: 16,
  },
  studentHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  studentHeaderAvatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(249,168,37,0.2)',
    border: '2px solid #f9a825',
    color: '#f9a825',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.4rem',
    flexShrink: 0,
  },
  studentHeaderName: {
    color: '#fff',
    fontSize: '1.2rem',
    fontWeight: 700,
    marginBottom: 4,
  },
  studentHeaderMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.875rem',
  },
  studentHeaderRight: {
    display: 'flex',
    gap: 16,
  },
  semStat: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '10px 20px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  semStatLabel: {
    display: 'block',
    color: '#f9a825',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: 4,
  },
  semStatValue: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    background: '#fff',
    borderRadius: 10,
    padding: '8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  tab: {
    flex: 1,
    padding: '10px 20px',
    border: 'none',
    borderRadius: 7,
    background: 'transparent',
    color: '#616161',
    fontWeight: 600,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#1a237e',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(26,35,126,0.3)',
  },
  tabBadge: {
    background: '#f9a825',
    color: '#1a237e',
    borderRadius: 20,
    padding: '1px 8px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  // ── Form ──
  formCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
  },
  formTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: 16,
  },
  formError: {
    background: '#ffebee',
    border: '1px solid #ef9a9a',
    color: '#c62828',
    borderRadius: 7,
    padding: '10px 14px',
    marginBottom: 14,
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  formSuccess: {
    background: '#e8f5e9',
    border: '1px solid #a5d6a7',
    color: '#2e7d32',
    borderRadius: 7,
    padding: '10px 14px',
    marginBottom: 14,
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
  },
  form: {},
  formRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: 1,
    minWidth: 160,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#37474f',
  },
  formInput: {
    border: '1.5px solid #e0e0e0',
    borderRadius: 7,
    padding: '10px 12px',
    fontSize: '0.9375rem',
    outline: 'none',
    color: '#212121',
    background: '#fafafa',
    width: '100%',
  },
  formActions: {
    display: 'flex',
    gap: 12,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #1a237e, #283593)',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '10px 24px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(26,35,126,0.2)',
  },
  btnSecondary: {
    background: '#fff',
    color: '#616161',
    border: '1.5px solid #e0e0e0',
    borderRadius: 7,
    padding: '10px 24px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    background: '#c62828',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '10px 24px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // ── Modal ──
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 24,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: '36px 32px',
    maxWidth: 400,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalIcon: {
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: 12,
  },
  modalText: {
    color: '#616161',
    fontSize: '0.9375rem',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
};
