/* --------------------------------------------------
   Format Firestore timestamp to readable time
-------------------------------------------------- */
export function fmtTime(timestamp, use24Hour = false) {
  if (!timestamp) return "";

  try {
    let date;

    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "number") {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24Hour,
    });
  } catch {
    return "";
  }
}

/* --------------------------------------------------
   Get short username from email
-------------------------------------------------- */
export function shortName(email) {
  if (!email || typeof email !== "string") return "User";

  const name = email.split("@")[0];
  if (!name) return "User";

  return name.charAt(0).toUpperCase() + name.slice(1);
}

/* --------------------------------------------------
   Online / last seen duration
-------------------------------------------------- */
export function onlineDuration(lastSeen) {
  if (!lastSeen) return "Offline";

  try {
    let last;

    if (lastSeen?.toDate) {
      last = lastSeen.toDate().getTime();
    } else {
      last = new Date(lastSeen).getTime();
    }

    if (!last || isNaN(last)) return "Offline";

    const now = Date.now();
    const diff = Math.floor((now - last) / 1000);

    if (diff < 10) return "Active now";
    if (diff < 60) return `Active ${diff}s ago`;
    if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;

    const days = Math.floor(diff / 86400);
    return `Active ${days}d ago`;
  } catch {
    return "Offline";
  }
}

/* --------------------------------------------------
   Safe avatar fallback (DiceBear)
-------------------------------------------------- */
export function avatarFromSeed(seed = "user") {
  if (!seed || typeof seed !== "string") {
    seed = "user";
  }

  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(
    seed
  )}&size=40`;
}