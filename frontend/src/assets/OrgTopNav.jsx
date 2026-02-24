import { NavLink } from 'react-router-dom';
import useLogout from '../hooks/useLogout';
const OrgTopNav = ({ activeView, onChangeView }) => {
  const { LogoutLogic } = useLogout();
  const canSwitchViews = typeof onChangeView === 'function';
  const orgLink = (view, label) => (
    <NavLink to={`/orgdash?view=${view}`} className={({ isActive }) => (isActive && activeView === view ? 'active' : '')}>
      {label}
    </NavLink>
  );
  const navBtn = (view, label) => (
    <button
      type="button"
      className={activeView === view ? 'active' : ''}
      onClick={() => onChangeView(view)}
    >
      {label}
    </button>
  );
  return (
    <nav className="topnav">
      {canSwitchViews ? navBtn('dashboard', 'Dashboard') : orgLink('dashboard', 'Dashboard')}
      {canSwitchViews ? navBtn('create', 'Create Event') : orgLink('create', 'Create Event')}
      {canSwitchViews ? navBtn('profile', 'Profile') : orgLink('profile', 'Profile')}
      {canSwitchViews ? navBtn('ongoing', 'Ongoing Events') : orgLink('ongoing', 'Ongoing Events')}
      <NavLink to="/attendance_scan" className={({ isActive }) => (isActive ? 'active' : '')}>Attendance Scanner</NavLink>
      <button type="button" className="topnav-logout" onClick={LogoutLogic}>Logout</button>
    </nav>
  );
};

export default OrgTopNav;
