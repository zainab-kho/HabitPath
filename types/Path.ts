import type { PathColorKey } from '@/colors/pathColors';

export interface Path {
  id: string;
  name: string;
  color: PathColorKey; // key like "green"
  habitIds: string[];
  endDate?: string;
  createdDate: string;
  archived?: { archivedDate: string };
}