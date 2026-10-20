// Approximate province centers from Open Admin Data; no device location is read.
// The merchant must explicitly tap a map point to select an address.
export const PROVINCE_MAP_CENTERS: Readonly<Record<string, readonly [number, number]>> = {
  "Badakhshan": [
    37.038,
    71.456
  ],
  "Badghis": [
    35.137,
    63.734
  ],
  "Baghlan": [
    35.804,
    68.914
  ],
  "Balkh": [
    36.67,
    67.078
  ],
  "Bamyan": [
    34.804,
    67.234
  ],
  "Daykundi": [
    33.706,
    66.22
  ],
  "Farah": [
    32.608,
    62.302
  ],
  "Faryab": [
    36.06,
    64.869
  ],
  "Ghazni": [
    33.316,
    67.811
  ],
  "Ghor": [
    34.179,
    64.929
  ],
  "Helmand": [
    31.154,
    64.047
  ],
  "Herat": [
    34.197,
    62.131
  ],
  "Jowzjan": [
    36.829,
    65.854
  ],
  "Kabul": [
    34.555,
    69.335
  ],
  "Kandahar": [
    31.045,
    65.71
  ],
  "Kapisa": [
    34.963,
    69.623
  ],
  "Khost": [
    33.377,
    69.834
  ],
  "Kunar": [
    34.966,
    71.094
  ],
  "Kunduz": [
    36.843,
    68.746
  ],
  "Laghman": [
    34.764,
    70.16
  ],
  "Logar": [
    34.013,
    69.168
  ],
  "Nangarhar": [
    34.274,
    70.476
  ],
  "Nimroz": [
    30.802,
    62.319
  ],
  "Nuristan": [
    35.417,
    70.788
  ],
  "Paktia": [
    33.632,
    69.388
  ],
  "Paktika": [
    32.477,
    68.744
  ],
  "Panjshir": [
    35.446,
    69.795
  ],
  "Parwan": [
    34.958,
    68.886
  ],
  "Samangan": [
    35.972,
    67.702
  ],
  "Sar-e Pol": [
    35.714,
    66.139
  ],
  "Takhar": [
    36.702,
    69.779
  ],
  "Urozgan": [
    32.854,
    66.059
  ],
  "Wardak": [
    34.303,
    68.218
  ],
  "Zabul": [
    32.2,
    67.148
  ]
};
export const DEFAULT_MAP_CENTER = { latitude: 34.532, longitude: 69.167 };

export function initialMapCenter(province: string) {
  const center = PROVINCE_MAP_CENTERS[province];
  return center
    ? { latitude: center[0]!, longitude: center[1]! }
    : DEFAULT_MAP_CENTER;
}

export function validMapPin(
  coordinates: { latitude: number; longitude: number } | null
): boolean {
  return coordinates === null || (
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    Math.abs(coordinates.latitude) <= 90 &&
    Math.abs(coordinates.longitude) <= 180
  );
}

export function googleMapsPlaceUrl(latitude: number, longitude: number) {
  if (!validMapPin({ latitude, longitude })) return null;
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(latitude.toFixed(6) + "," + longitude.toFixed(6));
}
