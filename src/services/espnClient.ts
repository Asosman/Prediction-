// ============================================================================
// FootyPredict ESPN Client Service
// Handles client-side fetching, caching, and auto-refresh for matches in West Africa Time
// ============================================================================

import { EspnMatchOfTheDay } from '../types';
import { getCurrentDateInWAT, fetchEspnMatchesOfTheDay } from './espnService';

export interface EspnFeedResponse {
  success: boolean;
  date_wat: string;
  matches: EspnMatchOfTheDay[];
  total: number;
  source: string;
}

/**
 * Fetches live matches of the day in West Africa Time (WAT)
 */
export async function getLiveEspnMatches(
  dateWatYyyyMmDd?: string,
  leagues?: string[]
): Promise<EspnFeedResponse> {
  const queryParams = new URLSearchParams();
  if (dateWatYyyyMmDd) queryParams.set('date', dateWatYyyyMmDd);
  if (leagues && leagues.length > 0) queryParams.set('leagues', leagues.join(','));

  try {
    const res = await fetch(`/api/espn/matches-of-the-day?${queryParams.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data: EspnFeedResponse = await res.json();
    if (data && data.matches && data.matches.length > 0) {
      return data;
    }
    // If backend returned empty, run client-side direct ESPN fetch
    return await fetchEspnMatchesOfTheDay(dateWatYyyyMmDd, leagues);
  } catch (err) {
    console.warn('Client server proxy fetch failed, falling back to direct ESPN API with WAT formatting:', err);
    try {
      return await fetchEspnMatchesOfTheDay(dateWatYyyyMmDd, leagues);
    } catch (directErr) {
      console.error('Direct ESPN fetch also failed:', directErr);
      const wat = getCurrentDateInWAT();
      return {
        success: false,
        date_wat: wat.formatted,
        matches: [],
        total: 0,
        source: 'ESPN Connection Unavailable',
      };
    }
  }
}
