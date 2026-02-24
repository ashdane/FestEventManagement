import AUTH from "../services/authServices"
import { useNavigate } from "react-router-dom"
import PARTICIPANT_SERVICE from "../services/participantServices";
const useLogin = () => { // custom hooks must start with use! + they cant take any arguments
        const navigate = useNavigate()
        const submitfunc = async (state) =>
        {
            try {
                const response  = await AUTH.LoginAPI(state)
                const { token, usertype, id } = response
                if (!token) throw new Error('Login failed');
                localStorage.setItem('token', token) //saving token to clients local storage
                console.log("FULL SERVER RESPONSE:", response);
                console.log("EXTRACTED USERTYPE:", usertype)
                if(usertype === "ADMTR")
                    navigate('/admindash')
                else if(usertype === "OGR")
                    navigate('/orgdash')
                else {
                    const marker = `onboard_done_${id}`;
                    const done = localStorage.getItem(marker) === '1';
                    const profile = await PARTICIPANT_SERVICE.getMyProfile(token).catch(() => null);
                    const hasPrefs = !!((profile?.areas_of_interests || []).length || (profile?.orgs_of_interests || []).length);
                    if (done || hasPrefs) {
                        localStorage.setItem(marker, '1');
                        navigate('/pptdash');
                    } else {
                        navigate('/onboarding');
                    }
                }
                return response
            } catch (error) {
                const msg = String(error?.message || 'Login failed');
                console.error('Login error:', error);
                if (msg.toLowerCase().includes('archived')) alert('Account archived');
                else if (msg.toLowerCase().includes('disabled')) alert('Account disabled');
                else alert(msg);
                return null;
            }
        }
        return { submitfunc }
}
export default useLogin
