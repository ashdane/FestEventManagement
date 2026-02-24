import { useEffect, useState } from 'react';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
const historyTabs = ['Normal', 'Merchandise', 'Completed', 'CancelledRejected'];
const PPTDash = () => {
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const [dashboard, setDashboard] = useState({
        upcomingEvents: [],
        participationHistory: {
            Normal: [],
            Merchandise: [],
            Completed: [],
            CancelledRejected: []
        },
        eventRecords: []
    });
    const [activeTab, setActiveTab] = useState('Normal');
    const [isLoading, setIsLoading] = useState(true);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [reminderMinutes, setReminderMinutes] = useState(30);
    const [calendarLinks, setCalendarLinks] = useState([]);
    const [selectedEventIds, setSelectedEventIds] = useState([]);
    const token = localStorage.getItem('token');
    const fetchDashboard = async () => {
        const data = await EVENT_SERVICE.getMyEventsDashboard(token);
        setDashboard(data);
        const linksData = await EVENT_SERVICE.getCalendarLinks(token, {
            timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            reminderMinutes
        });
        setCalendarLinks(linksData.links || []);
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') {
            LogoutLogic();
            return;
        }
        fetchDashboard()
            .catch((error) => alert(error.message))
            .finally(() => setIsLoading(false));
    }, []);
    const downloadIcs = async (eventIds = []) => {
        try {
            const options = { timezone, reminderMinutes };
            if (eventIds.length)
                options.eventIds = eventIds.join(',');
            const res = await fetch(EVENT_SERVICE.getCalendarIcsUrl(options), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok)
                return alert('Failed to export calendar');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = eventIds.length ? 'event.ics' : 'fems-events.ics';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Failed to export calendar');
        }
    };
    const toggleSelected = (eventId) => {
        setSelectedEventIds((prev) =>
            prev.includes(String(eventId))
                ? prev.filter((id) => id !== String(eventId))
                : [...prev, String(eventId)]
        );
    };
    const selectAllUpcoming = () => {
        setSelectedEventIds((dashboard.upcomingEvents || []).map((e) => String(e.event_id)));
    };
    const clearSelection = () => setSelectedEventIds([]);
    const openLink = (url) => {
        if (!url) return alert('Calendar link not available for this event yet.');
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    const ticketClick = async (ticketId) => {
        try {
            await navigator.clipboard.writeText(ticketId);
            alert(`Ticket copied: ${ticketId}`);
        } catch {
            alert(`Ticket: ${ticketId}`);
        }
    };
    const historyList = dashboard.participationHistory?.[activeTab] || [];
    return (
        <div className="pptdash-container" style={{ padding: '20px' }}>
            <TopNav />
            {isLoading && <p>Loading dashboard...</p>}
            {!isLoading && (
                <div className="my-events-grid">
                    <div className="my-events-box">
                        <h2>Upcoming Events</h2>
                        <div className="row">
                            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Timezone (auto-detected)" />
                            <input type="number" value={reminderMinutes} onChange={(e) => setReminderMinutes(Number(e.target.value) || 0)} placeholder="Reminder mins" />
                            <button type="button" onClick={() => fetchDashboard().catch((e) => alert(e.message))}>Refresh Links</button>
                            <button type="button" onClick={() => downloadIcs()}>Export All .ics</button>
                            <button type="button" onClick={selectAllUpcoming}>Select All</button>
                            <button type="button" onClick={clearSelection}>Clear</button>
                            <button type="button" onClick={() => downloadIcs(selectedEventIds)} disabled={!selectedEventIds.length}>Export Selected .ics</button>
                        </div>
                        {dashboard.upcomingEvents.length === 0 ? (
                            <p>No upcoming registered events.</p>
                        ) : (
                            dashboard.upcomingEvents.map((item) => (
                                <div key={item.ticket_id} style={{ borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={selectedEventIds.includes(String(item.event_id))}
                                            onChange={() => toggleSelected(item.event_id)}
                                        /> Select for batch export
                                    </label>
                                    <p><strong>{item.event_name}</strong></p>
                                    <p>Type: {item.event_type}</p>
                                    <p>Organizer: {item.organizer}</p>
                                    <p>Schedule: {item.schedule}</p>
                                    <div className="row">
                                        <button type="button" onClick={() => downloadIcs([item.event_id])}>.ics</button>
                                        <button type="button" onClick={() => {
                                            const link = calendarLinks.find((l) => String(l.event_id) === String(item.event_id));
                                            if (link) openLink(link.google);
                                        }}>Google</button>
                                        <button type="button" onClick={() => {
                                            const link = calendarLinks.find((l) => String(l.event_id) === String(item.event_id));
                                            if (link) openLink(link.outlook);
                                        }}>Outlook</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="my-events-box">
                        <h2>Participation History</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {historyTabs.map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '6px 10px',
                                        border: '1px solid #bbb',
                                        background: activeTab === tab ? '#e8f5ff' : '#fff'
                                    }}
                                >
                                    {tab === 'CancelledRejected' ? 'Cancelled/Rejected' : tab}
                                </button>
                            ))}
                        </div>
                        {historyList.length === 0 ? (
                            <p>No records in this category.</p>
                        ) : (
                            historyList.map((item) => (
                                <div key={`${activeTab}-${item.ticket_id}`} style={{ borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
                                    <p><strong>{item.event_name}</strong></p>
                                    <p>Status: {item.participation_status}</p>
                                    <p>Organizer: {item.organizer}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="my-events-box">
                        <h2>Event Records</h2>
                        {dashboard.eventRecords.length === 0 ? (
                            <p>No event records yet.</p>
                        ) : (
                            dashboard.eventRecords.map((item) => (
                                <div key={item.ticket_id} style={{ borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
                                    <p><strong>{item.event_name}</strong></p>
                                    <p>Type: {item.event_type}</p>
                                    <p>Organizer: {item.organizer}</p>
                                    <p>Status: {item.participation_status}</p>
                                    <p>Team: {item.team_name || 'N/A'}</p>
                                    <button type="button" onClick={() => ticketClick(item.ticket_id)} style={{ padding: 0, border: 'none', background: 'none', color: '#1677ff', cursor: 'pointer' }}>
                                        Ticket: {item.ticket_id}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default PPTDash;
