export interface TopicalKeyword {
  id: number;
  cluster_id: string;
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  intent?: string;
  suggested_title?: string;
  status: string;
  created_at: string;
}

export interface TopicalCluster {
  id: string;
  topical_map_id: string;
  parent_id?: string;
  name: string;
  description?: string;
  level: number;
  created_at: string;
  keywords: TopicalKeyword[];
  subclusters: TopicalCluster[];
}

export interface TopicalMap {
  id: string;
  user_id: string;
  name: string;
  topic: string;
  country: string;
  language: string;
  total_keywords: number;
  total_search_volume: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface TopicalMapDetail extends TopicalMap {
  clusters: TopicalCluster[];
}

export interface CreateTopicalMapRequest {
  name: string;
  topic: string;
  country?: string;
  language?: string;
}
