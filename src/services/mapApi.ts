import { apiRequest } from './apiClient';
import type { MapPOI } from './themeService';

export interface SearchLocationItem {
  name: string;
  lat: number;
  lng: number;
}

export async function searchLocations(query: string): Promise<SearchLocationItem[]> {
  return apiRequest<SearchLocationItem[]>(`/api/v1/map/search?query=${encodeURIComponent(query)}`);
}

export async function fetchNearbyPois(lat: number, lng: number): Promise<MapPOI[]> {
  return apiRequest<MapPOI[]>(`/api/v1/map/pois/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
}
