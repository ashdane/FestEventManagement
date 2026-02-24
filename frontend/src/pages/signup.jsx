import formStates from "../hooks/formStates"
import { useNavigate } from "react-router-dom"
import AUTH from "../services/authServices"
const Signup = () => {
        const navigate = useNavigate()
        const [ state, ChangeState ] = formStates({"usertype": "PPT", "participant_type": "ITST", "first_name": "", "last_name": "", 
            "org_name": "", "email": "", "phone_number": "", "password": ""
        })
        const { usertype, participant_type, first_name, last_name, org_name, email, phone_number, password } = state
        const submitfunc = async (e) => {
            e.preventDefault()
            try {
            const response  = await AUTH.SignupAPI(state)
            alert("You've succesfully signed up!");
            return response
            }
            catch(error)
            {
                const errorMessage = error.response?.data?.message 
                         || error.message ;
                alert(errorMessage);
            }
        }
        return (
            <div className="page login-container">
                <div className="card login-card">
                    <h1>Felicity Event Management System</h1>
                    <form onSubmit={submitfunc} className="login-form">
                        <div className="form-group">
                            <label htmlFor="usertype">User Type</label>
                            <select id="usertype" name="usertype" value={usertype} onChange={ChangeState}>
                                <option value="PPT">Participant</option>
                            </select>
                        </div>

                        {usertype === "PPT" && (
                            <div className="form-group">
                                <label htmlFor="participant_type">Type of Participant</label>
                                <select name="participant_type" value={participant_type} onChange={ChangeState}>
                                    <option value="ITST">IIIT Student</option>
                                    <option value="NITST">Other</option>
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>First Name</label>
                            <input type="text" name="first_name" value={first_name} onChange={ChangeState} />
                        </div>

                        <div className="form-group">
                            <label>Last Name</label>
                            <input type="text" name="last_name" value={last_name} onChange={ChangeState} />
                        </div>

                        {participant_type === "NITST" && (
                        <div className="form-group">
                                <label>College / Organization Name</label>
                                <input 
                                    type="text" 
                                    name="org_name" 
                                    value={org_name} 
                                    onChange={ChangeState} 
                                    required 
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>E-Mail</label>
                            <input type="text" name="email" value={email} onChange={ChangeState} />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="text" name="phone_number" value={phone_number} onChange={ChangeState} />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" name="password" value={password} onChange={ChangeState} />
                        </div>

                        <div>
                            <button type="submit">Signup</button>
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={() => navigate('/')}>
                                Login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
}
export default Signup // when doing this im telling external files that this page is the login component
