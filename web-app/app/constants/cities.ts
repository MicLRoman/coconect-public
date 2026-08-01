// Cities + neighborhoods for Tablr's target markets (Western cities).
// Used by the step-by-step event join flow and onboarding.

export const CITIES = [
    "Toronto, Canada", "London, UK", "New York, USA", "San Francisco, USA", "Berlin, Germany",
    "Paris, France", "Tokyo, Japan", "Singapore, Singapore", "Sydney, Australia", "Dubai, UAE",
    "Los Angeles, USA", "Chicago, USA", "Boston, USA", "Austin, USA", "Seattle, USA",
    "Miami, USA", "Amsterdam, Netherlands", "Stockholm, Sweden", "Zurich, Switzerland", "Tel Aviv, Israel",
    "Bangalore, India", "Hong Kong, China", "Seoul, South Korea", "Shanghai, China", "Beijing, China",
    "Mumbai, India", "Sao Paulo, Brazil", "Buenos Aires, Argentina", "Mexico City, Mexico", "Barcelona, Spain",
    "Madrid, Spain", "Milan, Italy", "Rome, Italy", "Vienna, Austria", "Munich, Germany",
    "Frankfurt, Germany", "Dublin, Ireland", "Copenhagen, Denmark", "Helsinki, Finland", "Oslo, Norway",
    "Vancouver, Canada", "Montreal, Canada", "Melbourne, Australia", "Auckland, New Zealand", "Johannesburg, South Africa",
    "Cape Town, South Africa", "Lagos, Nigeria", "Nairobi, Kenya", "Jakarta, Indonesia", "Kuala Lumpur, Malaysia",
    "Bangkok, Thailand", "Manila, Philippines", "Ho Chi Minh City, Vietnam", "Taipei, Taiwan", "Istanbul, Turkey",
    "Warsaw, Poland", "Prague, Czechia", "Budapest, Hungary", "Bucharest, Romania", "Lisbon, Portugal",
    "Athens, Greece", "Moscow, Russia", "Saint Petersburg, Russia", "Kyiv, Ukraine", "Riyadh, Saudi Arabia",
    "Doha, Qatar", "Abu Dhabi, UAE", "Cairo, Egypt", "Casablanca, Morocco", "Bogota, Colombia",
    "Lima, Peru", "Santiago, Chile", "Rio de Janeiro, Brazil", "Denver, USA", "Atlanta, USA",
    "Washington D.C., USA", "Dallas, USA", "Houston, USA", "Philadelphia, USA", "Phoenix, USA",
    "San Diego, USA", "Detroit, USA", "Las Vegas, USA", "Honolulu, USA", "Brisbane, Australia",
    "Perth, Australia", "Calgary, Canada", "Ottawa, Canada", "Edmonton, Canada", "Geneva, Switzerland",
    "Brussels, Belgium", "Antwerp, Belgium", "Lyon, France", "Marseille, France", "Hamburg, Germany",
    "Stuttgart, Germany", "Turin, Italy", "Naples, Italy", "Valletta, Malta", "Luxembourg City, Luxembourg",
    "Reykjavik, Iceland", "Monaco, Monaco", "Tallinn, Estonia", "Riga, Latvia", "Vilnius, Lithuania"
];

export const NEIGHBORHOODS: Record<string, string[]> = {
    "Toronto, Canada": [
        "Downtown Core", "King West", "Queen West", "Liberty Village", "Yorkville", 
        "The Annex", "Midtown", "Leslieville", "The Beaches", "High Park", 
        "Roncesvalles", "Danforth / Greektown", "Distillery District", "CityPlace", 
        "St. Lawrence Market", "North York", "Etobicoke", "Scarborough", "East York"
    ],
    "London, UK": ["Soho", "Shoreditch", "Mayfair", "Camden", "Canary Wharf", "Notting Hill", "Chelsea", "Islington", "Greenwich", "Brixton"],
    "New York, USA": ["Manhattan", "Brooklyn", "Williamsburg", "SoHo", "Tribeca", "Queens", "Upper East Side", "Upper West Side", "Chelsea", "West Village"],
    "San Francisco, USA": ["SoMa", "Mission", "Marina", "Hayes Valley", "Nob Hill", "Castro", "Pacific Heights", "Financial District", "North Beach", "Richmond District"],
    "Berlin, Germany": ["Mitte", "Kreuzberg", "Prenzlauer Berg", "Friedrichshain", "Charlottenburg", "Neukölln", "Schöneberg", "Moabit"],
    "Dubai, UAE": ["Downtown Dubai", "Dubai Marina", "JBR", "JLT", "Business Bay", "DIFC", "Palm Jumeirah", "Deira", "Al Barsha"],
    "Paris, France": ["Le Marais", "Saint-Germain-des-Prés", "Latin Quarter", "Montmartre", "Champs-Élysées", "Montparnasse", "Bastille"],
    "Tokyo, Japan": ["Shibuya", "Shinjuku", "Roppongi", "Ginza", "Akihabara", "Harajuku", "Asakusa"],
    "Singapore, Singapore": ["Marina Bay", "Orchard Road", "Tiong Bahru", "Chinatown", "Sentosa", "Kampong Glam"],
    "Sydney, Australia": ["CBD", "Surry Hills", "Bondi", "Newtown", "Paddington", "Darlinghurst"]
};

export function getNeighborhoodsForCity(city: string | undefined | null): string[] {
    if (!city) return [];
    return NEIGHBORHOODS[city] || [];
}
