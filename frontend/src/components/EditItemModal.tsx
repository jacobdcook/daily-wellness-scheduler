"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ScheduledItem } from "@/types";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ScheduledItem | null;
    onSave: (itemId: string, updates: Record<string, string>) => void;
    onDelete: (itemId: string) => void;
}

export function EditItemModal({ isOpen, onClose, item, onSave, onDelete }: EditItemModalProps) {
    const [name, setName] = useState("");
    const [time, setTime] = useState("");
    const [dose, setDose] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!item) return;

        const newName = item.item.name;
        let newTime = "00:00";
        try {
            newTime = format(new Date(item.scheduled_time), "HH:mm");
        } catch (e) {
            // Fallback if valid HH:mm string
            if (typeof item.scheduled_time === 'string' && item.scheduled_time.includes(":")) {
                newTime = item.scheduled_time; 
            }
        }
        const newDose = item.item.dose ?? "";
        const newNotes = item.item.notes ?? "";

        setName(prev => prev !== newName ? newName : prev);
        setTime(prev => prev !== newTime ? newTime : prev);
        setDose(prev => prev !== newDose ? newDose : prev);
        setNotes(prev => prev !== newNotes ? newNotes : prev);
    }, [item]);

    if (!item) return null;

    const handleSave = () => {
        onSave(item.id || "", {
            name,
            scheduled_time: time, // Just passing HH:mm, backend will merge with date
            dose,
            notes
        });
        onClose();
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this item?")) {
            onDelete(item.id || "");
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Edit Schedule Item</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                        />

                        {/* Quick Reschedule Actions */}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => {
                                    const [h, m] = time.split(':').map(Number);
                                    const d = new Date(); d.setHours(h, m + 15);
                                    setTime(format(d, 'HH:mm'));
                                }}
                                className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border rounded text-xs font-medium text-gray-600"
                            >
                                +15m
                            </button>
                            <button
                                onClick={() => {
                                    const [h, m] = time.split(':').map(Number);
                                    const d = new Date(); d.setHours(h, m + 30);
                                    setTime(format(d, 'HH:mm'));
                                }}
                                className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border rounded text-xs font-medium text-gray-600"
                            >
                                +30m
                            </button>
                            <button
                                onClick={() => {
                                    const [h, m] = time.split(':').map(Number);
                                    const d = new Date(); d.setHours(h + 1, m);
                                    setTime(format(d, 'HH:mm'));
                                }}
                                className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border rounded text-xs font-medium text-gray-600"
                            >
                                +1h
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dose</label>
                        <input
                            type="text"
                            value={dose}
                            onChange={(e) => setDose(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            rows={2}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-between">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        Delete
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

