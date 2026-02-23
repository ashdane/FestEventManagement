import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const useLogout = () => {
    const navigate = useNavigate();

    const LogoutLogic = useCallback(() => {
        try {
            localStorage.removeItem('token');
            navigate('/');
        } catch (error) {
            console.log('Client issue. Unable to logout!');
        }
    }, [navigate]);

    return { LogoutLogic };
};

export default useLogout;
