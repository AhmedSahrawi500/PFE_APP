import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import logoSvg from '../assets/estl_logo.png';
import { WarningIcon, TeacherIcon, StudentIcon, UsersIcon } from '../components/Icons.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Erreur de connexion.');
        setLoading(false);
        return;
      }

      login(data.token, data.user);

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (role === 'teacher') {
      setUsername('prof1');
      setPassword('prof123');
    } else {
      setUsername('etud1');
      setPassword('etud123');
    }
    setError('');
  };

  return (
    <div style={styles.page}>
      {/* Background decoration */}
      <div style={styles.bgDecor} />

      <div style={styles.card} className="fade-in">
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src={logoSvg} alt="ESTL Logo" style={styles.logo} />
        </div>

        <div style={styles.cardBody}>
          <h1 style={styles.title}>Gestion des Notes</h1>
          <p style={styles.subtitle}>École Supérieure de Technologie de Laâyoune</p>
          <div style={styles.divider} />

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <WarningIcon size={16} color="#c62828" style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label} htmlFor="username">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Entrez votre identifiant"
                required
                autoComplete="username"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                required
                autoComplete="current-password"
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <span style={styles.btnSpinner} />
                  Connexion en cours...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={styles.demoBox}>
            <p style={styles.demoTitle}>Comptes de démonstration</p>
            <div style={styles.demoButtons}>
              <button style={styles.demoBtn} onClick={() => fillDemo('admin')}>
                <span style={styles.demoBtnIcon}>
                  <UsersIcon size={26} color="#1a237e" fill="none" />
                </span>
                <div>
                  <div style={styles.demoBtnLabel}>Admin</div>
                  <div style={styles.demoBtnCreds}>admin / admin123</div>
                </div>
              </button>
              <button style={styles.demoBtn} onClick={() => fillDemo('teacher')}>
                <span style={styles.demoBtnIcon}>
                  <TeacherIcon size={26} color="#1a237e" fill="none" />
                </span>
                <div>
                  <div style={styles.demoBtnLabel}>Enseignant</div>
                  <div style={styles.demoBtnCreds}>prof1 / prof123</div>
                </div>
              </button>
              <button style={styles.demoBtn} onClick={() => fillDemo('student')}>
                <span style={styles.demoBtnIcon}>
                  <StudentIcon size={26} color="#1a237e" fill="none" />
                </span>
                <div>
                  <div style={styles.demoBtnLabel}>Étudiant</div>
                  <div style={styles.demoBtnCreds}>etud1 / etud123</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <p style={styles.footer}>
        © 2024 ESTL Laâyoune — Système de Gestion des Notes
      </p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0d1357 0%, #1a237e 40%, #283593 70%, #1565c0 100%)',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgDecor: {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(249, 168, 37, 0.08)',
    pointerEvents: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: 460,
    overflow: 'hidden',
  },
  logoWrap: {
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 24px 20px',
    borderBottom: '4px solid #1a237e',
  },
  logo: {
    width: 280,
    height: 'auto',
  },
  cardBody: {
    padding: '28px 32px 32px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#616161',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 3,
    background: 'linear-gradient(90deg, #1a237e, #f9a825, #1a237e)',
    borderRadius: 2,
    marginBottom: 24,
    opacity: 0.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  errorBox: {
    background: '#ffebee',
    border: '1px solid #ef9a9a',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#c62828',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    fontSize: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#37474f',
  },
  input: {
    border: '2px solid #e0e0e0',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#212121',
    background: '#fafafa',
    width: '100%',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #1a237e, #283593)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '13px',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: 4,
    boxShadow: '0 4px 12px rgba(26, 35, 126, 0.3)',
    letterSpacing: '0.5px',
  },
  btnSpinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  demoBox: {
    marginTop: 24,
    background: '#f8f9ff',
    border: '1px solid #c5cae9',
    borderRadius: 10,
    padding: '16px',
  },
  demoTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#5c6bc0',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  demoButtons: {
    display: 'flex',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    border: '1.5px solid #c5cae9',
    borderRadius: 8,
    padding: '8px 10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    minWidth: 0,
  },
  demoBtnIcon: {
    fontSize: '1.5rem',
  },
  demoBtnLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#1a237e',
  },
  demoBtnCreds: {
    fontSize: '0.75rem',
    color: '#757575',
    fontFamily: 'monospace',
  },
  footer: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8125rem',
    textAlign: 'center',
  },
};
