'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        // Generate a new UUID and redirect
        const newId = crypto.randomUUID();
        router.replace(`/${newId}`);
    }, [router]);

    return (
        <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center text-zinc-500 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase animate-pulse">Initializing Antigravity Environment...</p>
        </div>
    );
}
