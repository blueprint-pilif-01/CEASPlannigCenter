import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Calendar, Clock, User, Mail, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import { apiCall, isAuthenticated } from '../../utils/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_label?: string;
  related_id?: number;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/planner/login');
      return;
    }
    loadNotifications();
  }, [navigate]);

  const loadNotifications = async () => {
    try {
      const data = await apiCall('/notifications');
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await apiCall(`/notifications/${notificationId}/read`, { method: 'PUT' });
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiCall('/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    if (!window.confirm('Ștergi această notificare?')) return;

    try {
      await apiCall(`/notifications/${notificationId}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const confirmAssignment = async (notification: Notification) => {
    if (!notification.related_id) {
      alert('Eroare: ID assignment lipsă');
      return;
    }

    if (!confirm('Confirmă că vei fi prezent?')) return;

    try {
      await apiCall(`/assignments/${notification.related_id}/confirm`, { method: 'PUT' });
      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
      alert('✅ Confirmat! Mulțumim!');
    } catch (error: any) {
      console.error('Error confirming assignment:', error);
      alert(`Eroare: ${error.message || 'Nu s-a putut confirma'}`);
    }
  };

  const declineAssignment = async (notification: Notification) => {
    if (!notification.related_id) {
      alert('Eroare: ID assignment lipsă');
      return;
    }

    const reason = prompt('Motiv pentru refuz (opțional):');
    if (reason === null) return;

    try {
      await apiCall(`/assignments/${notification.related_id}/decline`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
      alert('❌ Programare refuzată');
    } catch (error: any) {
      console.error('Error declining assignment:', error);
      alert(`Eroare: ${error.message || 'Nu s-a putut refuza'}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'voting_open':
        return <Bell size={18} className="text-blue-500" />;
      case 'assignment':
        return <User size={18} className="text-green-500" />;
      case 'vote_reminder':
        return <Clock size={18} className="text-orange-500" />;
      case 'assignment_reminder':
        return <Calendar size={18} className="text-purple-500" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'voting_open':
        return 'Votare deschisă';
      case 'assignment':
        return 'Programare nouă';
      case 'vote_reminder':
        return 'Reminder votare';
      case 'assignment_reminder':
        return 'Reminder programare';
      default:
        return 'Notificare';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <>
        <PlannerNav />
        <LoadingSpinner fullScreen message="Se încarcă notificările..." />
      </>
    );
  }

  return (
    <>
      <PlannerNav />
      <main className="notifications-page">
        <div className="notifications-header">
          <div className="header-left">
            <Bell size={24} className="header-icon" />
            <div>
              <h1>Notificări</h1>
              <p>{notifications.length} notificări • {unreadCount} necitite</p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button className="btn-mark-all" onClick={markAllAsRead}>
              <Check size={16} />
              Marchează toate ca citite
            </button>
          )}
        </div>

        <div className="notifications-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Toate ({notifications.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Necitite ({unreadCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Citite ({notifications.length - unreadCount})
          </button>
        </div>

        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-notifications">
              <Bell size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
              <h3>
                {filter === 'unread' ? 'Nicio notificare necitită' : 
                 filter === 'read' ? 'Nicio notificare citită' : 
                 'Nicio notificare'}
              </h3>
              <p>
                {filter === 'unread' ? 'Toate notificările au fost citite' : 
                 filter === 'read' ? 'Nu ai citit nicio notificare încă' : 
                 'Nu ai notificări încă'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notification-content">
                  <div className="notification-header">
                    <span className="notification-type">
                      {getNotificationTypeLabel(notification.type)}
                    </span>
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleDateString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <h3 className="notification-title">{notification.title}</h3>
                  <p className="notification-message">{notification.message}</p>
                  
                  {notification.action_url && (
                    <div className="notification-actions">
                      <button 
                        className="btn-action"
                        onClick={() => {
                          // Navigate based on action_url
                          if (notification.action_url?.startsWith('/planner/')) {
                            navigate(notification.action_url);
                          } else if (notification.action_url?.startsWith('http')) {
                            window.open(notification.action_url, '_blank');
                          }
                        }}
                      >
                        <ExternalLink size={14} />
                        {notification.action_label || 'Vezi detalii'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="notification-controls">
                  {(notification.type === 'assignment' || notification.type === 'assignment_reminder') && notification.related_id ? (
                    <>
                      <button
                        className="btn-confirm-notif"
                        onClick={() => confirmAssignment(notification)}
                        title="Confirmă prezența"
                      >
                        <CheckCircle size={14} /> Confirmă
                      </button>
                      <button
                        className="btn-decline-notif"
                        onClick={() => declineAssignment(notification)}
                        title="Refuză"
                      >
                        <XCircle size={14} /> Refuză
                      </button>
                    </>
                  ) : (
                    <>
                      {!notification.is_read && (
                        <button
                          className="btn-mark-read"
                          onClick={() => markAsRead(notification.id)}
                          title="Marchează ca citit"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => deleteNotification(notification.id)}
                        title="Șterge notificare"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <style>{`
          body {
            background: var(--bg-primary);
            color: var(--text-primary);
            padding-top: 80px;
          }
          
          .notifications-page {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
          }
          
          .notifications-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--card-border);
          }
          
          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          
          .header-icon {
            color: #4CAF50;
          }
          
          .notifications-header h1 {
            margin: 0 0 4px 0;
            font-size: 28px;
            font-weight: 900;
            color: var(--text-primary);
          }

          .notifications-header p {
            margin: 0;
            color: var(--text-tertiary);
            font-size: 14px;
          }
          
          .btn-mark-all {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: #4CAF50;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s;
          }
          
          .btn-mark-all:hover {
            background: #45a049;
          }
          
          .notifications-filters {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
          }
          
          .filter-btn {
            padding: 8px 16px;
            background: var(--hover-bg);
            border: 1px solid var(--border-primary);
            color: var(--text-tertiary);
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .filter-btn:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
          
          .filter-btn.active {
            background: #4CAF50;
            border-color: #4CAF50;
            color: #fff;
          }
          
          .notifications-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .notification-item {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            transition: all 0.2s;
          }

          .notification-item:hover {
            background: var(--hover-bg);
            border-color: var(--border-primary);
          }
          
          .notification-item.unread {
            background: rgba(76,175,80,0.08);
            border-color: rgba(76,175,80,0.2);
          }
          
          .notification-item.unread:hover {
            background: rgba(76,175,80,0.12);
          }
          
          .notification-icon {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            background: var(--hover-bg);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .notification-content {
            flex: 1;
            min-width: 0;
          }
          
          .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          
          .notification-type {
            font-size: 12px;
            font-weight: 700;
            color: #4CAF50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .notification-time {
            font-size: 12px;
            color: var(--text-muted);
          }

          .notification-title {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.4;
          }

          .notification-message {
            margin: 0 0 12px 0;
            color: var(--text-secondary);
            line-height: 1.5;
          }
          
          .notification-actions {
            margin-top: 12px;
          }
          
          .btn-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: rgba(76,175,80,0.1);
            border: 1px solid rgba(76,175,80,0.3);
            color: #4CAF50;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .btn-action:hover {
            background: rgba(76,175,80,0.2);
            border-color: rgba(76,175,80,0.5);
          }
          
          .notification-controls {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-shrink: 0;
          }
          
          .btn-mark-read,
          .btn-delete,
          .btn-confirm,
          .btn-decline {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .btn-mark-read,
          .btn-confirm {
            background: rgba(76,175,80,0.1);
            color: #4CAF50;
          }

          .btn-mark-read:hover,
          .btn-confirm:hover {
            background: rgba(76,175,80,0.2);
          }

          .btn-delete,
          .btn-decline {
            background: rgba(244,67,54,0.1);
            color: #f44336;
          }

          .btn-delete:hover,
          .btn-decline:hover {
            background: rgba(244,67,54,0.2);
          }

          .btn-confirm-notif,
          .btn-decline-notif {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 14px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }

          .btn-confirm-notif {
            background: #4CAF50;
            color: #fff;
          }

          .btn-confirm-notif:hover {
            background: #45a049;
          }

          .btn-decline-notif {
            background: rgba(244,67,54,0.1);
            border: 1px solid rgba(244,67,54,0.3);
            color: #f44336;
          }

          .btn-decline-notif:hover {
            background: rgba(244,67,54,0.2);
          }

          .empty-notifications {
            text-align: center;
            padding: 80px 20px;
            color: var(--text-muted);
          }

          .empty-notifications h3 {
            margin: 16px 0 8px 0;
            font-size: 20px;
            font-weight: 700;
            color: var(--text-tertiary);
          }

          .empty-notifications p {
            margin: 0;
            color: var(--text-muted);
          }
          
          /* Mobile responsiveness */
          @media (max-width: 768px) {
            .notifications-page {
              padding: 16px;
            }
            
            .notifications-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
            
            .notifications-filters {
              flex-wrap: wrap;
            }
            
            .notification-item {
              padding: 16px;
            }
            
            .notification-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }
          }
        `}</style>
      </main>
    </>
  );
}
