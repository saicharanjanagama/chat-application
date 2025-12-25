/* --------------------------------------------------
   Format Firestore timestamp to readable time
-------------------------------------------------- */
export function fmtTime(timestamp) {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "";
  }
}

/* --------------------------------------------------
   Get short username from email
-------------------------------------------------- */
export function shortName(email) {
  if (!email) return "User";
  return email.split("@")[0];
}

/* --------------------------------------------------
   Online / last seen duration
-------------------------------------------------- */
export function onlineDuration(lastSeen) {
  if (!lastSeen) return "Offline";

  try {
    const now = Date.now();
    const last = lastSeen.toDate
      ? lastSeen.toDate().getTime()
      : new Date(lastSeen).getTime();

    const diff = Math.floor((now - last) / 1000);

    if (diff < 10) return "Active now";
    if (diff < 60) return `Active ${diff}s ago`;
    if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;

    return `Active ${Math.floor(diff / 3600)}h ago`;
  } catch (error) {
    return "Offline";
  }
}

/* --------------------------------------------------
   Safe avatar fallback (DiceBear)
-------------------------------------------------- */
export function avatarFromSeed(seed = "user") {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(
    seed
  )}`;
}

