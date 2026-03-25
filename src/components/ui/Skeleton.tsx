import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-zinc-800/50 rounded-md ${className}`}
            {...props}
        />
    );
}
