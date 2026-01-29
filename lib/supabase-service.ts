// // @/lib/supabase-service.ts
// import { supabase } from '@/lib/supabase';
// import { PostgrestError } from '@supabase/supabase-js';

// /**
//  * generic response type for all database operations
//  */
// export interface DbResponse<T> {
//   data: T | null;
//   error: PostgrestError | Error | null;
//   success: boolean;
// }

// /**
//  * generic Supabase service for CRUD operations
//  */
// export class SupabaseService {
//   /**
//    * fetch all records from a table with optional filters
//    */
//   static async getAll<T>(
//     tableName: string,
//     userId?: string,
//     filters?: { column: string; value: any }[],
//     orderBy?: { column: string; ascending?: boolean }
//   ): Promise<DbResponse<T[]>> {
//     try {
//       let query = supabase.from(tableName).select('*');

//       // add user filter if provided
//       if (userId) {
//         query = query.eq('user_id', userId);
//       }

//       // add additional filters
//       if (filters) {
//         filters.forEach(filter => {
//           query = query.eq(filter.column, filter.value);
//         });
//       }

//       // add ordering
//       if (orderBy) {
//         query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
//       }

//       const { data, error } = await query;

//       if (error) {
//         console.error(`Error fetching from ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: data as T[], error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error fetching from ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * fetch a single record by ID
//    */
//   static async getById<T>(
//     tableName: string,
//     id: string,
//     userId?: string
//   ): Promise<DbResponse<T>> {
//     try {
//       let query = supabase.from(tableName).select('*').eq('id', id);

//       if (userId) {
//         query = query.eq('user_id', userId);
//       }

//       const { data, error } = await query.single();

//       if (error) {
//         console.error(`Error fetching ${tableName} by ID:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: data as T, error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error fetching ${tableName} by ID:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * create a new record
//    */
//   static async create<T>(
//     tableName: string,
//     data: Partial<T>,
//     userId?: string
//   ): Promise<DbResponse<T>> {
//     try {
//       const insertData = userId ? { ...data, user_id: userId } : data;

//       const { data: result, error } = await supabase
//         .from(tableName)
//         .insert([insertData])
//         .select()
//         .single();

//       if (error) {
//         console.error(`Error creating ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: result as T, error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error creating ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * create multiple records at once
//    */
//   static async createMany<T>(
//     tableName: string,
//     dataArray: Partial<T>[],
//     userId?: string
//   ): Promise<DbResponse<T[]>> {
//     try {
//       const insertData = userId
//         ? dataArray.map(item => ({ ...item, user_id: userId }))
//         : dataArray;

//       const { data: result, error } = await supabase
//         .from(tableName)
//         .insert(insertData)
//         .select();

//       if (error) {
//         console.error(`Error creating multiple ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: result as T[], error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error creating multiple ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * update a record by ID
//    */
//   static async update<T>(
//     tableName: string,
//     id: string,
//     data: Partial<T>,
//     userId?: string
//   ): Promise<DbResponse<T>> {
//     try {
//       let query = supabase
//         .from(tableName)
//         .update(data)
//         .eq('id', id);

//       if (userId) {
//         query = query.eq('user_id', userId);
//       }

//       const { data: result, error } = await query.select().single();

//       if (error) {
//         console.error(`Error updating ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: result as T, error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error updating ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * update multiple records with a filter
//    */
//   static async updateMany<T>(
//     tableName: string,
//     data: Partial<T>,
//     filters: { column: string; value: any }[],
//     userId?: string
//   ): Promise<DbResponse<T[]>> {
//     try {
//       let query = supabase.from(tableName).update(data);

//       if (userId) {
//         query = query.eq('user_id', userId);
//       }

//       filters.forEach(filter => {
//         query = query.eq(filter.column, filter.value);
//       });

//       const { data: result, error } = await query.select();

//       if (error) {
//         console.error(`Error updating multiple ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: result as T[], error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error updating multiple ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * delete a record by ID
//    */
//   static async delete(
//     tableName: string,
//     id: string,
//     userId?: string
//   ): Promise<DbResponse<null>> {
//     try {
//       let query = supabase.from(tableName).delete().eq('id', id);

//       if (userId) {
//         query = query.eq('user_id', userId);
//       }

//       const { error } = await query;

//       if (error) {
//         console.error(`Error deleting from ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: null, error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error deleting from ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * delete multiple records with filters
//    */
//   static async deleteMany(
//     tableName: string,
//     filters: { column: string; value: any }[],
//     userId?: string
//   ): Promise<DbResponse<null>> {
//     try {
//       let query = supabase.from(tableName).delete();

//       if (userId) {
//         query = query.eq('user_id', userId);
//       }

//       filters.forEach(filter => {
//         query = query.eq(filter.column, filter.value);
//       });

//       const { error } = await query;

//       if (error) {
//         console.error(`Error deleting multiple from ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: null, error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error deleting multiple from ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }

//   /**
//    * upsert (insert or update) a record
//    */
//   static async upsert<T>(
//     tableName: string,
//     data: Partial<T>,
//     userId?: string
//   ): Promise<DbResponse<T>> {
//     try {
//       const upsertData = userId ? { ...data, user_id: userId } : data;

//       const { data: result, error } = await supabase
//         .from(tableName)
//         .upsert(upsertData)
//         .select()
//         .single();

//       if (error) {
//         console.error(`Error upserting ${tableName}:`, error);
//         return { data: null, error, success: false };
//       }

//       return { data: result as T, error: null, success: true };
//     } catch (error) {
//       console.error(`Unexpected error upserting ${tableName}:`, error);
//       return { data: null, error: error as Error, success: false };
//     }
//   }
// }