import { useEffect } from 'react'
import useLogout from '../hooks/useLogout'
import useVerifyRoles from '../hooks/useVerifyRoles'
const AdminDash = () =>
{
    const { token_verification } = useVerifyRoles()
    const { LogoutLogic } = useLogout()
    
    useEffect(() => { //useEffect is used to have these functions not disturb reacts render cycle (it only executes these after the UI is fully rendered)
        const token = localStorage.getItem('token')
        const role = token_verification(token) 
        if(role != "ADMTR")
        {
            console.log("Role mismatch while entering AdminDash")
            LogoutLogic()
        }
    }, [token_verification, LogoutLogic])

    return (
    <div>
        <h1>ADMIN DASHBOARD</h1>
        <button onClick={ LogoutLogic }>LOGOUT</button>
        <button> Create User </button>
        <button>  Clubs/Organization Administration </button>
    </div>
    )
}
export default AdminDash