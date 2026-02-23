import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
const EventDetails = () => {
    const { eventId } = useParams();
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [forum, setForum] = useState([]);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [since, setSince] = useState(new Date().toISOString());
    const token = localStorage.getItem('token');
    const loadDetails = async () => {
        const res = await fetch(`/api/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load event details');
        setData(payload);
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') return LogoutLogic();
        loadDetails().catch((error) => alert(error.message)).finally(() => setLoading(false));
        EVENT_SERVICE.getForum(token, eventId).then((d) => setForum(d.messages || [])).catch(() => {});
        const id = setInterval(async () => {
            try {
                const n = await EVENT_SERVICE.forumNotifications(token, eventId, since);
                if ((n.newCount || 0) > 0) {
                    const d = await EVENT_SERVICE.getForum(token, eventId, { since });
                    setForum((prev) => [...prev, ...(d.messages || [])]);
                    setSince(new Date().toISOString());
                }
            } catch {}
        }, 5000);
        return () => clearInterval(id);
    }, [eventId, token, token_verification, LogoutLogic, since]);
    const register = async () => {
        const res = await fetch(`/api/events/${eventId}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({})
        });
        const payload = await res.json();
        if (!res.ok) return alert(payload.error || 'Registration failed');
        alert(`Registered successfully. Ticket ID: ${payload.ticket_id}`);
        setLoading(true);
        await loadDetails().catch((error) => alert(error.message));
        setLoading(false);
    };
    const postMessage = async () => {
        if (!text.trim()) return;
        try {
            const d = await EVENT_SERVICE.postForum(token, eventId, { text, parentId: replyTo || null });
            setForum((prev) => [...prev, d.forumMessage]);
            setText('');
            setReplyTo('');
            setSince(new Date().toISOString());
        } catch (e) { alert(e.message); }
    };
    if (loading) return <div style={{ padding: '20px' }}><TopNav /><p>Loading event details...</p></div>;
    if (!data) return <div style={{ padding: '20px' }}><TopNav /><p>Event not found.</p></div>;
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
            {myRegistration && <p><strong>Your Ticket:</strong> {myRegistration.ticket_id} ({myRegistration.participation_status})</p>}
            <button type="button" onClick={register} disabled={!canRegister}>{event.event_type === 'Merchandise' ? 'Purchase' : 'Register'}</button>
            {!canRegister && <p style={{ color: 'crimson', marginTop: '8px' }}>{blockingReason}</p>}
            <div className="card" style={{ marginTop: '14px' }}>
                <h2>Discussion Forum</h2>
                <div className="row">
                    <input value={text} onChange={(e) => setText(e.target.value)} placeholder={replyTo ? 'Reply...' : 'Ask a question...'} />
                    {replyTo && <button type="button" onClick={() => setReplyTo('')}>Cancel Reply</button>}
                    <button type="button" onClick={postMessage}>Post</button>
                </div>
                {(forum || []).map((m) => (
                    <div key={m._id} className="card">
                        <p><strong>{m.isAnnouncement ? '[Announcement] ' : ''}{m.authorName}</strong>{m.parentId ? ' (reply)' : ''}</p>
                        <p>{m.text}</p>
                        <div className="row">
                            <button type="button" onClick={() => setReplyTo(m._id)}>Reply</button>
                            <button type="button" onClick={async () => {
                                await EVENT_SERVICE.reactForum(token, eventId, m._id, 'like');
                                const d = await EVENT_SERVICE.getForum(token, eventId);
                                setForum(d.messages || []);
                            }}>Like {(m.reactions || []).find((r) => r.emoji === 'like')?.users?.length || 0}</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default EventDetails;
