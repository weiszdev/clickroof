/* Analytics-agnostic step tracking.
   Pushes a plain object onto window.clickroofEvents, emits "clickroof:step",
   and mirrors into window.dataLayer when some other script created one.
   No vendor snippet is loaded here. Do not put name, phone, email, or
   street address in `detail`. */
(function (root) {
  var events = [];

  function trackStep(step, detail) {
    var payload = {
      event: "clickroof_step",
      step: String(step),
      detail: detail || {},
      ts: new Date().toISOString()
    };
    events.push(payload);
    root.clickroofEvents = events;
    if (typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function") {
      root.dispatchEvent(new root.CustomEvent("clickroof:step", { detail: payload }));
    }
    if (Array.isArray(root.dataLayer)) root.dataLayer.push(payload);
    return payload;
  }

  var api = { trackStep: trackStep, events: events };
  root.ClickRoofTrack = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
