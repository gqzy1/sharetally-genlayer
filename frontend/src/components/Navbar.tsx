import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { UndeployedBadge } from './StatusBadge';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/examples', label: 'Offline Examples', end: false },
  { to: '/books', label: 'Catalogue', end: true },
  { to: '/books/new', label: 'New Quotation', end: false },
];

export const Navbar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand-link" onClick={() => setDrawerOpen(false)}>
          <BrandMark size={28} />
          <span>ShareTally</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions nav-actions-desktop">
          <UndeployedBadge />
          <Link to="/examples" className="btn btn-primary btn-sm">
            Inspect Demo Split
          </Link>
        </div>

        <button
          type="button"
          className="nav-mobile-toggle"
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setDrawerOpen((prev) => !prev)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {drawerOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <div style={{ paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <UndeployedBadge />
            <Link to="/examples" className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(false)}>
              Inspect Demo Split
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
