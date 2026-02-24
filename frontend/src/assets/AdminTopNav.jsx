import useLogout from '../hooks/useLogout';
const AdminTopNav = ({ activeView, onChangeView }) => {
  const { LogoutLogic } = useLogout();
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
      {navBtn('resets', 'Reset Requests')}
      {navBtn('organizers', 'Manage Organizers')}
      <button type="button" className="topnav-logout" onClick={LogoutLogic}>Logout</button>
    </nav>
  );
};
export default AdminTopNav;
