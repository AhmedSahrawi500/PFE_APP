import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import Navbar from '../components/Navbar.jsx';
import {
  UsersIcon, TeacherIcon, StudentIcon, TrashIcon, PlusIcon,
  EditIcon, CheckIcon, WarningIcon, BookIcon,
} from '../components/Icons.jsx';

// ─── Shared helpers ────────────────────────────────────────────────────────────
function Chip({ label, color = '#3949ab', bg = '#e8eaf6' }) {
  return (
    <span style={{ background: bg, color, borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 }}>
      {label}
    </span>
  );
}

function IconBtn({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={s.iconBtn}>{children}</button>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={s.errorBox}>
      <WarningIcon size={14} color="#c62828" style={{ marginRight: 6, flexShrink: 0 }} />
      {msg}
    </div>
  );
}

function LoadingBox() {
  return <div style={s.loadingBox}><div className="spinner" /></div>;
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('classes');

  // ── Data ──
  const [teachers, setTeachers]     = useState([]);
  const [students, setStudents]     = useState([]);
  const [classes,  setClasses]      = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingClasses,  setLoadingClasses]  = useState(true);

  // ── Global flash ──
  const [successMsg, setSuccessMsg] = useState('');
  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500); };

  // ── Loaders ──
  const loadTeachers = useCallback(async () => {
    setLoadingTeachers(true);
    try { const r = await authFetch('/api/admin/teachers'); setTeachers(await r.json()); }
    finally { setLoadingTeachers(false); }
  }, [authFetch]);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try { const r = await authFetch('/api/admin/students'); setStudents(await r.json()); }
    finally { setLoadingStudents(false); }
  }, [authFetch]);

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    try { const r = await authFetch('/api/admin/classes'); setClasses(await r.json()); }
    finally { setLoadingClasses(false); }
  }, [authFetch]);

  const loadSubjects = useCallback(async () => {
    try { const r = await authFetch('/api/admin/subjects'); setAllSubjects(await r.json()); }
    catch { /* silent */ }
  }, [authFetch]);

  useEffect(() => {
    loadTeachers();
    loadStudents();
    loadClasses();
    loadSubjects();
  }, [loadTeachers, loadStudents, loadClasses, loadSubjects]);

  // ─── DELETE helper ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const urlMap = {
      teacher: `/api/admin/teachers/${deleteTarget.id}`,
      student: `/api/admin/students/${deleteTarget.id}`,
      class:   `/api/admin/classes/${deleteTarget.id}`,
    };
    try {
      const res = await authFetch(urlMap[deleteTarget.type], { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { flash(data.message); return; }
      if (deleteTarget.type === 'teacher') setTeachers(p => p.filter(t => t.id !== deleteTarget.id));
      if (deleteTarget.type === 'student') setStudents(p => p.filter(st => st.id !== deleteTarget.id));
      if (deleteTarget.type === 'class')   setClasses(p => p.filter(c => c.id !== deleteTarget.id));
      flash(data.message);
    } catch { flash('Erreur lors de la suppression.'); }
    finally { setDeleteLoading(false); setDeleteTarget(null); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CLASSES TAB STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [showClassForm, setShowClassForm]   = useState(false);
  const [className, setClassName]           = useState('');
  const [classFormError, setClassFormError] = useState('');
  const [classFormLoading, setClassFormLoading] = useState(false);

  // Assign teachers to a class
  const [assignTeachersTarget, setAssignTeachersTarget] = useState(null);
  const [assignTeachersSelected, setAssignTeachersSelected] = useState([]);
  const [assignTeachersLoading, setAssignTeachersLoading] = useState(false);
  const [assignTeachersError, setAssignTeachersError]     = useState('');

  // Assign students to a class
  const [assignStudentsTarget, setAssignStudentsTarget]   = useState(null);
  const [assignStudentsSelected, setAssignStudentsSelected] = useState([]);
  const [assignStudentsLoading, setAssignStudentsLoading] = useState(false);
  const [assignStudentsError, setAssignStudentsError]     = useState('');

  const handleAddClass = async (e) => {
    e.preventDefault();
    setClassFormError('');
    setClassFormLoading(true);
    try {
      const res = await authFetch('/api/admin/classes', { method: 'POST', body: JSON.stringify({ name: className }) });
      const data = await res.json();
      if (!res.ok) { setClassFormError(data.message); return; }
      setClasses(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      setClassName('');
      setShowClassForm(false);
      flash('Classe créée avec succès.');
    } catch { setClassFormError('Erreur de connexion.'); }
    finally { setClassFormLoading(false); }
  };

  const openAssignTeachers = (cls) => {
    setAssignTeachersTarget(cls);
    setAssignTeachersSelected(cls.teachers.map(t => t.id));
    setAssignTeachersError('');
  };

  const saveClassTeachers = async () => {
    setAssignTeachersLoading(true);
    setAssignTeachersError('');
    try {
      const res = await authFetch(`/api/admin/classes/${assignTeachersTarget.id}/teachers`, {
        method: 'PUT', body: JSON.stringify({ teacher_ids: assignTeachersSelected }),
      });
      const data = await res.json();
      if (!res.ok) { setAssignTeachersError(data.message); return; }
      setClasses(p => p.map(c => c.id === assignTeachersTarget.id ? { ...c, teachers: data.teachers } : c));
      setAssignTeachersTarget(null);
      flash('Enseignants mis à jour.');
    } catch { setAssignTeachersError('Erreur de connexion.'); }
    finally { setAssignTeachersLoading(false); }
  };

  const openAssignStudents = (cls) => {
    setAssignStudentsTarget(cls);
    setAssignStudentsSelected(cls.students.map(st => st.id));
    setAssignStudentsError('');
  };

  const saveClassStudents = async () => {
    setAssignStudentsLoading(true);
    setAssignStudentsError('');
    try {
      const res = await authFetch(`/api/admin/classes/${assignStudentsTarget.id}/students`, {
        method: 'PUT', body: JSON.stringify({ student_ids: assignStudentsSelected }),
      });
      const data = await res.json();
      if (!res.ok) { setAssignStudentsError(data.message); return; }
      // Update classes list
      setClasses(p => p.map(c => c.id === assignStudentsTarget.id ? { ...c, students: data.students } : c));
      // Refresh students list (class_name may have changed)
      loadStudents();
      setAssignStudentsTarget(null);
      flash('Étudiants mis à jour.');
    } catch { setAssignStudentsError('Erreur de connexion.'); }
    finally { setAssignStudentsLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TEACHERS TAB STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [tForm, setTForm] = useState({ username: '', password: '', name: '' });
  const [tFormError, setTFormError]   = useState('');
  const [tFormLoading, setTFormLoading] = useState(false);

  // Assign subjects modal
  const [assignSubjectsTarget, setAssignSubjectsTarget]     = useState(null);
  const [assignSubjectsSelected, setAssignSubjectsSelected] = useState([]);
  const [assignSubjectsLoading, setAssignSubjectsLoading]   = useState(false);
  const [assignSubjectsError, setAssignSubjectsError]       = useState('');

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setTFormError('');
    setTFormLoading(true);
    try {
      const res = await authFetch('/api/admin/teachers', { method: 'POST', body: JSON.stringify(tForm) });
      const data = await res.json();
      if (!res.ok) { setTFormError(data.message); return; }
      setTeachers(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      setTForm({ username: '', password: '', name: '' });
      setShowTeacherForm(false);
      flash('Enseignant ajouté avec succès.');
    } catch { setTFormError('Erreur de connexion.'); }
    finally { setTFormLoading(false); }
  };

  const openAssignSubjects = (teacher) => {
    setAssignSubjectsTarget(teacher);
    setAssignSubjectsSelected(teacher.subjects.map(s => s.id));
    setAssignSubjectsError('');
  };

  const saveSubjects = async () => {
    setAssignSubjectsLoading(true);
    setAssignSubjectsError('');
    try {
      const res = await authFetch(`/api/admin/teachers/${assignSubjectsTarget.id}/subjects`, {
        method: 'PUT', body: JSON.stringify({ subject_ids: assignSubjectsSelected }),
      });
      const data = await res.json();
      if (!res.ok) { setAssignSubjectsError(data.message); return; }
      setTeachers(p => p.map(t => t.id === assignSubjectsTarget.id ? { ...t, subjects: data.subjects } : t));
      setAssignSubjectsTarget(null);
      flash('Matières mises à jour.');
    } catch { setAssignSubjectsError('Erreur de connexion.'); }
    finally { setAssignSubjectsLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STUDENTS TAB STATE
  // ─────────────────────────────────────────────────────────────────────────
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [sForm, setSForm] = useState({ username: '', password: '', name: '', student_number: '', filiere: '', niveau: '' });
  const [sFormError, setSFormError]   = useState('');
  const [sFormLoading, setSFormLoading] = useState(false);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSFormError('');
    setSFormLoading(true);
    try {
      const res = await authFetch('/api/admin/students', { method: 'POST', body: JSON.stringify(sForm) });
      const data = await res.json();
      if (!res.ok) { setSFormError(data.message); return; }
      setStudents(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSForm({ username: '', password: '', name: '', student_number: '', filiere: '', niveau: '' });
      setShowStudentForm(false);
      flash('Étudiant ajouté avec succès.');
    } catch { setSFormError('Erreur de connexion.'); }
    finally { setSFormLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'classes',  label: 'Classes',      icon: <BookIcon    size={15} color="currentColor" style={{ marginRight: 6 }} />, count: classes.length },
    { key: 'teachers', label: 'Enseignants',  icon: <TeacherIcon size={15} color="currentColor" style={{ marginRight: 6 }} />, count: teachers.length },
    { key: 'students', label: 'Étudiants',    icon: <StudentIcon size={15} color="currentColor" style={{ marginRight: 6 }} />, count: students.length },
  ];

  return (
    <div style={s.page}>
      <Navbar />

      {successMsg && (
        <div style={s.successBanner} className="fade-in">
          <CheckIcon size={15} color="#2e7d32" style={{ marginRight: 8, flexShrink: 0 }} />
          {successMsg}
        </div>
      )}

      <div style={s.content}>
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Administration</h1>
          <p style={s.pageSubtitle}>Gestion des classes, enseignants et étudiants</p>
        </div>

        {/* ── Tabs ── */}
        <div style={s.tabs}>
          {tabs.map(t => (
            <button
              key={t.key}
              style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}{t.label}
              <span style={s.tabBadge}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ══════════ CLASSES TAB ══════════ */}
        {activeTab === 'classes' && (
          <div className="fade-in">
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Gestion des classes</h2>
              <button style={s.btnAdd} onClick={() => { setShowClassForm(v => !v); setClassFormError(''); }}>
                <PlusIcon size={15} color="#fff" style={{ marginRight: 6 }} />
                Nouvelle classe
              </button>
            </div>

            {showClassForm && (
              <div style={s.formCard} className="fade-in">
                <h3 style={s.formCardTitle}>Créer une classe</h3>
                <ErrorBox msg={classFormError} />
                <form onSubmit={handleAddClass} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={s.label}>Nom de la classe</label>
                    <input
                      style={s.input} required value={className}
                      onChange={e => setClassName(e.target.value)}
                      placeholder="ex: Génie Informatique, CDL, Génie Civil…"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={classFormLoading} style={s.btnPrimary}>
                      {classFormLoading ? 'En cours…' : 'Créer'}
                    </button>
                    <button type="button" style={s.btnSecondary} onClick={() => setShowClassForm(false)}>Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {loadingClasses ? <LoadingBox /> : classes.length === 0 ? (
              <div style={s.emptyState}>Aucune classe enregistrée. Créez votre première classe ci-dessus.</div>
            ) : (
              <div style={s.classGrid}>
                {classes.map(cls => (
                  <div key={cls.id} style={s.classCard}>
                    {/* ── Card header ── */}
                    <div style={s.classCardHeader}>
                      <div style={s.classAvatar}>
                        {cls.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={s.classCardName}>{cls.name}</div>
                        <div style={s.classCardMeta}>
                          {cls.teachers.length} enseignant{cls.teachers.length !== 1 ? 's' : ''} · {cls.students.length} étudiant{cls.students.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <IconBtn onClick={() => openAssignTeachers(cls)} title="Affecter des enseignants">
                          <TeacherIcon size={15} color="#1a237e" />
                        </IconBtn>
                        <IconBtn onClick={() => openAssignStudents(cls)} title="Affecter des étudiants">
                          <StudentIcon size={15} color="#1a237e" />
                        </IconBtn>
                        <IconBtn onClick={() => setDeleteTarget({ type: 'class', id: cls.id, name: cls.name })} title="Supprimer">
                          <TrashIcon size={15} color="#c62828" />
                        </IconBtn>
                      </div>
                    </div>

                    {/* ── Teachers row ── */}
                    <div style={s.classSection}>
                      <span style={s.classSectionLabel}>Enseignants</span>
                      <div style={s.chipRow}>
                        {cls.teachers.length === 0
                          ? <span style={s.none}>Aucun enseignant affecté</span>
                          : cls.teachers.map(t => <Chip key={t.id} label={t.name} />)
                        }
                      </div>
                    </div>

                    {/* ── Students row ── */}
                    <div style={s.classSection}>
                      <span style={s.classSectionLabel}>Étudiants</span>
                      <div style={s.chipRow}>
                        {cls.students.length === 0
                          ? <span style={s.none}>Aucun étudiant affecté</span>
                          : cls.students.map(st => (
                              <Chip key={st.id} label={`${st.name} (${st.student_number})`} bg="#e8f5e9" color="#2e7d32" />
                            ))
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TEACHERS TAB ══════════ */}
        {activeTab === 'teachers' && (
          <div className="fade-in">
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Liste des enseignants</h2>
              <button style={s.btnAdd} onClick={() => { setShowTeacherForm(v => !v); setTFormError(''); }}>
                <PlusIcon size={15} color="#fff" style={{ marginRight: 6 }} />
                Ajouter un enseignant
              </button>
            </div>

            {showTeacherForm && (
              <div style={s.formCard} className="fade-in">
                <h3 style={s.formCardTitle}>Nouvel enseignant</h3>
                <ErrorBox msg={tFormError} />
                <form onSubmit={handleAddTeacher} style={s.formRow}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Nom complet</label>
                    <input style={s.input} required value={tForm.name}
                      onChange={e => setTForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Prof. Ahmed Benali" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Nom d'utilisateur</label>
                    <input style={s.input} required value={tForm.username}
                      onChange={e => setTForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="prof2" />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Mot de passe</label>
                    <input style={s.input} required type="password" minLength={6} value={tForm.password}
                      onChange={e => setTForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Min. 6 caractères" />
                  </div>
                  <div style={s.formActions}>
                    <button type="submit" disabled={tFormLoading} style={s.btnPrimary}>
                      {tFormLoading ? 'En cours…' : 'Créer'}
                    </button>
                    <button type="button" style={s.btnSecondary} onClick={() => setShowTeacherForm(false)}>Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {loadingTeachers ? <LoadingBox /> : teachers.length === 0 ? (
              <div style={s.emptyState}>Aucun enseignant enregistré.</div>
            ) : (
              <div style={s.cardList}>
                {teachers.map(t => (
                  <div key={t.id} style={s.card}>
                    <div style={s.cardHeader}>
                      <div style={s.avatar}>{t.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={s.cardName}>{t.name}</div>
                        <div style={s.cardSub}>@{t.username}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <IconBtn onClick={() => openAssignSubjects(t)} title="Affecter des matières">
                          <EditIcon size={15} color="#1a237e" />
                        </IconBtn>
                        <IconBtn onClick={() => setDeleteTarget({ type: 'teacher', id: t.id, name: t.name })} title="Supprimer">
                          <TrashIcon size={15} color="#c62828" />
                        </IconBtn>
                      </div>
                    </div>
                    <div style={s.chipRow}>
                      {t.subjects.length === 0
                        ? <span style={s.none}>Aucune matière affectée</span>
                        : t.subjects.map(sub => <Chip key={sub.id} label={`${sub.name} (coef. ${sub.coefficient})`} />)
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ STUDENTS TAB ══════════ */}
        {activeTab === 'students' && (
          <div className="fade-in">
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Liste des étudiants</h2>
              <button style={s.btnAdd} onClick={() => { setShowStudentForm(v => !v); setSFormError(''); }}>
                <PlusIcon size={15} color="#fff" style={{ marginRight: 6 }} />
                Ajouter un étudiant
              </button>
            </div>

            {showStudentForm && (
              <div style={s.formCard} className="fade-in">
                <h3 style={s.formCardTitle}>Nouvel étudiant</h3>
                <ErrorBox msg={sFormError} />
                <form onSubmit={handleAddStudent}>
                  <div style={s.formRow}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Nom complet</label>
                      <input style={s.input} required value={sForm.name}
                        onChange={e => setSForm(p => ({ ...p, name: e.target.value }))} placeholder="Ahmed Tazi" />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Identifiant</label>
                      <input style={s.input} required value={sForm.username}
                        onChange={e => setSForm(p => ({ ...p, username: e.target.value }))} placeholder="etud4" />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Mot de passe</label>
                      <input style={s.input} required type="password" minLength={6} value={sForm.password}
                        onChange={e => setSForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 caractères" />
                    </div>
                  </div>
                  <div style={{ ...s.formRow, marginTop: 10 }}>
                    <div style={s.formGroup}>
                      <label style={s.label}>N° étudiant</label>
                      <input style={s.input} required value={sForm.student_number}
                        onChange={e => setSForm(p => ({ ...p, student_number: e.target.value }))} placeholder="2024004" />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Filière</label>
                      <input style={s.input} required value={sForm.filiere}
                        onChange={e => setSForm(p => ({ ...p, filiere: e.target.value }))} placeholder="Génie Informatique" />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Niveau</label>
                      <input style={s.input} required value={sForm.niveau}
                        onChange={e => setSForm(p => ({ ...p, niveau: e.target.value }))} placeholder="2ème Année" />
                    </div>
                  </div>
                  <div style={{ ...s.formActions, marginTop: 14 }}>
                    <button type="submit" disabled={sFormLoading} style={s.btnPrimary}>
                      {sFormLoading ? 'En cours…' : 'Créer'}
                    </button>
                    <button type="button" style={s.btnSecondary} onClick={() => setShowStudentForm(false)}>Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {loadingStudents ? <LoadingBox /> : students.length === 0 ? (
              <div style={s.emptyState}>Aucun étudiant enregistré.</div>
            ) : (
              <div style={s.table}>
                <div style={s.tableHeader}>
                  <span style={{ flex: 2 }}>Nom</span>
                  <span style={{ flex: 1 }}>Identifiant</span>
                  <span style={{ flex: 1 }}>N° Étudiant</span>
                  <span style={{ flex: 2 }}>Filière</span>
                  <span style={{ flex: 1 }}>Niveau</span>
                  <span style={{ flex: 1 }}>Classe</span>
                  <span style={{ width: 40 }} />
                </div>
                {students.map(st => (
                  <div key={st.id} style={s.tableRow}>
                    <span style={{ flex: 2, fontWeight: 600, color: '#1a237e' }}>{st.name}</span>
                    <span style={{ flex: 1, color: '#616161', fontFamily: 'monospace', fontSize: '0.83rem' }}>@{st.username}</span>
                    <span style={{ flex: 1, color: '#616161' }}>{st.student_number}</span>
                    <span style={{ flex: 2, color: '#424242' }}>{st.filiere}</span>
                    <span style={{ flex: 1, color: '#757575' }}>{st.niveau}</span>
                    <span style={{ flex: 1 }}>
                      {st.class_name
                        ? <Chip label={st.class_name} bg="#e8eaf6" color="#3949ab" />
                        : <span style={s.none}>—</span>}
                    </span>
                    <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}>
                      <IconBtn onClick={() => setDeleteTarget({ type: 'student', id: st.id, name: st.name })} title="Supprimer">
                        <TrashIcon size={15} color="#c62828" />
                      </IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ MODAL: Assign Teachers to Class ══ */}
      {assignTeachersTarget && (
        <Modal title={`Enseignants — ${assignTeachersTarget.name}`} onClose={() => setAssignTeachersTarget(null)}>
          <p style={s.modalSub}>Sélectionnez les enseignants affectés à cette classe.</p>
          <ErrorBox msg={assignTeachersError} />
          <div style={s.checkList}>
            {teachers.map(t => {
              const checked = assignTeachersSelected.includes(t.id);
              return (
                <label key={t.id} style={{ ...s.checkRow, ...(checked ? s.checkRowActive : {}) }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => setAssignTeachersSelected(p => checked ? p.filter(x => x !== t.id) : [...p, t.id])}
                    style={{ marginRight: 10 }} />
                  <span style={s.checkLabel}>{t.name}</span>
                  <span style={s.checkSub}>@{t.username}</span>
                </label>
              );
            })}
            {teachers.length === 0 && <p style={s.none}>Aucun enseignant disponible.</p>}
          </div>
          <div style={s.modalActions}>
            <button onClick={saveClassTeachers} disabled={assignTeachersLoading} style={s.btnPrimary}>
              {assignTeachersLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setAssignTeachersTarget(null)} style={s.btnSecondary}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Assign Students to Class ══ */}
      {assignStudentsTarget && (
        <Modal title={`Étudiants — ${assignStudentsTarget.name}`} onClose={() => setAssignStudentsTarget(null)}>
          <p style={s.modalSub}>
            Sélectionnez les étudiants à placer dans cette classe.
            Un étudiant déjà dans une autre classe sera déplacé automatiquement.
          </p>
          <ErrorBox msg={assignStudentsError} />
          <div style={s.checkList}>
            {students.map(st => {
              const checked = assignStudentsSelected.includes(st.id);
              const otherClass = st.class_id && st.class_id !== assignStudentsTarget.id ? st.class_name : null;
              return (
                <label key={st.id} style={{ ...s.checkRow, ...(checked ? s.checkRowActive : {}) }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => setAssignStudentsSelected(p => checked ? p.filter(x => x !== st.id) : [...p, st.id])}
                    style={{ marginRight: 10 }} />
                  <span style={s.checkLabel}>{st.name}</span>
                  <span style={s.checkSub}>{st.student_number}</span>
                  {otherClass && (
                    <span style={{ ...s.checkSub, marginLeft: 6, color: '#f57c00', fontStyle: 'italic' }}>
                      (actuellement: {otherClass})
                    </span>
                  )}
                </label>
              );
            })}
            {students.length === 0 && <p style={s.none}>Aucun étudiant disponible.</p>}
          </div>
          <div style={s.modalActions}>
            <button onClick={saveClassStudents} disabled={assignStudentsLoading} style={s.btnPrimary}>
              {assignStudentsLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setAssignStudentsTarget(null)} style={s.btnSecondary}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Assign Subjects to Teacher ══ */}
      {assignSubjectsTarget && (
        <Modal title={`Matières — ${assignSubjectsTarget.name}`} onClose={() => setAssignSubjectsTarget(null)}>
          <p style={s.modalSub}>Sélectionnez les matières que cet enseignant pourra noter.</p>
          <ErrorBox msg={assignSubjectsError} />
          <div style={s.checkList}>
            {allSubjects.map(sub => {
              const checked = assignSubjectsSelected.includes(sub.id);
              return (
                <label key={sub.id} style={{ ...s.checkRow, ...(checked ? s.checkRowActive : {}) }}>
                  <input type="checkbox" checked={checked}
                    onChange={() => setAssignSubjectsSelected(p => checked ? p.filter(x => x !== sub.id) : [...p, sub.id])}
                    style={{ marginRight: 10 }} />
                  <span style={s.checkLabel}>{sub.name}</span>
                  <span style={s.checkSub}>coef. {sub.coefficient}</span>
                </label>
              );
            })}
          </div>
          <div style={s.modalActions}>
            <button onClick={saveSubjects} disabled={assignSubjectsLoading} style={s.btnPrimary}>
              {assignSubjectsLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setAssignSubjectsTarget(null)} style={s.btnSecondary}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Confirm Delete ══ */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <TrashIcon size={48} color="#c62828" />
          </div>
          <h3 style={{ ...s.modalTitle, justifyContent: 'center' }}>Confirmer la suppression</h3>
          <p style={s.modalSub}>
            Supprimer <strong>{deleteTarget.name}</strong> ?
            {deleteTarget.type === 'student' && ' Toutes ses notes seront également supprimées.'}
            {deleteTarget.type === 'class'   && ' Les étudiants seront désaffectés mais pas supprimés.'}
            {' '}Cette action est irréversible.
          </p>
          <div style={s.modalActions}>
            <button onClick={confirmDelete} disabled={deleteLoading} style={s.btnDanger}>
              {deleteLoading ? 'Suppression…' : 'Oui, supprimer'}
            </button>
            <button onClick={() => setDeleteTarget(null)} style={s.btnSecondary}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reusable Modal wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal} className="fade-in">
        {title && <h3 style={s.modalTitle}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column' },
  content: { maxWidth: 1100, margin: '0 auto', width: '100%', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 24 },

  successBanner: {
    background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32',
    padding: '11px 24px', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 500,
  },

  pageHeader:   { marginBottom: 4 },
  pageTitle:    { fontSize: '1.55rem', fontWeight: 700, color: '#1a237e', marginBottom: 4 },
  pageSubtitle: { color: '#616161', fontSize: '0.9375rem' },

  tabs: { display: 'flex', gap: 8, background: '#fff', borderRadius: 10, padding: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', width: 'fit-content' },
  tab: {
    display: 'flex', alignItems: 'center', padding: '9px 18px',
    border: 'none', borderRadius: 7, background: 'transparent',
    color: '#616161', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
  },
  tabActive: { background: '#1a237e', color: '#fff', boxShadow: '0 2px 8px rgba(26,35,126,0.3)' },
  tabBadge:  { marginLeft: 8, background: '#f9a825', color: '#1a237e', borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700 },

  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle:  { fontSize: '1.05rem', fontWeight: 700, color: '#1a237e' },

  btnAdd: {
    display: 'flex', alignItems: 'center',
    background: 'linear-gradient(135deg, #1a237e, #283593)',
    color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 16px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(26,35,126,0.2)',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff',
    border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    background: '#fff', color: '#616161', border: '1.5px solid #e0e0e0',
    borderRadius: 7, padding: '10px 22px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  btnDanger: {
    background: '#c62828', color: '#fff', border: 'none',
    borderRadius: 7, padding: '10px 22px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },

  formCard:      { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 20, border: '1px solid #e8eaf6' },
  formCardTitle: { fontSize: '1rem', fontWeight: 700, color: '#1a237e', marginBottom: 14 },
  formRow:       { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' },
  formGroup:     { flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 5 },
  formActions:   { display: 'flex', gap: 8, alignItems: 'flex-end' },
  label:         { fontSize: '0.8125rem', fontWeight: 600, color: '#37474f' },
  input: {
    border: '1.5px solid #e0e0e0', borderRadius: 7, padding: '9px 12px',
    fontSize: '0.9rem', outline: 'none', color: '#212121', background: '#fafafa', width: '100%',
  },

  errorBox: {
    background: '#ffebee', border: '1px solid #ef9a9a', color: '#c62828',
    borderRadius: 7, padding: '9px 14px', marginBottom: 14, fontSize: '0.875rem', display: 'flex', alignItems: 'center',
  },

  loadingBox: { display: 'flex', justifyContent: 'center', padding: '48px 0' },
  emptyState: {
    background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center',
    color: '#9e9e9e', fontSize: '0.9375rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },

  // ── Class cards ──
  classGrid: { display: 'flex', flexDirection: 'column', gap: 14 },
  classCard: {
    background: '#fff', borderRadius: 12, padding: '18px 22px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8eaf6',
  },
  classCardHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 },
  classAvatar: {
    width: 44, height: 44, borderRadius: 10,
    background: 'linear-gradient(135deg, #1a237e, #3949ab)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
  },
  classCardName: { fontWeight: 700, color: '#1a237e', fontSize: '1rem', marginBottom: 2 },
  classCardMeta: { fontSize: '0.8rem', color: '#9e9e9e' },
  classSection:      { marginBottom: 10 },
  classSectionLabel: { fontSize: '0.78rem', fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 },

  // ── Teacher/Student cards ──
  cardList:   { display: 'flex', flexDirection: 'column', gap: 12 },
  card:       { background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8eaf6' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar:     { width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1a237e, #3949ab)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  cardName:   { fontWeight: 700, color: '#1a237e', fontSize: '0.95rem' },
  cardSub:    { fontSize: '0.8rem', color: '#757575', fontFamily: 'monospace' },

  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  none:    { fontSize: '0.8rem', color: '#bdbdbd', fontStyle: 'italic' },

  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' },

  // ── Students table ──
  table: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8eaf6' },
  tableHeader: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
    background: 'linear-gradient(135deg, #1a237e, #283593)', color: '#fff',
    fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px',
  },
  tableRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '13px 20px', borderBottom: '1px solid #f5f5f5', fontSize: '0.875rem',
  },

  // ── Modals ──
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:   { background: '#fff', borderRadius: 16, padding: '28px 28px', maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
  modalTitle:   { fontSize: '1.1rem', fontWeight: 700, color: '#1a237e', marginBottom: 8, display: 'flex', alignItems: 'center' },
  modalSub:     { color: '#616161', fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.6 },
  modalActions: { display: 'flex', gap: 10, marginTop: 20, flexShrink: 0 },

  checkList:      { display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320, paddingRight: 4 },
  checkRow:       { display: 'flex', alignItems: 'center', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  checkRowActive: { border: '1.5px solid #1a237e', background: '#e8eaf6' },
  checkLabel:     { flex: 1, fontWeight: 600, color: '#212121', fontSize: '0.9rem' },
  checkSub:       { fontSize: '0.8rem', color: '#9e9e9e' },
};
