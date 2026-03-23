'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { SettingsMenu } from './SettingsMenu';
import { RestoreModal } from './RestoreModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { EmailVerificationModal } from './EmailVerificationModal';
import { useToast } from './Toast';
import styles from './Header.module.css';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSettingsExpanded, setMobileSettingsExpanded] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Mobile settings modal states
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [showDeletePlaysModal, setShowDeletePlaysModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [restoreType, setRestoreType] = useState<'collection' | 'plays'>('collection');
  const [accountDeletionCode, setAccountDeletionCode] = useState('');

  const isActive = (path: string) => pathname === path;

  // Mobile settings handlers
  const handleMobileBackup = async (type: 'collection' | 'plays') => {
    try {
      const response = await fetch(`/api/backup/${type}`);
      if (!response.ok) throw new Error('Failed to backup');
      
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bgnight-${type}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addToast(`Backup downloaded successfully!`, 'success');
    } catch (error) {
      addToast('Failed to create backup', 'error');
    }
  };

  const handleMobileDeleteCollection = async () => {
    try {
      const response = await fetch('/api/delete/collection', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      
      const data = await response.json();
      addToast(data.message, 'success');
      window.location.reload();
    } catch (error) {
      addToast('Failed to delete collection', 'error');
    }
  };

  const handleMobileDeletePlays = async () => {
    try {
      const response = await fetch('/api/delete/plays', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      
      const data = await response.json();
      addToast(data.message, 'success');
      window.location.reload();
    } catch (error) {
      addToast('Failed to delete plays', 'error');
    }
  };

  const handleMobileDeleteAccount = async (code: string) => {
    try {
      const response = await fetch('/api/user/delete-request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      
      addToast('Account deleted successfully', 'success');
      window.location.href = '/';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      addToast(errorMessage, 'error');
      throw error;
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = session ? [
    { href: '/collection', label: 'My Collection' },
    { href: '/plan', label: 'Plan BGN' },
    { href: '/planned-nights', label: 'My Planned BGNs' },
    { href: '/plays', label: 'My Past BGNs' },
    { href: '/community-bgn', label: 'Community BGNs' },
  ] : [];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎲</span>
          <span className={styles.logoText}>Board Game Night</span>
        </Link>

        <nav className={styles.nav}>
          {/* Public link - always visible */}
          <Link
            href="/community-bgn"
            className={`${styles.navLink} ${isActive('/community-bgn') ? styles.active : ''}`}
          >
            Community BGNs
          </Link>
          
          {/* Private links - only when logged in */}
          {session && navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActive(link.href) ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.user}>
          {session ? (
            <>
              <span className={styles.userName}>{session.user.name || session.user.email}</span>
              <div className={styles.desktopSettings}>
                <SettingsMenu />
              </div>
              <button onClick={() => signOut()} className={styles.logoutBtn}>
                Logout
              </button>
              
              {/* Mobile hamburger button */}
              <button 
                className={styles.hamburgerBtn}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.loginBtn}>
                Login
              </Link>
              
              {/* Mobile hamburger button for logged out users */}
              <button 
                className={styles.hamburgerBtn}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div 
            ref={mobileMenuRef}
            className={styles.mobileMenu}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <span className={styles.mobileMenuTitle}>Menu</span>
              <button 
                className={styles.closeMenuBtn}
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {session ? (
              <nav className={styles.mobileNav}>
                <Link
                  href="/community-bgn"
                  className={`${styles.mobileNavLink} ${isActive('/community-bgn') ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Community BGNs
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.mobileNavLink} ${isActive(link.href) ? styles.active : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                
                <div className={styles.mobileMenuDivider}></div>
                
                <div className={styles.mobileUserInfo}>
                  <span className={styles.mobileUserName}>
                    {session.user.name || session.user.email}
                  </span>
                </div>
                
                {/* Mobile Settings Section */}
                <div className={styles.mobileSettingsSection}>
                  <button 
                    onClick={() => setMobileSettingsExpanded(!mobileSettingsExpanded)}
                    className={styles.mobileSettingsToggle}
                    aria-expanded={mobileSettingsExpanded}
                  >
                    <span>⚙️ Settings</span>
                    <span className={`${styles.expandIcon} ${mobileSettingsExpanded ? styles.expanded : ''}`}>▼</span>
                  </button>
                  
                  {mobileSettingsExpanded && (
                    <div className={styles.mobileSettingsContent}>
                      <div className={styles.mobileSettingsGroup}>
                        <h4 className={styles.mobileSettingsGroupTitle}>Backup</h4>
                        <button 
                          className={styles.mobileSettingsItem}
                          onClick={() => {
                            handleMobileBackup('collection');
                          }}
                        >
                          📥 Backup Collection
                        </button>
                        <button 
                          className={styles.mobileSettingsItem}
                          onClick={() => {
                            handleMobileBackup('plays');
                          }}
                        >
                          📥 Backup Logged Plays
                        </button>
                      </div>
                      
                      <div className={styles.mobileSettingsGroup}>
                        <h4 className={styles.mobileSettingsGroupTitle}>Restore</h4>
                        <button 
                          className={styles.mobileSettingsItem}
                          onClick={() => {
                            setRestoreType('collection');
                            setShowRestoreModal(true);
                            setMobileMenuOpen(false);
                          }}
                        >
                          📤 Restore Collection
                        </button>
                        <button 
                          className={styles.mobileSettingsItem}
                          onClick={() => {
                            setRestoreType('plays');
                            setShowRestoreModal(true);
                            setMobileMenuOpen(false);
                          }}
                        >
                          📤 Restore Logged Plays
                        </button>
                      </div>

                      <div className={styles.mobileSettingsGroup}>
                        <h4 className={styles.mobileSettingsGroupTitle}>Collection Tools</h4>
                        <button
                          className={styles.mobileSettingsItem}
                          onClick={() => {
                            router.push('/settings/bulk-update');
                            setMobileMenuOpen(false);
                          }}
                        >
                          🔄 Bulk Update from BGG
                        </button>
                      </div>

                      <div className={styles.mobileSettingsGroup}>
                        <h4 className={styles.mobileSettingsGroupTitle}>Danger Zone</h4>
                        <button 
                          className={`${styles.mobileSettingsItem} ${styles.danger}`}
                          onClick={() => {
                            setShowDeleteCollectionModal(true);
                            setMobileMenuOpen(false);
                          }}
                        >
                          🗑️ Delete Collection
                        </button>
                        <button 
                          className={`${styles.mobileSettingsItem} ${styles.danger}`}
                          onClick={() => {
                            setShowDeletePlaysModal(true);
                            setMobileMenuOpen(false);
                          }}
                        >
                          🗑️ Delete Logged Plays
                        </button>
                        <button 
                          className={`${styles.mobileSettingsItem} ${styles.danger}`}
                          onClick={() => {
                            setShowEmailVerificationModal(true);
                            setMobileMenuOpen(false);
                          }}
                        >
                          ⚠️ Remove User Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className={styles.mobileLogoutBtn}
                >
                  Logout
                </button>
              </nav>
            ) : (
              <nav className={styles.mobileNav}>
                <Link
                  href="/community-bgn"
                  className={`${styles.mobileNavLink} ${isActive('/community-bgn') ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Community BGNs
                </Link>
                <Link
                  href="/login"
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </nav>
            )}
          </div>
        </div>
      )}

      {/* Mobile Settings Modals */}
      {showRestoreModal && (
        <RestoreModal
          type={restoreType}
          onClose={() => setShowRestoreModal(false)}
        />
      )}

      {showDeleteCollectionModal && (
        <ConfirmDeleteModal
          title="Delete Collection"
          message="This will permanently delete all games from your collection. This action cannot be undone."
          itemCount="games"
          onConfirm={handleMobileDeleteCollection}
          onClose={() => setShowDeleteCollectionModal(false)}
        />
      )}

      {showDeletePlaysModal && (
        <ConfirmDeleteModal
          title="Delete Logged Plays"
          message="This will permanently delete all your logged plays. This action cannot be undone."
          itemCount="logged plays"
          onConfirm={handleMobileDeletePlays}
          onClose={() => setShowDeletePlaysModal(false)}
        />
      )}

      {showEmailVerificationModal && (
        <EmailVerificationModal
          onVerify={(code) => {
            setAccountDeletionCode(code);
            setShowEmailVerificationModal(false);
            setShowDeleteAccountModal(true);
          }}
          onClose={() => setShowEmailVerificationModal(false)}
        />
      )}

      {showDeleteAccountModal && (
        <ConfirmDeleteModal
          title="Remove User Account"
          message="This will permanently delete your account and all associated data. This action cannot be undone."
          itemCount="account"
          requireCode={true}
          onConfirm={() => handleMobileDeleteAccount(accountDeletionCode)}
          onClose={() => setShowDeleteAccountModal(false)}
        />
      )}
    </header>
  );
}
