'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { SettingsMenu } from './SettingsMenu';
import styles from './Header.module.css';

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

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
    { href: '/planned-nights', label: 'Planned BGNs' },
    { href: '/plays', label: 'Past BGNs' },
  ] : [];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎲</span>
          <span className={styles.logoText}>Board Game Night</span>
        </Link>

        {session && (
          <nav className={styles.nav}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive(link.href) ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

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
                
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    // Open settings by simulating click on settings button
                    const settingsBtn = document.querySelector('[data-settings-trigger]') as HTMLButtonElement;
                    if (settingsBtn) settingsBtn.click();
                  }}
                  className={styles.mobileSettingsBtn}
                >
                  ⚙️ Settings
                </button>
                
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
    </header>
  );
}
