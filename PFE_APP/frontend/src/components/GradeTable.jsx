import React from 'react';
import { EditIcon, TrashIcon, DocumentIcon } from './Icons.jsx';

export function getMention(note) {
  if (note >= 16) return { label: 'Excellent', cls: 'mention-excellent' };
  if (note >= 14) return { label: 'Très Bien', cls: 'mention-tres-bien' };
  if (note >= 12) return { label: 'Bien', cls: 'mention-bien' };
  if (note >= 10) return { label: 'Assez Bien', cls: 'mention-assez-bien' };
  if (note >= 8)  return { label: 'Passable', cls: 'mention-passable' };
  return { label: 'Insuffisant', cls: 'mention-insuffisant' };
}

export function calcWeightedAverage(grades) {
  if (!grades || grades.length === 0) return null;
  const totalCoef = grades.reduce((sum, g) => sum + g.coefficient, 0);
  if (totalCoef === 0) return null;
  const totalWeighted = grades.reduce((sum, g) => sum + g.note * g.coefficient, 0);
  return (totalWeighted / totalCoef).toFixed(2);
}

/**
 * GradeTable renders a table of grades.
 *
 * Props:
 *   grades       – array of grade objects
 *   isTeacher    – boolean; if true, show action buttons
 *   onEdit       – (grade) => void
 *   onDelete     – (gradeId) => void
 *   editingId    – id of grade currently being edited (highlights row)
 */
export default function GradeTable({ grades, isTeacher, onEdit, onDelete, editingId }) {
  const average = calcWeightedAverage(grades);

  if (!grades || grades.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}><DocumentIcon size={52} color="#c5cae9" /></div>
        <p style={styles.emptyText}>Aucune note enregistrée pour ce semestre.</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Matière</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Coef.</th>
              <th style={{ width: '18%', textAlign: 'center' }}>Note /20</th>
              <th style={{ width: '18%', textAlign: 'center' }}>Mention</th>
              {isTeacher && <th style={{ width: '17%', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => {
              const mention = getMention(g.note);
              const isEditing = editingId === g.id;
              return (
                <tr
                  key={g.id}
                  style={isEditing ? { background: '#fffde7' } : undefined}
                >
                  <td>
                    <span style={styles.subjectName}>{g.subject_name}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={styles.coefBadge}>{g.coefficient}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      ...styles.noteBadge,
                      background: g.note >= 10 ? '#e8f5e9' : '#ffebee',
                      color: g.note >= 10 ? '#2e7d32' : '#c62828',
                    }}>
                      {Number(g.note).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`mention ${mention.cls}`}>
                      {mention.label}
                    </span>
                  </td>
                  {isTeacher && (
                    <td style={{ textAlign: 'center' }}>
                      <div style={styles.actionBtns}>
                        <button
                          style={styles.editBtn}
                          onClick={() => onEdit && onEdit(g)}
                          title="Modifier"
                        >
                          <EditIcon size={15} color="#1565c0" />
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => onDelete && onDelete(g.id)}
                          title="Supprimer"
                        >
                          <TrashIcon size={15} color="#c62828" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Weighted average */}
      {average !== null && (
        <div style={styles.avgRow}>
          <span style={styles.avgLabel}>Moyenne pondérée</span>
          <span style={{
            ...styles.avgValue,
            color: parseFloat(average) >= 10 ? '#2e7d32' : '#c62828',
          }}>
            {average} / 20
          </span>
          <span className={`mention ${getMention(parseFloat(average)).cls}`}>
            {getMention(parseFloat(average)).label}
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#9e9e9e',
    background: '#fff',
    borderRadius: 10,
    border: '2px dashed #e0e0e0',
  },
  emptyIcon: {
    marginBottom: 12,
    display: 'flex',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: 500,
  },
  subjectName: {
    fontWeight: 600,
    color: '#1a237e',
  },
  coefBadge: {
    display: 'inline-block',
    background: '#e8eaf6',
    color: '#3949ab',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  noteBadge: {
    display: 'inline-block',
    borderRadius: 20,
    padding: '3px 12px',
    fontWeight: 700,
    fontSize: '0.9375rem',
  },
  actionBtns: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
  },
  editBtn: {
    background: '#e3f2fd',
    border: '1px solid #90caf9',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  deleteBtn: {
    background: '#ffebee',
    border: '1px solid #ef9a9a',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  avgRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '14px 20px',
    background: '#f8f9ff',
    borderTop: '2px solid #c5cae9',
  },
  avgLabel: {
    fontWeight: 700,
    color: '#1a237e',
    fontSize: '0.9375rem',
    flex: 1,
  },
  avgValue: {
    fontWeight: 700,
    fontSize: '1.125rem',
  },
};
