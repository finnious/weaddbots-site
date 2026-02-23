export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        const data = await request.json();

        if (!data.email) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing email' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Step 1: Search for contact by email
        const searchUrl = `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${env.GHL_LOCATION_ID}&email=${encodeURIComponent(data.email)}`;

        const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${env.GHL_API_KEY}`,
                'Version': '2021-07-28'
            }
        });

        if (!searchResponse.ok) {
            console.error('GHL search error:', await searchResponse.text());
            return new Response(
                JSON.stringify({ success: false, error: 'Could not find contact' }),
                { status: 500, headers: corsHeaders }
            );
        }

        const searchResult = await searchResponse.json();
        const contact = searchResult.contact;

        if (!contact || !contact.id) {
            // Contact not found — still show success page (don't reveal if email exists)
            return new Response(
                JSON.stringify({ success: true, message: 'Unsubscribed' }),
                { status: 200, headers: corsHeaders }
            );
        }

        // Step 2: Remove meetup email tags
        const tagsToRemove = ['WAB-Newsletter', 'WAB-Meetup-Attendee'];

        const removeResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}/tags`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${env.GHL_API_KEY}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            },
            body: JSON.stringify({ tags: tagsToRemove })
        });

        if (!removeResponse.ok) {
            console.error('GHL tag remove error:', await removeResponse.text());
        }

        // Step 3: Add WAB-Unsubscribed tag for tracking
        const addResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}/tags`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.GHL_API_KEY}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            },
            body: JSON.stringify({ tags: ['WAB-Unsubscribed'] })
        });

        if (!addResponse.ok) {
            console.error('GHL tag add error:', await addResponse.text());
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Unsubscribed' }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Unsubscribe error:', error);
        return new Response(
            JSON.stringify({ success: false, error: 'Server error' }),
            { status: 500, headers: corsHeaders }
        );
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
