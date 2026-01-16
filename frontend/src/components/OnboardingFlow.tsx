"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Calendar, Settings, Pill, UtensilsCrossed, Heart } from "lucide-react";
import { UserSettings } from "@/types";
import { saveSettings, loadSettings } from "@/utils/api";

interface OnboardingFlowProps {
    isOpen: boolean;
    onComplete: (settings: UserSettings) => void;
    onSkip: () => void;
}

export function OnboardingFlow({ isOpen, onComplete, onSkip }: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [settings, setSettings] = useState<Partial<UserSettings>>({
        wake_time: "07:30",
        bedtime: "22:00",
        breakfast_mode: "yes",
        lunch_mode: "yes",
        dinner_mode: "yes",
        breakfast_days: [true, true, true, true, true, true, true],
        workout_days: [false, false, false, false, false, false, false],
        workout_time: "",
        enable_supplements: false,
        optional_items: {},
        electrolyte_intensity: "light",
        fasting: "no",
    });

    const steps = [
        {
            id: "welcome",
            title: "Welcome to Daily Wellness Scheduler!",
            description: "Let's set up your personalized wellness schedule in just a few steps.",
            icon: Sparkles,
        },
        {
            id: "supplements",
            title: "Do you take supplements?",
            description: "We can help you track vitamins, minerals, and other supplements. You can always change this later.",
            icon: Pill,
        },
        {
            id: "meals",
            title: "Meal Schedule",
            description: "When do you typically eat? We'll add meal reminders to your schedule.",
            icon: UtensilsCrossed,
        },
        {
            id: "workouts",
            title: "Workout Schedule",
            description: "Do you have a regular workout routine? We can add workout reminders.",
            icon: Heart,
        },
        {
            id: "complete",
            title: "You're all set!",
            description: "Your schedule is ready. You can customize it anytime in settings.",
            icon: Check,
        },
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        try {
            // Load existing settings and merge
            const existingSettings = await loadSettings();
            const mergedSettings: UserSettings = {
                ...existingSettings,
                ...settings,
            } as UserSettings;
            
            await saveSettings(mergedSettings);
            onComplete(mergedSettings);
        } catch (error) {
            console.error("Failed to save settings", error);
            onComplete(settings as UserSettings);
        }
    };

    const handleSupplementsToggle = (enabled: boolean) => {
        setSettings(prev => ({ ...prev, enable_supplements: enabled }));
    };

    const handleMealToggle = (meal: "breakfast" | "lunch" | "dinner", enabled: boolean) => {
        setSettings(prev => ({
            ...prev,
            [`${meal}_mode`]: enabled ? "yes" : "no",
        }));
    };

    const handleWorkoutDayToggle = (dayIndex: number) => {
        setSettings(prev => {
            const workoutDays = [...(prev.workout_days || [false, false, false, false, false, false, false])];
            workoutDays[dayIndex] = !workoutDays[dayIndex];
            return { ...prev, workout_days: workoutDays };
        });
    };

    const handleWorkoutTimeChange = (time: string) => {
        setSettings(prev => ({ ...prev, workout_time: time }));
    };

    if (!isOpen) return null;

    const currentStepData = steps[currentStep];
    const Icon = currentStepData.icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={currentStep === 0 ? undefined : onSkip}
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                    <Icon className="text-primary-600 dark:text-primary-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {currentStepData.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Step {currentStep + 1} of {steps.length}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onSkip}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1 bg-gray-200 dark:bg-gray-800">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                                className="h-full bg-primary-600"
                            />
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                                        {currentStepData.description}
                                    </p>

                                    {/* Step Content */}
                                    {currentStep === 0 && (
                                        <div className="space-y-4 text-center py-8">
                                            <div className="text-6xl mb-4">👋</div>
                                            <p className="text-lg text-gray-700 dark:text-gray-300">
                                                We'll help you create a personalized schedule for your wellness journey.
                                            </p>
                                        </div>
                                    )}

                                    {currentStep === 1 && (
                                        <div className="space-y-4 py-4">
                                            <button
                                                onClick={() => handleSupplementsToggle(true)}
                                                className={`w-full p-6 rounded-xl border-2 transition-all ${
                                                    settings.enable_supplements
                                                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                                                        : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-lg ${
                                                        settings.enable_supplements
                                                            ? "bg-primary-600"
                                                            : "bg-gray-200 dark:bg-gray-700"
                                                    }`}>
                                                        <Pill className={settings.enable_supplements ? "text-white" : "text-gray-400"} size={24} />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                            Yes, I take supplements
                                                        </h3>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Track vitamins, minerals, and other supplements
                                                        </p>
                                                    </div>
                                                    {settings.enable_supplements && (
                                                        <Check className="text-primary-600" size={24} />
                                                    )}
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => handleSupplementsToggle(false)}
                                                className={`w-full p-6 rounded-xl border-2 transition-all ${
                                                    !settings.enable_supplements
                                                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                                                        : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-lg ${
                                                        !settings.enable_supplements
                                                            ? "bg-primary-600"
                                                            : "bg-gray-200 dark:bg-gray-700"
                                                    }`}>
                                                        <UtensilsCrossed className={!settings.enable_supplements ? "text-white" : "text-gray-400"} size={24} />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                            No, I don't take supplements
                                                        </h3>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Focus on nutrition, meals, and general wellness
                                                        </p>
                                                    </div>
                                                    {!settings.enable_supplements && (
                                                        <Check className="text-primary-600" size={24} />
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-4 py-4">
                                            {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                                                <label
                                                    key={meal}
                                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <UtensilsCrossed size={20} className="text-primary-600" />
                                                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                                                            {meal}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={settings[`${meal}_mode`] === "yes"}
                                                        onChange={(e) => handleMealToggle(meal, e.target.checked)}
                                                        className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div className="space-y-6 py-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                    Select workout days:
                                                </label>
                                                <div className="grid grid-cols-7 gap-2">
                                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                                                        <button
                                                            key={day}
                                                            onClick={() => handleWorkoutDayToggle(index)}
                                                            className={`p-3 rounded-lg font-medium transition-colors ${
                                                                settings.workout_days?.[index]
                                                                    ? "bg-primary-600 text-white"
                                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {settings.workout_days?.some(day => day) && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Workout time:
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={settings.workout_time || "17:00"}
                                                        onChange={(e) => handleWorkoutTimeChange(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {currentStep === 4 && (
                                        <div className="space-y-4 text-center py-8">
                                            <div className="text-6xl mb-4">🎉</div>
                                            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                                                Your personalized schedule is ready! You can customize it anytime in settings.
                                            </p>
                                            <div className="flex flex-col gap-3 max-w-md mx-auto">
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <Calendar size={20} className="text-primary-600" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        View and manage your schedule
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <Settings size={20} className="text-primary-600" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        Customize in settings anytime
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <Sparkles size={20} className="text-primary-600" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        Use templates to add routines
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 0}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                    currentStep === 0
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                <ArrowLeft size={18} />
                                Back
                            </button>

                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                            >
                                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                                {currentStep < steps.length - 1 && <ArrowRight size={18} />}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}

