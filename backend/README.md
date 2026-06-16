# Tutorial: Pornirea Serverului Backend

Ghid complet pentru configurarea si pornirea serverului backend al aplicatiei CEAS Planning Center.

## Cuprins
- [Prerequisite](#prerequisite)
- [Instalare](#instalare)
- [Configurare PostgreSQL](#configurare-postgresql)
- [Pornire Server](#pornire-server)
- [Verificare Functionare](#verificare-functionare)
- [Troubleshooting](#troubleshooting)

---

## Prerequisite

Inainte de a incepe, asigura-te ca ai instalate:

- **Node.js** (versiunea 18 sau mai mare)
  - Verifica versiunea: `node --version`
  - Descarca de la: https://nodejs.org/

- **npm** (vine instalat cu Node.js)
  - Verifica versiunea: `npm --version`

- **PostgreSQL** (versiunea 14 sau mai mare)
  - Verifica versiunea: `psql --version`
  - Descarca de la: https://www.postgresql.org/download/

---

## Instalare

### Pasul 1: Navigheaza in folderul backend

```bash
cd backend
```

### Pasul 2: Instaleaza dependentele

```bash
npm install
```

Aceasta va instala toate pachetele necesare din [package.json](package.json):
- Express.js (framework server)
- PostgreSQL client (pg)
- JWT pentru autentificare
- CORS, Helmet pentru securitate
- Multer pentru upload fisiere
- si altele

---

## Configurare PostgreSQL

### Pasul 3: Creaza baza de date PostgreSQL

1. **Conecteaza-te la PostgreSQL**:
   ```bash
   sudo -u postgres psql
   ```

2. **Creaza baza de date si utilizatorul**:
   ```sql
   CREATE DATABASE ceas_planning;
   CREATE USER ceas_user WITH PASSWORD 'parola_puternica';
   GRANT ALL PRIVILEGES ON DATABASE ceas_planning TO ceas_user;
   \q
   ```

### Pasul 4: Configureaza fisierul .env

Creaza fisierul `.env` in folderul backend cu urmatorul continut:

```env
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ceas_planning
DB_USER=ceas_user
DB_PASSWORD=parola_puternica

# IMPORTANT: Genereaza un secret puternic pentru JWT
JWT_SECRET=your_super_secret_jwt_key_here

# CORS - originile permise
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Email Configuration (optional)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=contact@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=CEAS Planning Center

# Frontend URL (pentru link-uri in emailuri)
FRONTEND_URL=http://localhost:5174
```

**Genereaza un JWT_SECRET puternic** (recomandat):
```bash
openssl rand -base64 64
```

### Pasul 5: Initializeaza baza de date

```bash
# Creaza tabelele in PostgreSQL
npm run db:init

# Populeaza cu date de test (optional)
npm run db:seed

# Importa melodiile (optional)
npm run db:import-songs
```

---

## Pornire Server

Ai doua optiuni pentru a porni serverul:

### Optiunea 1: Mod Development (recomandat pentru dezvoltare)

```bash
npm run dev
```

**Avantaje:**
- Auto-restart cand modifici fisiere
- Perfect pentru development
- Foloseste `nodemon`

### Optiunea 2: Mod Production

```bash
npm start
```

**Avantaje:**
- Rulare standard cu Node.js
- Fara auto-restart
- Pentru productie

---

## Verificare Functionare

### 1. Verifica output-ul in terminal

Dupa pornire, ar trebui sa vezi:

```
📂 Connecting to PostgreSQL database...
✅ Connected to PostgreSQL database

🚀 CEAS Planning Center Backend
================================
✅ Server running on http://localhost:3000
📊 Environment: development
🔐 JWT Secret: Configured

📡 Available endpoints:
   POST   /api/auth/login
   GET    /api/auth/me
   GET    /api/services
   POST   /api/votes
   GET    /api/notifications

🔗 API Documentation: http://localhost:3000/api/health
```

### 2. Testeaza endpoint-ul de health check

Deschide browser-ul sau foloseste curl:

```bash
curl http://localhost:3000/api/health
```

Raspuns asteptat:
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T...",
  "environment": "development"
}
```

### 3. Testeaza in browser

Viziteaza: http://localhost:3000/api/health

---

## Troubleshooting

### Problema 1: Port deja in uz

**Eroare:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutie:**
1. Schimba portul in .env:
   ```env
   PORT=3001
   ```
2. SAU opreste procesul care foloseste portul 3000:
   ```bash
   # Pe macOS/Linux
   lsof -ti:3000 | xargs kill

   # Pe Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

### Problema 2: Module not found

**Eroare:**
```
Error: Cannot find module 'express'
```

**Solutie:**
```bash
# Sterge node_modules si reinstaleaza
rm -rf node_modules package-lock.json
npm install
```

### Problema 3: PostgreSQL connection refused

**Eroare:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutie:**
1. Verifica ca PostgreSQL ruleaza:
   ```bash
   sudo systemctl status postgresql
   ```
2. Porneste PostgreSQL daca nu ruleaza:
   ```bash
   sudo systemctl start postgresql
   ```

### Problema 4: Authentication failed

**Eroare:**
```
Error: password authentication failed for user
```

**Solutie:**
1. Verifica credentialele din .env
2. Verifica configurarea pg_hba.conf
3. Reseteaza parola utilizatorului PostgreSQL:
   ```sql
   ALTER USER ceas_user WITH PASSWORD 'noua_parola';
   ```

### Problema 5: CORS errors in frontend

**Eroare in browser:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutie:**
Verifica CORS_ORIGIN in .env sa includa URL-ul frontend-ului:
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

---

## Comenzi Utile

| Comanda | Descriere |
|---------|-----------|
| `npm start` | Porneste serverul in mod production |
| `npm run dev` | Porneste serverul in mod development cu nodemon |
| `npm run db:init` | Initializeaza structura bazei de date PostgreSQL |
| `npm run db:seed` | Populeaza baza de date cu date de test |
| `npm run db:import-songs` | Importa melodiile |

---

## Structura Proiectului

```
backend/
├── config/          # Configuratii (database PostgreSQL)
├── controllers/     # Logica business
├── cron/           # Task-uri programate
├── middleware/     # Middleware Express
├── routes/         # Definirea rutelor API
├── scripts/        # Scripturi pentru DB
├── utils/          # Functii helper
├── .env            # Configurare (NU commita!)
└── server.js       # Entry point
```

---

## Endpoints Disponibile

### Autentificare
- `POST /api/auth/login` - Login utilizator
- `GET /api/auth/me` - Info utilizator curent

### Servicii
- `GET /api/services` - Lista servicii
- `POST /api/services` - Creare serviciu nou
- `PUT /api/services/:id` - Update serviciu

### Voting
- `POST /api/votes` - Voteaza pentru disponibilitate
- `GET /api/votes` - Voturi utilizator

### Notificari
- `GET /api/notifications` - Lista notificari
- `PUT /api/notifications/:id` - Marcheaza ca citita

### Utilizatori
- `GET /api/users` - Lista utilizatori
- `POST /api/users` - Creare utilizator nou

### Cantari
- `GET /api/songs` - Lista cantari
- `POST /api/songs` - Adauga cantare noua

---

## Securitate

Serverul include:
- 🔒 **Helmet** - Security headers
- 🔑 **JWT** - Autentificare securizata
- 🛡️ **CORS** - Cross-Origin protection
- 📊 **Rate limiting** - Protectie impotriva spam
- ✅ **Input validation** - Validare date
- 🔐 **Bcrypt** - Hash-uire parole

---

## License

ISC
