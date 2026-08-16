import SocialShell from "./components/SocialShell";

const mockCandidates = [
  { id: 1, name: "Sarah", age: 27, city: "Montréal", country: "Sénégal", occupation: "Designer", interests: "Musique, Cuisine, Voyage", avatar_url: null, looking_for: "Relation sérieuse", arrived_since: "3 mois", email_verified: true },
  { id: 2, name: "David", age: 31, city: "Montréal", country: "Cameroun", occupation: "Dev", interests: "Foot, Musique", avatar_url: null, looking_for: "Amitié", arrived_since: "8 mois" },
  { id: 3, name: "Brenda", age: 25, city: "Québec", country: "Côte d'Ivoire", occupation: "Infirmière", interests: "Danse", avatar_url: null },
];

const mockMatches = [
  { id: 9, name: "Mireille", city: "Québec", avatar_url: null, is_online: true, email_verified: true },
];

const SCENARIOS = {
  full: {
    currentUser: { id: "me", user_id: "auth-me", name: "Patrick Test", city: "Montréal", avatar_url: null, bio: "Bio test", occupation: "Dev", interests: "Code, Musique" },
    candidates: mockCandidates,
    matches: mockMatches,
  },
  emptyProfile: {
    currentUser: { id: "me", user_id: "auth-me", name: "Patrick", city: "", avatar_url: null },
    candidates: mockCandidates,
    matches: [],
  },
  noMatches: {
    currentUser: { id: "me", user_id: "auth-me", name: "Patrick Test", city: "Montréal", avatar_url: null, bio: "Bio", occupation: "Dev", interests: "Code" },
    candidates: mockCandidates,
    matches: [],
  },
  noCandidates: {
    currentUser: { id: "me", user_id: "auth-me", name: "Patrick Test", city: "Montréal", avatar_url: null, bio: "Bio", occupation: "Dev", interests: "Code" },
    candidates: [],
    matches: mockMatches,
  },
  noName: {
    currentUser: { id: "me", user_id: "auth-me", name: "", city: "", avatar_url: null },
    candidates: [],
    matches: [],
  },
};

export default function DebugHome() {
  const params = new URLSearchParams(window.location.search);
  const scenario = SCENARIOS[params.get("scenario")] || SCENARIOS.full;
  return (
    <SocialShell
      currentUser={scenario.currentUser}
      setView={() => {}}
      handleSignOut={() => {}}
      candidates={scenario.candidates}
      getMatches={() => scenario.matches}
      openChat={() => {}}
      handleLike={() => {}}
      handlePass={() => {}}
      profilePhotos={{}}
      openEditProfile={() => {}}
    />
  );
}
