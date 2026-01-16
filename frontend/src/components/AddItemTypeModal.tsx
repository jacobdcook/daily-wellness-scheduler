"use client";

import { X, Pill, Utensils, Dumbbell, Droplets, Moon, Heart, Bell, Plus, CheckCircle } from "lucide-react";
import { ScheduleItemType } from "@/types";

interface ItemTypeOption {
    type: ScheduleItemType;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    example: string;
}

interface AddItemTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectType: (type: ScheduleItemType) => void;
}

export function AddItemTypeModal({ isOpen, onClose, onSelectType }: AddItemTypeModalProps) {
    if (!isOpen) return null;

    const itemTypes: ItemTypeOption[] = [
        {
            type: "supplement",
            label: "Supplement",
            description: "Vitamins, minerals, herbs, and other supplements",
            icon: <Pill className="w-6 h-6" />,
            color: "text-green-600",
            bgColor: "bg-green-50 hover:bg-green-100",
            example: "Vitamin D3 5000 IU, Magnesium 400mg"
        },
        {
            type: "meal",
            label: "Meal/Nutrition",
            description: "Breakfast, lunch, dinner, snacks, or nutrition tracking",
            icon: <Utensils className="w-6 h-6" />,
            color: "text-orange-600",
            bgColor: "bg-orange-50 hover:bg-orange-100",
            example: "Breakfast, Protein shake, Meal prep"
        },
        {
            type: "workout",
            label: "Exercise/Workout",
            description: "Gym sessions, cardio, yoga, stretching, or physical activity",
            icon: <Dumbbell className="w-6 h-6" />,
            color: "text-red-600",
            bgColor: "bg-red-50 hover:bg-red-100",
            example: "Gym workout, Yoga session, Running"
        },
        {
            type: "hydration",
            label: "Water/Hydration",
            description: "Water intake goals, electrolyte drinks, or hydration reminders",
            icon: <Droplets className="w-6 h-6" />,
            color: "text-blue-600",
            bgColor: "bg-blue-50 hover:bg-blue-100",
            example: "Drink 16oz water, Electrolyte drink"
        },
        {
            type: "task",
            label: "Personal Task",
            description: "Work tasks, chores, appointments, or personal activities",
            icon: <CheckCircle className="w-6 h-6" />,
            color: "text-purple-600",
            bgColor: "bg-purple-50 hover:bg-purple-100",
            example: "Work meeting, Laundry, Doctor appointment"
        },
        {
            type: "habit",
            label: "Habit/Break",
            description: "Daily habits, breaks, meditation, or wellness activities",
            icon: <Heart className="w-6 h-6" />,
            color: "text-pink-600",
            bgColor: "bg-pink-50 hover:bg-pink-100",
            example: "Meditation, Reading, Deep breathing"
        },
        {
            type: "reminder",
            label: "Reminder/Note",
            description: "General reminders, notes, or custom wellness items",
            icon: <Bell className="w-6 h-6" />,
            color: "text-yellow-600",
            bgColor: "bg-yellow-50 hover:bg-yellow-100",
            example: "Take breaks, Journal entry, Stand up"
        },
        {
            type: "medication",
            label: "Medication",
            description: "Prescription medications or medical treatments",
            icon: <Pill className="w-6 h-6" />,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50 hover:bg-indigo-100",
            example: "Blood pressure meds, Antibiotics"
        },
        {
            type: "custom",
            label: "Custom Item",
            description: "Any other wellness or personal item not listed above",
            icon: <Plus className="w-6 h-6" />,
            color: "text-gray-600",
            bgColor: "bg-gray-50 hover:bg-gray-100",
            example: "Sleep tracking, Mood check, Custom routine"
        }
    ];

    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4">
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Add New Item to Schedule</h2>
                        <p className="text-sm text-gray-600 mt-1">Choose what type of item you want to add</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {itemTypes.map((itemType) => (
                            <button
                                key={itemType.type}
                                onClick={() => {
                                    onSelectType(itemType.type);
                                    onClose();
                                }}
                                className={`p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all text-left group ${itemType.bgColor}`}
                            >
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-3 group-hover:scale-110 transition-transform ${itemType.color}`}>
                                    {itemType.icon}
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1">{itemType.label}</h3>
                                <p className="text-sm text-gray-600 mb-2">{itemType.description}</p>
                                <div className="text-xs text-gray-500 italic">
                                    Example: {itemType.example}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 mt-0.5">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-blue-900 mb-1">Need help deciding?</h4>
                                <p className="text-sm text-blue-700">
                                    Use the AI assistant to help you create the perfect item. Just describe what you need and it will suggest the right type and details for you.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}