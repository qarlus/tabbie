/** Curated Unsplash landscapes — no API key; fixed photo IDs. */

const PHOTOS: { url: string; photographer?: string }[] = [
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80",
    photographer: "David Marcu",
  },
  {
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80",
    photographer: "Nikola Jovanovic",
  },
  {
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80",
    photographer: "Vladimir Kudinov",
  },
  {
    url: "https://images.unsplash.com/photo-1426604966848-d7ad8dde7a00?w=1920&q=80",
    photographer: "Nikola Jovanovic",
  },
  {
    url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80",
    photographer: "Silas Baisch",
  },
  {
    url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1494500764479-0c8f2919a3ad?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1518173946687-2f271d302f1c?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1418065460487-3e41a274266b?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1483728642387-6bc3bdd8c538?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1447755415215-6189beaa221e?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1495616811223-4bdb98b81211?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1523712999619-f77fbcfc3843?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&q=80",
    photographer: "Luca Bravo",
  },
  {
    url: "https://images.unsplash.com/photo-1439853949137-646a777ae177?w=1920&q=80",
    photographer: "Luca Bravo",
  },
];

const PHOTO_URLS = PHOTOS.map((p) => p.url);

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Pick a curated photo by day-of-year index. */
export function dailyPhotoUrl(date = new Date()): string {
  return PHOTO_URLS[dayOfYear(date) % PHOTO_URLS.length]!;
}

/** Optional attribution stub for daily photos. */
export function photoAttribution(url: string): { photographer?: string } {
  const match = PHOTOS.find((p) => p.url === url);
  return match?.photographer ? { photographer: match.photographer } : {};
}
