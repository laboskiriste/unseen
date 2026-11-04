// When the popup may ask for a store rating: once, after a week of use, and
// only after Unseen has actually blocked something worth rating. No rewards,
// no repeats: "Not now" and "Rate" both end it for good.

const RATE = (() => {
  const AFTER_MS = 7 * 864e5;
  const MIN_BLOCKED = 20;

  // `since` is when the user started using Unseen (the Pro trial start, set
  // on install or on the update to 0.2.0); `answered` is the stored answer.
  function shouldAsk({ answered, since, total, now = Date.now() }) {
    return !answered && !!since && now - since >= AFTER_MS && total >= MIN_BLOCKED;
  }

  function reviewUrl({ firefox, id }) {
    return firefox
      ? 'https://addons.mozilla.org/firefox/addon/unseen-email-tracker-blocker/reviews/'
      : `https://chromewebstore.google.com/detail/${id}/reviews`;
  }

  return { shouldAsk, reviewUrl, MIN_BLOCKED };
})();
