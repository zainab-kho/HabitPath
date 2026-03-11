export interface Reward {
  id: string;
  name: string;
  costPoints: number;
  costDollars: number;
  backgroundColor?: string;
  photoUri?: string;
  tags?: string[];
  notes?: string;
  dateAdded: string;
  isClaimed: boolean;
  dateClaimed?: string;
}
