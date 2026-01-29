// // @/lib/services/assignment-service.ts
// import { SupabaseService } from '@/lib/supabase-service';
// import { Assignment } from '@/types/Assignment';

// const TABLE_NAME = 'assignments';

// export const AssignmentService = {
//   getAll: (userId: string) =>
//     SupabaseService.getAll<Assignment>(TABLE_NAME, userId, undefined, {
//       column: 'due_date',
//       ascending: true,
//     }),

//   getById: (id: string, userId: string) =>
//     SupabaseService.getById<Assignment>(TABLE_NAME, id, userId),

//   create: (assignment: Partial<Assignment>, userId: string) =>
//     SupabaseService.create<Assignment>(TABLE_NAME, assignment, userId),

//   update: (id: string, assignment: Partial<Assignment>, userId: string) =>
//     SupabaseService.update<Assignment>(TABLE_NAME, id, assignment, userId),

//   delete: (id: string, userId: string) =>
//     SupabaseService.delete(TABLE_NAME, id, userId),

//   // custom method: get assignments by course
//   getByCourse: (courseId: string, userId: string) =>
//     SupabaseService.getAll<Assignment>(TABLE_NAME, userId, [
//       { column: 'course_id', value: courseId },
//     ]),

//   // custom method: get assignments by progress status
//   getByProgress: (progress: string, userId: string) =>
//     SupabaseService.getAll<Assignment>(TABLE_NAME, userId, [
//       { column: 'progress', value: progress },
//     ]),
// };