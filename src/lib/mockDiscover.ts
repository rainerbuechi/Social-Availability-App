import { DiscoverCard } from "./types";

export const mockCards: DiscoverCard[] = [
  // Study
  { id: "d1", title: "Silent Study Floor", type: "study", area: "University Area", city: "any", description: "Quiet upper floor with natural light and solid wifi. Good for deep focus blocks.", timeOfDay: "any" },
  { id: "d2", title: "Central Library", type: "study", area: "City Center", city: "any", description: "Individual desks and group rooms. Usually free spots before noon.", timeOfDay: "any" },
  { id: "d3", title: "Café Study Session", type: "study", area: "any", city: "any", description: "Relaxed atmosphere, power outlets at most tables. Order something and stay a while.", timeOfDay: "morning" },

  // Coffee
  { id: "d4", title: "Specialty Roaster", type: "coffee", area: "Altstadt", city: "any", description: "Small batch beans, great flat whites. Good for a slow catch-up.", timeOfDay: "morning" },
  { id: "d5", title: "Lakeside Café", type: "coffee", area: "Seepromenade", city: "any", description: "Water views and outdoor seating. Best on a clear morning.", timeOfDay: "morning" },
  { id: "d6", title: "Campus Café", type: "coffee", area: "University Area", city: "any", description: "Quick grab between lectures. Usually packed 10–12.", timeOfDay: "morning" },

  // Lunch
  { id: "d7", title: "Market Lunch", type: "lunch", area: "City Center", city: "any", description: "Fresh daily menu, student-friendly prices. Always worth the short wait.", timeOfDay: "afternoon" },
  { id: "d8", title: "Waterfront Takeaway", type: "lunch", area: "Seepromenade", city: "any", description: "Grab something and sit by the water. Works for any group size.", timeOfDay: "afternoon" },
  { id: "d9", title: "Street Food Corner", type: "lunch", area: "any", city: "any", description: "Rotating vendors, quick bites, easy to split up and share.", timeOfDay: "afternoon" },

  // Walk
  { id: "d10", title: "Lakeside Loop", type: "walk", area: "Seepromenade", city: "any", description: "Flat 3 km path along the water. Great for clearing your head.", timeOfDay: "any" },
  { id: "d11", title: "Old Town Stroll", type: "walk", area: "Altstadt", city: "any", description: "Cobblestone streets and local shops. Best in the late afternoon.", timeOfDay: "afternoon" },
  { id: "d12", title: "Campus Green", type: "walk", area: "University Area", city: "any", description: "Short loop through the park near campus. Quick break between sessions.", timeOfDay: "any" },

  // Bar / Drinks
  { id: "d13", title: "Student Bar", type: "bar", area: "University Area", city: "any", description: "Cheap drinks, pool table, always someone you know. Opens at 6.", timeOfDay: "evening" },
  { id: "d14", title: "Rooftop Bar", type: "bar", area: "City Center", city: "any", description: "Good views, cocktails, slightly pricier. Save it for a proper night out.", timeOfDay: "evening" },
  { id: "d15", title: "Cozy Wine Bar", type: "bar", area: "Altstadt", city: "any", description: "Low lighting, local wines, small plates. Best for groups of 3–5.", timeOfDay: "evening" },

  // Events
  { id: "d16", title: "Open Mic Night", type: "event", area: "City Center", city: "any", description: "Weekly local acts, free entry. Check the door board for the lineup.", timeOfDay: "evening" },
  { id: "d17", title: "Weekend Market", type: "event", area: "any", city: "any", description: "Local vendors, street food, easy to wander. Usually Saturday mornings.", timeOfDay: "morning" },
  { id: "d18", title: "Outdoor Cinema", type: "event", area: "Seepromenade", city: "any", description: "Bring a blanket, starts at sunset. Summer only.", timeOfDay: "evening" },
];