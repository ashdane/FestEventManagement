import { useNavigate } from "react-router-dom"
import formStates from "../hooks/formStates"
import useLogin from "../hooks/useLogin"
const Login = () => {
    const navigate = useNavigate() //useNavigate is a hook. it works with DOM. its only job is to give the function navigate
    const [ state, ChangeState ] = formStates({"usertype": "", "email": "", "password": "" })
    const { submitfunc } = useLogin()
    const { email, password } = state
    const handleSubmit = (e) => {
        e.preventDefault()
        submitfunc(state)
    }
    return (
        <div className="page login-container">
            <div className="card login-card">
                <h1>Felicity Event Management System</h1>
                <form onSubmit={handleSubmit} className = "login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input type="text" name = "email" value = { email } onChange = { ChangeState }/>
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name = "password" value = { password } onChange = { ChangeState }/>
                    </div>
                    <div>
                    <button type="submit">Login</button>
                    </div>
                    <div className="form-actions">
                    <button type = "button" onClick = {() => navigate('/signup')}>
                        Signup
                    </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
export default Login // when doing this im telling external files that this page is the login component
