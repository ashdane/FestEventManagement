import { useEffect, useState } from 'react';
import useCreateFormBuilder from '../../hooks/useCreateFormBuilder';
import EVENT_SERVICE from '../../services/eventServices';
const emptyFieldName = (t) => (t === 'FILE' ? 'Upload File' : 'New Field');
const FormBuilder = ({ eventId, token }) => {
    const { fields, setFields, addField, updateField, removeField, moveFieldUp, moveFieldDown } = useCreateFormBuilder([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [formLocked, setFormLocked] = useState(false);
    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await EVENT_SERVICE.getEventRegistrationForm(token, eventId);
                setFields(data.registrationLayout || []);
                setFormLocked(Boolean(data.form_locked));
            } catch (err) { setError(err.message || 'Failed to load form configuration.'); } finally { setIsLoading(false); }
        };
        if (eventId && token) load();
    }, [eventId, token, setFields]);
    const saveForm = async () => {
        try {
            setIsSaving(true); setError('');
            await EVENT_SERVICE.saveEventRegistrationForm(token, eventId, fields.map((f) => ({
                fieldType: f.fieldType, fieldName: f.fieldName?.trim() || emptyFieldName(f.fieldType),
                required: Boolean(f.required), options: f.fieldType === 'DROPDOWN' ? (f.options || []) : []
            })));
            alert('Form layout saved');
        } catch (err) { setError(err.message || 'Failed to save form'); } finally { setIsSaving(false); }
    };
    if (!eventId) return <div className="card">Select an event first.</div>;
    if (isLoading) return <div className="card">Loading form builder...</div>;
    return (
        <div className="card">
            <h3>Custom Registration Form</h3>
            {formLocked && <p>Form is locked after first registration. Editing is disabled.</p>}
            {error && <p>{error}</p>}
            {fields.map((f, i) => (
                <div key={i} className="card">
                    <div className="row">
                        <input value={f.fieldName || ''} onChange={(e) => updateField(i, { fieldName: e.target.value })} placeholder="Field Name" disabled={formLocked} />
                        <select value={f.fieldType} onChange={(e) => {
                            const t = e.target.value, next = { fieldType: t, options: t === 'DROPDOWN' ? ['Option 1', 'Option 2'] : [] };
                            if (!fields[i].fieldName) next.fieldName = emptyFieldName(t);
                            updateField(i, next);
                        }} disabled={formLocked}>
                            <option value="TEXT">Text</option><option value="NUMBER">Number</option><option value="DROPDOWN">Dropdown</option><option value="CHECKBOX">Checkbox</option><option value="FILE">File Upload</option>
                        </select>
                        <label><input type="checkbox" checked={Boolean(f.required)} onChange={(e) => updateField(i, { required: e.target.checked })} disabled={formLocked} /> Required</label>
                        <button type="button" onClick={() => moveFieldUp(i)} disabled={formLocked || i === 0}>Up</button>
                        <button type="button" onClick={() => moveFieldDown(i)} disabled={formLocked || i === fields.length - 1}>Down</button>
                        <button type="button" onClick={() => removeField(i)} disabled={formLocked}>Delete</button>
                    </div>
                    {f.fieldType === 'DROPDOWN' && (
                        <input value={(f.options || []).join(', ')} onChange={(e) => updateField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} placeholder="Dropdown options separated by commas" disabled={formLocked} />
                    )}
                </div>
            ))}
            <div className="row">
                <button type="button" onClick={addField} disabled={formLocked || fields.length >= 20}>+ Add Field ({fields.length}/20)</button>
                <button type="button" onClick={saveForm} disabled={formLocked || isSaving}>{isSaving ? 'Saving...' : 'Save Layout'}</button>
            </div>
        </div>
    );
};
export default FormBuilder;
