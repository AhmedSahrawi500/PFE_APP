import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App.jsx';
import Navbar from '../components/Navbar.jsx';
import GradeTable, { calcWeightedAverage, getMention } from '../components/GradeTable.jsx';
import { DocumentIcon, WarningIcon } from '../components/Icons.jsx';

const SEMESTRES = ['S1', 'S2', 'S3', 'S4'];

export default function StudentDashboard() {
  const { user, authFetch } = useAuth();

  const [grades, setGrades]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeSemestre, setActiveSemestre] = useState('S1');

  const fetchGrades = useCallback(async () => {
    try {
      const res = await authFetch(`/api/grades/student/${user.student_id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erreur lors du chargement des notes.');
      } else {
        setGrades(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, user?.student_id]);

  useEffect(() => {
    if (!user?.student_id) {
      setError("Profil étudiant introuvable. Contactez l'administration.");
      setLoading(false);
      return;
    }
    fetchGrades();
  }, [fetchGrades, user?.student_id]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const gradesForSemestre = grades.filter(g => g.semestre === activeSemestre);

  const allGradesAvg = calcWeightedAverage(grades);
  const overallMention = allGradesAvg ? getMention(parseFloat(allGradesAvg)) : null;

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        {/* ── Student Profile Header ─────────────────────────────────────── */}
        <div style={styles.profileCard} className="fade-in">
          <div style={styles.profileLeft}>
            <div style={styles.profileAvatar}>
              {user?.name?.[0] || '?'}
            </div>
            <div>
              <h1 style={styles.profileName}>{user?.name}</h1>
              <div style={styles.profileTags}>
                <span style={styles.tag}>
                  <span style={styles.tagDot} />
                  N° {user?.student_number}
                </span>
                <span style={styles.tag}>
                  <span style={styles.tagDot} />
                  {user?.filiere}
                </span>
                <span style={styles.tag}>
                  <span style={styles.tagDot} />
                  {user?.niveau}
                </span>
              </div>
            </div>
          </div>
          <div style={styles.profileRight}>
            {overallMention && allGradesAvg && (
              <div style={styles.overallBadge}>
                <span style={styles.overallLabel}>Mention Générale</span>
                <span className={`mention ${overallMention.cls}`} style={{ fontSize: '1rem', padding: '6px 18px' }}>
                  {overallMention.label}
                </span>
              </div>
            )}
          </div>
        </div>

{/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div style={styles.errorBox}>
            <WarningIcon size={16} color="#c62828" style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────────────── */}
        {!loading && !error && (
          <div style={styles.gradesCard} className="fade-in">
            <div style={styles.gradesHeader}>
              <h2 style={styles.gradesTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginRight: 10, verticalAlign: 'middle' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Relevé de Notes
              </h2>

              {/* Semestre tabs */}
              <div style={styles.tabs}>
                {SEMESTRES.map(s => {
                  const count = grades.filter(g => g.semestre === s).length;
                  return (
                    <button
                      key={s}
                      style={{
                        ...styles.tab,
                        ...(activeSemestre === s ? styles.tabActive : {}),
                      }}
                      onClick={() => setActiveSemestre(s)}
                    >
                      Semestre {s}
                      {count > 0 && (
                        <span style={{
                          ...styles.tabBadge,
                          background: activeSemestre === s ? '#f9a825' : '#e8eaf6',
                          color: activeSemestre === s ? '#1a237e' : '#3949ab',
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div style={styles.loadingBox}><div className="spinner" /></div>
            ) : (
              <div>
                {gradesForSemestre.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}><DocumentIcon size={56} color="#c5cae9" /></div>
                    <h3 style={styles.emptyTitle}>Aucune note disponible</h3>
                    <p style={styles.emptyText}>
                      Les notes du {activeSemestre} n'ont pas encore été saisies par votre enseignant.
                    </p>
                  </div>
                ) : (
                  <GradeTable
                    grades={gradesForSemestre}
                    isTeacher={false}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {loading && !error && (
          <div style={styles.loadingBox}><div className="spinner" /></div>
        )}

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <div style={styles.footerNote}>
          <p>
            Pour toute réclamation concernant vos notes, veuillez contacter votre enseignant ou la scolarité.
          </p>
          <p style={{ marginTop: 4, opacity: 0.7 }}>
            École Supérieure de Technologie de Laâyoune — Année Universitaire 2024/2025
          </p>
        </div>
      </div>
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
  container: {
    maxWidth: 960,
    margin: '0 auto',
    width: '100%',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  profileCard: {
    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    borderRadius: 16,
    padding: '24px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    boxShadow: '0 4px 20px rgba(26,35,126,0.25)',
  },
  profileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'rgba(249,168,37,0.2)',
    border: '3px solid #f9a825',
    color: '#f9a825',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.6rem',
    flexShrink: 0,
  },
  profileName: {
    color: '#fff',
    fontSize: '1.4rem',
    fontWeight: 700,
    marginBottom: 8,
  },
  profileTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#f9a825',
    flexShrink: 0,
  },
  profileRight: {
    textAlign: 'right',
  },
  overallBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  overallLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  // ── Stats ──
  errorBox: {
    background: '#ffebee',
    border: '1px solid #ef9a9a',
    color: '#c62828',
    borderRadius: 8,
    padding: '14px 18px',
    fontSize: '0.9375rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  // ── Grades card ──
  gradesCard: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    overflow: 'hidden',
    border: '1px solid #e0e0e0',
  },
  gradesHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  gradesTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#1a237e',
    display: 'flex',
    alignItems: 'center',
  },
  tabs: {
    display: 'flex',
    gap: 6,
    background: '#f5f5f5',
    borderRadius: 8,
    padding: '4px',
  },
  tab: {
    padding: '7px 18px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: '#616161',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#1a237e',
    color: '#fff',
    boxShadow: '0 2px 6px rgba(26,35,126,0.25)',
  },
  tabBadge: {
    borderRadius: 20,
    padding: '1px 7px',
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
  },
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '56px 24px',
  },
  emptyIcon: {
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9e9e9e',
    fontSize: '0.9375rem',
    maxWidth: 360,
    margin: '0 auto',
  },
  footerNote: {
    textAlign: 'center',
    color: '#9e9e9e',
    fontSize: '0.8125rem',
    padding: '8px 0 16px',
  },
};
