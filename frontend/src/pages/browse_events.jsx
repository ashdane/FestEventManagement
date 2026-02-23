import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';

const BrowseEvents = () => {
    const navigate = useNavigate();
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();

    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        q: '',
        eventType: '',
        eligibility: '',
        dateFrom: '',
        dateTo: '',
        followedOnly: false,
        trendingOnly: false
    });

    const token = localStorage.getItem('token');

    const fetchEvents = useCallback(async (query = filters) => {
        const data = await EVENT_SERVICE.browseEvents(token, query);

        setEvents(data.events || []);
        setTrending(data.trendingTop5 || []);
    }, [token, filters]);

    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') {
            LogoutLogic();
            return;
        }

        fetchEvents()
            .catch((error) => alert(error.message))
            .finally(() => setIsLoading(false));
    }, [token, token_verification, LogoutLogic, fetchEvents]);

    const onFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const applyFilters = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await fetchEvents(filters);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <TopNav />
            <h1>Browse Events</h1>

            <form onSubmit={applyFilters} style={{ display: 'grid', gap: '10px', maxWidth: '900px', marginBottom: '20px' }}>
                <input
                    type="text"
                    name="q"
                    value={filters.q}
                    onChange={onFilterChange}
                    placeholder="Search event or organizer"
                />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <select name="eventType" value={filters.eventType} onChange={onFilterChange}>
                        <option value="">All Event Types</option>
                        <option value="Normal">Normal</option>
                        <option value="Merchandise">Merchandise</option>
                    </select>

                    <select name="eligibility" value={filters.eligibility} onChange={onFilterChange}>
                        <option value="">All Eligibility</option>
                        <option value="ALL">All</option>
                        <option value="IIIT">IIIT</option>
                        <option value="NON_IIIT">Non-IIIT</option>
                    </select>

                    <input type="date" name="dateFrom" value={filters.dateFrom} onChange={onFilterChange} />
                    <input type="date" name="dateTo" value={filters.dateTo} onChange={onFilterChange} />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <label>
                        <input type="checkbox" name="followedOnly" checked={filters.followedOnly} onChange={onFilterChange} />
                        Followed Clubs Only
                    </label>
                    <label>
                        <input type="checkbox" name="trendingOnly" checked={filters.trendingOnly} onChange={onFilterChange} />
                        Trending Only
                    </label>
                </div>

                <button type="submit" style={{ width: '160px' }}>Apply Filters</button>
            </form>

            <div style={{ marginBottom: '20px' }}>
                <h2>Trending (Top 5 / 24h)</h2>
                {trending.length === 0 ? (
                    <p>No trending events yet.</p>
                ) : (
                    <ul>
                        {trending.map((event) => (
                            <li key={event._id}>
                                {event.event_name} - {event.organizer_name} ({event.trending_count_24h})
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h2>All Events</h2>
                {isLoading && <p>Loading events...</p>}
                {!isLoading && events.length === 0 && <p>No events match your filters.</p>}
                {!isLoading && events.map((event) => (
                    <div key={event._id} style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                        <h3>{event.event_name}</h3>
                        <p><strong>Type:</strong> {event.event_type || 'Normal'}</p>
                        <p><strong>Eligibility:</strong> {event.eligibility}</p>
                        <p><strong>Organizer:</strong> {event.organizer_name}</p>
                        <p><strong>Schedule:</strong> {new Date(event.event_start).toLocaleDateString()} - {new Date(event.event_end).toLocaleDateString()}</p>
                        <button onClick={() => navigate(`/events/${event._id}`)}>View Details</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BrowseEvents;
