import AUTH from "../services/authServices"
import { useNavigate } from "react-router-dom"
const useLogin = () => { // custom hooks must start with use! + they cant take any arguments
        const navigate = useNavigate()
        const submitfunc = async (state) =>
        {
            try {
                const response  = await AUTH.LoginAPI(state)
                const { message, token, usertype } = response
                localStorage.setItem('token', token) //saving token to clients local storage
                console.log("FULL SERVER RESPONSE:", response);
                console.log("EXTRACTED USERTYPE:", usertype)
                if(usertype === "ADMTR")
                    navigate('/admindash')
                else if(usertype === "OGR")
                    navigate('/orgdash')
                else
                    navigate('/pptdash')
                return response
            } catch (error) {
                const msg = error?.message || 'Login failed';
                if (msg.toLowerCase().includes('archived')) alert('Account archived');
                else if (msg.toLowerCase().includes('disabled')) alert('Account disabled');
                else alert(msg);
                return null;
            }
        }
        return { submitfunc }
}
export default useLogin
