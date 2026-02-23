import formStates from "../hooks/formStates"
import { useNavigate } from "react-router-dom"
import AUTH from "../services/authServices"
const Signup = () => {
        const navigate = useNavigate()
        const [ state, ChangeState ] = formStates({"usertype": "PPT", "participant_type": "", "first_name": "", "last_name": "", 
            "organization_name": "", "email": "", "phone_number": "", "password": ""
        })
        const { usertype, participant_type, first_name, last_name, organization_name, email, phone_number, password } = state
        const submitfunc = async (e) => {
            e.preventDefault()
            const response  = await AUTH.SignupAPI(state)
            alert("Hey!");
            return response
        }
        return (<div>
            <h1>Signup Page</h1>
            <form onSubmit={submitfunc}>
                <div>
                    <div className="dropdown">
                        <label>Name</label>
                        <select id="usertype" name="usertype" value = { usertype } onChange = { ChangeState }>
                            <option value="PPT">Participant</option>
                            <option value="OGR">Organizer</option>
                            <option value="ADMTR">Administrator</option>
                        </select>
                    </div>
                    { usertype === "PPT" &&
                    (
                    <div>
                        <label htmlFor="participant_type">Type of Participant</label>
                        <select name = "participant_type" value = { participant_type } onChange = { ChangeState }>
                            <option value="ITST">IIIT Student</option>
                            <option value="NITST">Other</option>
                        </select>
                    </div>
                    )
                    }
                    <div>
                        <label>First Name</label>
                        <input type="text" name = "first_name" value = { first_name } onChange = { ChangeState }/>
                    </div>
                    <div>
                        <label>Last Name</label>
                        <input type="text" name = "last_name" value = { last_name } onChange = { ChangeState }/>
                    </div>
                    <div>
                        <label>Organization Name</label>
                        <input type="text" name = "organization_name" value = { organization_name } onChange = { ChangeState }/>
                    </div>
                    <div>
                        <label>E-Mail</label>
                        <input type="text" name = "email" value = { email } onChange = { ChangeState }/>
                    </div>
                    <div>
                        <label>Phone Number</label>
                        <input type="text" name = "phone_number" value = { phone_number } onChange = { ChangeState }/>
                    </div>
                    <div>
                        <label>Password</label>
                        <input type="text" name = "password" value = { password } onChange = { ChangeState }/>
                    </div>
                </div>
                <button>Signup</button>
                <button type = "button" onClick = {() => navigate('/')}>
                    Go back to login
                </button>
            </form>
        </div>)
}

export default Signup // when doing this im telling external files that this page is the login component
//export const Login //If i did this i would be exporting just a component called Login form this file
