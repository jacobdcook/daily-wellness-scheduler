import { ScheduledItem, ScheduleItemType } from "@/types";
import { Check, Clock, Info, Edit2, Droplets, RefreshCw, UtensilsCrossed, AlertCircle, Undo2, BookOpen, Pill, Calendar, Dumbbell, Coffee, Heart, Activity } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { hapticSuccess, hapticTap } from "@/utils/haptics";
import { KnowledgeModal } from "./KnowledgeModal";

export type ItemState = "pending" | "in_progress" | "completed";

interface ScheduleCardProps {
    item: ScheduledItem;
    state: ItemState;
    onStateChange: (newState: ItemState) => void;
    onEdit: (item: ScheduledItem) => void;
    onReschedule?: (item: ScheduledItem) => void;
    isMissed?: boolean;
    fastingEnabled?: boolean;
    fastingLevel?: string;
}

export function ScheduleCard({ item, state, onStateChange, onEdit, onReschedule, isMissed, fastingEnabled, fastingLevel }: ScheduleCardProps) {
    const [showCaloricTooltip, setShowCaloricTooltip] = useState(false);
    const [showKnowledge, setShowKnowledge] = useState(false);
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-100, -50, 0, 50, 100], [0.5, 1, 1, 1, 0.5]);
    
    // Opacity for background text
    const completeOpacity = useTransform(x, [20, 60], [0, 1]);
    const resetOpacity = useTransform(x, [-60, -20], [1, 0]);

    // Determine item type (default to supplement for backward compatibility)
    const itemType: ScheduleItemType = item.item_type || "supplement";
    const isSupplement = itemType === "supplement";
    
    // Handle both SupplementItem and GeneralTaskItem structures
    const itemName = item.item?.name || "";
    const itemDose = item.item?.dose || item.item?.description || "";
    const itemNotes = item.item?.notes || "";
    const itemCategory = item.item?.category || "";
    
    const isCaloric = item.item?.caloric || false;
    const fastingAction = item.item?.fasting_action || "allow";
    const fastingNotes = item.item?.fasting_notes || "";
    
    // Get icon based on item type
    const getItemIcon = () => {
        if (isSupplement) return Pill;
        switch (itemType) {
            case "meal": return UtensilsCrossed;
            case "workout": return Dumbbell;
            case "hydration": return Droplets;
            case "habit": return Heart;
            case "medication": return Pill;
            case "reminder": return Clock;
            default: return Calendar;
        }
    };
    
    const ItemIcon = getItemIcon();
    
    // Get color scheme based on item type
    const getItemColorScheme = () => {
        if (isSupplement) {
            return {
                bg: "bg-purple-50 dark:bg-purple-900/20",
                border: "border-purple-200 dark:border-purple-900",
                text: "text-purple-700 dark:text-purple-300",
                icon: "text-purple-600 dark:text-purple-400"
            };
        }
        switch (itemType) {
            case "meal":
                return {
                    bg: "bg-orange-50 dark:bg-orange-900/20",
                    border: "border-orange-200 dark:border-orange-900",
                    text: "text-orange-700 dark:text-orange-300",
                    icon: "text-orange-600 dark:text-orange-400"
                };
            case "workout":
                return {
                    bg: "bg-red-50 dark:bg-red-900/20",
                    border: "border-red-200 dark:border-red-900",
                    text: "text-red-700 dark:text-red-300",
                    icon: "text-red-600 dark:text-red-400"
                };
            case "hydration":
                return {
                    bg: "bg-blue-50 dark:bg-blue-900/20",
                    border: "border-blue-200 dark:border-blue-900",
                    text: "text-blue-700 dark:text-blue-300",
                    icon: "text-blue-600 dark:text-blue-400"
                };
            default:
                return {
                    bg: "bg-green-50 dark:bg-green-900/20",
                    border: "border-green-200 dark:border-green-900",
                    text: "text-green-700 dark:text-green-300",
                    icon: "text-green-600 dark:text-green-400"
                };
        }
    };
    
    const colorScheme = getItemColorScheme();
    
    // Determine fasting behavior message
    const getFastingBehavior = () => {
        if (!fastingEnabled || !isCaloric) return null;
        
        if (fastingLevel === "strict") {
            return "Skipped during strict fasting";
        }
        
        switch (fastingAction) {
            case "defer":
                return "Moved to feeding window";
            case "skip":
                return "Skipped during fasting";
            case "meal_dependent":
                return "Taken with meals only";
            default:
                return "Allowed during fasting";
        }
    };
    
    const fastingBehavior = getFastingBehavior();
    const toggleStatus = () => {
        hapticTap();
        // Cycle: pending -> in_progress -> completed -> pending
        if (state === "pending") {
            onStateChange("in_progress");
        } else if (state === "in_progress") {
            onStateChange("completed");
        } else {
            onStateChange("pending");
        }
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 100) {
            // Swiped Right -> Complete
            if (state !== "completed") {
                onStateChange("completed");
                hapticSuccess();
            }
        } else if (info.offset.x < -100) {
            // Swiped Left -> Reset to Pending (or Undo)
            if (state !== "pending") {
                onStateChange("pending");
                hapticTap();
            }
        }
    };

    const time = new Date(item.scheduled_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const showReschedule = isMissed && state !== "completed" && onReschedule;

    return (
        <div className="relative mb-3 overflow-hidden rounded-xl">
            {/* Swipe Background Actions */}
            <div className="absolute inset-0 flex items-center justify-between px-6 select-none pointer-events-none">
                {/* Left Side Background (revealed when swiping right) -> Complete */}
                <motion.div 
                    className="flex items-center text-white font-bold gap-2 bg-green-500 absolute left-0 top-0 bottom-0 w-1/2 pl-6" 
                    style={{ opacity: completeOpacity }}
                >
                    <Check size={24} />
                    <span>Complete</span>
                </motion.div>

                {/* Right Side Background (revealed when swiping left) -> Reset */}
                <motion.div 
                    className="flex items-center justify-end text-amber-600 font-bold gap-2 bg-amber-100 absolute right-0 top-0 bottom-0 w-1/2 pr-6" 
                    style={{ opacity: resetOpacity }}
                >
                    <span>Reset</span>
                    <Undo2 size={24} />
                </motion.div>
            </div>

            {/* Animated Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }} // Snaps back
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{ x, opacity }}
                className={clsx(
                    "relative z-10 flex items-center p-4 rounded-xl border transition-shadow duration-200",
                    state === "completed"
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900"
                        : state === "in_progress"
                            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900 shadow-sm"
                            : isMissed
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 shadow-sm"
                            : fastingEnabled && isCaloric && fastingAction !== "allow"
                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900 shadow-sm"
                            : !isSupplement
                            ? `${colorScheme.bg} ${colorScheme.border} shadow-sm`
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                )}
            >
                <div className="flex-shrink-0 mr-4 flex items-center gap-2">
                    <div className={clsx("p-2 rounded-lg", colorScheme.bg, colorScheme.icon)}>
                        <ItemIcon size={20} />
                    </div>
                    <button
                        onClick={toggleStatus}
                        className={clsx(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                            state === "completed"
                                ? "bg-green-500 border-green-500 text-white"
                            : state === "in_progress"
                                ? "bg-orange-400 border-orange-400 text-white"
                                : "border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 text-transparent"
                        )}
                        aria-label={`Status: ${state}`}
                    >
                        {state === "completed" && <Check size={16} strokeWidth={3} />}
                        {state === "in_progress" && <div className="w-3 h-3 bg-white rounded-full" />}
                    </button>
                </div>

                <div className="flex-grow">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                            <Clock size={14} className="mr-1" />
                            <span className={state === "completed" ? "line-through" : ""}>{time}</span>
                            {isMissed && state !== "completed" && (
                                <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 px-2 py-0.5 rounded-full font-medium">
                                    Missed
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {showReschedule && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onReschedule) onReschedule(item);
                                    }}
                                    className="opacity-100 p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-all"
                                    title="Reschedule"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item);
                                }}
                                className="opacity-50 hover:opacity-100 p-2 text-gray-400 hover:text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 dark:bg-primary-900/20 rounded-md transition-all"
                                title="Edit Item"
                            >
                                <Edit2 size={14} />
                            </button>
                            {isSupplement && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowKnowledge(true);
                                    }}
                                    className="opacity-50 hover:opacity-100 p-2 text-gray-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:bg-primary-900/20 rounded-md transition-all"
                                    title="Learn about this supplement"
                                >
                                    <BookOpen size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3
                            className={clsx(
                                "font-semibold text-lg select-none",
                                state === "completed" ? "text-gray-500 dark:text-gray-400 line-through" : !isSupplement ? colorScheme.text : "text-gray-900 dark:text-gray-100"
                            )}
                        >
                            {itemName}
                        </h3>
                        {isCaloric && (
                            <div className="relative z-20">
                                <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full cursor-help"
                                    onMouseEnter={() => setShowCaloricTooltip(true)}
                                    onMouseLeave={() => setShowCaloricTooltip(false)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCaloricTooltip(!showCaloricTooltip);
                                    }}
                                >
                                    <UtensilsCrossed size={12} />
                                    Caloric
                                </span>
                                {showCaloricTooltip && (
                                    <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                                        <div className="font-semibold mb-1 flex items-center gap-1">
                                            <UtensilsCrossed size={12} />
                                            Caloric Item
                                        </div>
                                        <p className="text-gray-300 mb-2">
                                            {fastingEnabled 
                                                ? fastingBehavior || "Contains calories"
                                                : "Contains calories - will be affected if fasting is enabled"
                                            }
                                        </p>
                                        {fastingNotes && (
                                            <p className="text-gray-400 text-xs italic border-t border-gray-700 pt-2">
                                                {fastingNotes}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {fastingEnabled && isCaloric && fastingBehavior && (
                            <span className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                                fastingAction === "skip" || fastingLevel === "strict"
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200"
                                    : fastingAction === "defer"
                                    ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            )}>
                                <AlertCircle size={12} />
                                {fastingBehavior}
                            </span>
                        )}
                        {item.day_type === "sweaty" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 text-xs font-medium rounded-full">
                                <Droplets size={12} />
                                Sweaty Day
                            </span>
                        )}
                    </div>
                    {itemDose && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm select-none">{itemDose}</p>
                    )}
                    {itemNotes && (
                        <div className="flex items-start mt-2 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md select-none">
                            <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                            {itemNotes}
                        </div>
                    )}
                </div>
            </motion.div>

            {isSupplement && (
                <KnowledgeModal
                    isOpen={showKnowledge}
                    onClose={() => setShowKnowledge(false)}
                    itemName={itemName}
                />
            )}
        </div>
    );
}
