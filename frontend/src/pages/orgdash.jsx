import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
import HOME_SERVICE from '../services/homeServices';
import FormBuilder from '../components/events/FormBuilder';
import OrgTopNav from '../assets/OrgTopNav';
const VIEWS = { DASHBOARD: 'dashboard', CREATE: 'create', PROFILE: 'profile', ONGOING: 'ongoing' };
const DEFAULT_DRAFT = {
    event_name: '', event_description: '', event_type: 'Normal', eligibility: 'ALL',
    reg_deadline: '', event_start: '', event_end: '', reg_limit: 100, reg_fee: 0
};
const EMPTY_ANALYTICS = { completed_events: 0, total_registrations: 0, total_sales: 0, total_revenue: 0, total_attendance: 0 };
const OrgDash = () => {
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const location = useLocation();
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
    const [forum, setForum] = useState([]);
    const [forumText, setForumText] = useState('');
    const [forumAnnouncement, setForumAnnouncement] = useState(false);
    const [activeView, setActiveView] = useState(VIEWS.DASHBOARD);
    const [loading, setLoading] = useState(true);
    const selectedEvent = useMemo(() => events.find((e) => e._id === selectedEventId) || null, [events, selectedEventId]);
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
    const loadDetail = useCallback(async (eventId, filters = detailFilters) => {
        const data = await EVENT_SERVICE.getOrganizerEventDetails(token, eventId, filters);
        setDetail(data);
        setSelectedEventId(eventId);
        const f = await EVENT_SERVICE.getForum(token, eventId).catch(() => ({ messages: [] }));
        setForum(f.messages || []);
    }, [token, detailFilters]);
    const loadProfile = useCallback(async () => {
        const [data, history] = await Promise.all([
            HOME_SERVICE.get_org_details(token),
            HOME_SERVICE.getMyResetHistory(token).catch(() => [])
        ]);
        setProfile((p) => ({ ...p, ...data }));
        setResetHistory(history || []);
    }, [token]);
    useEffect(() => {
        if (!selectedEventId) return undefined;
        const id = setInterval(async () => {
            const d = await EVENT_SERVICE.getForum(token, selectedEventId).catch(() => ({ messages: [] }));
            setForum(d.messages || []);
        }, 5000);
        return () => clearInterval(id);
    }, [token, selectedEventId]);
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'OGR') return LogoutLogic();
        Promise.all([fetchDashboard(), loadProfile()]).catch((e) => alert(e.message)).finally(() => setLoading(false));
    }, [token, token_verification, LogoutLogic, fetchDashboard, loadProfile]);
    const createDraft = useCallback(async (e) => {
        e.preventDefault();
        try { await EVENT_SERVICE.createEventDraft(token, draftData); setDraftData(DEFAULT_DRAFT); await fetchDashboard(); alert('Draft created'); } catch (err) { alert(err.message); }
    }, [token, draftData, fetchDashboard]);
    const updateEvent = useCallback(async (eventId, payload) => {
        try { await EVENT_SERVICE.updateOrganizerEvent(token, eventId, payload); await fetchDashboard(); alert('Event updated'); } catch (err) { alert(err.message); }
    }, [token, fetchDashboard]);
    const publishEvent = useCallback(async (eventId) => {
        try { await EVENT_SERVICE.publishEvent(token, eventId); await fetchDashboard(); alert('Event published'); } catch (err) { alert(err.message); }
    }, [token, fetchDashboard]);
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
    const postForum = async () => {
        if (!selectedEventId || !forumText.trim()) return;
        try {
            await EVENT_SERVICE.postForum(token, selectedEventId, { text: forumText.trim(), isAnnouncement: forumAnnouncement });
            setForumText('');
            setForumAnnouncement(false);
            const d = await EVENT_SERVICE.getForum(token, selectedEventId);
            setForum(d.messages || []);
        } catch (err) { alert(err.message); }
    };
    const pinForum = async (id, pinned) => {
        try {
            await EVENT_SERVICE.pinForum(token, selectedEventId, id, !pinned);
            const d = await EVENT_SERVICE.getForum(token, selectedEventId);
            setForum(d.messages || []);
        } catch (err) { alert(err.message); }
    };
    const deleteForum = async (id) => {
        try {
            await EVENT_SERVICE.deleteForum(token, selectedEventId, id);
            setForum((prev) => prev.filter((m) => m._id !== id));
        } catch (err) { alert(err.message); }
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
                                <button type="button" onClick={() => setActiveView(VIEWS.CREATE)}>Manage Event</button>
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
                            <select name="event_type" value={draftData.event_type} onChange={(e) => setDraftData((p) => ({ ...p, event_type: e.target.value }))}><option value="Normal">Normal</option><option value="Merchandise">Merchandise</option></select>
                            <select name="eligibility" value={draftData.eligibility} onChange={(e) => setDraftData((p) => ({ ...p, eligibility: e.target.value }))}><option value="ALL">All</option><option value="IIIT">IIIT</option><option value="NON_IIIT">Non-IIIT</option></select>
                            <input type="date" name="reg_deadline" value={draftData.reg_deadline} onChange={(e) => setDraftData((p) => ({ ...p, reg_deadline: e.target.value }))} required />
                            <input type="date" name="event_start" value={draftData.event_start} onChange={(e) => setDraftData((p) => ({ ...p, event_start: e.target.value }))} required />
                            <input type="date" name="event_end" value={draftData.event_end} onChange={(e) => setDraftData((p) => ({ ...p, event_end: e.target.value }))} required />
                            <input type="number" name="reg_limit" value={draftData.reg_limit} onChange={(e) => setDraftData((p) => ({ ...p, reg_limit: Number(e.target.value) }))} required />
                            <input type="number" name="reg_fee" value={draftData.reg_fee} onChange={(e) => setDraftData((p) => ({ ...p, reg_fee: Number(e.target.value) }))} required />
                            <button type="submit">Create Draft</button>
                        </form>
                    </div>
                    {events.map((e) => (
                        <div key={e._id} className="card">
                                <h3>{e.event_name}</h3>
                                <p>Status: {e.status} | Type: {e.event_type}</p>
                                <p>{e.event_description}</p>
                                <div className="row">
                                    <button type="button" onClick={() => loadDetail(e._id)}>View Detail</button>
                                    {e.status === 'DRAFT' && <>
                                        <button type="button" onClick={() => setSelectedEventId(selectedEventId === e._id ? '' : e._id)}>{selectedEventId === e._id ? 'Hide Form Builder' : 'Define Required Fields'}</button>
                                        <button type="button" onClick={() => publishEvent(e._id)}>Publish</button>
                                </>}
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
                        </div>
                    ))}
                    {selectedEvent && <FormBuilder eventId={selectedEvent._id} token={token} />}
                    {detail && (
                        <div className="card">
                            <h2>Event Detail</h2>
                            <p><strong>Name:</strong> {detail.event.event_name}</p>
                            <p><strong>Type:</strong> {detail.event.event_type} | <strong>Status:</strong> {detail.event.status}</p>
                            <p><strong>Dates:</strong> {new Date(detail.event.event_start).toLocaleString()} - {new Date(detail.event.event_end).toLocaleString()}</p>
                            <p><strong>Eligibility:</strong> {detail.event.eligibility} | <strong>Pricing:</strong> INR {detail.event.reg_fee}</p>
                            <p><strong>Registrations/Sales:</strong> {detail.detailAnalytics?.sales ?? detail.registrationsCount} | <strong>Attendance:</strong> {detail.detailAnalytics?.attendance ?? detail.attendanceCount} | <strong>Team completion:</strong> {detail.detailAnalytics?.teamCompletion ?? 0} | <strong>Revenue:</strong> INR {detail.detailAnalytics?.revenue ?? 0}</p>
                            <div className="row">
                                <input placeholder="Search participant/email/team" value={detailFilters.q} onChange={(e) => setDetailFilters((f) => ({ ...f, q: e.target.value }))} />
                                <select value={detailFilters.status} onChange={(e) => setDetailFilters((f) => ({ ...f, status: e.target.value }))}>
                                    <option value="">All Status</option><option value="REGISTERED">REGISTERED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option><option value="REJECTED">REJECTED</option>
                                </select>
                                <button type="button" onClick={() => loadDetail(detail.event._id, detailFilters)}>Apply</button>
                                <button type="button" onClick={exportCsv}>Export CSV</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table><thead><tr><th>Name</th><th>Email</th><th>Reg Date</th><th>Payment</th><th>Team</th><th>Attendance</th></tr></thead><tbody>
                                    {(detail.participants || []).map((p) => <tr key={p.ticket_id || `${p.email}-${p.regDate}`}><td>{p.name}</td><td>{p.email}</td><td>{p.regDate ? new Date(p.regDate).toLocaleString() : '-'}</td><td>{p.payment}</td><td>{p.team}</td><td>{p.attendance ? 'Yes' : 'No'}</td></tr>)}
                                </tbody></table>
                            </div>
                            <h3>Forum Moderation</h3>
                            <div className="column">
                                <input placeholder="Post update or reply" value={forumText} onChange={(e) => setForumText(e.target.value)} />
                                <label><input type="checkbox" checked={forumAnnouncement} onChange={(e) => setForumAnnouncement(e.target.checked)} /> Announcement</label>
                                <button type="button" onClick={postForum}>Post</button>
                            </div>
                            {(forum || []).map((m) => (
                                <div key={m._id} className="card">
                                    <p><strong>{m.pinned ? '[Pinned] ' : ''}{m.isAnnouncement ? '[Announcement] ' : ''}{m.authorName}</strong></p>
                                    <p>{m.text}</p>
                                    <div className="column">
                                        <button type="button" onClick={() => pinForum(m._id, m.pinned)}>{m.pinned ? 'Unpin' : 'Pin'}</button>
                                        <button type="button" onClick={() => deleteForum(m._id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
