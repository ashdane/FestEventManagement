import AUTH from "../services/authServices"
import { useNavigate } from "react-router-dom"
const useLogin = () => { // custom hooks must start with use! + they cant take any arguments
        const navigate = useNavigate()
        const submitfunc = async (state) =>
        {
            const response  = await AUTH.LoginAPI(state)
            const { error, message } = response
            if(error)
            {
                alert( `${error}` )
            }
            else
            {
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
            }
            return response
        }
        return { submitfunc }
}
export default useLogin

//hooks are react functions that are an API to core react concepts. it does away with the need of
// this and class components

//Error: hooks cant be async as they are expected to run synchronously. If not they would break React's
//render flow