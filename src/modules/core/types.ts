export interface Owner {
  id: string;
  display_name: string;
  created_at: number;
  is_local_owner: number;
}

export interface Domain {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: number;
}