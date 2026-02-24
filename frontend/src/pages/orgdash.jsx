import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
import HOME_SERVICE from '../services/homeServices';
import FormBuilder from '../components/events/FormBuilder';
import OrgTopNav from '../assets/OrgTopNav';
const VIEWS = { DASHBOARD: 'dashboard', CREATE: 'create', PROFILE: 'profile', ONGOING: 'ongoing' };
const DEFAULT_DRAFT = {
    event_name: '', event_description: '', event_type: 'Normal', eligibility: 'ALL',
    reg_deadline: '', event_start: '', event_end: '', reg_limit: 100, reg_fee: 0,
    stockqty: 0, merch_sizes: '', merch_colors: '', purchaseLimitPerParticipant: 1
};
const EMPTY_ANALYTICS = { completed_events: 0, total_registrations: 0, total_sales: 0, total_revenue: 0, total_attendance: 0 };
const OrgDash = () => {
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
    const [draftData, setDraftData] = useState(DEFAULT_DRAFT);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [detail, setDetail] = useState(null);
    const [detailFilters, setDetailFilters] = useState({ q: '', status: '' });
    const [profile, setProfile] = useState({ org_name: '', category: '', description: '', contact_email: '', phone_number: '', discord_webhook_url: '', email: '' });
    const [resetReason, setResetReason] = useState('');
    const [resetHistory, setResetHistory] = useState([]);
    const [activeView, setActiveView] = useState(VIEWS.DASHBOARD);
    const [loading, setLoading] = useState(true);
    const ongoingEvents = useMemo(() => events.filter((e) => e.status === 'ONGOING'), [events]);
    useEffect(() => {
        const view = new URLSearchParams(location.search).get('view');
        if (view && Object.values(VIEWS).includes(view)) setActiveView(view);
    }, [location.search]);
    const fetchDashboard = useCallback(async () => {
        const data = await EVENT_SERVICE.getOrganizerDashboardSummary(token);
        setEvents(data.events || []);
        setAnalytics(data.analytics || EMPTY_ANALYTICS);
    }, [token]);
    const loadDetail = useCallback(async (eventId, filters = detailFilters, force = false) => {
        if (!force && detail?.event?._id === eventId) {
            setDetail(null);
            return;
        }
        const data = await EVENT_SERVICE.getOrganizerEventDetails(token, eventId, filters);
        setDetail(data);
        setSelectedEventId(eventId);
    }, [token, detailFilters, detail]);
    const loadProfile = useCallback(async () => {
        const [data, history] = await Promise.all([
            HOME_SERVICE.get_org_details(token),
            HOME_SERVICE.getMyResetHistory(token).catch(() => [])
        ]);
        setProfile((p) => ({ ...p, ...data }));
        setResetHistory(history || []);
    }, [token]);
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'OGR') return LogoutLogic();
        Promise.all([fetchDashboard(), loadProfile()]).catch((e) => alert(e.message)).finally(() => setLoading(false));
    }, [token, token_verification, LogoutLogic, fetchDashboard, loadProfile]);
    const createDraft = useCallback(async (e) => {
        e.preventDefault();
        const csvToArr = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
        const payload = draftData.event_type === 'Merchandise'
            ? {
                ...draftData,
                stockqty: Number(draftData.stockqty || 0),
                merchandiseDetails: {
                    sizes: csvToArr(draftData.merch_sizes),
                    colors: csvToArr(draftData.merch_colors),
                    purchaseLimitPerParticipant: Number(draftData.purchaseLimitPerParticipant || 1)
                }
            }
            : draftData;
        delete payload.merch_sizes;
        delete payload.merch_colors;
        delete payload.purchaseLimitPerParticipant;
        try { await EVENT_SERVICE.createEventDraft(token, payload); setDraftData(DEFAULT_DRAFT); await fetchDashboard(); alert('Draft created'); } catch (err) { alert(err.message); }
    }, [token, draftData, fetchDashboard]);
    const updateEvent = useCallback(async (eventId, payload) => {
        try { await EVENT_SERVICE.updateOrganizerEvent(token, eventId, payload); await fetchDashboard(); alert('Event updated'); } catch (err) { alert(err.message); }
    }, [token, fetchDashboard]);
    const publishEvent = useCallback(async (eventId) => {
        try { await EVENT_SERVICE.publishEvent(token, eventId); await fetchDashboard(); alert('Event published'); } catch (err) { alert(err.message); }
    }, [token, fetchDashboard]);
    const moderateMerch = useCallback(async (type, ticketId, eventId) => {
        try {
            if (type === 'approve') await EVENT_SERVICE.approveMerchandisePayment(token, ticketId);
            else await EVENT_SERVICE.rejectMerchandisePayment(token, ticketId);
            await Promise.all([fetchDashboard(), loadDetail(eventId, detailFilters)]);
            alert(`Payment ${type}d`);
        } catch (err) { alert(err.message); }
    }, [token, fetchDashboard, loadDetail, detailFilters]);
    const saveProfile = async (e) => {
        e.preventDefault();
        try { await HOME_SERVICE.update_org_details(token, profile); alert('Profile saved'); await loadProfile(); } catch (err) { alert(err.message); }
    };
    const submitReset = async (e) => {
        e.preventDefault();
        if (!resetReason.trim()) return;
        try {
            await HOME_SERVICE.requestReset(token, resetReason.trim());
            setResetReason('');
            await loadProfile();
            alert('Reset request submitted');
        } catch (err) { alert(err.message); }
    };
    const exportCsv = async () => {
        if (!selectedEventId) return;
        const params = new URLSearchParams({ format: 'csv', ...detailFilters }).toString();
        const res = await fetch(`/api/events/organizer/${selectedEventId}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return alert('CSV export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-${selectedEventId}-participants.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div className="page">
            {/* <h1>ORGANIZER DASHBOARD</h1> */}
            <OrgTopNav activeView={activeView} onChangeView={setActiveView} />
            {loading && <p>Loading dashboard...</p>}
            {!loading && activeView === VIEWS.DASHBOARD && (
                <>
                    <h2>Events</h2>
                    <div className="column">
                        {events.map((e) => (
                            <div key={e._id} className="card">
                                <h3>{e.event_name}</h3>
                                <p>Type: {e.event_type} | Status: {e.status}</p>
                                <p>Fee: INR {e.reg_fee}</p>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setActiveView(VIEWS.CREATE);
                                        await loadDetail(e._id, detailFilters, true).catch((err) => alert(err.message));
                                    }}
                                >
                                    Manage Event
                                </button>
                            </div>
                        ))}
                    </div>
                    <h2>Analytics</h2>
                    <div className="column">
                        <div className="card">Completed: {analytics.completed_events}</div>
                        <div className="card">Registrations: {analytics.total_registrations}</div>
                        <div className="card">Sales: {analytics.total_sales}</div>
                        <div className="card">Revenue: INR {analytics.total_revenue}</div>
                        <div className="card">Attendance: {analytics.total_attendance}</div>
                    </div>
                </>
            )}
            {!loading && activeView === VIEWS.CREATE && (
                <>
                    <div className="card">
                        <h2>Create Event Draft</h2>
                        <form onSubmit={createDraft} className="column">
                            <input name="event_name" value={draftData.event_name} placeholder="Event Name" onChange={(e) => setDraftData((p) => ({ ...p, event_name: e.target.value }))} required />
                            <textarea name="event_description" value={draftData.event_description} placeholder="Description" onChange={(e) => setDraftData((p) => ({ ...p, event_description: e.target.value }))} required />
                            <label>Event Type<select name="event_type" value={draftData.event_type} onChange={(e) => setDraftData((p) => ({ ...p, event_type: e.target.value }))}><option value="Normal">Normal</option><option value="Merchandise">Merchandise</option></select></label>
                            <label>Eligibility<select name="eligibility" value={draftData.eligibility} onChange={(e) => setDraftData((p) => ({ ...p, eligibility: e.target.value }))}><option value="ALL">All</option><option value="IIIT">IIIT</option><option value="NON_IIIT">Non-IIIT</option></select></label>
                            <label>Registration Deadline<input type="date" name="reg_deadline" value={draftData.reg_deadline} onChange={(e) => setDraftData((p) => ({ ...p, reg_deadline: e.target.value }))} required /></label>
                            <label>Event Start Date<input type="date" name="event_start" value={draftData.event_start} onChange={(e) => setDraftData((p) => ({ ...p, event_start: e.target.value }))} required /></label>
                            <label>Event End Date<input type="date" name="event_end" value={draftData.event_end} onChange={(e) => setDraftData((p) => ({ ...p, event_end: e.target.value }))} required /></label>
                            <label>Registration Limit<input type="number" name="reg_limit" value={draftData.reg_limit} onChange={(e) => setDraftData((p) => ({ ...p, reg_limit: Number(e.target.value) }))} required /></label>
                            <label>Registration Fee (INR)<input type="number" name="reg_fee" value={draftData.reg_fee} onChange={(e) => setDraftData((p) => ({ ...p, reg_fee: Number(e.target.value) }))} required /></label>
                            {draftData.event_type === 'Merchandise' && <>
                                <label>Stock Quantity<input type="number" name="stockqty" value={draftData.stockqty} onChange={(e) => setDraftData((p) => ({ ...p, stockqty: Number(e.target.value) }))} required /></label>
                                <label>Available Sizes (comma separated)<input name="merch_sizes" value={draftData.merch_sizes} placeholder="S, M, L" onChange={(e) => setDraftData((p) => ({ ...p, merch_sizes: e.target.value }))} required /></label>
                                <label>Available Colors (comma separated)<input name="merch_colors" value={draftData.merch_colors} placeholder="Black, White" onChange={(e) => setDraftData((p) => ({ ...p, merch_colors: e.target.value }))} required /></label>
                                <label>Purchase Limit Per Participant<input type="number" min="1" name="purchaseLimitPerParticipant" value={draftData.purchaseLimitPerParticipant} onChange={(e) => setDraftData((p) => ({ ...p, purchaseLimitPerParticipant: Number(e.target.value) }))} required /></label>
                            </>}
                            <button type="submit">Create Draft</button>
                        </form>
                    </div>
                    {events.map((e) => {
                        const isDetailOpen = detail?.event?._id === e._id;
                        const isFormOpen = isDetailOpen && selectedEventId === e._id && e.status === 'DRAFT';
                        return (
                            <div key={e._id} className="card">
                                <h3>{e.event_name}</h3>
                                <p>Status: {e.status} | Type: {e.event_type}</p>
                                <p>{e.event_description}</p>
                                <div className="row">
                                    <button type="button" onClick={() => loadDetail(e._id)}>{isDetailOpen ? 'Hide Detail' : 'View Detail'}</button>
                                    {e.status === 'DRAFT' && isDetailOpen && (
                                        <button type="button" onClick={() => setSelectedEventId(isFormOpen ? '' : e._id)}>
                                            {isFormOpen ? 'Hide Add Fields' : 'Add/Define Fields'}
                                        </button>
                                    )}
                                    {e.status === 'DRAFT' && <button type="button" onClick={() => publishEvent(e._id)}>Publish</button>}
                                    {e.status === 'PUBLISHED' && <>
                                        <button type="button" onClick={() => updateEvent(e._id, { event_description: `${e.event_description} (edited)` })}>Update Description</button>
                                        <button type="button" onClick={() => updateEvent(e._id, { reg_limit: Number(e.reg_limit) + 10 })}>Increase Limit +10</button>
                                        <button type="button" onClick={() => updateEvent(e._id, { registration_closed: true })}>Close Registrations</button>
                                    </>}
                                    {['ONGOING', 'COMPLETED'].includes(e.status) && <>
                                        <button type="button" onClick={() => updateEvent(e._id, { status: 'COMPLETED' })}>Mark Completed</button>
                                        <button type="button" onClick={() => updateEvent(e._id, { status: 'CLOSED' })}>Mark Closed</button>
                                    </>}
                                </div>
                                {isDetailOpen && (
                                    <div className="card event-detail-inner">
                                        <h2>Event Detail</h2>
                                        <p><strong>Name:</strong> {detail.event.event_name}</p>
                                        <p><strong>Type:</strong> {detail.event.event_type} | <strong>Status:</strong> {detail.event.status}</p>
                                        <p><strong>Dates:</strong> {new Date(detail.event.event_start).toLocaleString()} - {new Date(detail.event.event_end).toLocaleString()}</p>
                                        <p><strong>Eligibility:</strong> {detail.event.eligibility} | <strong>Pricing:</strong> INR {detail.event.reg_fee}</p>
                                        {detail.event.event_type === 'Merchandise' && <p><strong>Merch:</strong> Stock {detail.event.stockqty || 0} | Sizes {(detail.event.merchandiseDetails?.sizes || []).join(', ') || '-'} | Colors {(detail.event.merchandiseDetails?.colors || []).join(', ') || '-'} | Per-user Limit {detail.event.merchandiseDetails?.purchaseLimitPerParticipant || 1}</p>}
                                        <p><strong>Registrations/Sales:</strong> {detail.detailAnalytics?.sales ?? detail.registrationsCount} | <strong>Attendance:</strong> {detail.detailAnalytics?.attendance ?? detail.attendanceCount} | <strong>Team completion:</strong> {detail.detailAnalytics?.teamCompletion ?? 0} | <strong>Revenue:</strong> INR {detail.detailAnalytics?.revenue ?? 0}</p>
                                        {isFormOpen && <FormBuilder eventId={e._id} token={token} />}
                                        <div className="row">
                                            <input placeholder="Search participant/email/team" value={detailFilters.q} onChange={(x) => setDetailFilters((f) => ({ ...f, q: x.target.value }))} />
                                            <select value={detailFilters.status} onChange={(x) => setDetailFilters((f) => ({ ...f, status: x.target.value }))}>
                                                <option value="">All Status</option><option value="REGISTERED">REGISTERED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option><option value="REJECTED">REJECTED</option>
                                            </select>
                                            <button type="button" onClick={() => loadDetail(e._id, detailFilters)}>Apply</button>
                                            <button type="button" onClick={exportCsv}>Export CSV</button>
                                        </div>
                                        {detail.event.event_type === 'Merchandise' && (
                                            <>
                                                <h3>Merchandise Orders (Payment Moderation)</h3>
                                                {!!(detail.merchOrders || []).length && (
                                                    <div style={{ overflowX: 'auto' }}>
                                                        <table><thead><tr><th>Ticket</th><th>Name</th><th>Email</th><th>Size</th><th>Color</th><th>Qty</th><th>Status</th><th>Payment Proof</th><th>Action</th></tr></thead><tbody>
                                                            {(detail.merchOrders || []).map((o) => <tr key={o._id}><td>{o.ticketId}</td><td>{o.participantName || '-'}</td><td>{o.participantEmail || '-'}</td><td>{o.size || '-'}</td><td>{o.color || '-'}</td><td>{o.qty || 0}</td><td>{o.status}</td><td>{o.paymentProofUrl ? <a href={o.paymentProofUrl} target="_blank" rel="noreferrer">View</a> : '-'}</td><td>{o.status === 'Pending Approval' ? <><button type="button" onClick={() => moderateMerch('approve', o._id, e._id)}>Approve</button><button type="button" onClick={() => moderateMerch('reject', o._id, e._id)}>Reject</button></> : '-'}</td></tr>)}
                                                        </tbody></table>
                                                    </div>
                                                )}
                                                {!((detail.merchOrders || []).length) && <p>No orders yet.</p>}
                                            </>
                                        )}
                                        {detail.event.event_type !== 'Merchandise' && !!(detail.participants || []).length && (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table><thead><tr><th>Name</th><th>Email</th><th>Reg Date</th><th>Payment</th><th>Team</th><th>Attendance</th></tr></thead><tbody>
                                                    {(detail.participants || []).map((p) => <tr key={p.ticket_id || `${p.email}-${p.regDate}`}><td>{p.name}</td><td>{p.email}</td><td>{p.regDate ? new Date(p.regDate).toLocaleString() : '-'}</td><td>{p.payment}</td><td>{p.team}</td><td>{p.attendance ? 'Yes' : 'No'}</td></tr>)}
                                                </tbody></table>
                                            </div>
                                        )}
                                        {detail.event.event_type !== 'Merchandise' && !((detail.participants || []).length) && <p>No participant records yet.</p>}
                                        <h3>Forum Moderation</h3>
                                        <button type="button" onClick={() => navigate(`/events/${e._id}/forum`)}>Open Forum Chat</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
            {!loading && activeView === VIEWS.ONGOING && (
                <div className="card"><h2>Ongoing Events</h2>{ongoingEvents.length ? ongoingEvents.map((e) => <p key={e._id}>{e.event_name} ({e.event_type}) - {e.status}</p>) : <p>No ongoing events right now.</p>}</div>
            )}
            {!loading && activeView === VIEWS.PROFILE && (
                <div className="card">
                    <h2>Organizer Profile</h2>
                    <form onSubmit={saveProfile} className="column">
                        <input value={profile.org_name || ''} placeholder="Name" onChange={(e) => setProfile((p) => ({ ...p, org_name: e.target.value }))} />
                        <input value={profile.category || ''} placeholder="Category" onChange={(e) => setProfile((p) => ({ ...p, category: e.target.value }))} />
                        <input value={profile.contact_email || ''} placeholder="Contact Email" onChange={(e) => setProfile((p) => ({ ...p, contact_email: e.target.value }))} />
                        <input value={profile.phone_number || ''} placeholder="Contact Number" onChange={(e) => setProfile((p) => ({ ...p, phone_number: e.target.value }))} />
                        <input value={profile.email || ''} placeholder="Login Email (non-editable)" readOnly />
                        <input value={profile.discord_webhook_url || ''} placeholder="Discord Webhook URL" onChange={(e) => setProfile((p) => ({ ...p, discord_webhook_url: e.target.value }))} />
                        <textarea value={profile.description || ''} placeholder="Description" onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))} />
                        <button type="submit">Save Profile</button>
                    </form>
                    <h3>Password Reset Request</h3>
                    <form onSubmit={submitReset} className="column">
                        <input value={resetReason} onChange={(e) => setResetReason(e.target.value)} placeholder="Reason for reset" />
                        <button type="submit">Request Reset</button>
                    </form>
                    {(resetHistory || []).map((r) => <p key={r._id}>{new Date(r.createdAt).toLocaleString()} - {r.status}{r.adminComments ? ` (${r.adminComments})` : ''}</p>)}
                </div>
            )}
        </div>
    );
};
export default OrgDash;
