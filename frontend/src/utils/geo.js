

export const COUNTRIES = [
  'South Africa',
  'Nigeria',
  'Ghana',
  'Kenya',
  'Egypt',
  'Morocco',
  'Algeria',
  'Tunisia',
  'Senegal',
  'Cameroon',
  'Ivory Coast',
  'Zambia',
  'Zimbabwe',
  'Botswana',
  'Namibia',
  'Mozambique',
  'Angola',
  'Tanzania',
  'Uganda',
  'Ethiopia',
  'England',
  'Spain',
  'France',
  'Germany',
  'Italy',
  'Portugal',
  'Netherlands',
  'Belgium',
  'Brazil',
  'Argentina',
  'United States',
  'Saudi Arabia',
  'United Arab Emirates',
  'Australia',
];

// Major cities per country, used to filter the City picker once a country is set.
export const CITIES_BY_COUNTRY = {
  'South Africa': [
    // Gauteng
    'Johannesburg', 'Pretoria', 'Soweto', 'Sandton', 'Midrand', 'Centurion',
    'Roodepoort', 'Randburg', 'Benoni', 'Boksburg', 'Germiston', 'Kempton Park',
    'Springs', 'Brakpan', 'Alberton', 'Vereeniging', 'Vanderbijlpark',
    'Krugersdorp', 'Carletonville', 'Tembisa', 'Katlehong', 'Daveyton',
    'Soshanguve', 'Mamelodi', 'Atteridgeville',
    // Western Cape
    'Cape Town', 'Stellenbosch', 'Paarl', 'George', 'Worcester', 'Mossel Bay',
    'Knysna', 'Oudtshoorn', 'Hermanus', 'Somerset West', 'Bellville',
    'Khayelitsha', 'Mitchells Plain', 'Saldanha', 'Vredenburg', 'Beaufort West',
    // KwaZulu-Natal
    'Durban', 'Pietermaritzburg', 'Pinetown', 'Umlazi', 'Newcastle',
    'Richards Bay', 'Empangeni', 'Ladysmith', 'Port Shepstone', 'Margate',
    'Ballito', 'Umhlanga', 'Howick', 'Estcourt', 'Vryheid', 'Kokstad',
    // Eastern Cape
    'Gqeberha', 'Port Elizabeth', 'East London', 'Mthatha', 'Queenstown',
    'Komani', 'Grahamstown', 'Makhanda', 'Uitenhage', 'King William\u2019s Town',
    'Butterworth', 'Aliwal North', 'Graaff-Reinet', 'Jeffreys Bay',
    // Free State
    'Bloemfontein', 'Welkom', 'Bethlehem', 'Sasolburg', 'Kroonstad',
    'Phuthaditjhaba', 'Virginia', 'Parys', 'Harrismith', 'Botshabelo',
    // Limpopo
    'Polokwane', 'Tzaneen', 'Mokopane', 'Thohoyandou', 'Lephalale', 'Musina',
    'Bela-Bela', 'Modimolle', 'Phalaborwa', 'Giyani', 'Louis Trichardt',
    // Mpumalanga
    'Nelspruit', 'Mbombela', 'Witbank', 'eMalahleni', 'Middelburg',
    'Secunda', 'Standerton', 'Ermelo', 'Barberton', 'Sabie', 'Hazyview',
    'White River', 'Bethal',
    // North West
    'Rustenburg', 'Mahikeng', 'Potchefstroom', 'Klerksdorp', 'Brits',
    'Lichtenburg', 'Zeerust', 'Vryburg', 'Orkney', 'Stilfontein',
    // Northern Cape
    'Kimberley', 'Upington', 'Springbok', 'Kuruman', 'De Aar', 'Kathu',
    'Postmasburg', 'Colesberg',
  ],
  Nigeria: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Kaduna', 'Enugu'],
  Ghana: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Tema'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
  Egypt: ['Cairo', 'Alexandria', 'Giza', 'Port Said', 'Suez'],
  Morocco: ['Casablanca', 'Rabat', 'Marrakesh', 'Fes', 'Tangier', 'Agadir'],
  Algeria: ['Algiers', 'Oran', 'Constantine', 'Annaba'],
  Tunisia: ['Tunis', 'Sfax', 'Sousse', 'Kairouan'],
  Senegal: ['Dakar', 'Touba', 'Thies', 'Saint-Louis'],
  Cameroon: ['Douala', 'Yaounde', 'Bamenda', 'Garoua'],
  'Ivory Coast': ['Abidjan', 'Bouake', 'Yamoussoukro', 'Daloa'],
  Zambia: ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone'],
  Zimbabwe: ['Harare', 'Bulawayo', 'Gweru', 'Mutare'],
  Botswana: ['Gaborone', 'Francistown', 'Maun'],
  Namibia: ['Windhoek', 'Walvis Bay', 'Swakopmund'],
  Mozambique: ['Maputo', 'Beira', 'Nampula'],
  Angola: ['Luanda', 'Huambo', 'Lobito'],
  Tanzania: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha'],
  Uganda: ['Kampala', 'Gulu', 'Mbarara', 'Jinja'],
  Ethiopia: ['Addis Ababa', 'Dire Dawa', 'Mekelle'],
  England: ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Leeds', 'Newcastle', 'Bristol'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'],
  France: ['Paris', 'Marseille', 'Lyon', 'Lille', 'Nice', 'Bordeaux'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Dortmund', 'Frankfurt'],
  Italy: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence'],
  Portugal: ['Lisbon', 'Porto', 'Braga', 'Coimbra'],
  Netherlands: ['Amsterdam', 'Rotterdam', 'Eindhoven', 'The Hague'],
  Belgium: ['Brussels', 'Antwerp', 'Ghent', 'Bruges'],
  Brazil: ['Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Porto Alegre'],
  Argentina: ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Atlanta'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Dammam'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
};

// All cities flattened, for when no country is selected yet.
const ALL_CITIES = Array.from(
  new Set(Object.values(CITIES_BY_COUNTRY).flat())
).sort();

// City suggestions filtered by the chosen country 
export const citiesForCountry = (country) => {
  if (country && CITIES_BY_COUNTRY[country]) return CITIES_BY_COUNTRY[country];
  return ALL_CITIES;
};
