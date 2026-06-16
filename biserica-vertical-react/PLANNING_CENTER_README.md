# 🎯 Planning Center - Biserica Vertical

Sistem complet de planificare pentru servicii biserică, tineret și evenimente speciale.

## ✅ Ce e implementat

### Backend (Node.js + Express + SQLite)
✅ **Database** - 13 tabele
- users, roles, user_roles
- services, service_items
- songs, song_files
- availability_polls, availability_votes
- assignments
- notifications
- service_templates, audit_log

✅ **Authentication** - JWT + bcrypt
- Login/logout
- Role-based permissions
- 21 roluri (10 departments + 11 admin)

✅ **API Endpoints** (40+)
- Services CRUD
- Voting system
- Assignments management
- Songs library
- Notifications
- Users & roles

### Frontend (React + TypeScript)
✅ **Pagini Planner**
- `/planner/login` - Autentificare
- `/planner/dashboard` - Dashboard personal
- `/planner/vote` - Votare disponibilitate
- `/planner/schedule` - Programul meu
- `/planner/calendar` - Calendar servicii
- `/planner/admin/create-service` - Creează serviciu (admin)

✅ **Componente**
- `PlannerNav` - Navigation bar
- `api.ts` - API utilities cu JWT

## 🚀 Cum să folosești

### 1. Pornește Backend
```bash
cd backend
npm start
```
Backend rulează pe: **http://localhost:3000**

### 2. Pornește Frontend
```bash
cd biserica-vertical-react
npm run dev
```
Frontend rulează pe: **http://localhost:5174**

### 3. Accesează Planning Center
```
http://localhost:5174/planner/login
```

## 🔐 Credențiale de test

### Admin (acces complet):
```
Username: admin
Password: Admin123!
Roles: admin_global
```

### Test Users:
```
maria.popescu / password123 (trupa)
ion.georgescu / password123 (trupa, sound)
ana.dumitrescu / password123 (trupa, tineret)
paul.radu / password123 (sound, admin_sound)
```

## 📋 Flow principal

### 1. Admin creează serviciu
- Login ca admin
- Dashboard → Create Service
- Selectează tip (Biserică/Tineret/Special)
- Completează detalii

### 2. Admin deschide votare
- Service View → "Deschide votare"
- Selectează roluri necesare (trupa: 5, sound: 1, etc.)
- Setează deadline
- Sistem trimite notificări automat

### 3. Membrii votează
- Primesc notificare
- Dashboard → "Voturi necesare"
- Selectează: ✅ Disponibil / ⚠️ Poate / ❌ Indisponibil
- Adaugă note opționale

### 4. Admin vede rezultate
- Service Votes Dashboard
- Vede cine e disponibil
- Atribuie roluri (create assignments)

### 5. Membri confirmă
- Primesc notificare
- Dashboard → "Programări viitoare"
- Confirmă sau Refuză cu motiv

## 🎨 Roluri & Permissions

### Departments (10):
1. **trupa** - Trupă Laudă
2. **trupa_tabara** - Trupă Tabără
3. **media** - Media/Video
4. **cafea** - Cafenea/Ospitalitate
5. **tineret** - Tineret UNITED
6. **grupa_copii** - Grupă Copii
7. **bun_venit** - Bun venit Biserică
8. **bun_venit_tineret** - Bun venit Tineret
9. **special** - Evenimente Speciale
10. **sound** - Sound/Tehnic

### Admin (11):
11-20. **admin_[departament]** - Admin pentru fiecare departament
21. **admin_global** - Super Admin (acces complet)

## 📡 API Endpoints principale

```bash
# Auth
POST   /api/auth/login
GET    /api/auth/me

# Services
GET    /api/services
POST   /api/services
GET    /api/services/:id
PUT    /api/services/:id
DELETE /api/services/:id

# Voting
POST   /api/services/:id/open-voting
GET    /api/votes/pending
POST   /api/votes
GET    /api/services/:id/votes

# Assignments
GET    /api/assignments/my-assignments
POST   /api/assignments
POST   /api/assignments/:id/confirm
POST   /api/assignments/:id/decline

# Notifications
GET    /api/notifications
GET    /api/notifications/unread-count
PUT    /api/notifications/:id/read

# Songs
GET    /api/songs
POST   /api/songs
GET    /api/songs/:id

# Users (admin only)
GET    /api/users
POST   /api/users
POST   /api/users/:id/roles
```

## 📊 Database Info

**Fișier:** `backend/database.db`

**Reset database:**
```bash
cd backend
rm database.db
npm run db:init
npm run db:seed
```

## 🔧 Next Steps (ce mai lipsește)

### TO DO:
- [ ] Admin: Vote Results Dashboard
- [ ] Admin: User Management UI
- [ ] Songs Library UI
- [ ] Service Items (ordine liturgică)
- [ ] File uploads (song files)
- [ ] Service Templates
- [ ] Reports & Analytics
- [ ] Email notifications (Nodemailer)
- [ ] Reminders cron job

### Prioritate pentru funcționalitate minimă:
1. ✅ Login/Dashboard/Vote - **DONE**
2. ✅ Create Service - **DONE**
3. 🚧 Vote Results Dashboard - **TODO**
4. 🚧 Assign Volunteers - **TODO**

## 📝 Notes

- Toate paginile sunt în React (nu HTML)
- API rulează pe port 3000
- Frontend pe port 5174
- JWT tokens expire în 7 zile
- Passwords hashed cu bcrypt (10 rounds)

## 🐛 Troubleshooting

### Backend nu pornește:
```bash
cd backend
npm install
npm run db:init
npm run db:seed
npm start
```

### Frontend erori:
```bash
cd biserica-vertical-react
npm install
npm run dev
```

### Can't login:
- Check că backend rulează (http://localhost:3000/api/health)
- Verifică credentials în console backend
- Clear localStorage și încearcă din nou

---

**Status:** Backend complet funcțional ✅ | Frontend parțial (login/dashboard/vote) ✅

**Ready for testing!** 🚀

