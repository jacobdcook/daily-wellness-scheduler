"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    getUserMealTemplates,
    createMealTemplate,
    updateMealTemplate,
    deleteMealTemplate,
    useMealTemplate,
    getMealTemplateStats,
    searchMealTemplates,
    MealTemplate,
} from "@/utils/api";
import { MealTemplateCard } from "@/components/MealTemplateCard";
import { MealTemplateModal } from "@/components/MealTemplateModal";
import { useToast } from "@/context/ToastContext";
import { BottomNav } from "@/components/BottomNav";

type CategoryFilter = "all" | "breakfast" | "lunch" | "dinner" | "snacks";

export default function MealTemplatesPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<MealTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MealTemplate | null>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (session) {
            loadTemplates();
            loadStats();
        }
    }, [session]);

    useEffect(() => {
        filterTemplates();
    }, [templates, categoryFilter, searchQuery]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const category = categoryFilter === "all" ? undefined : categoryFilter;
            const result = searchQuery
                ? await searchMealTemplates(searchQuery, category)
                : await getUserMealTemplates(category);
            setTemplates(result.templates);
        } catch (error) {
            console.error("Failed to load templates:", error);
            showToast("Failed to load meal templates", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const result = await getMealTemplateStats();
            setStats(result.stats);
        } catch (error) {
            console.error("Failed to load stats:", error);
        }
    };

    const filterTemplates = () => {
        let filtered = [...templates];

        if (categoryFilter !== "all") {
            filtered = filtered.filter((t) => t.category === categoryFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.name.toLowerCase().includes(query) ||
                    t.description.toLowerCase().includes(query) ||
                    t.foods.some((f) => f.name.toLowerCase().includes(query))
            );
        }

        setFilteredTemplates(filtered);
    };

    const handleCreate = async (templateData: any) => {
        try {
            const result = await createMealTemplate(templateData);
            showToast("Template created successfully!", "success");
            await loadTemplates();
            await loadStats();
        } catch (error) {
            console.error("Failed to create template:", error);
            showToast("Failed to create template", "error");
        }
    };

    const handleUpdate = async (templateData: any) => {
        if (!editingTemplate) return;

        try {
            await updateMealTemplate(editingTemplate.id, templateData);
            showToast("Template updated successfully!", "success");
            setEditingTemplate(null);
            await loadTemplates();
            await loadStats();
        } catch (error) {
            console.error("Failed to update template:", error);
            showToast("Failed to update template", "error");
        }
    };

    const handleDelete = async (templateId: string) => {
        try {
            await deleteMealTemplate(templateId);
            showToast("Template deleted successfully!", "success");
            await loadTemplates();
            await loadStats();
        } catch (error) {
            console.error("Failed to delete template:", error);
            showToast("Failed to delete template", "error");
        }
    };

    const handleDuplicate = async (template: MealTemplate) => {
        try {
            const duplicateData = {
                name: `${template.name} (Copy)`,
                description: template.description,
                category: template.category,
                foods: template.foods,
            };
            await createMealTemplate(duplicateData);
            showToast("Template duplicated successfully!", "success");
            await loadTemplates();
            await loadStats();
        } catch (error) {
            console.error("Failed to duplicate template:", error);
            showToast("Failed to duplicate template", "error");
        }
    };

    const handleUse = async (template: MealTemplate) => {
        try {
            await useMealTemplate(template.id);
            showToast("Template marked as used", "success");
            router.push(`/nutrition?useTemplate=${template.id}`);
            await loadTemplates();
            await loadStats();
        } catch (error) {
            console.error("Failed to use template:", error);
            showToast("Failed to use template", "error");
        }
    };

    const handleEdit = (template: MealTemplate) => {
        setEditingTemplate(template);
    };

    const handleSearch = () => {
        loadTemplates();
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Please sign in to view meal templates</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <ChefHat className="w-8 h-8 text-primary-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Templates</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Save and reuse your favorite meal combinations
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Plus size={20} />
                            Create Template
                        </button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Templates</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_templates}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Uses</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_usage}</div>
                            </div>
                            {stats.most_used && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Most Used</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {stats.most_used.name}
                                    </div>
                                    <div className="text-xs text-gray-500">{stats.most_used.usage_count} times</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                                placeholder="Search templates..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(["all", "breakfast", "lunch", "dinner", "snacks"] as CategoryFilter[]).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        categoryFilter === cat
                                            ? "bg-primary-600 text-white"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Templates Grid */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                        <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {searchQuery || categoryFilter !== "all"
                                ? "No templates match your filters"
                                : "No meal templates yet"}
                        </p>
                        {!searchQuery && categoryFilter === "all" && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Create Your First Template
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map((template) => (
                            <MealTemplateCard
                                key={template.id}
                                template={template}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onDuplicate={handleDuplicate}
                                onUse={handleUse}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <MealTemplateModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    template={null}
                    onSave={handleCreate}
                />
            )}

            {editingTemplate && (
                <MealTemplateModal
                    isOpen={!!editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    template={editingTemplate}
                    onSave={handleUpdate}
                />
            )}

            <BottomNav />
        </div>
    );
}

