import { useCallback, useEffect, useMemo, useState } from 'react';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
import FormBuilder from '../components/events/FormBuilder';

const DASHBOARD_VIEWS = {
    DASHBOARD: 'dashboard',
    CREATE: 'create',
    PROFILE: 'profile',
    ONGOING: 'ongoing'
};

const DEFAULT_DRAFT = {
    event_name: '',
    event_description: '',
    event_type: 'Normal',
    eligibility: 'ALL',
    reg_deadline: '',
    event_start: '',
    event_end: '',
    reg_limit: 100,
    reg_fee: 0
};

const EMPTY_ANALYTICS = {
    completed_events: 0,
    total_registrations: 0,
    total_sales: 0,
    total_revenue: 0,
    total_attendance: 0
};

const NAV_ITEMS = [
    { key: DASHBOARD_VIEWS.DASHBOARD, label: 'Dashboard' },
    { key: DASHBOARD_VIEWS.CREATE, label: 'Create Event' },
    { key: DASHBOARD_VIEWS.PROFILE, label: 'Profile' },
    { key: DASHBOARD_VIEWS.ONGOING, label: 'Ongoing Events' }
];

const OrganizerNav = ({ activeView, onViewChange, onLogout }) => (
    <nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {NAV_ITEMS.map((item) => (
            <button
                key={item.key}
                type="button"
                onClick={() => onViewChange(item.key)}
                style={{ background: activeView === item.key ? '#def2ff' : '#fff' }}
            >
                {item.label}
            </button>
        ))}
        <button type="button" onClick={onLogout}>Logout</button>
    </nav>
);

const AnalyticsCards = ({ analytics }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: '10px' }}>
        <div style={{ border: '1px solid #ccc', padding: '10px' }}><strong>Completed</strong><br />{analytics.completed_events}</div>
        <div style={{ border: '1px solid #ccc', padding: '10px' }}><strong>Registrations</strong><br />{analytics.total_registrations}</div>
        <div style={{ border: '1px solid #ccc', padding: '10px' }}><strong>Sales</strong><br />{analytics.total_sales}</div>
        <div style={{ border: '1px solid #ccc', padding: '10px' }}><strong>Revenue</strong><br />INR {analytics.total_revenue}</div>
        <div style={{ border: '1px solid #ccc', padding: '10px' }}><strong>Attendance</strong><br />{analytics.total_attendance}</div>
    </div>
);

const DraftForm = ({ draftData, onDraftChange, onSubmit }) => (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid black', maxWidth: '640px' }}>
        <h2>Create Event Draft</h2>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '10px' }}>
            <input type="text" name="event_name" value={draftData.event_name} placeholder="Event Name" onChange={onDraftChange} required />
            <textarea name="event_description" value={draftData.event_description} placeholder="Description" onChange={onDraftChange} required />
            <label>Event Type</label>
            <select name="event_type" value={draftData.event_type} onChange={onDraftChange} required>
                <option value="Normal">Normal</option>
                <option value="Merchandise">Merchandise</option>
            </select>
            <label>Eligibility</label>
            <select name="eligibility" value={draftData.eligibility} onChange={onDraftChange} required>
                <option value="ALL">All</option>
                <option value="IIIT">IIIT</option>
                <option value="NON_IIIT">Non-IIIT</option>
            </select>
            <label>Registration Deadline</label>
            <input type="date" name="reg_deadline" value={draftData.reg_deadline} onChange={onDraftChange} required />
            <label>Event Start</label>
            <input type="date" name="event_start" value={draftData.event_start} onChange={onDraftChange} required />
            <label>Event End</label>
            <input type="date" name="event_end" value={draftData.event_end} onChange={onDraftChange} required />
            <input type="number" name="reg_limit" value={draftData.reg_limit} placeholder="Registration Limit" onChange={onDraftChange} required />
            <input type="number" name="reg_fee" value={draftData.reg_fee} placeholder="Registration Fee (INR)" onChange={onDraftChange} required />
            <button type="submit">Create Draft</button>
        </form>
    </div>
);

const DashboardView = ({ events, analytics, onManageEvent }) => (
    <>
        <h2>Events Carousel</h2>
        {events.length === 0 ? (
            <p>No events created yet.</p>
        ) : (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {events.map((eventItem) => (
                    <div
                        key={eventItem._id}
                        style={{ minWidth: '260px', border: '1px solid #bbb', borderRadius: '8px', padding: '12px' }}
                    >
                        <h3>{eventItem.event_name}</h3>
                        <p><strong>Type:</strong> {eventItem.event_type}</p>
                        <p><strong>Status:</strong> {eventItem.status}</p>
                        <p><strong>Fee:</strong> INR {eventItem.reg_fee}</p>
                        <button type="button" onClick={onManageEvent}>Manage Event</button>
                    </div>
                ))}
            </div>
        )}

        <h2 style={{ marginTop: '20px' }}>Completed Events Analytics</h2>
        <AnalyticsCards analytics={analytics} />
    </>
);

const EventsManager = ({
    events,
    selectedEventId,
    onToggleEventSelection,
    onPublish,
    onUpdate
}) => (
    <div style={{ marginTop: '24px' }}>
        <h2>Manage My Events</h2>
        {events.length === 0 && <p>No events created yet.</p>}
        {events.length > 0 && (
            <div style={{ display: 'grid', gap: '12px' }}>
                {events.map((eventItem) => (
                    <div key={eventItem._id} style={{ border: '1px solid #bbb', borderRadius: '8px', padding: '12px' }}>
                        <h3>{eventItem.event_name}</h3>
                        <p><strong>Status:</strong> {eventItem.status}</p>
                        <p><strong>Type:</strong> {eventItem.event_type}</p>
                        <p><strong>Description:</strong> {eventItem.event_description}</p>
                        <p><strong>Form Locked:</strong> {eventItem.form_locked ? 'Yes' : 'No'}</p>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {eventItem.status === 'DRAFT' && (
                                <>
                                    <button type="button" onClick={() => onToggleEventSelection(eventItem._id)}>
                                        {selectedEventId === eventItem._id ? 'Hide Form Builder' : 'Define Required Fields'}
                                    </button>
                                    <button type="button" onClick={() => onPublish(eventItem._id)}>Publish</button>
                                </>
                            )}
                            {eventItem.status === 'PUBLISHED' && (
                                <>
                                    <button type="button" onClick={() => onUpdate(eventItem._id, { event_description: `${eventItem.event_description} (edited)` })}>
                                        Update Description
                                    </button>
                                    <button type="button" onClick={() => onUpdate(eventItem._id, { reg_limit: Number(eventItem.reg_limit) + 10 })}>
                                        Increase Limit +10
                                    </button>
                                    <button type="button" onClick={() => onUpdate(eventItem._id, { registration_closed: true })}>
                                        Close Registrations
                                    </button>
                                </>
                            )}
                            {['ONGOING', 'COMPLETED'].includes(eventItem.status) && (
                                <>
                                    <button type="button" onClick={() => onUpdate(eventItem._id, { status: 'COMPLETED' })}>Mark Completed</button>
                                    <button type="button" onClick={() => onUpdate(eventItem._id, { status: 'CLOSED' })}>Mark Closed</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const OngoingView = ({ events }) => (
    <div style={{ marginTop: '10px' }}>
        <h2>Ongoing Events</h2>
        {events.length === 0 ? (
            <p>No ongoing events right now.</p>
        ) : (
            events.map((eventItem) => (
                <div key={eventItem._id} style={{ border: '1px solid #bbb', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <p><strong>{eventItem.event_name}</strong></p>
                    <p>Type: {eventItem.event_type}</p>
                    <p>Status: {eventItem.status}</p>
                </div>
            ))
        )}
    </div>
);

const OrgDash = () => {
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const token = localStorage.getItem('token');

    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
    const [draftData, setDraftData] = useState(DEFAULT_DRAFT);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [activeView, setActiveView] = useState(DASHBOARD_VIEWS.DASHBOARD);
    const [loading, setLoading] = useState(true);

    const selectedEvent = useMemo(
        () => events.find((eventItem) => eventItem._id === selectedEventId) || null,
        [events, selectedEventId]
    );

    const ongoingEvents = useMemo(
        () => events.filter((eventItem) => eventItem.status === 'ONGOING'),
        [events]
    );

    const fetchDashboard = useCallback(async () => {
        const data = await EVENT_SERVICE.getOrganizerDashboardSummary(token);
        setEvents(data.events || []);
        setAnalytics(data.analytics || EMPTY_ANALYTICS);
    }, [token]);

    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'OGR') {
            LogoutLogic();
            return;
        }

        fetchDashboard()
            .catch((error) => alert(error.message))
            .finally(() => setLoading(false));
    }, [token, token_verification, LogoutLogic, fetchDashboard]);

    const handleDraftChange = useCallback((event) => {
        const { name, value, type } = event.target;
        setDraftData((prev) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    }, []);

    const createDraft = useCallback(async (event) => {
        event.preventDefault();
        try {
            await EVENT_SERVICE.createEventDraft(token, draftData);
            setDraftData(DEFAULT_DRAFT);
            await fetchDashboard();
            alert('Draft created');
        } catch (error) {
            alert(error.message);
        }
    }, [token, draftData, fetchDashboard]);

    const updateEvent = useCallback(async (eventId, payload) => {
        try {
            await EVENT_SERVICE.updateOrganizerEvent(token, eventId, payload);
            await fetchDashboard();
            alert('Event updated');
        } catch (error) {
            alert(error.message);
        }
    }, [token, fetchDashboard]);

    const publishEvent = useCallback(async (eventId) => {
        try {
            await EVENT_SERVICE.publishEvent(token, eventId);
            await fetchDashboard();
            alert('Event published');
        } catch (error) {
            alert(error.message);
        }
    }, [token, fetchDashboard]);

    const handleToggleEventSelection = useCallback((eventId) => {
        setSelectedEventId((currentId) => (currentId === eventId ? '' : eventId));
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1>ORGANIZER DASHBOARD</h1>
            <OrganizerNav activeView={activeView} onViewChange={setActiveView} onLogout={LogoutLogic} />

            {loading && <p>Loading dashboard...</p>}

            {!loading && activeView === DASHBOARD_VIEWS.DASHBOARD && (
                <DashboardView
                    events={events}
                    analytics={analytics}
                    onManageEvent={() => setActiveView(DASHBOARD_VIEWS.CREATE)}
                />
            )}

            {!loading && activeView === DASHBOARD_VIEWS.CREATE && (
                <>
                    <DraftForm
                        draftData={draftData}
                        onDraftChange={handleDraftChange}
                        onSubmit={createDraft}
                    />

                    <EventsManager
                        events={events}
                        selectedEventId={selectedEventId}
                        onToggleEventSelection={handleToggleEventSelection}
                        onPublish={publishEvent}
                        onUpdate={updateEvent}
                    />

                    {selectedEvent && (
                        <div style={{ marginTop: '20px' }}>
                            <FormBuilder eventId={selectedEvent._id} token={token} />
                        </div>
                    )}
                </>
            )}

            {!loading && activeView === DASHBOARD_VIEWS.ONGOING && (
                <OngoingView events={ongoingEvents} />
            )}

            {!loading && activeView === DASHBOARD_VIEWS.PROFILE && (
                <div style={{ marginTop: '10px' }}>
                    <h2>Organizer Profile</h2>
                    <p>Profile editing section can be added here as part of 10.5.</p>
                </div>
            )}
        </div>
    );
};

export default OrgDash;
