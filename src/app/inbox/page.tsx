'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

interface InboxMessage {
  id: string;
  type: string;
  title: string;
  message: string;
  senderName: string;
  isRead: boolean;
  createdAt: string;
  inviteToken?: string;
  expiresIn?: number;
  responseType?: string;
  plannedNight?: {
    eventDateTime: string | null;
    location: string | null;
  } | null;
}

export default function InboxPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchMessages = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/inbox?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        addToast('Failed to load messages', 'error');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      addToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, filter, addToast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}/read`, {
        method: 'PATCH',
      });

      if (res.ok) {
        setMessages(messages.map(m => 
          m.id === messageId ? { ...m, isRead: true } : m
        ));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/inbox/read-all', {
        method: 'PATCH',
      });

      if (res.ok) {
        setMessages(messages.map(m => ({ ...m, isRead: true })));
        addToast('All messages marked as read', 'success');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      addToast('Failed to mark messages as read', 'error');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessages(messages.filter(m => m.id !== messageId));
        addToast('Message deleted', 'success');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      addToast('Failed to delete message', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete all messages?')) return;

    try {
      await Promise.all(messages.map(m => 
        fetch(`/api/inbox/${m.id}`, { method: 'DELETE' })
      ));
      setMessages([]);
      addToast('All messages deleted', 'success');
    } catch (error) {
      console.error('Error deleting all messages:', error);
      addToast('Failed to delete messages', 'error');
    }
  };

  const handleAcceptJoin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}/accept-join`, {
        method: 'POST',
      });

      if (res.ok) {
        addToast('Join request accepted!', 'success');
        setMessages(messages.filter(m => m.id !== messageId));
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to accept request', 'error');
      }
    } catch (error) {
      console.error('Error accepting join request:', error);
      addToast('Failed to accept request', 'error');
    }
  };

  const handleDeclineJoin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}/decline-join`, {
        method: 'POST',
      });

      if (res.ok) {
        addToast('Join request declined', 'success');
        setMessages(messages.filter(m => m.id !== messageId));
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to decline request', 'error');
      }
    } catch (error) {
      console.error('Error declining join request:', error);
      addToast('Failed to decline request', 'error');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loading}>Loading messages...</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Inbox</h1>
              <p className={styles.subtitle}>
                {messages.length} message{messages.length !== 1 ? 's' : ''}
                {unreadCount > 0 && ` • ${unreadCount} unread`}
          </p>
        </div>
        <div className={styles.actions}>
          {unreadCount > 0 && (
            <button
              className={styles.actionBtn}
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </button>
          )}
          {messages.length > 0 && (
            <button
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={handleDeleteAll}
            >
              Delete all
            </button>
          )}
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Messages
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h3>No Messages</h3>
          <p>Your inbox is empty. When someone invites you to a board game night, you will see it here.</p>
        </div>
      ) : (
        <div className={styles.messageList}>
          {messages.map((message) => {
            // JOIN REQUEST - Show organizer actions
            if (message.type === 'JOIN_REQUEST') {
              return (
                <div
                  key={message.id}
                  className={`${styles.messageCard} ${styles.joinRequest} ${!message.isRead ? styles.unread : ''}`}
                >
                  <div className={styles.messageHeader}>
                    <div className={styles.messageMeta}>
                      <span className={styles.messageType}>📨</span>
                      <span className={styles.messageTime}>{formatTimeAgo(message.createdAt)}</span>
                      {!message.isRead && <span className={styles.unreadBadge}>New</span>}
                    </div>
                    <div className={styles.messageActions}>
                      {!message.isRead && (
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleMarkAsRead(message.id)}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className={styles.iconBtn}
                        onClick={() => handleDelete(message.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 className={styles.messageTitle}>{message.title}</h3>
                  <p className={styles.messageSender}>From: {message.senderName}</p>
                  <p className={styles.messagePreview}>{message.message}</p>

                  {message.plannedNight?.eventDateTime && (
                    <p className={styles.eventDetails}>
                      📅 {new Date(message.plannedNight.eventDateTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {message.plannedNight?.location && ` • 📍 ${message.plannedNight.location}`}
                    </p>
                  )}

                  <div className={styles.joinRequestActions}>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleAcceptJoin(message.id)}
                    >
                      ✓ Invite & Add
                    </button>
                    <button
                      className={styles.declineBtn}
                      onClick={() => handleDeclineJoin(message.id)}
                    >
                      ✗ Decline
                    </button>
                  </div>
                </div>
              );
            }

            // JOIN RESPONSE - Show acceptance/decline notification
            if (message.type === 'JOIN_RESPONSE') {
              const isAccepted = message.responseType === 'ACCEPTED';
              return (
                <div
                  key={message.id}
                  className={`${styles.messageCard} ${styles.joinResponse} ${!message.isRead ? styles.unread : ''}`}
                >
                  <div className={styles.messageHeader}>
                    <div className={styles.messageMeta}>
                      <span className={styles.messageType}>{isAccepted ? '✅' : '❌'}</span>
                      <span className={styles.messageTime}>{formatTimeAgo(message.createdAt)}</span>
                    </div>
                    <div className={styles.messageActions}>
                      {!message.isRead && (
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleMarkAsRead(message.id)}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className={styles.iconBtn}
                        onClick={() => handleDelete(message.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <h3 className={styles.messageTitle}>{message.title}</h3>
                  <p className={styles.messagePreview}>{message.message}</p>

                  {isAccepted && message.inviteToken && (
                    <button
                      className={styles.rsvpBtn}
                      onClick={() => {
                        router.push(`/invite/${message.inviteToken}`);
                        if (!message.isRead) {
                          handleMarkAsRead(message.id);
                        }
                      }}
                    >
                      RSVP Now
                    </button>
                  )}
                </div>
              );
            }

            // BGN_INVITE - Default invitation message
            return (
              <div
                key={message.id}
                className={`${styles.messageCard} ${!message.isRead ? styles.unread : ''}`}
              >
                <div className={styles.messageHeader}>
                  <div className={styles.messageMeta}>
                    <span className={styles.messageType}>📅</span>
                    <span className={styles.messageTime}>{formatTimeAgo(message.createdAt)}</span>
                    {!message.isRead && <span className={styles.unreadBadge}>New</span>}
                  </div>
                  <div className={styles.messageActions}>
                    {!message.isRead && (
                      <button
                        className={styles.iconBtn}
                        onClick={() => handleMarkAsRead(message.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className={styles.iconBtn}
                      onClick={() => handleDelete(message.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <h3 className={styles.messageTitle}>{message.title}</h3>
                <p className={styles.messageSender}>From: {message.senderName}</p>

                <div className={styles.messagePreview}>
                  {message.plannedNight?.eventDateTime 
                    ? new Date(message.plannedNight.eventDateTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Date TBD'
                  }
                  {message.plannedNight?.location && ` • ${message.plannedNight.location}`}
                </div>

                {message.expiresIn !== undefined && message.expiresIn !== null && (
                  <p className={styles.expiration}>
                    RSVP expires in {message.expiresIn}h
                  </p>
                )}

                {message.inviteToken && (
                  <button
                    className={styles.rsvpBtn}
                    onClick={() => {
                      router.push(`/invite/${message.inviteToken}`);
                      if (!message.isRead) {
                        handleMarkAsRead(message.id);
                      }
                    }}
                  >
                    RSVP Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </main>
</>
  );
}
