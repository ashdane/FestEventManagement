import { useNavigate } from "react-router-dom"
import { useState } from "react"
import formStates from "../hooks/formStates"
import useLogin from "../hooks/useLogin"
const Login = () => {
    const navigate = useNavigate() //useNavigate is a hook. it works with DOM. its only job is to give the function navigate
    const [ state, ChangeState ] = formStates({"usertype": "", "email": "", "password": "" })
    const { submitfunc } = useLogin()
    const [submitting, setSubmitting] = useState(false)
    const [errorText, setErrorText] = useState('')
    const { email, password } = state
    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorText('')
        if (!email || !password) {
            setErrorText('Enter email and password.')
            return;
        }
        setSubmitting(true)
        const out = await submitfunc({ ...state, email: email.trim() })
        if (!out) setErrorText('Login failed. Check credentials or backend connection.')
        setSubmitting(false)
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
                    <button type="submit" disabled={submitting}>{submitting ? 'Logging in...' : 'Login'}</button>
                    </div>
                    {errorText && <p style={{ color: 'crimson' }}>{errorText}</p>}
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
