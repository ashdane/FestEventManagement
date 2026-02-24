import { useEffect, useMemo, useState } from 'react';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
import OrgTopNav from '../assets/OrgTopNav';
import jsQR from 'jsqr';

const AttendanceScan = () => {
    const token = localStorage.getItem('token');
    const { token_verification } = useVerifyRoles();
    const [events, setEvents] = useState([]);
    const [eventId, setEventId] = useState('');
    const [ticketId, setTicketId] = useState('');
    const [dash, setDash] = useState({ stats: {}, scanned: [], pending: [] });
    const [audit, setAudit] = useState([]);
    const chosen = useMemo(() => events.find((e) => String(e._id) === String(eventId)), [events, eventId]);
    
    const load = async (id = eventId) => {
        if (!id) return;
        const [d, a] = await Promise.all([
            EVENT_SERVICE.getAttendanceDashboard(token, id),
            EVENT_SERVICE.getAttendanceAudit(token, id).catch(() => ({ logs: [] }))
        ]);
        setDash(d);
        setAudit(a.logs || []);
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'OGR') return;
        EVENT_SERVICE.getOrganizerEvents(token).then((d) => {
            const list = (d.events || []).filter((e) => ['ONGOING', 'PUBLISHED'].includes(e.status));
            setEvents(list);
            if (list[0]) setEventId(list[0]._id);
        }).catch((e) => alert(e.message));
    }, [token, token_verification]);
    useEffect(() => {
        if (!eventId) return;
        load(eventId).catch(() => {});
        const id = setInterval(() => load(eventId).catch(() => {}), 5000);
        return () => clearInterval(id);
    }, [eventId]);
    const scan = async () => {
        if (!ticketId.trim()) return;
        try {
            await EVENT_SERVICE.scanAttendance(token, ticketId.trim());
            setTicketId('');
            await load();
        } catch (e) { alert(e.message); }
    };
    const override = async (id, action) => {
        const reason = window.prompt('Reason for manual override') || '';
        try {
            await EVENT_SERVICE.manualOverrideAttendance(token, { ticketId: id, action, reason });
            await load();
        } catch (e) { alert(e.message); }
    };
    const onFile = async (file) => {
        if (!file) return;
        let decoded = '';
        try {
            const bitmap = await createImageBitmap(file);
            if ('BarcodeDetector' in window) {
                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                const codes = await detector.detect(bitmap);
                decoded = codes?.[0]?.rawValue || '';
            }
            if (!decoded) {
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return alert('Could not read image');
                ctx.drawImage(bitmap, 0, 0);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                decoded = jsQR(img.data, img.width, img.height)?.data || '';
            }
            if (!decoded) return alert('QR not detected. Use manual ticket ID input.');
            setTicketId(decoded);
        } catch (e) {
            return alert(e?.message || 'Could not decode QR from file');
        }
        try {
            await EVENT_SERVICE.scanAttendance(token, decoded);
            await load();
        } catch (e) {
            alert(e?.message || 'Scan failed after decoding QR');
        }
    };
    const downloadCsv = async () => {
        if (!eventId) return;
        const res = await fetch(EVENT_SERVICE.getAttendanceCsvUrl(eventId), { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return alert('CSV export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${eventId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div className="page">
            <OrgTopNav />
            <div className="row" style={{ marginTop: '10px' }}>
                <div className="card">Total: {dash.stats?.totalRegistered || 0}</div>
                <div className="card">Checked In: {dash.stats?.checkedIn || 0}</div>
                <div className="card">Pending: {dash.stats?.remaining || 0}</div>
                <div className="card">Attendance %: {dash.stats?.attendancePercentage || 0}</div>
            </div>
            <h1>Attendance Scanner</h1>
            <div className="card">
                <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                    <option value="">Select event</option>
                    {events.map((e) => <option key={e._id} value={e._id}>{e.event_name} ({e.status})</option>)}
                </select>
                {chosen && <p>Selected: <strong>{chosen.event_name}</strong></p>}
                <div className="row">
                    <input placeholder="Ticket ID (TKT-...)" value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
                    <button type="button" onClick={scan}>Scan Ticket</button>
                    <button type="button" onClick={() => ticketId.trim() && override(ticketId.trim(), 'CHECK_IN')}>Manual Check-in</button>
                    <button type="button" onClick={() => ticketId.trim() && override(ticketId.trim(), 'CHECK_OUT')}>Manual Check-out</button>
                    <button type="button" onClick={downloadCsv}>Export CSV</button>
                </div>
                <p style={{ marginTop: '8px' }}>Manual override: enter Ticket ID and click Manual Check-in or Manual Check-out.</p>
                <div className="row">
                    <label>Scan from file/camera</label>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
            </div>
            <div className="card">
                <details>
                    <summary>Scanned ({(dash.scanned || []).length})</summary>
                    {(dash.scanned || []).map((r) => (
                        <div key={r.ticketId} className="row">
                            <span>{r.ticketId} - {r.participantName} - {r.scannedAt ? new Date(r.scannedAt).toLocaleString() : '-'}</span>
                            <button type="button" onClick={() => override(r.ticketId, 'CHECK_OUT')}>Manual Check-out</button>
                        </div>
                    ))}
                </details>
            </div>
            <div className="card">
                <details>
                    <summary>Not Yet Scanned ({(dash.pending || []).length})</summary>
                    {(dash.pending || []).map((r) => (
                        <div key={r.ticketId} className="row">
                            <span>{r.ticketId} - {r.participantName}</span>
                            <button type="button" onClick={() => override(r.ticketId, 'CHECK_IN')}>Manual Check-in</button>
                        </div>
                    ))}
                </details>
            </div>
            <div className="card">
                <details>
                    <summary>Audit Log ({audit.length})</summary>
                    {audit.slice(0, 30).map((l) => (
                        <p key={l._id}>{new Date(l.createdAt).toLocaleString()} - {l.action} - {l.ticketId}{l.reason ? ` (${l.reason})` : ''}</p>
                    ))}
                </details>
            </div>
        </div>
    );
};
export default AttendanceScan;
