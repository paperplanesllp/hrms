import { SHIFT } from "../../app/constants.js";

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function arrivalStatus(checkInHHMM) {
  const start = toMinutes(SHIFT.START);
  const inMin = toMinutes(checkInHHMM);

  if (inMin <= start) return { label: "On time", tone: "blue" };
  return { label: "Short Hours", tone: "orange" };
}

export function toneBadge(tone) {
  if (tone === "blue") return "border-blue-500/25 bg-blue-500/10 text-blue-600";
  if (tone === "orange") return "border-orange-500/25 bg-orange-500/10 text-orange-600";
  return "border-gray-300/25 bg-gray-100/10 text-gray-600";
}