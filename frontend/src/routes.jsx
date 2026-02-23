import { Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import Signup from './pages/signup' // It must be capitalized, or else it will be mistken for a html component
import AdminDash from './pages/admindash'
import OrgDash from './pages/orgdash'
import PPTDash from './pages/pptdash'
import Profile from './pages/profile'
import OrganizersAndClubs from './pages/organizers_and_club'
import BrowseEvents from './pages/browse_events'
import EventDetails from './pages/event_details'
import AttendanceScan from './pages/attendance_scan'
const RoutingFunction = () => {
    return (
    <Routes>
        <Route path = "/" element = {<Login />} />
        <Route path = "/signup" element = {<Signup />} />
        <Route path = "/admindash" element = {<AdminDash />} />
        <Route path = "/orgdash" element = {<OrgDash />} />
        <Route path = "/pptdash" element = {<PPTDash />} />
        <Route path = "/profile" element = {<Profile />} />
        <Route path = "/organizers_and_clubs" element = {<OrganizersAndClubs />} />
        <Route path = "/browse_events" element = {<BrowseEvents />} />
        <Route path = "/events/:eventId" element = {<EventDetails />} />
        <Route path = "/attendance_scan" element = {<AttendanceScan />} />
    </Routes>
    )
}
export default RoutingFunction
