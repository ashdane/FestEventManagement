import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import PARTICIPANT_SERVICE from '../services/participantServices';
import useVerifyRoles from '../hooks/useVerifyRoles';

const INTERESTS = [
    { value: 'TECH_EVENTS', label: 'Technical' },
    { value: 'CULTURAL_EVENTS', label: 'Cultural' },
    { value: 'ENTERTAINMENT', label: 'Entertainment' },
    { value: 'NETWORKING', label: 'Networking' }
];

const Onboarding = () => {
    const navigate = useNavigate();
    const { token_verification } = useVerifyRoles();
    const token = localStorage.getItem('token');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [areas, setAreas] = useState([]);
    const [orgs, setOrgs] = useState([]);
    const [pickedOrgs, setPickedOrgs] = useState([]);

    const uid = useMemo(() => {
        try { return jwtDecode(token || '').id; } catch { return ''; }
    }, [token]);

    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT') return navigate('/');
        (async () => {
            try {
                const [profile, list] = await Promise.all([
                    PARTICIPANT_SERVICE.getMyProfile(token),
                    PARTICIPANT_SERVICE.getOrganizersList(token)
                ]);
                setAreas(profile?.areas_of_interests || []);
                setPickedOrgs((profile?.orgs_of_interests || []).map((o) => o._id || o));
                setOrgs(list || []);
            } catch (e) {
                alert(e.message || 'Failed to load onboarding');
                navigate('/pptdash');
            } finally { setLoading(false); }
        })();
    }, [token, token_verification, navigate]);

    const toggle = (value) => {
        setAreas((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    };
    const toggleOrg = (id) => {
        setPickedOrgs((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
    };
    const finish = async (skip = false) => {
        setSaving(true);
        try {
            if (!skip) await PARTICIPANT_SERVICE.updateMyProfile(token, { areas_of_interests: areas, orgs_of_interests: pickedOrgs });
            if (uid) localStorage.setItem(`onboard_done_${uid}`, '1');
            navigate('/pptdash');
        } catch (e) {
            alert(e.message || 'Could not save onboarding');
        } finally { setSaving(false); }
    };

    if (loading) return <div className="page"><p>Loading onboarding...</p></div>;
    return (
        <div className="page" style={{ maxWidth: 900 }}>
            <div className="card">
                <h2>Participant Onboarding</h2>
                <p>Step {step} of 2</p>
                {step === 1 && (
                    <>
                        <h3>Select Interested Areas</h3>
                        <div className="row" style={{ flexWrap: 'wrap' }}>
                            {INTERESTS.map((it) => (
                                <button key={it.value} type="button" onClick={() => toggle(it.value)} style={{ background: areas.includes(it.value) ? '#9FAF9B' : '' }}>
                                    {it.label}
                                </button>
                            ))}
                        </div>
                        <div className="row" style={{ marginTop: 12 }}>
                            <button type="button" onClick={() => setStep(2)}>Next</button>
                            <button type="button" onClick={() => setStep(2)}>Skip</button>
                        </div>
                    </>
                )}
                {step === 2 && (
                    <>
                        <h3>Follow Clubs / Organizers</h3>
                        <p>Pick any clubs. You can skip and configure later from Profile.</p>
                        <div className="column">
                            {(orgs || []).map((o) => (
                                <div key={o._id} className="card" style={{ border: pickedOrgs.includes(o._id) ? '2px solid #9FAF9B' : '1px solid #ddd' }}>
                                    <div className="row" style={{ justifyContent: 'space-between' }}>
                                        <div>
                                            <strong>{o.org_name}</strong>
                                            <p style={{ margin: 0 }}>{o.description || 'No description'}</p>
                                            <p style={{ margin: 0 }}>Tag: {o.category || 'General'}</p>
                                        </div>
                                        <button type="button" onClick={() => toggleOrg(o._id)}>{pickedOrgs.includes(o._id) ? 'Selected' : 'Select'}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="row" style={{ marginTop: 12 }}>
                            <button type="button" onClick={() => setStep(1)}>Back</button>
                            <button type="button" disabled={saving} onClick={() => finish(false)}>{saving ? 'Saving...' : 'Finish'}</button>
                            <button type="button" disabled={saving} onClick={() => finish(true)}>Skip</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Onboarding;

