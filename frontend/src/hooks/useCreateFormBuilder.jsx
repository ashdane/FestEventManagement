import { useState } from 'react';

const useCreateFormBuilder = (initialFields = []) => {
    const [fields, setFields] = useState(initialFields);

    const addField = () => {
        setFields((previousFields) => {
            if (previousFields.length >= 20) {
                alert('Max 20 fields allowed');
                return previousFields;
            }
            const newField = {
                fieldName: 'New Field',
                fieldType: 'TEXT',
                required: false,
                options: []
            };
            return [...previousFields, newField];
        });
    };

    const updateField = (index, updatedData) => {
        setFields((previousFields) => previousFields.map((field, i) =>
            i === index ? { ...field, ...updatedData } : field
        ));
    };

    const removeField = (index) => {
        setFields((previousFields) => previousFields.filter((_, i) => i !== index));
    };

    const moveFieldUp = (index) => {
        if (index <= 0) return;
        setFields((previousFields) => {
            const updated = [...previousFields];
            [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
            return updated;
        });
    };

    const moveFieldDown = (index) => {
        setFields((previousFields) => {
            if (index >= previousFields.length - 1) return previousFields;
            const updated = [...previousFields];
            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
            return updated;
        });
    };

    const loadFields = (data) => setFields(data);

    return {
        fields,
        setFields,
        addField,
        updateField,
        removeField,
        moveFieldUp,
        moveFieldDown,
        loadFields
    };
};

export default useCreateFormBuilder;
