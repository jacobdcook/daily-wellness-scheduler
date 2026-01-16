"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Activity, Plus, TrendingUp, TrendingDown, Minus, ArrowLeft, Trash2, Edit2 } from "lucide-react";
import { 
    getHealthMetrics, 
    createHealthMetric, 
    deleteHealthMetric, 
    getHealthMetricStats,
    HealthMetric,
    HealthMetricStats
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

type MetricType = "weight" | "blood_pressure" | "heart_rate" | "custom";

export default function HealthMetricsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<MetricType>("weight");
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [stats, setStats] = useState<HealthMetricStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMetric, setNewMetric] = useState({
        metric_type: "weight" as MetricType,
        value: "",
        unit: "lbs",
        notes: "",
        custom_name: "",
    });

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [metricsData, statsData] = await Promise.all([
                getHealthMetrics(activeTab, 30),
                getHealthMetricStats(activeTab, 30)
            ]);
            setMetrics(metricsData.metrics);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load health metrics:", error);
            showToast("Failed to load health metrics", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMetric = async () => {
        if (!newMetric.value) {
            showToast("Please enter a value", "error");
            return;
        }

        try {
            await createHealthMetric({
                metric_type: newMetric.metric_type,
                value: parseFloat(newMetric.value),
                unit: newMetric.unit,
                timestamp: new Date().toISOString(),
                notes: newMetric.notes || undefined,
                custom_name: newMetric.custom_name || undefined,
            });
            showToast("Metric added successfully", "success");
            setShowAddModal(false);
            setNewMetric({ metric_type: "weight", value: "", unit: "lbs", notes: "", custom_name: "" });
            loadData();
        } catch (error) {
            console.error("Failed to add metric:", error);
            showToast("Failed to add metric", "error");
        }
    };

    const handleDeleteMetric = async (metricId: string) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;

        try {
            await deleteHealthMetric(metricId);
            showToast("Metric deleted", "success");
            loadData();
        } catch (error) {
            console.error("Failed to delete metric:", error);
            showToast("Failed to delete metric", "error");
        }
    };

    const getMetricLabel = (type: MetricType) => {
        switch (type) {
            case "weight": return "Weight";
            case "blood_pressure": return "Blood Pressure";
            case "heart_rate": return "Heart Rate";
            case "custom": return "Custom";
            default: return type;
        }
    };

    const getMetricUnit = (type: MetricType) => {
        switch (type) {
            case "weight": return ["lbs", "kg"];
            case "blood_pressure": return ["mmHg"];
            case "heart_rate": return ["bpm"];
            case "custom": return ["units"];
            default: return ["units"];
        }
    };

    const formatValue = (metric: HealthMetric) => {
        if (metric.metric_type === "blood_pressure") {
            // Blood pressure is stored as a single value, but we'll display it differently
            return `${metric.value} ${metric.unit}`;
        }
        return `${metric.value} ${metric.unit}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        <h1 className="font-bold text-xl tracking-tight">Health Metrics</h1>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {/* Tab Navigation */}
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-6 overflow-x-auto">
                    {(["weight", "blood_pressure", "heart_rate"] as MetricType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                activeTab === type
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                        >
                            {getMetricLabel(type)}
                        </button>
                    ))}
                </div>

                {/* Stats Card */}
                {stats && stats.count > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Statistics (Last 30 Days)</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Latest</p>
                                <p className="text-2xl font-bold">
                                    {stats.latest ? formatValue(stats.latest) : "N/A"}
                                </p>
                            </div>
                            {stats.average !== null && (
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Average</p>
                                    <p className="text-2xl font-bold">
                                        {stats.average.toFixed(1)} {stats.latest?.unit || ""}
                                    </p>
                                </div>
                            )}
                            {stats.min !== null && stats.max !== null && (
                                <>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Min</p>
                                        <p className="text-2xl font-bold">
                                            {stats.min.toFixed(1)} {stats.latest?.unit || ""}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Max</p>
                                        <p className="text-2xl font-bold">
                                            {stats.max.toFixed(1)} {stats.latest?.unit || ""}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                        {stats.trend && (
                            <div className="mt-4 flex items-center gap-2">
                                {stats.trend === "increasing" && <TrendingUp className="w-5 h-5 text-red-500" />}
                                {stats.trend === "decreasing" && <TrendingDown className="w-5 h-5 text-green-500" />}
                                {stats.trend === "stable" && <Minus className="w-5 h-5 text-gray-500" />}
                                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                    Trend: {stats.trend}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Metrics List */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : metrics.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed dark:border-gray-800">
                        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No {getMetricLabel(activeTab).toLowerCase()} entries yet</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Add First Entry
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {metrics.map((metric) => (
                            <div
                                key={metric.id}
                                className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-4 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <p className="text-2xl font-bold">{formatValue(metric)}</p>
                                        {metric.metric_type === "blood_pressure" && (
                                            <span className="text-sm text-gray-500">Systolic</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {format(new Date(metric.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                    {metric.notes && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{metric.notes}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteMetric(metric.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Metric Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Add {getMetricLabel(activeTab)} Entry</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Value</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={newMetric.value}
                                    onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                                    placeholder="Enter value"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Unit</label>
                                <select
                                    value={newMetric.unit}
                                    onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                                >
                                    {getMetricUnit(activeTab).map((unit) => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>

                            {activeTab === "blood_pressure" && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                                    💡 Tip: Enter systolic pressure. Diastolic can be added in notes.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                                <textarea
                                    value={newMetric.notes}
                                    onChange={(e) => setNewMetric({ ...newMetric, notes: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                                    rows={3}
                                    placeholder="Add any notes..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddMetric}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Add Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

