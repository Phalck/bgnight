'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import styles from './Inbox.module.css';

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
  requesterId?: string;
  plannedNight?: {
    eventDateTime: string | null;
    location: string | null;
  } | null;
}

export function Inbox() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch('/api/inbox/unread-count');
      if (res.ok) {
        const data = await res.json();
        const newCount = data.count;
        
        // Check if we have new messages
        if (newCount > previousUnreadCount && previousUnreadCount > 0) {
          setHasNewMessage(true);
          // Fetch messages to check type for appropriate toast
          const messagesRes = await fetch('/api/inbox');
          if (messagesRes.ok) {
            const messagesData = await messagesRes.json();
            const latestMessage = messagesData[0];
            if (latestMessage) {
              if (latestMessage.type === 'JOIN_REQUEST') {
                addToast(`New join request from ${latestMessage.senderName}!`, 'success');
              } else if (latestMessage.type === 'JOIN_RESPONSE') {
                if (latestMessage.responseType === 'ACCEPTED') {
                  addToast('Your join request was accepted!', 'success');
                } else {
                  addToast('Your join request was declined', 'error');
                }
              } else {
                addToast('New board game night invitation!', 'success');
              }
            }
          }
          // Reset animation after 3 seconds
          setTimeout(() => setHasNewMessage(false), 3000);
        }
        
        setUnreadCount(newCount);
        setPreviousUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [session?.user?.id, previousUnreadCount, addToast]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.slice(0, 5)); // Only show 5 most recent
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [session?.user?.id]);

  // Initial fetch and polling
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchUnreadCount();
    fetchMessages();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) {
        fetchMessages();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [session?.user?.id, isOpen, fetchUnreadCount, fetchMessages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}/read`, {
        method: 'PATCH',
      });

      if (res.ok) {
        setMessages(messages.map(m => 
          m.id === messageId ? { ...m, isRead: true } : m
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const message = messages.find(m => m.id === messageId);
        setMessages(messages.filter(m => m.id !== messageId));
        if (message && !message.isRead) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/inbox/read-all', {
        method: 'PATCH',
      });

      if (res.ok) {
        setMessages(messages.map(m => ({ ...m, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleAcceptJoin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/inbox/${messageId}/accept-join`, {
        method: 'POST',
      });

      if (res.ok) {
        addToast('Join request accepted!', 'success');
        // Remove the request from the list or mark as read
        setMessages(messages.filter(m => m.id !== messageId));
        setUnreadCount(Math.max(0, unreadCount - 1));
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
        // Remove the request from the list
        setMessages(messages.filter(m => m.id !== messageId));
        setUnreadCount(Math.max(0, unreadCount - 1));
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!session?.user) return null;

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={`${styles.bellButton} ${unreadCount > 0 ? styles.hasUnread : ''} ${hasNewMessage ? styles.newMessage : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchMessages();
          }
        }}
        title="Inbox"
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3 className={styles.title}>Inbox</h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllBtn}
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.messageList}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📭</span>
                <p>No messages</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageCard} ${!message.isRead ? styles.unread : ''}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageType}>📅</span>
                    <span className={styles.messageTime}>{formatTimeAgo(message.createdAt)}</span>
                  </div>

                  <h4 className={styles.messageTitle}>{message.title}</h4>
                  <p className={styles.messageSender}>From: {message.senderName}</p>

                  <p className={styles.messagePreview}>
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
                  </p>

                  {message.expiresIn !== undefined && message.expiresIn !== null && (
                    <p className={styles.expiration}>
                      RSVP expires in {message.expiresIn}h
                    </p>
                  )}

                  <div className={styles.messageActions}>
                    {message.inviteToken && (
                      <button
                        className={styles.rsvpBtn}
                        onClick={() => {
                          router.push(`/invite/${message.inviteToken}`);
                          setIsOpen(false);
                          if (!message.isRead) {
                            handleMarkAsRead(message.id);
                          }
                        }}
                      >
                        RSVP Now
                      </button>
                    )}

                    {!message.isRead && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleMarkAsRead(message.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}

                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDelete(message.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.footer}>
            <button
              className={styles.viewAllBtn}
              onClick={() => {
                router.push('/inbox');
                setIsOpen(false);
              }}
            >
              View All Messages
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
