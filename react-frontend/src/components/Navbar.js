import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Students' },
    { path: '/attendance', label: 'Attendance' },
    { path: '/reports', label: 'Reports' },
  ];

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link className="navbar-brand" to="/dashboard">Bluetooth Attendance</Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {navItems.map(({ path, label }) => (
              <li key={path} className="nav-item">
                <Link
                  to={path}
                  className={`nav-link${location.pathname === path ? ' active' : ''}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
