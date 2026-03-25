import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, compiler, options, compiler_option, stdin, clientId } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });
        }

        // --- Rate Limiting Logic ---
        // Count requests in the last minute for this clientId
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

        // We assume a 'rate_limits' table exists. 
        const { count, error: countError } = await supabase
            .from('rate_limits')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('endpoint', 'run')
            .gte('created_at', oneMinuteAgo);

        if (countError) {
            console.error('Rate Limit Check Error:', countError);
            // Fallback silently if table doesn't exist yet to not break the app entirely
        }

        if (count !== null && count >= 10) {
            return NextResponse.json(
                { error: 'Rate limit exceeded: Please wait before running code again.' },
                { status: 429 }
            );
        }

        // Log this request
        await supabase.from('rate_limits').insert({
            client_id: clientId,
            endpoint: 'run'
        });

        // --- Wandbox Proxy ---
        const response = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                compiler,
                options,
                compiler_option,
                save: true,
                stdin: stdin || ''
            })
        });

        if (!response.ok) {
            throw new Error(`Wandbox API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('API Run Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
