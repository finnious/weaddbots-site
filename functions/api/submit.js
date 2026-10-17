import {
    buildGhlBody,
    customFieldsNeedLookup,
    indexCustomFields,
    resolveCustomFields
} from './ghl-payload.mjs';

const JSON_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), { status: status, headers: JSON_HEADERS });
}

async function loadCustomFieldIndex(env) {
    const response = await fetch(
        'https://services.leadconnectorhq.com/locations/' + env.GHL_LOCATION_ID + '/customFields',
        {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + env.GHL_API_KEY,
                'Version': '2021-07-28',
                'Accept': 'application/json'
            }
        }
    );
    if (!response.ok) {
        const error = new Error('custom field lookup failed');
        error.status = response.status;
        throw error;
    }
    return indexCustomFields(await response.json());
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();

        if (!data.first_name || !data.email) {
            return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
        }

        let index = null;
        if (customFieldsNeedLookup(data.customFields)) {
            try {
                index = await loadCustomFieldIndex(env);
            } catch (error) {
                // The contacts token may not be allowed to list fields. Fall
                // back to sending contact.{key} and let upsert accept or reject it.
                console.error('GHL custom field lookup failed; sending field keys', error.status || error.message);
                index = null;
            }
        }

        const resolved = resolveCustomFields(data.customFields, index);
        if (resolved.missingKeys.length > 0) {
            return jsonResponse({
                success: false,
                error: 'Missing GHL custom fields',
                missingKeys: resolved.missingKeys
            }, 422);
        }

        const ghlBody = buildGhlBody(
            Object.assign({}, data, { locationId: env.GHL_LOCATION_ID }),
            resolved.customFields
        );

        const ghlResponse = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + env.GHL_API_KEY,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            },
            body: JSON.stringify(ghlBody)
        });

        if (!ghlResponse.ok) {
            const errorText = await ghlResponse.text();
            console.error('GHL Error:', errorText);
            return jsonResponse({ success: false, error: 'Failed to submit to CRM' }, 500);
        }

        const result = await ghlResponse.json();

        return jsonResponse({ success: true, contactId: result.contact && result.contact.id }, 200);

    } catch (error) {
        console.error('Function error:', error);
        return jsonResponse({ success: false, error: 'Server error' }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
