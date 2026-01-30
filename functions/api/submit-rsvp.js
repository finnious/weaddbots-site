export async function onRequestPost(context) {
    const { request, env } = context;
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://www.weaddbots.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    try {
        const formData = await request.json();
        
        // Validate required fields
        if (!formData.first_name || !formData.email) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        
        // Submit to GHL API
        const ghlResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.GHL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: formData.first_name,
                email: formData.email,
                phone: formData.phone || '',
                tags: ['Event-Feb-2026', 'Meetup-Attendee', 'Website-RSVP'],
                source: 'Website RSVP Form',
                customField: {
                    ai_question: formData.ai_question || '',
                    preferred_area: formData.preferred_area || '',
                    preferred_time: formData.preferred_time || '',
                    event_name: formData.event_name || '',
                    event_date: formData.event_date || '',
                    sms_consent: formData.sms_consent || 'No',
                    marketing_consent: formData.marketing_consent || 'No',
                }
            })
        });
        
        if (!ghlResponse.ok) {
            const error = await ghlResponse.text();
            console.error('GHL Error:', error);
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to submit to CRM' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        
        const result = await ghlResponse.json();
        
        return new Response(
            JSON.stringify({ success: true, contactId: result.contact?.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
    } catch (error) {
        console.error('Function error:', error);
        return new Response(
            JSON.stringify({ success: false, error: 'Server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}
