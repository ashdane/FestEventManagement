import { useEffect, useState } from 'react';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
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
    const token = localStorage.getItem('token');
    const fetchDashboard = async () => {
        const res = await fetch('/api/events/my-dashboard', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to load dashboard');
        }
        setDashboard(data);
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
        <div className="pptdash-container">
            <TopNav />
            <h1>My Events Dashboard</h1>
            {isLoading && <p>Loading dashboard...</p>}
            {!isLoading && (
                <div className="my-events-grid">
                    <div className="my-events-box">
                        <h2>Upcoming Events</h2>
                        {dashboard.upcomingEvents.length === 0 ? (
                            <p>No upcoming registered events.</p>
                        ) : (
                            dashboard.upcomingEvents.map((item) => (
                                <div key={item.ticket_id} style={{ borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
                                    <p><strong>{item.event_name}</strong></p>
                                    <p>Type: {item.event_type}</p>
                                    <p>Organizer: {item.organizer}</p>
                                    <p>Schedule: {item.schedule}</p>
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
