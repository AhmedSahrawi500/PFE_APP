# ESTL — Système de Gestion des Notes

Application web full-stack pour la gestion des notes étudiantes à l'École Supérieure de Technologie de Laâyoune.

## Démarrage rapide

### Prérequis
- Node.js **v22.5 ou supérieur** (v24 recommandé — SQLite natif intégré)
- npm

### 1. Backend (port 5000)

```bash
cd backend
npm install
node server.js
```

La base de données SQLite (`estl_grades.db`) est créée et peuplée automatiquement au premier démarrage.

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Ouvrez **http://localhost:5173** dans votre navigateur.

---

## Comptes de démonstration

| Rôle       | Identifiant | Mot de passe |
|------------|-------------|--------------|
| Enseignant | `prof1`     | `prof123`    |
| Étudiant 1 | `etud1`     | `etud123`    |
| Étudiant 2 | `etud2`     | `etud123`    |
| Étudiant 3 | `etud3`     | `etud123`    |

---

## Structure du projet

```
khaled_pfe/
├── backend/
│   ├── server.js          # Point d'entrée Express
│   ├── db.js              # SQLite (node:sqlite natif) + seed
│   ├── .env               # JWT_SECRET, PORT
│   └── routes/
│       ├── auth.js        # POST /api/auth/login
│       ├── students.js    # GET /api/students (enseignant)
│       └── grades.js      # CRUD notes + GET /api/grades/subjects
└── frontend/
    ├── vite.config.js     # Proxy /api → localhost:5000
    └── src/
        ├── App.jsx            # Router + AuthContext
        ├── assets/logo.svg    # Logo ESTL SVG
        ├── pages/
        │   ├── Login.jsx
        │   ├── TeacherDashboard.jsx
        │   └── StudentDashboard.jsx
        └── components/
            ├── Navbar.jsx
            └── GradeTable.jsx
```

## API

| Méthode | Endpoint                        | Rôle       | Description                  |
|---------|---------------------------------|------------|------------------------------|
| POST    | `/api/auth/login`               | Tous       | Connexion, retourne JWT      |
| GET     | `/api/students`                 | Enseignant | Liste de tous les étudiants  |
| GET     | `/api/grades/subjects`          | Tous       | Liste des matières           |
| GET     | `/api/grades/student/:id`       | Tous*      | Notes d'un étudiant          |
| POST    | `/api/grades`                   | Enseignant | Ajouter une note             |
| PUT     | `/api/grades/:id`               | Enseignant | Modifier une note            |
| DELETE  | `/api/grades/:id`               | Enseignant | Supprimer une note           |

\* Un étudiant peut seulement accéder à ses propres notes.

## Données initiales

- **5 matières** : Mathématiques (×3), Informatique (×4), Physique (×2), Anglais (×1), Français (×1)
- **3 étudiants** : 2 en Génie Informatique 2ème Année, 1 en Génie Électrique 1ère Année
- **Notes pré-saisies** pour etud1 (S1 complet + S2 partiel) et etud2 (S1 partiel)
- **etud3** n'a aucune note — parfait pour tester l'ajout depuis le tableau de bord enseignant
