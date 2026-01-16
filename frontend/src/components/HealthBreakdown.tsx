"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface BreakdownData {
    nutri_score_points?: number;
    nova_points?: number;
    additives_points?: number;
    ingredient_quality_points?: number;
    final_score?: number;
    grade?: string;
}

interface HealthBreakdownProps {
    breakdown?: BreakdownData;
    showChart?: boolean;
}

export function HealthBreakdown({ breakdown, showChart = true }: HealthBreakdownProps) {
    if (!breakdown) {
        return null;
    }

    const components = [
        {
            name: "Nutri-Score",
            value: breakdown.nutri_score_points || 0,
            weight: 40,
            color: "#3b82f6" // blue
        },
        {
            name: "NOVA",
            value: breakdown.nova_points || 0,
            weight: 30,
            color: "#f59e0b" // orange
        },
        {
            name: "Additives",
            value: breakdown.additives_points || 0,
            weight: 20,
            color: "#ef4444" // red
        },
        {
            name: "Ingredients",
            value: breakdown.ingredient_quality_points || 0,
            weight: 10,
            color: "#10b981" // green
        }
    ];

    const chartData = components.map(comp => ({
        name: comp.name,
        value: comp.value,
        weight: `${comp.weight}%`
    }));

    const COLORS = components.map(c => c.color);

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-base font-bold text-white mb-1">Score Breakdown</h4>
                <p className="text-xs text-gray-400 mb-4">How your health score is calculated</p>
                
                {showChart && (
                    <div className="mb-6 bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #475569',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                />
                                <Legend 
                                    wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="space-y-3">
                    {components.map((comp, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                    <div 
                                        className="w-4 h-4 rounded-full shadow-md"
                                        style={{ backgroundColor: comp.color }}
                                    />
                                    <span className="text-sm font-semibold text-white">{comp.name}</span>
                                    <span className="text-xs text-gray-500 bg-slate-700 px-2 py-0.5 rounded">
                                        {comp.weight} weight
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-white">
                                    {comp.value}/100
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${comp.value}%`,
                                        backgroundColor: comp.color,
                                        boxShadow: `0 0 8px ${comp.color}40`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Final Score</span>
                    <span className="text-lg font-bold text-orange-400">
                        {breakdown.final_score || 0}/100
                    </span>
                </div>
                {breakdown.grade && (
                    <div className="text-xs text-gray-400 mt-1">
                        Grade: {breakdown.grade}
                    </div>
                )}
            </div>
        </div>
    );
}

