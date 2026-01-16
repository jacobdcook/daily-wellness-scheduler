"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash, Info, Sparkles, MessageCircle, Pill, Utensils, Dumbbell, Droplets, CheckCircle, Heart, Bell, Moon } from "lucide-react";
import { clsx } from "clsx";
import { CustomItem, UserSettings, ScheduleItemType } from "@/types";

interface CustomScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    onSave: (newSettings: UserSettings) => void;
    selectedItemType?: ScheduleItemType;
}

export function CustomScheduleModal({ isOpen, onClose, settings, onSave, selectedItemType }: CustomScheduleModalProps) {
    const [activeTab, setActiveTab] = useState<"schedule" | "supplement">("schedule");
    const [items, setItems] = useState<CustomItem[]>([]);
    const [newItem, setNewItem] = useState<CustomItem>({
        id: `custom-${Date.now()}`,
        name: "",
        time: "08:00",
        dose: "",
        notes: "",
        enabled: true,
        optional: false,
        caloric: false
    });
    const [currentItemType, setCurrentItemType] = useState<ScheduleItemType | undefined>(selectedItemType);
    const [aiPrompt, setAiPrompt] = useState("");
    const aiExamples = [
        "Add magnesium glycinate nightly at 9pm for 2 weeks",
        "Schedule soccer every Tuesday at 4pm",
        "Add protein shake after sweaty days only",
        "Remind me to stretch every morning at 7am"
    ];

    // Get appropriate labels and placeholders based on item type
    const getItemTypeConfig = (type?: ScheduleItemType) => {
        switch (type) {
            case "supplement":
                return {
                    title: "Add Supplement",
                    itemLabel: "Supplement Name",
                    detailsLabel: "Dosage (e.g. 1 capsule, 500mg)",
                    notesPlaceholder: "Timing notes, brand, etc.",
                    examples: ["Vitamin D3 5000 IU", "Magnesium Glycinate 400mg", "Omega-3 Fish Oil", "Probiotics"],
                    icon: <Pill className="w-5 h-5" />
                };
            case "meal":
                return {
                    title: "Add Meal/Nutrition",
                    itemLabel: "Meal Name",
                    detailsLabel: "Details (e.g. 2 eggs, grilled chicken)",
                    notesPlaceholder: "Preparation notes, calories, etc.",
                    examples: ["Breakfast Smoothie", "Grilled Chicken Salad", "Protein Shake", "Meal Prep"],
                    icon: <Utensils className="w-5 h-5" />
                };
            case "workout":
                return {
                    title: "Add Workout/Exercise",
                    itemLabel: "Workout Name",
                    detailsLabel: "Duration/Details (e.g. 45 min, 3 sets)",
                    notesPlaceholder: "Equipment needed, intensity, etc.",
                    examples: ["Gym Workout", "Yoga Session", "Running 5k", "Strength Training"],
                    icon: <Dumbbell className="w-5 h-5" />
                };
            case "hydration":
                return {
                    title: "Add Hydration Goal",
                    itemLabel: "Hydration Item",
                    detailsLabel: "Amount (e.g. 16oz, 500ml)",
                    notesPlaceholder: "Type of drink, timing, etc.",
                    examples: ["Drink 16oz Water", "Electrolyte Drink", "Herbal Tea", "Coconut Water"],
                    icon: <Droplets className="w-5 h-5" />
                };
            case "task":
                return {
                    title: "Add Personal Task",
                    itemLabel: "Task Name",
                    detailsLabel: "Details/Duration (e.g. 30 min, high priority)",
                    notesPlaceholder: "Location, requirements, etc.",
                    examples: ["Team Meeting", "Grocery Shopping", "Doctor Appointment", "Laundry"],
                    icon: <CheckCircle className="w-5 h-5" />
                };
            case "habit":
                return {
                    title: "Add Habit/Break",
                    itemLabel: "Habit Name",
                    detailsLabel: "Duration/Details (e.g. 10 min meditation)",
                    notesPlaceholder: "How it makes you feel, goals, etc.",
                    examples: ["Meditation", "Reading", "Deep Breathing", "Journaling"],
                    icon: <Heart className="w-5 h-5" />
                };
            case "reminder":
                return {
                    title: "Add Reminder/Note",
                    itemLabel: "Reminder Title",
                    detailsLabel: "Details/Message",
                    notesPlaceholder: "Additional context or instructions",
                    examples: ["Take Breaks", "Stand Up", "Check Email", "Custom Reminder"],
                    icon: <Bell className="w-5 h-5" />
                };
            case "medication":
                return {
                    title: "Add Medication",
                    itemLabel: "Medication Name",
                    detailsLabel: "Dosage (e.g. 10mg, 1 tablet)",
                    notesPlaceholder: "Instructions, side effects, etc.",
                    examples: ["Blood Pressure Meds", "Antibiotics", "Pain Reliever", "Prescription"],
                    icon: <Pill className="w-5 h-5" />
                };
            default:
                return {
                    title: "Add Custom Item",
                    itemLabel: "Item Name",
                    detailsLabel: "Details (optional)",
                    notesPlaceholder: "Additional notes",
                    examples: ["Custom Wellness Item", "Personal Goal", "Health Check", "Other"],
                    icon: <Plus className="w-5 h-5" />
                };
        }
    };

    // Determine which item type to use based on active tab
    const effectiveItemType = activeTab === "supplement" ? "supplement" : (currentItemType || selectedItemType);
    const config = getItemTypeConfig(effectiveItemType);

    useEffect(() => {
        if (!isOpen) return;

        const newItems = settings.custom_items || [];
        setItems(prev => JSON.stringify(prev) !== JSON.stringify(newItems) ? newItems : prev);
        
        // Reset when modal opens
        if (selectedItemType) {
            setCurrentItemType(selectedItemType);
            setActiveTab(selectedItemType === "supplement" ? "supplement" : "schedule");
        } else {
            setCurrentItemType(undefined);
            setActiveTab("schedule");
        }
    }, [isOpen, settings, selectedItemType]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        if (!newItem.name || !newItem.time) {
            alert("Name and time are required");
            return;
        }
        setItems([...items, newItem]);
        setNewItem({ id: `custom-${Date.now()}`, name: "", time: "08:00", dose: "", notes: "", enabled: true, optional: false, caloric: false });
    };

    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const newSettings = {
            ...settings,
            custom_items: items
        };
        onSave(newSettings);
        onClose();
    };

    const openChatWithPrompt = (message?: string, autoSend = false) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("wellness-chat-open", { detail: { message: message && message.trim() ? message : undefined, autoSend } }));
    };

    const handleAiPrompt = (autoSend = false, promptText?: string) => {
        const text = (promptText ?? aiPrompt).trim();
        if (!text) {
            openChatWithPrompt(undefined, false);
            return;
        }
        openChatWithPrompt(text, autoSend);
        if (autoSend) {
            setAiPrompt("");
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
                <div className="border-b">
                    <div className="flex items-center justify-between p-4 pb-0">
                        <div className="flex items-center gap-3">
                            {effectiveItemType && (
                                <div className="text-blue-600">
                                    {config.icon}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-gray-900">
                                {activeTab === "supplement" ? "Add Supplement" : (currentItemType ? config.title : "Create Custom Schedule")}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mt-4 px-4">
                        <button
                            onClick={() => {
                                setActiveTab("schedule");
                                if (activeTab === "supplement") {
                                    setCurrentItemType(undefined);
                                }
                            }}
                            className={clsx(
                                "px-4 py-3 font-medium text-sm border-b-2 transition-colors",
                                activeTab === "schedule"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Schedule
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("supplement");
                                setCurrentItemType("supplement");
                            }}
                            className={clsx(
                                "px-4 py-3 font-medium text-sm border-b-2 transition-colors",
                                activeTab === "supplement"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Supplement
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    {/* Item Type Selection (Schedule tab only, when no type selected) */}
                    {activeTab === "schedule" && !currentItemType && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-4">Select Item Type</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { type: "meal" as ScheduleItemType, label: "Meal", icon: <Utensils className="w-5 h-5" />, color: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700" },
                                    { type: "workout" as ScheduleItemType, label: "Workout", icon: <Dumbbell className="w-5 h-5" />, color: "bg-red-50 hover:bg-red-100 border-red-200 text-red-700" },
                                    { type: "hydration" as ScheduleItemType, label: "Water", icon: <Droplets className="w-5 h-5" />, color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700" },
                                    { type: "task" as ScheduleItemType, label: "Task", icon: <CheckCircle className="w-5 h-5" />, color: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700" },
                                    { type: "habit" as ScheduleItemType, label: "Habit", icon: <Heart className="w-5 h-5" />, color: "bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700" },
                                    { type: "reminder" as ScheduleItemType, label: "Reminder", icon: <Bell className="w-5 h-5" />, color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700" },
                                    { type: "medication" as ScheduleItemType, label: "Medication", icon: <Pill className="w-5 h-5" />, color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700" },
                                    { type: "custom" as ScheduleItemType, label: "Custom", icon: <Plus className="w-5 h-5" />, color: "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700" },
                                ].map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => setCurrentItemType(item.type)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${item.color}`}
                                    >
                                        {item.icon}
                                        <span className="text-sm font-medium mt-2">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Item Form (shown when item type is selected or Supplement tab is active) */}
                    {(currentItemType || activeTab === "supplement") && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-700">Add New Item</h3>
                            {activeTab === "schedule" && currentItemType && (
                                <button
                                    onClick={() => setCurrentItemType(undefined)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    ← Change Type
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <input
                                type="text"
                                placeholder={config.itemLabel}
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                className="px-3 py-2 border rounded-md text-sm"
                            />
                            <input
                                type="time"
                                value={newItem.time}
                                onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                                className="px-3 py-2 border rounded-md text-sm"
                            />
                            <input
                                type="text"
                                placeholder={config.detailsLabel}
                                value={newItem.dose}
                                onChange={(e) => setNewItem({ ...newItem, dose: e.target.value })}
                                className="px-3 py-2 border rounded-md text-sm"
                            />
                            <input
                                type="text"
                                placeholder={config.notesPlaceholder}
                                value={newItem.notes}
                                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                                className="px-3 py-2 border rounded-md text-sm"
                            />
                        </div>
                        <div className="text-sm space-y-3">
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newItem.optional || false}
                                        onChange={(e) => setNewItem({ ...newItem, optional: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-gray-800">
                                        Mark this item as optional
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                    Optional items stay in your library and can be toggled on/off from the main settings panel without deleting them.
                                </p>
                            </div>
                            {newItem.optional && (
                                <div className="ml-6 space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={newItem.caloric || false}
                                            onChange={(e) => setNewItem({ ...newItem, caloric: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-gray-700">
                                            This item has calories / breaks a fast
                                        </span>
                                    </label>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        When fasting is enabled, caloric optional items will automatically move to the feeding window or be skipped (depending on your fasting level).
                                        <br />
                                        Light fasting moves them to your feeding window; strict fasting skips them entirely.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* AI helper */}
                        <div className="mt-4 border border-blue-100 bg-white rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                                <Sparkles size={16} />
                                Let AI describe it for you
                            </div>
                            <p className="text-xs text-gray-600">
                                Tell the Wellness Assistant exactly what you need (e.g. “add this at this for 1 week” or “recurring every other day at 7am”) and it will auto-create the item for you.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {config.examples.slice(0, 4).map((example) => (
                                    <button
                                        key={example}
                                        type="button"
                                        onClick={() => setAiPrompt(`Add ${example} to my schedule`)}
                                        className="px-3 py-1 text-xs rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                rows={2}
                                placeholder={`Try: "Add ${config.examples[0]} at 8am every weekday"`}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleAiPrompt(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm border border-blue-200 rounded-md text-blue-700 hover:bg-blue-50 transition-colors"
                                >
                                    <MessageCircle size={14} />
                                    Open AI helper
                                </button>
                                <button
                                    type="button"
                                    disabled={!aiPrompt.trim()}
                                    onClick={() => handleAiPrompt(true)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                        aiPrompt.trim()
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    <Sparkles size={14} />
                                    Ask AI for me
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                We’ll open the Assistant with your prompt so it can auto-fill the schedule (supports single dates, weekly routines, every-other-day, “for 1 week”, reminders, fasting notes, etc.).
                            </p>
                        </div>

                        <button
                            onClick={handleAddItem}
                            className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Plus size={16} className="mr-2" />
                            Add Item
                        </button>
                    </div>
                    )}

                    {/* Items List */}
                    {items.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Your Items</h3>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        <span>{item.name}</span>
                                        <span className="text-gray-500 text-sm">at {item.time}</span>
                                        {item.optional && (
                                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                                Optional
                                            </span>
                                        )}
                                        {item.caloric && (
                                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                                Caloric
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {item.dose} {item.notes && `• ${item.notes}`}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteItem(idx)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    )}
                    
                    {/* Empty state */}
                    {items.length === 0 && (currentItemType || activeTab === "supplement") && (
                        <div className="text-center text-gray-500 py-8 italic">
                            No items added yet. Use the form above to build your schedule.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={items.length === 0}
                        className={clsx(
                            "px-4 py-2 rounded-md transition-colors",
                            items.length > 0
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        )}
                    >
                        Create Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}
