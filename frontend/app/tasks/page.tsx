"use client";

import { BottomNav } from "@/components/BottomNav";
import { CheckSquare, Plus, ListTodo, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { getTasks, createTask, updateTask, deleteTask, Task } from "@/utils/api";

export default function TasksPage() {
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await getTasks();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error("Failed to load tasks:", error);
            showToast("Failed to load tasks", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) {
            showToast("Please enter a task title", "error");
            return;
        }

        try {
            const newTask: Omit<Task, "id" | "createdAt"> = {
                title: newTaskTitle,
                completed: false,
                priority: newTaskPriority,
            };

            const result = await createTask(newTask);
            setTasks([...tasks, result.task]);
            setNewTaskTitle("");
            setNewTaskPriority("medium");
            setShowAddModal(false);
            showToast("Task added", "success");
        } catch (error) {
            console.error("Failed to add task:", error);
            showToast("Failed to add task", "error");
        }
    };

    const handleToggleTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            await updateTask(taskId, { completed: !task.completed });
            setTasks(tasks.map(task => 
                task.id === taskId ? { ...task, completed: !task.completed } : task
            ));
        } catch (error) {
            console.error("Failed to update task:", error);
            showToast("Failed to update task", "error");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId);
            setTasks(tasks.filter(task => task.id !== taskId));
            showToast("Task deleted", "success");
        } catch (error) {
            console.error("Failed to delete task:", error);
            showToast("Failed to delete task", "error");
        }
    };

    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckSquare className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        <h1 className="font-bold text-xl tracking-tight">Tasks</h1>
                        {totalCount > 0 && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({completedCount}/{totalCount})
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="p-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-full transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading tasks...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed dark:border-gray-800">
                        <ListTodo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            No Tasks Yet
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Click the + button to add your first task
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800 flex items-start gap-3 ${
                                    task.completed ? "opacity-60" : ""
                                }`}
                            >
                                <button
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        task.completed
                                            ? "bg-primary-600 border-primary-600"
                                            : "border-gray-300 dark:border-gray-600"
                                    }`}
                                >
                                    {task.completed && (
                                        <CheckSquare className="w-4 h-4 text-white" />
                                    )}
                                </button>
                                <div className="flex-1">
                                    <h3 className={`font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                                        {task.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                            task.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                            task.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                    <X className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Task Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full border dark:border-gray-800">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Task</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Task Title</label>
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="Enter task title"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border dark:border-gray-700 focus:outline-none focus:border-primary-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleAddTask();
                                        } else if (e.key === "Escape") {
                                            setShowAddModal(false);
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Priority</label>
                                <div className="flex gap-2">
                                    {(["low", "medium", "high"] as const).map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() => setNewTaskPriority(priority)}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                newTaskPriority === priority
                                                    ? priority === "high" ? "bg-red-600 text-white" :
                                                      priority === "medium" ? "bg-yellow-600 text-white" :
                                                      "bg-blue-600 text-white"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewTaskTitle("");
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddTask}
                                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
