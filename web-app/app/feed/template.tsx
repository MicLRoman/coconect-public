import React from 'react';

// Re-mounts on every navigation within /feed, so each tab/page fades in smoothly.
export default function FeedTemplate({ children }: { children: React.ReactNode }) {
    return <div className="animate-in fade-in duration-300">{children}</div>;
}
