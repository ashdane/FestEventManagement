import './TopNav.css';
import { NavLink } from 'react-router-dom';
import useLogout from '../hooks/useLogout';

const TopNav = () => {
  const { LogoutLogic } = useLogout();

  return (
    <nav className="topnav">
      <NavLink to="/pptdash" className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
      <NavLink to="/browse_events" className={({ isActive }) => (isActive ? 'active' : '')}>Browse Events</NavLink>
      <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>Profile</NavLink>
      <NavLink to="/organizers_and_clubs" className={({ isActive }) => (isActive ? 'active' : '')}>Organizers/Clubs</NavLink>
      <button type="button" className="topnav-logout" onClick={LogoutLogic}>Logout</button>
    </nav>
  );
};

export default TopNav;
