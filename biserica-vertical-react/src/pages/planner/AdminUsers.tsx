import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import { apiCall, isAuthenticated, getUser } from '../../utils/api';

interface User {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  roles: Array<{ id: number; name: string; display_name: string; category: string }>;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  category: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [editedData, setEditedData] = useState({ full_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: ''
  });
  const [newUserRoles, setNewUserRoles] = useState<number[]>([]);
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  useEffect(() => {
    // Removed admin role check - allow direct access
    loadData();
  }, [navigate, user]);

  const loadData = async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        apiCall('/users'),
        apiCall('/users/roles/all'),
      ]);

      setUsers(usersData.users || []);
      setAllRoles(rolesData.roles || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setSelectedRoles(user.roles.map((r) => r.id));
    setEditedData({
      full_name: user.full_name,
      email: user.email || '',
      phone: user.phone || ''
    });
    setShowModal(true);
  };

  const saveUserData = async () => {
    if (!editingUser) return;

    if (!editedData.full_name.trim()) {
      alert('Numele complet este obligatoriu');
      return;
    }

    try {
      // Update user personal data
      await apiCall(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editedData.full_name,
          email: editedData.email || null,
          phone: editedData.phone || null
        }),
      });

      // Update roles
      await apiCall(`/users/${editingUser.id}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleIds: selectedRoles }),
      });

      alert('✅ Date utilizator actualizate!');
      setShowModal(false);
      loadData();
    } catch (error) {
      alert('❌ Eroare la actualizare');
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert('Completează câmpurile obligatorii: Username, Parolă și Nume complet');
      return;
    }

    if (newUser.password.length < 6) {
      alert('Parola trebuie să aibă cel puțin 6 caractere');
      return;
    }

    if (newUserRoles.length === 0) {
      alert('Selectează cel puțin un rol pentru utilizator');
      return;
    }

    try {
      // Create user
      const response = await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      // Assign roles to new user
      if (response.user?.id && newUserRoles.length > 0) {
        await apiCall(`/users/${response.user.id}/roles`, {
          method: 'POST',
          body: JSON.stringify({ roleIds: newUserRoles }),
        });
      }

      if (sendEmailOnCreate && newUser.email) {
        try {
          await apiCall('/email/send-credentials', {
            method: 'POST',
            body: JSON.stringify({ userIds: [response.user.id] }),
          });
          alert('Utilizator creat cu succes! Credentialele au fost trimise pe email.');
        } catch (emailErr) {
          console.error('Error sending credentials:', emailErr);
          alert('Utilizator creat cu succes, dar eroare la trimiterea email-ului. Trimite manual credentialele.');
        }
      } else {
        alert('Utilizator creat cu succes!');
      }
      setSendEmailOnCreate(true);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: ''
      });
      setNewUserRoles([]);
      loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message || 'Eroare la crearea utilizatorului');
    }
  };

  const toggleNewUserRole = (roleId: number) => {
    if (newUserRoles.includes(roleId)) {
      setNewUserRoles(newUserRoles.filter((id) => id !== roleId));
    } else {
      setNewUserRoles([...newUserRoles, roleId]);
    }
  };

  const toggleRole = (roleId: number) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const deleteUser = async (userToDelete: User) => {
    // Check if trying to delete themselves
    if (userToDelete.id === user?.id) {
      alert('Nu te poți șterge pe tine însuți!');
      return;
    }

    // Check if user is super_admin or admin_global
    const isProtectedAdmin = userToDelete.roles.some(r => 
      r.name === 'super_admin' || r.name === 'admin_global'
    );

    if (isProtectedAdmin) {
      alert('Nu poți șterge un administrator global!');
      return;
    }

    if (!window.confirm(`Ești sigur că vrei să ștergi utilizatorul "${userToDelete.full_name}"?\n\nAceastă acțiune este ireversibilă și va șterge toate datele asociate (roluri, disponibilități, asignări, notificări).`)) {
      return;
    }

    try {
      await apiCall(`/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      alert('Utilizatorul a fost șters cu succes!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Eroare la ștergerea utilizatorului');
    }
  };

  const toggleSelectUser = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const exportCSV = () => {
    const targets = selectedIds.size > 0 ? users.filter(u => selectedIds.has(u.id)) : users;
    const rows = [['Nume', 'Username', 'Email', 'Telefon', 'Roluri', 'Status']];
    targets.forEach(u => {
      rows.push([
        u.full_name,
        u.username,
        u.email || '',
        u.phone || '',
        u.roles.map(r => r.display_name).join('; '),
        u.is_active ? 'Activ' : 'Inactiv'
      ]);
    });
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'utilizatori.csv';
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const departmentRoles = allRoles.filter((r) => r.category === 'department');
  const adminRoles = allRoles.filter((r) => r.category === 'admin');

  if (loading) {
    return (
      <>
        <PlannerNav />
        <LoadingSpinner fullScreen />
      </>
    );
  }

  return (
    <>
      <PlannerNav />
      <div className="admin-tabs">
        <Link to="/planner/admin/users" className={`admin-tab ${location.pathname === '/planner/admin/users' ? 'active' : ''}`}>
          Utilizatori
        </Link>
        <Link to="/planner/admin/contracts" className={`admin-tab ${location.pathname === '/planner/admin/contracts' ? 'active' : ''}`}>
          Contracte Semnate
        </Link>
        <Link to="/planner/admin/registrations" className={`admin-tab ${location.pathname === '/planner/admin/registrations' ? 'active' : ''}`}>
          Inscrieri Evenimente
        </Link>
      </div>
      <main className="users-container">
        <div className="users-header">
          <div>
            <h1>Gestionare Utilizatori</h1>
            <p>Administrează utilizatori și roluri (doar Super Admin)</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-export-csv" onClick={exportCSV}>
              ↓ Export CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
            <button
              className="btn-add-user"
              onClick={() => setShowCreateModal(true)}
            >
              + Adaugă Utilizator
            </button>
          </div>
        </div>

        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedIds.size === users.length && users.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Nume</th>
                <th>Username</th>
                <th>Email</th>
                <th>Roluri</th>
                <th>Status</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={selectedIds.has(u.id) ? 'row-selected' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelectUser(u.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td>{u.full_name}</td>
                  <td>{u.username}</td>
                  <td>{u.email || '-'}</td>
                  <td>
                    <div className="roles-badges">
                      {u.roles.map((r) => (
                        <span key={r.id} className={`role-badge ${r.category}`}>
                          {r.display_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Activ' : 'Inactiv'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" onClick={() => openEditModal(u)}>
                        Editează
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => deleteUser(u)}
                        disabled={u.roles.some(r => r.name === 'super_admin' || r.name === 'admin_global')}
                        title={u.roles.some(r => r.name === 'super_admin' || r.name === 'admin_global') ? 'Nu poți șterge un administrator' : 'Șterge utilizator'}
                      >
                        Șterge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal pentru creare utilizator nou */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setSendEmailOnCreate(true); }}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Adaugă Utilizator Nou</h2>
                <button onClick={() => { setShowCreateModal(false); setSendEmailOnCreate(true); }}>×</button>
              </div>

              <div className="modal-body">
                <div className="form-section">
                  <h3>Informații de bază</h3>
                  
                  <div className="form-group">
                    <label>Nume complet *</label>
                    <input
                      type="text"
                      placeholder="ex: Ion Popescu"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      placeholder="ex: IonP"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Parolă * (min. 6 caractere)</label>
                    <input
                      type="password"
                      placeholder="ex: parola123"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="ex: ion@email.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefon</label>
                    <input
                      type="tel"
                      placeholder="ex: 0722123456"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={sendEmailOnCreate}
                        onChange={(e) => setSendEmailOnCreate(e.target.checked)}
                      />
                      <span>Trimite credentiale pe email</span>
                    </label>
                    {sendEmailOnCreate && !newUser.email && (
                      <p className="form-warning">Adauga un email pentru a putea trimite credentialele</p>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Departamente *</h3>
                  <div className="roles-checkboxes">
                    {departmentRoles.map((role) => (
                      <label key={role.id} className="role-checkbox">
                        <input
                          type="checkbox"
                          checked={newUserRoles.includes(role.id)}
                          onChange={() => toggleNewUserRole(role.id)}
                        />
                        <span>{role.display_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <h3>Roluri Admin (opțional)</h3>
                  <div className="roles-checkboxes">
                    {adminRoles.map((role) => (
                      <label key={role.id} className="role-checkbox">
                        <input
                          type="checkbox"
                          checked={newUserRoles.includes(role.id)}
                          onChange={() => toggleNewUserRole(role.id)}
                        />
                        <span>{role.display_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => { setShowCreateModal(false); setNewUserRoles([]); setNewUser({ username: '', password: '', full_name: '', email: '', phone: '' }); setSendEmailOnCreate(true); }} className="btn-cancel">
                  Anulează
                </button>
                <button onClick={createUser} className="btn-save">
                  Creează Utilizator
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal pentru editare utilizator */}
        {showModal && editingUser && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Editează Utilizator - {editingUser.username}</h2>
                <button onClick={() => setShowModal(false)}>×</button>
              </div>

              <div className="modal-body">
                {/* Date personale */}
                <div className="form-section">
                  <h3>Informații Personale</h3>

                  <div className="form-group">
                    <label>Nume complet *</label>
                    <input
                      type="text"
                      value={editedData.full_name}
                      onChange={(e) => setEditedData({ ...editedData, full_name: e.target.value })}
                      placeholder="ex: Ion Popescu"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editedData.email}
                      onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                      placeholder="ex: ion.popescu@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefon</label>
                    <input
                      type="tel"
                      value={editedData.phone}
                      onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                      placeholder="ex: 0712345678"
                    />
                  </div>
                </div>

                {/* Roluri */}
                <div className="roles-section">
                  <h3>Departamente</h3>
                  <div className="roles-checkboxes">
                    {departmentRoles.map((role) => (
                      <label key={role.id} className="role-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                        <span>{role.display_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="roles-section">
                  <h3>Admin</h3>
                  <div className="roles-checkboxes">
                    {adminRoles.map((role) => (
                      <label key={role.id} className="role-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                        <span>{role.display_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={() => setShowModal(false)} className="btn-cancel">
                  Anulează
                </button>
                <button onClick={saveUserData} className="btn-save">
                  Salvează Modificări
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          body { background: var(--bg-primary); padding-top: 80px; color: var(--text-primary); }
          .admin-tabs {
            max-width: 1400px; margin: 0 auto; padding: 20px 24px 0;
            display: flex; gap: 4px; border-bottom: 1px solid var(--card-border);
          }
          .admin-tab {
            padding: 10px 20px; text-decoration: none; color: var(--text-secondary);
            font-weight: 700; font-size: 14px; border-bottom: 3px solid transparent; transition: all 0.2s;
          }
          .admin-tab:hover { color: var(--text-primary); background: var(--hover-bg); }
          .admin-tab.active { color: #4CAF50; border-bottom-color: #4CAF50; }
          .users-container { max-width: 1400px; margin: 0 auto; padding: 40px 24px; }
          .users-header { margin-bottom: 32px; }
          .users-header h1 { margin: 0 0 8px 0; font-size: 32px; font-weight: 900; }
          .users-header p { margin: 0; color: var(--text-secondary); }
          .users-table { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--card-border); font-weight: 700; font-size: 14px; color: var(--text-secondary); }
          td { padding: 16px; border-bottom: 1px solid var(--card-border); }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: var(--hover-bg); }
          .roles-badges { display: flex; gap: 6px; flex-wrap: wrap; }
          .role-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
          .role-badge.department { background: rgba(33,150,243,0.1); color: #2196F3; }
          .role-badge.admin { background: rgba(255,93,31,0.1); color: #FF5D1F; }
          .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
          .status-badge.active { background: rgba(76,175,80,0.1); color: #4CAF50; }
          .status-badge.inactive { background: rgba(244,67,54,0.1); color: #f44336; }
          .action-buttons { display: flex; gap: 8px; }
          .btn-edit { padding: 6px 14px; background: var(--hover-bg); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 6px; font-weight: 700; cursor: pointer; }
          .btn-edit:hover { background: var(--active-bg); }
          .btn-delete { padding: 6px 14px; background: rgba(244,67,54,0.1); border: 1px solid rgba(244,67,54,0.3); color: #f44336; border-radius: 6px; font-weight: 700; cursor: pointer; }
          .btn-delete:hover { background: rgba(244,67,54,0.2); }
          .btn-delete:disabled { opacity: 0.3; cursor: not-allowed; }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
          .modal-content { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
          .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid var(--card-border); }
          .modal-header h2 { margin: 0; font-size: 20px; }
          .modal-header button { background: none; border: none; color: var(--text-primary); font-size: 32px; cursor: pointer; line-height: 1; }
          .modal-body { padding: 24px; }
          .roles-section { margin-bottom: 24px; }
          .roles-section h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 800; color: var(--text-secondary); }
          .roles-checkboxes { display: grid; gap: 8px; }
          .role-checkbox { display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; }
          .role-checkbox:hover { background: var(--hover-bg); }
          .role-checkbox input { width: 18px; height: 18px; cursor: pointer; }
          .modal-footer { display: flex; gap: 12px; padding: 24px; border-top: 1px solid var(--card-border); }
          .btn-cancel { flex: 1; padding: 12px; background: var(--hover-bg); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 8px; font-weight: 700; cursor: pointer; }
          .btn-save { flex: 1; padding: 12px; background: #4CAF50; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
          .btn-save:hover { background: #45a049; }
          .btn-add-user { padding: 12px 24px; background: #4CAF50; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
          .btn-add-user:hover { background: #45a049; }
          .btn-export-csv { padding: 12px 20px; background: var(--hover-bg); border: 1px solid var(--border-primary); color: var(--text-primary); border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
          .btn-export-csv:hover { background: var(--active-bg); }
          tr.row-selected { background: rgba(76,175,80,0.05) !important; }
          .users-header { display: flex; justify-content: space-between; align-items: center; }
          .modal-large { max-width: 700px; }
          .form-section { margin-bottom: 24px; }
          .form-section h3 { margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: var(--text-secondary); border-bottom: 1px solid var(--card-border); padding-bottom: 8px; }
          .form-group { margin-bottom: 16px; }
          .form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
          .form-group input { width: 100%; padding: 12px 14px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 8px; color: var(--text-primary); font-size: 14px; }
          .form-group input:focus { outline: none; border-color: #4CAF50; background: var(--hover-bg); }
          .form-group input::placeholder { color: var(--text-tertiary); }
          .toggle-label {
            display: flex !important;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-weight: 600 !important;
          }
          .toggle-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #4CAF50;
          }
          .form-warning {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #ff9800;
            font-weight: 500;
          }
        `}</style>
      </main>
    </>
  );
}
