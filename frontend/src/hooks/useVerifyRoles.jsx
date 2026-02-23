import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
const VerifyRoles = () => {
    const navigate = useNavigate();
    const token_verification = useCallback((token) => {
        if (!token) {
            console.log('Missing token');
            navigate('/');
            return null;
        }
        try {
            const decodedToken = jwtDecode(token);
            if ((decodedToken.exp * 1000) < Date.now()) {
                console.log('Expired token');
                navigate('/');
                return null;
            }
            return decodedToken.role || null;
        } catch {
            console.log('Malformed token');
            navigate('/');
            return null;
        }
    }, [navigate]);
    return { token_verification };
};
export default VerifyRoles;
