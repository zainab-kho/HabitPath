// @/types/Course.ts
export interface Course {
    id?: string;
    user_id?: string;
    course_number: string;
    course_name: string;
    instructor?: string;
    has_schedule?: boolean;
    schedule_days?: string[];
    schedule_start_time?: string;
    schedule_end_time?: string;
    created_at?: string;
    updated_at?: string;
    color?: string;
}