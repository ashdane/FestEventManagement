import { useCallback, useEffect, useState } from 'react';
import TopNav from '../assets/TopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import HOME_SERVICE from '../services/homeServices';
import PARTICIPANT_SERVICE from '../services/participantServices';
const defaultProfile = {
    first_name: '',
    last_name: '',
    email: '',
    participant_type: '',
    org_name: '',
    phone_number: '',
    areas_of_interests: [],
    orgs_of_interests: []
};
const Profile = () => {
    const [profile, setProfile] = useState(defaultProfile);
    const [orgOptions, setOrgOptions] = useState([]);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const token = localStorage.getItem('token');
    const fetchProfile = useCallback(async () => {
        const data = await PARTICIPANT_SERVICE.getMyProfile(token);
        setProfile({
            ...defaultProfile,
            ...data,
            orgs_of_interests: (data.orgs_of_interests || []).map((org) => org._id || org)
        });
    }, [token]);
    const fetchOrgs = useCallback(async () => {
        const data = await HOME_SERVICE.getOrganizers();
        setOrgOptions(data);
    }, []);
    useEffect(() => {
        const role = token_verification(token);
        if (role !== 'PPT' && role != 'OGR') {
            LogoutLogic();
            return;
        }
        Promise.all([fetchProfile(), fetchOrgs()]).catch((error) => {
            console.error(error.message);
            alert('Failed to load profile data');
        });
    }, [token, token_verification, LogoutLogic, fetchProfile, fetchOrgs]);
    const handleInput = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };
    const handleMultiSelect = (e, key) => {
        const values = Array.from(e.target.selectedOptions, (option) => option.value);
        setProfile((prev) => ({ ...prev, [key]: values }));
    };
    const saveProfile = async (e) => {
        e.preventDefault();
        try {
            await PARTICIPANT_SERVICE.updateMyProfile(token, {
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone_number: profile.phone_number,
                org_name: profile.org_name,
                areas_of_interests: profile.areas_of_interests,
                orgs_of_interests: profile.orgs_of_interests
            });
            alert('Profile updated');
        } catch (error) {
            alert(error.message || 'Profile update failed');
        }
    };
    const handlePasswordInput = (e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };
    const changePassword = async (e) => {
        e.preventDefault();
        try {
            await PARTICIPANT_SERVICE.changeMyPassword(token, passwordForm);
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            alert('Password changed successfully');
        } catch (error) {
            alert(error.message || 'Password change failed');
        }
    };
    return (
        <div style={{ padding: '20px' }}>
            <TopNav />
            <form onSubmit={saveProfile} style={{ display: 'grid', gap: '10px', maxWidth: '500px' }}>
                <input name="first_name" value={profile.first_name} onChange={handleInput} placeholder="First Name" />
                <input name="last_name" value={profile.last_name} onChange={handleInput} placeholder="Last Name" />
                <input name="phone_number" value={profile.phone_number} onChange={handleInput} placeholder="Contact Number" />
                <input name="org_name" value={profile.org_name} onChange={handleInput} placeholder="College / Organization" />
                <input value={profile.email} readOnly placeholder="Email" />
                <input value={profile.participant_type} readOnly placeholder="Participant Type" />
                <label>Selected Interests</label>
                <select multiple value={profile.areas_of_interests} onChange={(e) => handleMultiSelect(e, 'areas_of_interests')}>
                    <option value="TECH_EVENTS">Tech</option>
                    <option value="CULTURAL_EVENTS">Cultural</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="NETWORKING">Networking</option>
                </select>
                <label>Followed Clubs</label>
                <select multiple value={profile.orgs_of_interests} onChange={(e) => handleMultiSelect(e, 'orgs_of_interests')}>
                    {orgOptions.map((org) => (
                        <option key={org._id} value={org._id}>{org.org_name}</option>
                    ))}
                </select>
                <button type="submit">Save Profile</button>
            </form>
            <h2 style={{ marginTop: '24px' }}>Security Settings</h2>
            <form onSubmit={changePassword} style={{ display: 'grid', gap: '10px', maxWidth: '500px' }}>
                <input type="password" name="oldPassword" value={passwordForm.oldPassword} onChange={handlePasswordInput} placeholder="Current Password" />
                <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordInput} placeholder="New Password" />
                <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordInput} placeholder="Confirm New Password" />
                <button type="submit">Change Password</button>
            </form>
        </div>
    );
};
export default Profile;
