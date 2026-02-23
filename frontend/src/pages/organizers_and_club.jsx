import { useEffect, useState } from 'react';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
const OrganizersAndClubs = () => {
    const [organizers, setOrganizers] = useState([]);
    const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
    const [selectedOrganizerDetails, setSelectedOrganizerDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const token = localStorage.getItem('token');
    const fetchOrganizers = async () => {
        const res = await fetch('/api/participants/organizers', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch organizers');
        }
        setOrganizers(data);
    };
    const fetchOrganizerDetails = async (organizerId) => {
        const res = await fetch(`/api/participants/organizers/${organizerId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch organizer details');
        }
        setSelectedOrganizerDetails(data);
        setSelectedOrganizerId(organizerId);
    };
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') {
            LogoutLogic();
            return;
        }
        fetchOrganizers()
            .catch((error) => alert(error.message))
            .finally(() => setIsLoading(false));
    }, []);
    const handleFollowAction = async (organizerId, isCurrentlyFollowed) => {
        const action = isCurrentlyFollowed ? 'unfollow' : 'follow';
        const res = await fetch(`/api/participants/organizers/${organizerId}/${action}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Action failed');
            return;
        }
        setOrganizers((prev) =>
            prev.map((org) =>
                org._id === organizerId ? { ...org, isFollowed: !isCurrentlyFollowed } : org
            )
        );
    };
    const renderEvents = (events) => {
        if (!events || events.length === 0) return <p>None</p>;
        return (
            <ul>
                {events.map((event) => (
                    <li key={event._id}>
                        {event.event_name} ({new Date(event.event_start).toLocaleDateString()})
                    </li>
                ))}
            </ul>
        );
    };
    return (
        <div style={{ padding: '20px' }}>
            <TopNav />
            <h1>Clubs / Organizers</h1>
            <div
                style={{
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px'
                }}
            >
                {isLoading && <p>Loading organizers...</p>}
                {!isLoading && organizers.length === 0 && <p>No organizers found.</p>}
                {!isLoading &&
                    organizers.map((org) => (
                        <div
                            key={org._id}
                            style={{
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '12px'
                            }}
                        >
                            <h3>{org.organization_name}</h3>
                            <p><strong>Category:</strong> {org.category || 'Not set'}</p>
                            <p><strong>Description:</strong> {org.description || 'No description'}</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleFollowAction(org._id, org.isFollowed)}>
                                    {org.isFollowed ? 'Unfollow' : 'Follow'}
                                </button>
                                <button onClick={() => fetchOrganizerDetails(org._id)}>
                                    View Details
                                </button>
                            </div>
                            {selectedOrganizerId === org._id && selectedOrganizerDetails && (
                                <div style={{ marginTop: '12px', padding: '10px', background: '#f7f7f7' }}>
                                    <p><strong>Name:</strong> {selectedOrganizerDetails.organizer.organization_name}</p>
                                    <p><strong>Category:</strong> {selectedOrganizerDetails.organizer.category || 'Not set'}</p>
                                    <p><strong>Description:</strong> {selectedOrganizerDetails.organizer.description || 'No description'}</p>
                                    <p><strong>Contact Email:</strong> {selectedOrganizerDetails.organizer.email}</p>
                                    <p><strong>Upcoming Events:</strong></p>
                                    {renderEvents(selectedOrganizerDetails.upcomingEvents)}
                                    <p><strong>Past Events:</strong></p>
                                    {renderEvents(selectedOrganizerDetails.pastEvents)}
                                </div>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
};
export default OrganizersAndClubs;
