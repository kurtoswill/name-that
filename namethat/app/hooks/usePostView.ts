import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePostViewProps {
    postId: string;
    viewerId?: string;
    initialViews: number;
    viewThreshold?: number; // time in ms before counting as view (default 5s)
}

export function usePostView({ postId, viewerId, initialViews, viewThreshold = 5000 }: UsePostViewProps) {
    const [views, setViews] = useState(initialViews);
    const [isAnimating, setIsAnimating] = useState(false);
    const viewTimerRef = useRef<NodeJS.Timeout>();
    const postRef = useRef<HTMLDivElement>(null);
    const hasViewedRef = useRef(false);
    const isViewingRef = useRef(false);
    const startTimeRef = useRef<number>(0);

    // Expose recordView for imperative use (vote/add name)
    const recordView = useCallback(async (force = false) => {
        if (hasViewedRef.current) return;
        if (!force) {
            const timeViewing = Date.now() - startTimeRef.current;
            if (timeViewing < viewThreshold) return;
        }
        try {
            const res = await fetch('/api/views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, viewerId })
            });
            if (res.ok) {
                const getRes = await fetch(`/api/views?postId=${postId}`);
                const getData = await getRes.json();
                hasViewedRef.current = true;
                setIsAnimating(true);
                setViews(getData.views);
                setTimeout(() => setIsAnimating(false), 600);
            }
        } catch (error) {
            console.error('Error recording view:', error);
        }
    }, [postId, viewerId, viewThreshold]);

    useEffect(() => {
        if (!postRef.current || !viewerId) return;

        // Create an intersection observer with lower threshold for better detection
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isViewingRef.current) {
                        // Start tracking view time
                        isViewingRef.current = true;
                        startTimeRef.current = Date.now();
                        
                        // Set up the view recording check
                        viewTimerRef.current = setTimeout(() => {
                            if (isViewingRef.current) {
                                recordView();
                            }
                        }, viewThreshold);
                    } else if (!entry.isIntersecting && isViewingRef.current) {
                        // Reset if post leaves view
                        isViewingRef.current = false;
                        if (viewTimerRef.current) {
                            clearTimeout(viewTimerRef.current);
                        }
                    }
                });
            },
            {
                threshold: 0.25, // Only need 25% visibility to start counting
                rootMargin: '-10% 0px' // Add small margin to ensure post is actually in view
            }
        );

        observer.observe(postRef.current);

        return () => {
            observer.disconnect();
            if (viewTimerRef.current) {
                clearTimeout(viewTimerRef.current);
            }
        };
    }, [postId, viewerId, viewThreshold, recordView]);

    return { postRef, views, isAnimating, recordView };
}
