import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Setup basic server-side client (read-only for meta tags)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

type Props = {
    params: Promise<{ projectId: string }>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    // read route params
    const resolvedParams = await params;
    const id = resolvedParams.projectId;

    // fetch data
    const { data } = await supabase
        .from('projects')
        .select('name, language, content')
        .eq('id', id)
        .single();

    if (!data) {
        return {
            title: 'Not Found - Antigravity AI Cloud IDE',
        };
    }

    const { name, language, content } = data;
    const langUpper = language.charAt(0).toUpperCase() + language.slice(1);
    const title = `[${langUpper}] ${name || 'Untitled'} - AI 代碼沙盒`;
    const description = content ? (content.slice(0, 50) + '...') : 'A cloud-based AI coding environment.';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            // Default high-quality cover image for developer vibe
            images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'],
        },
    };
}

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
