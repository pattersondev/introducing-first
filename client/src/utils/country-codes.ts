export const countryToCode: { [key: string]: string } = {
  "United States": "us",
  "USA": "us",
  "Brazil": "br",
  "Russia": "ru",
  "Nigeria": "ng",
  "Ireland": "ie",
  "Canada": "ca",
  "Mexico": "mx",
  "England": "gb",
  "United Kingdom": "gb",
  "Australia": "au",
  "New Zealand": "nz",
  "China": "cn",
  "Japan": "jp",
  "South Korea": "kr",
  "Thailand": "th",
  "Netherlands": "nl",
  "Germany": "de",
  "France": "fr",
  "Spain": "es",
  "Italy": "it",
  "Poland": "pl",
  "Sweden": "se",
  "Norway": "no",
  "Denmark": "dk",
  "Finland": "fi",
  "Croatia": "hr",
  "Serbia": "rs",
  "Ukraine": "ua",
  "Kazakhstan": "kz",
  "Kyrgyzstan": "kg",
  "Cuba": "cu",
  "Jamaica": "jm",
  "Argentina": "ar",
  "Chile": "cl",
  "Peru": "pe",
  "Ecuador": "ec",
  "Colombia": "co",
  "Venezuela": "ve",
  "South Africa": "za",
  // Add more mappings as needed
};

export function getCountryCode(country: string): string | null {
  if (!country) return null;
  
  // Clean up the country name
  const cleanCountry = country.trim();
  
  // Direct lookup
  if (countryToCode[cleanCountry]) {
    return countryToCode[cleanCountry];
  }
  
  // Try to find a match ignoring case
  const lowerCountry = cleanCountry.toLowerCase();
  const match = Object.keys(countryToCode).find(
    key => key.toLowerCase() === lowerCountry
  );
  
  return match ? countryToCode[match] : null;
} 