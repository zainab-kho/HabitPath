import React, { createContext, useContext, useState } from 'react';

export interface QuestSubtask {
    id: string;
    name: string;
}

export interface QuestGoalSchedule {
    day: string;
    maxCount: number;
}

export interface QuestGoal {
    id: string;
    name: string;
    icon: string;
    type: 'checkbox' | 'increment';
    targetCount: number | null;
    showOnHabitsPage: boolean;
    activeDays: string[];
    daySchedule: QuestGoalSchedule[];
    subtasks: QuestSubtask[];
}

export interface QuestWeek {
    id: string;
    startDate: Date;
    endDate: Date;
    label: string;
    goals: QuestGoal[];
}

export interface QuestPhase {
    name: string;
    endDate: Date | null;
    goals: QuestGoal[];
    weeks: QuestWeek[];
}

let nextId = 1;
export const genId = () => String(nextId++);

interface QuestCreationState {
    phases: QuestPhase[];
    setPhases: React.Dispatch<React.SetStateAction<QuestPhase[]>>;
    phaseCount: number;
    setPhaseCount: React.Dispatch<React.SetStateAction<number>>;
    currentPhaseIndex: number;
    setCurrentPhaseIndex: React.Dispatch<React.SetStateAction<number>>;
    weekStartDay: number;
    setWeekStartDay: React.Dispatch<React.SetStateAction<number>>;
    updatePhaseCount: (newCount: number) => void;
    updatePhaseName: (index: number, name: string) => void;
    updatePhaseEndDate: (index: number, date: Date | null) => void;
    addGoalToPhase: (phaseIndex: number, goal: QuestGoal, weekId: string | null) => void;
    addWeekToPhase: (phaseIndex: number, week: QuestWeek) => void;
    getWeekStartDay: () => number; // returns weekStartDay directly
    resetPhases: () => void;
    addGoalTargetWeekId: string | null;
    setAddGoalTargetWeekId: React.Dispatch<React.SetStateAction<string | null>>;
    editingGoal: QuestGoal | null;
    setEditingGoal: React.Dispatch<React.SetStateAction<QuestGoal | null>>;
    updateGoalInPhase: (phaseIndex: number, updatedGoal: QuestGoal, weekId: string | null) => void;
    removeGoalFromPhase: (phaseIndex: number, goalId: string, weekId: string | null) => void;
    removeWeekFromPhase: (phaseIndex: number, weekId: string) => void;
    // detail mode: saving directly to Supabase for existing quests
    detailPhaseId: string | null;
    setDetailPhaseId: React.Dispatch<React.SetStateAction<string | null>>;
    detailWeekId: string | null;
    setDetailWeekId: React.Dispatch<React.SetStateAction<string | null>>;
    onDetailGoalSaved: (() => void) | null;
    setOnDetailGoalSaved: React.Dispatch<React.SetStateAction<(() => void) | null>>;
}

const QuestCreationContext = createContext<QuestCreationState | null>(null);

export function QuestCreationProvider({ children }: { children: React.ReactNode }) {
    const [phaseCount, setPhaseCount] = useState(1);
    const [phases, setPhases] = useState<QuestPhase[]>([
        { name: 'Phase 1', endDate: null, goals: [], weeks: [] },
    ]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [weekStartDay, setWeekStartDay] = useState(0);
    const [addGoalTargetWeekId, setAddGoalTargetWeekId] = useState<string | null>(null);
    const [editingGoal, setEditingGoal] = useState<QuestGoal | null>(null);
    const [detailPhaseId, setDetailPhaseId] = useState<string | null>(null);
    const [detailWeekId, setDetailWeekId] = useState<string | null>(null);
    const [onDetailGoalSaved, setOnDetailGoalSaved] = useState<(() => void) | null>(null);

    const updatePhaseCount = (newCount: number) => {
        if (newCount < 1) return;
        setPhaseCount(newCount);
        setPhases(prev => {
            if (newCount > prev.length) {
                const additions = Array.from({ length: newCount - prev.length }, (_, i) => ({
                    name: `Phase ${prev.length + i + 1}`,
                    endDate: null,
                    goals: [],
                    weeks: [],
                }));
                return [...prev, ...additions];
            }
            return prev.slice(0, newCount);
        });
        setCurrentPhaseIndex(prev => (prev >= newCount ? newCount - 1 : prev));
    };

    const updatePhaseName = (index: number, name: string) => {
        setPhases(prev => prev.map((p, i) => (i === index ? { ...p, name } : p)));
    };

    const updatePhaseEndDate = (index: number, date: Date | null) => {
        setPhases(prev => prev.map((p, i) => (i === index ? { ...p, endDate: date } : p)));
    };

    const addGoalToPhase = (phaseIndex: number, goal: QuestGoal, weekId: string | null) => {
        setPhases(prev =>
            prev.map((p, i) => {
                if (i !== phaseIndex) return p;
                if (weekId) {
                    return {
                        ...p,
                        weeks: p.weeks.map(w =>
                            w.id === weekId ? { ...w, goals: [...w.goals, goal] } : w
                        ),
                    };
                }
                return { ...p, goals: [...p.goals, goal] };
            })
        );
    };

    const addWeekToPhase = (phaseIndex: number, week: QuestWeek) => {
        setPhases(prev =>
            prev.map((p, i) => (i === phaseIndex ? { ...p, weeks: [...p.weeks, week] } : p))
        );
    };

    const updateGoalInPhase = (phaseIndex: number, updatedGoal: QuestGoal, weekId: string | null) => {
        setPhases(prev =>
            prev.map((p, i) => {
                if (i !== phaseIndex) return p;
                if (weekId) {
                    return {
                        ...p,
                        weeks: p.weeks.map(w =>
                            w.id === weekId
                                ? { ...w, goals: w.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g) }
                                : w
                        ),
                    };
                }
                return { ...p, goals: p.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g) };
            })
        );
    };

    const removeGoalFromPhase = (phaseIndex: number, goalId: string, weekId: string | null) => {
        setPhases(prev =>
            prev.map((p, i) => {
                if (i !== phaseIndex) return p;
                if (weekId) {
                    return {
                        ...p,
                        weeks: p.weeks.map(w =>
                            w.id === weekId ? { ...w, goals: w.goals.filter(g => g.id !== goalId) } : w
                        ),
                    };
                }
                return { ...p, goals: p.goals.filter(g => g.id !== goalId) };
            })
        );
    };

    const removeWeekFromPhase = (phaseIndex: number, weekId: string) => {
        setPhases(prev =>
            prev.map((p, i) => (i === phaseIndex ? { ...p, weeks: p.weeks.filter(w => w.id !== weekId) } : p))
        );
    };

    const getWeekStartDay = () => weekStartDay;

    const resetPhases = () => {
        setPhaseCount(1);
        setPhases([{ name: 'Phase 1', endDate: null, goals: [], weeks: [] }]);
        setCurrentPhaseIndex(0);
    };

    return (
        <QuestCreationContext.Provider
            value={{
                phases,
                setPhases,
                phaseCount,
                setPhaseCount,
                currentPhaseIndex,
                setCurrentPhaseIndex,
                weekStartDay,
                setWeekStartDay,
                updatePhaseCount,
                updatePhaseName,
                updatePhaseEndDate,
                addGoalToPhase,
                addWeekToPhase,
                getWeekStartDay,
                resetPhases,
                addGoalTargetWeekId,
                setAddGoalTargetWeekId,
                editingGoal,
                setEditingGoal,
                updateGoalInPhase,
                removeGoalFromPhase,
                removeWeekFromPhase,
                detailPhaseId,
                setDetailPhaseId,
                detailWeekId,
                setDetailWeekId,
                onDetailGoalSaved,
                setOnDetailGoalSaved,
            }}
        >
            {children}
        </QuestCreationContext.Provider>
    );
}

export function useQuestCreation() {
    const ctx = useContext(QuestCreationContext);
    if (!ctx) throw new Error('useQuestCreation must be used within QuestCreationProvider');
    return ctx;
}
