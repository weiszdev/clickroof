/* Static hail lookup. The dataset is built by scripts/build_hail.py. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ClickRoofHail = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* Used only when the generated JSON cannot be fetched. Not a NOAA measurement. */
  var SAMPLE_DATASET = {
    label: "sample",
    match_radius_km: 10,
    area: {
      name: "Bismarck, ND",
      center: { lat: 46.8083, lon: -100.7837 },
      bbox: { south: 46.50, west: -101.20, north: 47.12, east: -100.35 }
    },
    disclaimer: "SAMPLE DATA for layout only. Not a NOAA measurement. Run scripts/build_hail.py to replace it.",
    events: [
      {
        date: "2026-08-12",
        time_utc: "2026-08-12T03:00:00Z",
        lat: 46.8,
        lon: -100.78,
        inches: 1.75,
        radar: "SAMPLE"
      }
    ]
  };

  function haversineKm(lat1, lon1, lat2, lon2) {
    var r = 6371;
    var p1 = lat1 * Math.PI / 180;
    var p2 = lat2 * Math.PI / 180;
    var dphi = (lat2 - lat1) * Math.PI / 180;
    var dl = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function formatInches(n) {
    var rounded = Math.round(Number(n) * 100) / 100;
    if (!isFinite(rounded)) return "";
    return rounded.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  }

  function formatDay(isoDate) {
    var parts = String(isoDate || "").split("-");
    if (parts.length < 3) return String(isoDate || "");
    var month = MONTHS[Number(parts[1]) - 1] || parts[1];
    return month + " " + Number(parts[2]);
  }

  function findHail(dataset, lat, lon, radiusKm) {
    var events = (dataset && dataset.events) || [];
    var radius = radiusKm || (dataset && dataset.match_radius_km) || 10;
    var hits = [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (Number(ev.inches) < 1) continue;
      var distanceKm = haversineKm(lat, lon, Number(ev.lat), Number(ev.lon));
      if (distanceKm <= radius) {
        hits.push({
          date: ev.date,
          time_utc: ev.time_utc,
          lat: Number(ev.lat),
          lon: Number(ev.lon),
          inches: Number(ev.inches),
          radar: ev.radar,
          distanceKm: distanceKm
        });
      }
    }
    hits.sort(function (a, b) {
      if (b.inches !== a.inches) return b.inches - a.inches;
      return a.distanceKm - b.distanceKm;
    });
    var byDate = {};
    hits.forEach(function (hit) {
      var prev = byDate[hit.date];
      if (!prev || hit.inches > prev.inches || (hit.inches === prev.inches && hit.distanceKm < prev.distanceKm)) {
        byDate[hit.date] = hit;
      }
    });
    var days = Object.keys(byDate).map(function (key) { return byDate[key]; });
    days.sort(function (a, b) {
      if (b.inches !== a.inches) return b.inches - a.inches;
      return a.date < b.date ? 1 : -1;
    });
    return {
      match: days[0] || null,
      days: days,
      radiusKm: radius,
      label: dataset && dataset.label,
      disclaimer: dataset && dataset.disclaimer
    };
  }

  function hailSentence(match, label) {
    if (!match) return "";
    var size = formatInches(match.inches);
    var day = formatDay(match.date);
    if (label === "sample") {
      return "Sample figure only: ~" + size + "\" on " + day +
        " — possible hail damage wording, not a radar measurement";
    }
    return "Radar estimated ~" + size + "\" hail near you on " + day + " — possible hail damage";
  }

  function loadDataset(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Hail dataset request failed (" + res.status + ")");
      return res.json();
    });
  }

  return {
    SAMPLE_DATASET: SAMPLE_DATASET,
    haversineKm: haversineKm,
    formatInches: formatInches,
    formatDay: formatDay,
    findHail: findHail,
    hailSentence: hailSentence,
    loadDataset: loadDataset
  };
});
