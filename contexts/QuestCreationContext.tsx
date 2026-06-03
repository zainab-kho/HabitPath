import React, { createContext, useContext, useState } from 'react';

export interface QuestSubtask {
    id: string;
    name: string;
}

export interface QuestGoal {
    id: string;
    name: string;
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
    weekEndDay: number;
    setWeekEndDay: React.Dispatch<React.SetStateAction<number>>;
    updatePhaseCount: (newCount: number) => void;
    updatePhaseName: (index: number, name: string) => void;
    updatePhaseEndDate: (index: number, date: Date | null) => void;
    addGoalToPhase: (phaseIndex: number, goal: QuestGoal, weekId: string | null) => void;
    addWeekToPhase: (phaseIndex: number, week: QuestWeek) => void;
    getWeekStartDay: () => number;
    resetPhases: () => void;
}

const QuestCreationContext = createContext<QuestCreationState | null>(null);

export function QuestCreationProvider({ children }: { children: React.ReactNode }) {
    const [phaseCount, setPhaseCount] = useState(1);
    const [phases, setPhases] = useState<QuestPhase[]>([
        { name: 'Phase 1', endDate: null, goals: [], weeks: [] },
    ]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [weekEndDay, setWeekEndDay] = useState(0);

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

    const getWeekStartDay = () => (weekEndDay + 1) % 7;

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
                weekEndDay,
                setWeekEndDay,
                updatePhaseCount,
                updatePhaseName,
                updatePhaseEndDate,
                addGoalToPhase,
                addWeekToPhase,
                getWeekStartDay,
                resetPhases,
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
