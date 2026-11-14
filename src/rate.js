// When the popup may ask for a store rating: once, after a week of use, and
// only after Unseen has actually blocked something worth rating. No rewards,
// no repeats: "Not now" and "Rate" both end it for good. The same goes for
// the share card, which comes later and only once the rating card is answered,
// so the popup never shows both.

const RATE = (() => {
  const AFTER_MS = 7 * 864e5;
  const MIN_BLOCKED = 20;
  const SHARE_BLOCKED = 100;
  const SHARE_URL = 'https://unseen.tinyward.org/';

  // `since` is when the user started using Unseen (the Pro trial start, set
  // on install or on the update to 0.2.0); `answered` is the stored answer.
  function shouldAsk({ answered, since, total, now = Date.now() }) {
    return !answered && !!since && now - since >= AFTER_MS && total >= MIN_BLOCKED;
  }

  // `rated` is the rating card's answer; `shared` is this card's answer.
  function shouldShare({ rated, shared, total }) {
    return !!rated && !shared && total >= SHARE_BLOCKED;
  }

  function reviewUrl({ firefox, id }) {
    return firefox
      ? 'https://addons.mozilla.org/firefox/addon/unseen-email-tracker-blocker/reviews/'
      : `https://chromewebstore.google.com/detail/${id}/reviews`;
  }

  return { shouldAsk, shouldShare, reviewUrl, MIN_BLOCKED, SHARE_URL };
})();
