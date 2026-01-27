// @/types/Assignment.ts
export interface Assignment {
    id?: string;
    user_id?: string;
    course_id?: string;
    name: string;
    type: string;
    subject?: string;
    progress: string;
    due_date?: string;
    due_time?: string;
    created_at?: string;
    updated_at?: string;
}