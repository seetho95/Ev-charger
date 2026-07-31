export interface CityPreset {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Fallback quick-pick list of major Malaysian cities/towns, used so the trip
 * planner still works instantly (no network call) even if live geocoding via
 * Nominatim is unavailable or rate-limited.
 */
export const MY_CITIES: CityPreset[] = [
  { name: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  { name: "Petaling Jaya, Selangor", lat: 3.1073, lng: 101.6067 },
  { name: "Shah Alam, Selangor", lat: 3.0733, lng: 101.5185 },
  { name: "Putrajaya", lat: 2.9264, lng: 101.6964 },
  { name: "George Town, Penang", lat: 5.4141, lng: 100.3288 },
  { name: "Ipoh, Perak", lat: 4.5975, lng: 101.0901 },
  { name: "Melaka City", lat: 2.1896, lng: 102.2501 },
  { name: "Seremban, Negeri Sembilan", lat: 2.7297, lng: 101.9381 },
  { name: "Johor Bahru, Johor", lat: 1.4927, lng: 103.7414 },
  { name: "Kuantan, Pahang", lat: 3.8077, lng: 103.326 },
  { name: "Genting Highlands, Pahang", lat: 3.4227, lng: 101.7936 },
  { name: "Alor Setar, Kedah", lat: 6.1248, lng: 100.3678 },
  { name: "Kota Bharu, Kelantan", lat: 6.1254, lng: 102.2381 },
  { name: "Kuala Terengganu, Terengganu", lat: 5.3302, lng: 103.1408 },
  { name: "Kota Kinabalu, Sabah", lat: 5.9804, lng: 116.0735 },
  { name: "Kuching, Sarawak", lat: 1.5533, lng: 110.3592 },
];
