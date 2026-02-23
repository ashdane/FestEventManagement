import { useNavigate } from "react-router-dom"
import formStates from "../hooks/formStates"
import useLogin from "../hooks/useLogin"
const Login = () => {
    // hooks can only be called at the top level - error: i put it in the useLogin defintion
    const navigate = useNavigate() //useNavigate is a hook. it works with DOM. its only job is to give the function navigate
    const [ state, ChangeState ] = formStates({"usertype": "", "email": "", "password": "" })
    const { submitfunc } = useLogin()
    const { email, password } = state
    const handleSubmit = (e) => {
        e.preventDefault()
        submitfunc(state)
    }
    return (
        <div>
            <h1>Login Page</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>EMAIL</label>
                    <input type="text" name = "email" value = { email } onChange = { ChangeState }/>
                </div>
                <div>
                    <label>Password</label>
                    <input type="password" name = "password" value = { password } onChange = { ChangeState }/>
                </div>
                <div>
                <button>Login</button>
                </div>
                <div>
                <button type = "button" onClick = {() => navigate('/signup')}>
                    Signup
                </button>
                </div>
            </form>
        </div>
    )
}

export default Login // when doing this im telling external files that this page is the login component
//export const Login //If i did this i would be exporting just a component called Login form this file

//type "text" wouldnt hide the password

