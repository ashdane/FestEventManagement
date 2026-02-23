import { useEffect, useState } from 'react';
import useCreateFormBuilder from '../../hooks/useCreateFormBuilder';
import EVENT_SERVICE from '../../services/eventServices';

const emptyFieldName = (fieldType) => (fieldType === 'FILE' ? 'Upload File' : 'New Field');

const FormBuilder = ({ eventId, token }) => {
    const {
        fields,
        setFields,
        addField,
        updateField,
        removeField,
        moveFieldUp,
        moveFieldDown
    } = useCreateFormBuilder([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [formLocked, setFormLocked] = useState(false);

    useEffect(() => {
        const loadForm = async () => {
            try {
                setIsLoading(true);
                const data = await EVENT_SERVICE.getEventRegistrationForm(token, eventId);
                setFields(data.registrationLayout || []);
                setFormLocked(Boolean(data.form_locked));
            } catch (err) {
                setError(err.message || 'Failed to load form configuration.');
            } finally {
                setIsLoading(false);
            }
        };

        if (eventId && token) loadForm();
    }, [eventId, token, setFields]);

    const handleAddField = () => {
        addField();
    };

    const handleTypeChange = (index, fieldType) => {
        const nextData = { fieldType };
        if (fieldType === 'DROPDOWN') {
            nextData.options = ['Option 1', 'Option 2'];
        } else {
            nextData.options = [];
        }
        if (!fields[index].fieldName) {
            nextData.fieldName = emptyFieldName(fieldType);
        }
        updateField(index, nextData);
    };

    const handleOptionsChange = (index, value) => {
        const options = value
            .split(',')
            .map((option) => option.trim())
            .filter(Boolean);
        updateField(index, { options });
    };

    const saveForm = async () => {
        try {
            setIsSaving(true);
            setError('');

            const normalizedFields = fields.map((field) => ({
                fieldType: field.fieldType,
                fieldName: field.fieldName?.trim() || emptyFieldName(field.fieldType),
                required: Boolean(field.required),
                options: field.fieldType === 'DROPDOWN' ? (field.options || []) : []
            }));

            await EVENT_SERVICE.saveEventRegistrationForm(token, eventId, normalizedFields);
            alert('Form layout saved');
        } catch (err) {
            setError(err.message || 'Failed to save form');
        } finally {
            setIsSaving(false);
        }
    };

    if (!eventId) return <div>Select an event first.</div>;
    if (isLoading) return <div>Loading form builder...</div>;

    return (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
            <h3>Custom Registration Form</h3>
            {formLocked && (
                <p style={{ color: 'crimson' }}>
                    Form is locked after first registration. Editing is disabled.
                </p>
            )}
            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            {fields.map((field, index) => (
                <div
                    key={index}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 1fr auto auto auto',
                        gap: '8px',
                        marginBottom: '8px',
                        alignItems: 'center'
                    }}
                >
                    <input
                        value={field.fieldName || ''}
                        onChange={(e) => updateField(index, { fieldName: e.target.value })}
                        placeholder="Field Name"
                        disabled={formLocked}
                    />
                    <select
                        value={field.fieldType}
                        onChange={(e) => handleTypeChange(index, e.target.value)}
                        disabled={formLocked}
                    >
                        <option value="TEXT">Text</option>
                        <option value="NUMBER">Number</option>
                        <option value="DROPDOWN">Dropdown</option>
                        <option value="CHECKBOX">Checkbox</option>
                        <option value="FILE">File Upload</option>
                    </select>
                    <label>
                        <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            disabled={formLocked}
                        /> Required
                    </label>
                    <button type="button" onClick={() => moveFieldUp(index)} disabled={formLocked || index === 0}>
                        Up
                    </button>
                    <button
                        type="button"
                        onClick={() => moveFieldDown(index)}
                        disabled={formLocked || index === fields.length - 1}
                    >
                        Down
                    </button>

                    {field.fieldType === 'DROPDOWN' && (
                        <div style={{ gridColumn: '1 / span 5' }}>
                            <input
                                value={(field.options || []).join(', ')}
                                onChange={(e) => handleOptionsChange(index, e.target.value)}
                                placeholder="Dropdown options separated by commas"
                                disabled={formLocked}
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => removeField(index)}
                        disabled={formLocked}
                        style={{ gridColumn: '1 / span 5' }}
                    >
                        Delete Field
                    </button>
                </div>
            ))}

            <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={handleAddField} disabled={formLocked || fields.length >= 20}>
                    + Add Field ({fields.length}/20)
                </button>
                <button type="button" onClick={saveForm} disabled={formLocked || isSaving}>
                    {isSaving ? 'Saving...' : 'Save Layout'}
                </button>
            </div>
        </div>
    );
};

export default FormBuilder;
