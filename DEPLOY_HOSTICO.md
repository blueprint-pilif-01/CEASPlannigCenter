# Ghid Deploy pe Hostico.ro (cPanel)

## Cerinte
- Plan hosting cu **Node.js** suport (minim plan Business)
- **PostgreSQL** database (inclus in planurile mari sau addon)
- Domeniu configurat

---

## PASUL 1: Pregatire Fisiere

### 1.1 Build Frontend
```bash
cd biserica-vertical-react (frontend)
npm run build
```
Rezultatul: folder `dist/` cu toate fisierele statice.

### 1.2 Pregatire Backend
Copiaza tot folderul `backend/` FARA:
- `node_modules/` (se instaleaza pe server)
- `.env` (se creaza separat pe server)
- `database.db*` (SQLite vechi - nu mai e folosit)

---

## PASUL 2: Configurare PostgreSQL pe Hostico

### 2.1 Creaza Database
1. Login in **cPanel**
2. Mergi la **PostgreSQL Databases**
3. Creaza database nou: `ceas_planning`
4. Creaza user nou: `ceas_user` cu parola puternica
5. Adauga user-ul la database cu **ALL PRIVILEGES**

### 2.2 Noteaza datele:
```
Host: localhost (sau IP-ul dat de Hostico)
Port: 5432
Database: prefixul_ceas_planning
User: prefixul_ceas_user
Password: parola_ta
```

---

## PASUL 3: Upload Fisiere

### 3.1 Folosind File Manager sau FTP

**Pentru Backend (API):**
```
/home/username/
  └── api.domeniu.ro/    (sau subdomain)
      ├── server.js
      ├── package.json
      ├── config/
      ├── controllers/
      ├── middleware/
      ├── routes/
      ├── utils/
      ├── scripts/
      └── uploads/
```

**Pentru Frontend:**
```
/home/username/
  └── public_html/       (sau domeniul principal)
      ├── index.html
      ├── .htaccess
      └── assets/
          └── (fisierele JS/CSS)
```

---

## PASUL 4: Configurare Backend

### 4.1 Creaza fisierul `.env` pe server
In folderul backend, creaza `.env`:

```env
# PRODUCTION ENVIRONMENT
PORT=3000
NODE_ENV=production

# Database (PostgreSQL) - Datele de la Hostico
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prefixul_ceas_planning
DB_USER=prefixul_ceas_user
DB_PASSWORD=PAROLA_TA_PUTERNICA

# JWT - SCHIMBA CU UN STRING RANDOM!
JWT_SECRET=GENEREAZA_UN_STRING_RANDOM_DE_64_CARACTERE_AICI
JWT_EXPIRES_IN=7d

# CORS - Domeniul tau
CORS_ORIGIN=https://domeniul-tau.ro,https://www.domeniul-tau.ro
FRONTEND_URL=https://domeniul-tau.ro

# Email (optional)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=email@gmail.com
EMAIL_PASSWORD=app_password_gmail
EMAIL_FROM_NAME=CEAS Planning
EMAIL_FROM_ADDRESS=email@gmail.com

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# Security
BCRYPT_ROUNDS=12
```

### 4.2 Configureaza Node.js App in cPanel

1. Mergi la **Setup Node.js App** in cPanel
2. Click **Create Application**
3. Seteaza:
   - **Node.js version**: 18.x sau mai nou
   - **Application mode**: Production
   - **Application root**: calea catre backend (ex: `api.domeniu.ro`)
   - **Application URL**: subdomeniul (ex: `api.domeniu.ro`)
   - **Application startup file**: `server.js`

4. Click **Create**
5. In terminal-ul cPanel sau SSH, ruleaza:
```bash
cd ~/api.domeniu.ro
npm install --production
```

### 4.3 Initializeaza Database
In terminal cPanel/SSH:
```bash
cd ~/api.domeniu.ro
node scripts/init-postgresql.js
node scripts/init-contracts-tables.js
node scripts/seed-postgresql.js
```

---

## PASUL 5: Configurare Frontend

### 5.1 Actualizeaza API URL
Inainte de build, in `biserica-vertical-react (frontend)/src/utils/api.ts`, schimba:
```typescript
export const API_BASE_URL = 'https://api.domeniul-tau.ro';
```

Apoi rebuild:
```bash
npm run build
```

### 5.2 Upload dist/ in public_html
Copiaza continutul din `dist/` in `public_html/` sau domeniul principal.

### 5.3 Verifica .htaccess
Fisierul `.htaccess` din `dist/` trebuie sa fie prezent pentru ca rutele React sa functioneze.

---

## PASUL 6: Configurare DNS/Subdomain

### Pentru API pe subdomain:
1. In cPanel, mergi la **Subdomains**
2. Creaza: `api.domeniul-tau.ro`
3. Document Root: folderul unde ai pus backend-ul

### Pentru SSL:
1. Mergi la **SSL/TLS** sau **Let's Encrypt**
2. Genereaza certificate pentru ambele domenii

---

## PASUL 7: Testare

### 7.1 Testeaza Backend:
```
https://api.domeniul-tau.ro/api/health
```
Trebuie sa returneze: `{"status":"ok",...}`

### 7.2 Testeaza Frontend:
```
https://domeniul-tau.ro
```
Trebuie sa te redirectioneze la login.

### 7.3 Testeaza Login:
- Username: `Admin`
- Password: `CeasPlanning1234!`

---

## Troubleshooting

### Eroare 503 / App nu porneste
- Verifica logs in cPanel > Setup Node.js App > View Logs
- Verifica ca `.env` exista si e corect
- Verifica ca `npm install` a rulat

### Eroare CORS
- Verifica `CORS_ORIGIN` in `.env` include domeniul frontend

### Eroare Database
- Verifica credentialele PostgreSQL in `.env`
- Verifica ca user-ul are permisiuni pe database

### Frontend nu incarca
- Verifica ca `.htaccess` exista in public_html
- Verifica ca `mod_rewrite` e activat (cere la Hostico daca nu merge)

### API calls fail
- Verifica `API_BASE_URL` in frontend
- Verifica ca subdomeniul API e configurat corect

---

## Structura Finala pe Server

```
/home/username/
├── api.domeniu.ro/           # Backend
│   ├── .env                  # Configurari production
│   ├── server.js
│   ├── package.json
│   ├── node_modules/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── scripts/
│   └── uploads/
│
└── public_html/              # Frontend
    ├── index.html
    ├── .htaccess
    └── assets/
        ├── index.xxx.js
        └── index.xxx.css
```

---

## Credentiale Default

- **Admin Username**: `Admin`
- **Admin Password**: `CeasPlanning1234!`

**IMPORTANT**: Schimba parola dupa primul login!

---

## Contact Hostico

Daca ai probleme cu:
- Node.js support
- PostgreSQL setup
- SSL certificates

Contacteaza support-ul Hostico.ro - sunt foarte responsivi.
