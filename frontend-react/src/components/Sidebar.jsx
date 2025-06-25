// FILE: frontend-react/src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>1Project</h3>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/language" className="nav-link">Language</NavLink>
        <NavLink to="/desk" className="nav-link">Desk</NavLink>
        <NavLink to="/explore" className="nav-link">Explore</NavLink>
      </nav>
    </div>
  );
}

export default Sidebar;