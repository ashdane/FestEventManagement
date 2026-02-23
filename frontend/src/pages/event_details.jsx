import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
const EventDetails = () => {
    const { eventId } = useParams();
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const loadDetails = async () => {
        const res = await fetch(`/api/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        if (!res.ok) {
            throw new Error(payload.error || 'Failed to load event details');
        }
        setData(payload);
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') {
            LogoutLogic();
            return;
        }
        loadDetails()
            .catch((error) => alert(error.message))
            .finally(() => setLoading(false));
    }, [eventId]);
    const register = async () => {
        const res = await fetch(`/api/events/${eventId}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
        const payload = await res.json();
        if (!res.ok) {
            alert(payload.error || 'Registration failed');
            return;
        }
        alert(`Registered successfully. Ticket ID: ${payload.ticket_id}`);
        setLoading(true);
        await loadDetails().catch((error) => alert(error.message));
        setLoading(false);
    };
    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <TopNav />
                <p>Loading event details...</p>
            </div>
        );
    }
    if (!data) {
        return (
            <div style={{ padding: '20px' }}>
                <TopNav />
                <p>Event not found.</p>
            </div>
        );
    }
    const { event, canRegister, blockingReason, myRegistration } = data;
    return (
        <div style={{ padding: '20px' }}>
            <TopNav />
            <h1>{event.event_name}</h1>
            <p><strong>Type:</strong> {event.event_type || 'Normal'}</p>
            <p><strong>Description:</strong> {event.event_description}</p>
            <p><strong>Organizer:</strong> {event.organizer_name}</p>
            <p><strong>Organizer Email:</strong> {event.organizer_email}</p>
            <p><strong>Schedule:</strong> {new Date(event.event_start).toLocaleString()} - {new Date(event.event_end).toLocaleString()}</p>
            <p><strong>Registration Deadline:</strong> {new Date(event.reg_deadline).toLocaleString()}</p>
            <p><strong>Fee:</strong> INR {event.reg_fee}</p>
            <p><strong>Limit:</strong> {event.reg_limit}</p>
            <p><strong>Current Registrations:</strong> {event.active_registrations}</p>
            <p><strong>Eligibility:</strong> {event.eligibility}</p>
            {myRegistration && (
                <p>
                    <strong>Your Ticket:</strong> {myRegistration.ticket_id} ({myRegistration.participation_status})
                </p>
            )}
            <button onClick={register} disabled={!canRegister}>
                {event.event_type === 'Merchandise' ? 'Purchase' : 'Register'}
            </button>
            {!canRegister && <p style={{ color: 'crimson', marginTop: '8px' }}>{blockingReason}</p>}
        </div>
    );
};
export default EventDetails;
