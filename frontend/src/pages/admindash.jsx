import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import AdminTopNav from '../assets/AdminTopNav';
import HTTP_CLIENT from '../services/httpClient';
const ADMIN_VIEWS = ['resets', 'organizers'];
const AdminDash = () => {
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [organizers, setOrganizers] = useState([]);
    const [newOrg, setNewOrg] = useState({ org_name: '', category: '', description: '' });
    const [lastCreds, setLastCreds] = useState(null);
    const [lastResetCred, setLastResetCred] = useState(null);
    const [activeView, setActiveView] = useState('resets');
    useEffect(() => {
        const view = new URLSearchParams(location.search).get('view');
        if (view && ADMIN_VIEWS.includes(view)) setActiveView(view);
    }, [location.search]);
    useEffect(() => {
        const current = new URLSearchParams(location.search).get('view') || 'resets';
        if (current !== activeView) navigate(`/admindash?view=${activeView}`, { replace: true });
    }, [activeView, location.search, navigate]);
    const api = async (url, options = {}) => {
        const res = await fetch(HTTP_CLIENT.buildUrl(url), {
            ...options,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
        });
        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : await res.text().catch(() => '');
        if (!res.ok) throw new Error((typeof data === 'object' ? data?.error : '') || 'Request failed');
        return data;
    };
    const load = async () => {
        const all = await api('/api/admin/resets');
        setPending((Array.isArray(all) ? all : []).filter((r) => r.status === 'Pending'));
        const hist = await api('/api/admin/resets/history');
        setHistory(Array.isArray(hist) ? hist : []);
        const orgs = await api('/api/admin/organizers');
        setOrganizers(Array.isArray(orgs) ? orgs : []);
    };
    const act = async (type, id) => {
        const comments = window.prompt('Comments (optional)') || '';
        const data = await api(`/api/admin/resets/${type}/${id}`, { method: 'PUT', body: JSON.stringify({ comments }) });
        if (type === 'approve' && data?.newPassword) {
            setLastResetCred({ requestId: id, password: data.newPassword });
        }
        await load();
    };
    const orgAct = async (action, id) => {
        const method = action === 'delete' ? 'DELETE' : 'PATCH';
        const url = action === 'delete' ? `/api/admin/organizers/${id}` : `/api/admin/organizers/${id}/${action}`;
        await api(url, { method });
        await load();
    };
    const createOrg = async (e) => {
        e.preventDefault();
        const data = await api('/api/admin/create-organizer', { method: 'POST', body: JSON.stringify(newOrg) });
        setLastCreds(data.credentials || null);
        setNewOrg({ org_name: '', category: '', description: '' });
        await load();
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'ADMTR') return LogoutLogic();
        load().catch((e) => alert(e.message));
    }, [token, token_verification, LogoutLogic]);
    return (
        <div className="page">
            {/* <h1>ADMIN DASHBOARD</h1> */}
            <AdminTopNav activeView={activeView} onChangeView={setActiveView} />
            {activeView === 'resets' && (
                <>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 280 }}>
                            <h2>Reset Requests (Pending)</h2>
                            {(pending || []).map((r) => (
                                <div key={r._id} className="card">
                                    <p><strong>{r.organizerId?.org_name || 'Organizer'}</strong> - {r.reason}</p>
                                    <div className="row">
                                        <button type="button" onClick={() => act('approve', r._id)}>Approve</button>
                                        <button type="button" onClick={() => act('reject', r._id)}>Reject</button>
                                    </div>
                                </div>
                            ))}
                            {lastResetCred && (
                                <p className="card">
                                    Latest approved reset password (share with organizer): {lastResetCred.password}
                                </p>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 280 }}>
                            <h2>Reset History</h2>
                            {(history || []).map((r) => (
                                <div key={r._id} className="card">
                                    <p>{r.organizerId?.org_name || 'Organizer'} - {r.status}</p>
                                    <p>{r.adminComments || '-'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            {activeView === 'organizers' && (
                <>
                    {/* <h2>Organizer Management</h2> */}
                    <form onSubmit={createOrg} className="row">
                        <input value={newOrg.org_name} placeholder="Org name" onChange={(e) => setNewOrg((p) => ({ ...p, org_name: e.target.value }))} />
                        <input value={newOrg.category} placeholder="Category (optional)" onChange={(e) => setNewOrg((p) => ({ ...p, category: e.target.value }))} />
                        <input value={newOrg.description} placeholder="Description (optional)" onChange={(e) => setNewOrg((p) => ({ ...p, description: e.target.value }))} />
                        <button type="submit">Create</button>
                    </form>
                    {lastCreds && <p className="card">Generated credentials: {lastCreds.email} / {lastCreds.password}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))', gap: 12 }}>
                        {(organizers || []).map((o) => (
                            <div key={o._id} className="card">
                                <p><strong>{o.org_name}</strong> ({o.email})</p>
                                <p>enabled: {String(o.enabled)} | archived: {String(o.archived)}</p>
                                <div className="row">
                                    <button type="button" onClick={() => orgAct('disable', o._id)}>Disable</button>
                                    <button type="button" onClick={() => orgAct('enable', o._id)}>Enable</button>
                                    <button type="button" onClick={() => orgAct('archive', o._id)}>Archive</button>
                                    <button type="button" onClick={() => orgAct('delete', o._id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
export default AdminDash;
