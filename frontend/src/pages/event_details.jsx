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
    const [submitting, setSubmitting] = useState(false);
    const [merch, setMerch] = useState({ size: '', color: '', quantity: 1, paymentProof: null });
    const [formValues, setFormValues] = useState({});
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
        if (submitting) return;
        setSubmitting(true);
        try {
            const isMerch = data?.event?.event_type === 'Merchandise';
            const formFields = data?.event?.event_registration_form || [];
            if (formFields.length) {
                const missing = formFields.find((f) => f.required && !String(formValues?.[f.fieldName] ?? '').trim());
                if (missing) return alert(`Please fill required field: ${missing.fieldName}`);
            }
            const payload = isMerch
                ? await EVENT_SERVICE.buyMerchandise(token, {
                    eventId,
                    size: merch.size,
                    color: merch.color,
                    quantity: Number(merch.quantity || 1),
                    paymentProof: merch.paymentProof,
                    formResponses: JSON.stringify(formValues)
                })
                : await EVENT_SERVICE.registerForEvent(token, eventId, { formResponses: formValues });
            alert(isMerch ? `Order placed. Status: Pending Approval` : `Registered successfully. Ticket ID: ${payload.ticket_id}`);
            setLoading(true);
            await loadDetails().catch((error) => alert(error.message));
            setLoading(false);
        } catch (error) {
            alert(error.message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };
    if (loading) return <div style={{ padding: '20px' }}><TopNav /><p>Loading event details...</p></div>;
    if (!data) return <div style={{ padding: '20px' }}><TopNav /><p>Event not found.</p></div>;
    const { event, canRegister, blockingReason, myRegistration } = data;
    const fields = event.event_registration_form || [];
    const setField = (key, val) => setFormValues((p) => ({ ...p, [key]: val }));
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
            {!!fields.length && (
                <div className="card" style={{ marginBottom: '12px' }}>
                    <h3>{event.event_type === 'Merchandise' ? 'Additional Details Form' : 'Registration Form'}</h3>
                    {fields.map((f) => (
                        <div key={f._id || f.fieldName} style={{ marginBottom: '8px' }}>
                            <label>{f.fieldName}{f.required ? ' *' : ''}</label>
                            {f.fieldType === 'DROPDOWN' && (
                                <select value={formValues[f.fieldName] || ''} onChange={(e) => setField(f.fieldName, e.target.value)}>
                                    <option value="">Select</option>
                                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            )}
                            {f.fieldType === 'CHECKBOX' && (
                                <div className="row">
                                    {(f.options || []).map((o) => (
                                        <label key={o}>
                                            <input
                                                type="checkbox"
                                                checked={(String(formValues[f.fieldName] || '').split(',').filter(Boolean)).includes(o)}
                                                onChange={(e) => {
                                                    const current = String(formValues[f.fieldName] || '').split(',').filter(Boolean);
                                                    const next = e.target.checked ? [...current, o] : current.filter((x) => x !== o);
                                                    setField(f.fieldName, next.join(','));
                                                }}
                                            /> {o}
                                        </label>
                                    ))}
                                </div>
                            )}
                            {f.fieldType === 'NUMBER' && <input type="number" value={formValues[f.fieldName] || ''} onChange={(e) => setField(f.fieldName, e.target.value)} />}
                            {f.fieldType === 'FILE' && <input type="text" placeholder="Paste uploaded file URL" value={formValues[f.fieldName] || ''} onChange={(e) => setField(f.fieldName, e.target.value)} />}
                            {!['DROPDOWN', 'CHECKBOX', 'NUMBER', 'FILE'].includes(f.fieldType) && (
                                <input type="text" value={formValues[f.fieldName] || ''} onChange={(e) => setField(f.fieldName, e.target.value)} />
                            )}
                        </div>
                    ))}
                </div>
            )}
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
                <button type="button" onClick={register} disabled={!canRegister || submitting}>{submitting ? 'Submitting...' : 'Purchase Merchandise'}</button>
            ) : (
                <button type="button" onClick={register} disabled={!canRegister || submitting}>{submitting ? 'Submitting...' : 'Register for Event'}</button>
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
