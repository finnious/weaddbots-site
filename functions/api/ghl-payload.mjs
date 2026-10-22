/**
 * Pure helpers for the GoHighLevel contact upsert used by /api/submit.
 * Tags are sent only when the caller includes a non-empty list. Omitting
 * tags (or sending []) leaves them off the body so upsert does not replace
 * the tags already on a contact.
 */

const CONTACT_PREFIX = 'contact.';

export function indexCustomFields(payload) {
    const list = Array.isArray(payload)
        ? payload
        : (payload && (payload.customFields || payload.fields)) || [];
    const map = new Map();
    for (const field of list) {
        if (!field || field.id == null || field.id === '') continue;
        const keys = [field.fieldKey, field.key, field.field_key].filter(Boolean);
        for (const key of keys) {
            map.set(String(key).trim().toLowerCase(), String(field.id));
        }
    }
    return map;
}

export function canonicalFieldKey(key) {
    const trimmed = String(key || '').trim().toLowerCase();
    if (!trimmed) return '';
    return trimmed.startsWith(CONTACT_PREFIX) ? trimmed : CONTACT_PREFIX + trimmed;
}

export function lookupCustomFieldId(index, key) {
    if (!index || !key) return null;
    const raw = String(key).trim().toLowerCase();
    if (index.has(raw)) return index.get(raw);
    const canonical = canonicalFieldKey(raw).toLowerCase();
    if (index.has(canonical)) return index.get(canonical);
    return null;
}

/**
 * @param {Array} inputFields fields from the browser: { id } and/or { key }
 * @param {Map|null} index fieldKey → id when lookup succeeded; null when lookup
 *   was skipped or failed (keys are then forwarded without an id)
 */
export function resolveCustomFields(inputFields, index) {
    const customFields = [];
    const missingKeys = [];
    for (const field of inputFields || []) {
        if (!field) continue;
        const value = field.field_value == null ? '' : String(field.field_value);
        if (field.id) {
            const mapped = { id: String(field.id), field_value: value };
            if (field.key) mapped.key = canonicalFieldKey(field.key);
            customFields.push(mapped);
            continue;
        }
        if (!field.key) continue;
        const key = canonicalFieldKey(field.key);
        const id = index ? lookupCustomFieldId(index, field.key) : null;
        if (index && !id) {
            missingKeys.push(String(field.key).trim());
            continue;
        }
        const mapped = { key: key, field_value: value };
        if (id) mapped.id = id;
        customFields.push(mapped);
    }
    return { customFields, missingKeys };
}

export function customFieldsNeedLookup(inputFields) {
    return (inputFields || []).some(function (field) {
        return field && field.key && !field.id;
    });
}

export function buildGhlBody(data, customFields) {
    const body = {
        locationId: data.locationId,
        firstName: data.first_name,
        email: data.email,
        source: data.source || 'Website'
    };

    if (typeof data.last_name === 'string' && data.last_name.trim()) {
        body.lastName = data.last_name.trim();
    }
    if (typeof data.phone === 'string' && data.phone.trim()) {
        body.phone = data.phone.trim();
    }

    const company = String(data.companyName || data.company_name || '').trim();
    if (company) body.companyName = company;

    // Only a non-empty list is forwarded. Do not send tags: [] — GHL upsert
    // replaces every tag on an existing contact with the array it receives.
    if (Array.isArray(data.tags) && data.tags.length > 0) {
        body.tags = data.tags;
    }

    if (customFields && customFields.length > 0) {
        body.customFields = customFields;
    }

    return body;
}
