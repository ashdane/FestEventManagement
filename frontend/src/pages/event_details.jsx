import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
const EventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [merch, setMerch] = useState({ size: '', color: '', quantity: 1, paymentProof: null });
    const token = localStorage.getItem('token');
    const loadDetails = async () => {
        const payload = await EVENT_SERVICE.getEventDetails(token, eventId);
        setData(payload);
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') return LogoutLogic();
        loadDetails().catch((error) => alert(error.message)).finally(() => setLoading(false));
    }, [eventId, token, token_verification, LogoutLogic]);
    const register = async () => {
        try {
            const isMerch = data?.event?.event_type === 'Merchandise';
            const payload = isMerch
                ? await EVENT_SERVICE.buyMerchandise(token, {
                    eventId,
                    size: merch.size,
                    color: merch.color,
                    quantity: Number(merch.quantity || 1),
                    paymentProof: merch.paymentProof
                })
                : await EVENT_SERVICE.registerForEvent(token, eventId, {});
            alert(isMerch ? `Order placed. Status: Pending Approval` : `Registered successfully. Ticket ID: ${payload.ticket_id}`);
            setLoading(true);
            await loadDetails().catch((error) => alert(error.message));
            setLoading(false);
        } catch (error) {
            alert(error.message || 'Registration failed');
        }
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
            {event.event_type === 'Merchandise' && (
                <div className="card" style={{ marginBottom: '12px' }}>
                    <p><strong>Stock:</strong> {event.stockqty || 0}</p>
                    <label>Size<select value={merch.size} onChange={(e) => setMerch((m) => ({ ...m, size: e.target.value }))}><option value="">Select</option>{(event.merchandiseDetails?.sizes || []).map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                    <label>Color<select value={merch.color} onChange={(e) => setMerch((m) => ({ ...m, color: e.target.value }))}><option value="">Select</option>{(event.merchandiseDetails?.colors || []).map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
                    <label>Quantity<input type="number" min="1" max={event.merchandiseDetails?.purchaseLimitPerParticipant || 1} value={merch.quantity} onChange={(e) => setMerch((m) => ({ ...m, quantity: Number(e.target.value) }))} /></label>
                    <label>Payment Proof<input type="file" accept="image/*" onChange={(e) => setMerch((m) => ({ ...m, paymentProof: e.target.files?.[0] || null }))} /></label>
                </div>
            )}
            {event.event_type === 'Merchandise' ? (
                <button type="button" onClick={register} disabled={!canRegister}>Purchase Merchandise</button>
            ) : (
                <button type="button" onClick={register} disabled={!canRegister}>Register for Event</button>
            )}
            {!canRegister && <p style={{ color: 'crimson', marginTop: '8px' }}>{blockingReason}</p>}
            <div className="card" style={{ marginTop: '14px' }}>
                <h2>Discussion Forum</h2>
                <p>{myRegistration ? 'Open chat to post, reply, and react.' : 'Register first to access event discussion.'}</p>
                <button type="button" disabled={!myRegistration} onClick={() => navigate(`/events/${eventId}/forum`)}>Open Forum Chat</button>
            </div>
        </div>
    );
};
export default EventDetails;
