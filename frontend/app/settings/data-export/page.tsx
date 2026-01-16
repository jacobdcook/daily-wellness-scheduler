"use client";

import { useState, useRef } from "react";
import { 
    Download, Upload, Database, FileText, FileJson, 
    CheckCircle, AlertCircle, Loader2, ArrowLeft,
    Save, RefreshCw, Trash2, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import {
    exportAllData,
    exportNutritionCSV,
    exportWeightCSV,
    exportRecipesJSON,
    exportMealPlanJSON,
    importMyFitnessPal,
    importCronometer,
    importGenericJSON,
    createBackup,
    restoreBackup,
    BackupData,
    ImportResults
} from "@/utils/api";

export default function DataExportPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [importResults, setImportResults] = useState<ImportResults | null>(null);
    const [backupData, setBackupData] = useState<BackupData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importType, setImportType] = useState<"myfitnesspal" | "cronometer" | "generic" | null>(null);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const downloadJSON = (data: any, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, filename);
    };

    const handleExportNutritionCSV = async () => {
        setLoading("nutrition-csv");
        try {
            const blob = await exportNutritionCSV(dateRange.start || undefined, dateRange.end || undefined);
            const filename = `nutrition_export_${new Date().toISOString().split('T')[0]}.csv`;
            downloadBlob(blob, filename);
            showToast("Nutrition data exported successfully!", "success");
        } catch (error) {
            showToast("Failed to export nutrition data", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleExportWeightCSV = async () => {
        setLoading("weight-csv");
        try {
            const blob = await exportWeightCSV();
            const filename = `weight_export_${new Date().toISOString().split('T')[0]}.csv`;
            downloadBlob(blob, filename);
            showToast("Weight data exported successfully!", "success");
        } catch (error) {
            showToast("Failed to export weight data", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleExportRecipes = async () => {
        setLoading("recipes");
        try {
            const blob = await exportRecipesJSON();
            const filename = `recipes_export_${new Date().toISOString().split('T')[0]}.json`;
            downloadBlob(blob, filename);
            showToast("Recipes exported successfully!", "success");
        } catch (error) {
            showToast("Failed to export recipes", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleExportMealPlan = async () => {
        setLoading("meal-plan");
        try {
            const blob = await exportMealPlanJSON();
            const filename = `meal_plan_export_${new Date().toISOString().split('T')[0]}.json`;
            downloadBlob(blob, filename);
            showToast("Meal plan exported successfully!", "success");
        } catch (error) {
            showToast("Failed to export meal plan", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleExportAll = async () => {
        setLoading("all");
        try {
            const data = await exportAllData();
            const filename = `full_backup_${new Date().toISOString().split('T')[0]}.json`;
            downloadJSON(data, filename);
            setBackupData(data);
            showToast("Full data export completed!", "success");
        } catch (error) {
            showToast("Failed to export data", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleCreateBackup = async () => {
        setLoading("backup");
        try {
            const backup = await createBackup();
            const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
            downloadJSON(backup, filename);
            setBackupData(backup);
            showToast("Backup created successfully!", "success");
        } catch (error) {
            showToast("Failed to create backup", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !importType) return;

        setLoading(`import-${importType}`);
        setImportResults(null);

        try {
            let results: ImportResults;
            
            switch (importType) {
                case "myfitnesspal":
                    results = await importMyFitnessPal(file);
                    break;
                case "cronometer":
                    results = await importCronometer(file);
                    break;
                case "generic":
                    results = await importGenericJSON(file);
                    break;
                default:
                    throw new Error("Invalid import type");
            }

            setImportResults(results);
            
            const totalImported = (results.imported.nutrition || 0) + 
                                 (results.imported.recipes || 0) + 
                                 (results.imported.weight || 0);
            
            if (totalImported > 0) {
                showToast(`Successfully imported ${totalImported} items!`, "success");
            } else {
                showToast("No items were imported. Check the file format.", "warning");
            }

            if (results.errors.length > 0) {
                console.error("Import errors:", results.errors);
            }
        } catch (error: any) {
            showToast(error.message || "Failed to import data", "error");
        } finally {
            setLoading(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRestoreBackup = async () => {
        if (!backupData) {
            showToast("Please upload a backup file first", "warning");
            return;
        }

        if (!confirm("This will restore all data from the backup. Continue?")) {
            return;
        }

        setLoading("restore");
        try {
            const results = await restoreBackup(backupData);
            setImportResults(results);
            showToast("Backup restored successfully! Please refresh the page.", "success");
        } catch (error) {
            showToast("Failed to restore backup", "error");
        } finally {
            setLoading(null);
        }
    };

    const handleBackupFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text) as BackupData;
            setBackupData(data);
            showToast("Backup file loaded successfully!", "success");
        } catch (error) {
            showToast("Invalid backup file format", "error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Data Export & Import</h1>
                        <p className="text-gray-400">Export your data or import from other apps</p>
                    </div>
                </div>

                {/* Export Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Download className="w-6 h-6 text-orange-400" />
                        <h2 className="text-2xl font-bold text-white">Export Data</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Nutrition CSV */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <h3 className="font-semibold text-white">Nutrition Data (CSV)</h3>
                                        <p className="text-sm text-gray-400">Export all nutrition entries as CSV</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleExportNutritionCSV}
                                    disabled={loading === "nutrition-csv"}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {loading === "nutrition-csv" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Start Date (optional)</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">End Date (optional)</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Weight CSV */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-green-400" />
                                    <div>
                                        <h3 className="font-semibold text-white">Weight Data (CSV)</h3>
                                        <p className="text-sm text-gray-400">Export all weight entries as CSV</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleExportWeightCSV}
                                    disabled={loading === "weight-csv"}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {loading === "weight-csv" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export
                                </button>
                            </div>
                        </div>

                        {/* Recipes JSON */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileJson className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <h3 className="font-semibold text-white">Recipes (JSON)</h3>
                                        <p className="text-sm text-gray-400">Export all your recipes</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleExportRecipes}
                                    disabled={loading === "recipes"}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {loading === "recipes" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export
                                </button>
                            </div>
                        </div>

                        {/* Meal Plan JSON */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileJson className="w-5 h-5 text-yellow-400" />
                                    <div>
                                        <h3 className="font-semibold text-white">Meal Plan (JSON)</h3>
                                        <p className="text-sm text-gray-400">Export your current meal plan</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleExportMealPlan}
                                    disabled={loading === "meal-plan"}
                                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {loading === "meal-plan" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export
                                </button>
                            </div>
                        </div>

                        {/* Full Export */}
                        <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-lg p-4 border-2 border-orange-500/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-orange-400" />
                                    <div>
                                        <h3 className="font-semibold text-white">Full Data Export (JSON)</h3>
                                        <p className="text-sm text-gray-400">Export all your data (GDPR-compliant)</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleExportAll}
                                    disabled={loading === "all"}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {loading === "all" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Import Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Upload className="w-6 h-6 text-green-400" />
                        <h2 className="text-2xl font-bold text-white">Import Data</h2>
                    </div>

                    <div className="space-y-4 mb-4">
                        {/* MyFitnessPal */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white mb-1">MyFitnessPal</h3>
                                    <p className="text-sm text-gray-400">Import nutrition data from MyFitnessPal CSV export</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setImportType("myfitnesspal");
                                        fileInputRef.current?.click();
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Choose File
                                </button>
                            </div>
                        </div>

                        {/* Cronometer */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Cronometer</h3>
                                    <p className="text-sm text-gray-400">Import nutrition data from Cronometer CSV export</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setImportType("cronometer");
                                        fileInputRef.current?.click();
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Choose File
                                </button>
                            </div>
                        </div>

                        {/* Generic JSON */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Generic JSON</h3>
                                    <p className="text-sm text-gray-400">Import from our own export format or compatible JSON</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setImportType("generic");
                                        fileInputRef.current?.click();
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Choose File
                                </button>
                            </div>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={importType === "generic" ? ".json" : ".csv"}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {/* Import Results */}
                    {importResults && (
                        <div className={`mt-4 p-4 rounded-lg border ${
                            importResults.errors.length > 0 
                                ? "bg-yellow-900/20 border-yellow-500/50" 
                                : "bg-green-900/20 border-green-500/50"
                        }`}>
                            <div className="flex items-start gap-3">
                                {importResults.errors.length > 0 ? (
                                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <h4 className="font-semibold text-white mb-2">Import Results</h4>
                                    <div className="space-y-1 text-sm">
                                        {importResults.imported.nutrition && (
                                            <div className="text-gray-300">
                                                ✅ Imported {importResults.imported.nutrition} nutrition entries
                                            </div>
                                        )}
                                        {importResults.imported.recipes && (
                                            <div className="text-gray-300">
                                                ✅ Imported {importResults.imported.recipes} recipes
                                            </div>
                                        )}
                                        {importResults.imported.weight && (
                                            <div className="text-gray-300">
                                                ✅ Imported {importResults.imported.weight} weight entries
                                            </div>
                                        )}
                                        {importResults.skipped > 0 && (
                                            <div className="text-yellow-400">
                                                ⚠️ Skipped {importResults.skipped} items
                                            </div>
                                        )}
                                        {importResults.errors.length > 0 && (
                                            <div className="mt-2">
                                                <div className="text-red-400 font-medium mb-1">Errors:</div>
                                                {importResults.errors.slice(0, 5).map((error, idx) => (
                                                    <div key={idx} className="text-red-300 text-xs">{error}</div>
                                                ))}
                                                {importResults.errors.length > 5 && (
                                                    <div className="text-red-300 text-xs">
                                                        ...and {importResults.errors.length - 5} more errors
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Backup & Restore Section */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                        <Save className="w-6 h-6 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">Backup & Restore</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800">
                            <div className="flex items-start gap-3 mb-4">
                                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div className="text-sm text-blue-300">
                                    <p className="font-medium mb-1">Backup Your Data</p>
                                    <p className="text-blue-400">
                                        Create a complete backup of all your data. This includes nutrition entries, recipes, 
                                        weight data, meal plans, and settings. You can restore from this backup at any time.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCreateBackup}
                                disabled={loading === "backup"}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {loading === "backup" ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                Create Backup
                            </button>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                            <h3 className="font-semibold text-white mb-3">Restore from Backup</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Upload Backup File</label>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleBackupFileUpload}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-orange-600 file:text-white hover:file:bg-orange-700"
                                    />
                                </div>
                                {backupData && (
                                    <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-400 mb-1">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">Backup file loaded</span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Export date: {backupData.export_metadata?.export_date || backupData.backup_metadata?.backup_date || "Unknown"}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={handleRestoreBackup}
                                    disabled={!backupData || loading === "restore"}
                                    className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading === "restore" ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-5 h-5" />
                                    )}
                                    Restore Backup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

