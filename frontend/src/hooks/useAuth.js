import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectIsAuthenticated, selectUserRole, logout } from '../store/slices/authSlice';
import { useLogoutMutation } from '../store/api/authApi';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      dispatch(logout());
    }
  };

  const hasRole = (...roles) => roles.includes(role);
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || role === 'admin';
  const isViewer = role === 'viewer';

  return {
    user,
    isAuthenticated,
    role,
    handleLogout,
    hasRole,
    isAdmin,
    isManager,
    isViewer,
  };
};
