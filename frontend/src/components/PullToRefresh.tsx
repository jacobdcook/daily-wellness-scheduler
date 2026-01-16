import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { hapticTap } from "@/utils/haptics";

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [startPoint, setStartPoint] = useState<number | null>(null);
    const [pullChange, setPullChange] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const controls = useAnimation();
    
    const pullThreshold = 80;

    const initTouch = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            setStartPoint(e.touches[0].clientY);
        }
    };

    const touchMove = (e: React.TouchEvent) => {
        if (!startPoint) return;
        
        const touch = e.touches[0];
        const currentPoint = touch.clientY;
        const diff = currentPoint - startPoint;

        if (diff > 0 && window.scrollY === 0) {
            setPullChange(diff > pullThreshold * 1.5 ? pullThreshold * 1.5 : diff);
            e.preventDefault(); // Prevent native scroll
        }
    };

    const endTouch = async () => {
        if (!startPoint) return;
        
        if (pullChange >= pullThreshold) {
            setRefreshing(true);
            hapticTap();
            setPullChange(pullThreshold); // Snap to threshold
            await onRefresh();
            setRefreshing(false);
        }
        
        setPullChange(0);
        setStartPoint(null);
    };

    useEffect(() => {
        if (!refreshing) {
            controls.start({ y: 0 });
        }
    }, [refreshing, controls]);

    return (
        <div 
            onTouchStart={initTouch}
            onTouchMove={touchMove}
            onTouchEnd={endTouch}
            className="relative min-h-screen"
        >
            <div 
                className="flex items-center justify-center w-full absolute top-0 left-0 -z-10 overflow-hidden"
                style={{ height: pullChange, opacity: pullChange / pullThreshold }}
            >
                <motion.div 
                    animate={{ rotate: refreshing ? 360 : pullChange * 2 }}
                    transition={{ repeat: refreshing ? Infinity : 0, duration: 1 }}
                >
                    <RefreshCw className="text-blue-600" />
                </motion.div>
            </div>
            
            <motion.div
                animate={{ y: refreshing ? pullThreshold : pullChange }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
                {children}
            </motion.div>
        </div>
    );
}

