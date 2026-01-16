import { Calendar, Heart, CheckSquare, UtensilsCrossed, User, Droplets, BarChart3 } from "lucide-react";
import { clsx } from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getFriends } from "@/utils/api";

type Tab = "schedule" | "wellness" | "tasks" | "nutrition" | "water" | "profile" | "insights";

interface BottomNavProps {
    activeTab?: Tab; // Optional for backward compatibility
}

export function BottomNav({ activeTab }: BottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [pendingRequests, setPendingRequests] = useState(0);
    
    // Determine active tab from pathname
    const currentTab: Tab = activeTab || (pathname?.includes("/wellness") ? "wellness" 
        : pathname?.includes("/tasks") ? "tasks"
        : pathname?.includes("/water") ? "water"
        : pathname?.includes("/nutrition") ? "nutrition"
        : pathname?.includes("/insights") ? "insights"
        : pathname?.includes("/profile") ? "profile"
        : "schedule");

    const tabs: { id: Tab; label: string; icon: React.ElementType; path: string }[] = [
        { id: "schedule", label: "Schedule", icon: Calendar, path: "/" },
        { id: "wellness", label: "Wellness", icon: Heart, path: "/wellness" },
        { id: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks" },
        { id: "insights", label: "Insights", icon: BarChart3, path: "/insights" },
        { id: "water", label: "Water", icon: Droplets, path: "/water" },
        { id: "nutrition", label: "Nutrition", icon: UtensilsCrossed, path: "/nutrition" },
        { id: "profile", label: "Profile", icon: User, path: "/profile" },
    ];

    useEffect(() => {
        // Check for pending friend requests
        async function checkPendingRequests() {
            try {
                const friendsData = await getFriends();
                setPendingRequests(friendsData.pending_received?.length || 0);
            } catch (error) {
                // Silently fail - not critical
            }
        }
        checkPendingRequests();
        
        // Check every 30 seconds for new requests
        const interval = setInterval(checkPendingRequests, 30000);
        return () => clearInterval(interval);
    }, [pathname]); // Re-check when navigating

    const handleTabChange = (tab: Tab, path: string) => {
        router.push(path);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 pb-safe z-50 shadow-lg">
            <div className="max-w-3xl mx-auto px-2 h-16 flex items-center justify-around">
                {tabs.map((tab) => {
                    const hasNotification = tab.id === "profile" && pendingRequests > 0;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id, tab.path)}
                            className={clsx(
                                "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                currentTab === tab.id
                                    ? "text-primary-600 dark:text-primary-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            <div className="relative">
                                <tab.icon size={22} strokeWidth={currentTab === tab.id ? 2.5 : 2} />
                                {hasNotification && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {pendingRequests > 9 ? "9+" : pendingRequests}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

