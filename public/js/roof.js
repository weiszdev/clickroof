/* Roof confirm + anonymous price range.
   Google Solar is used only when a key is supplied at runtime.
   Never commit a key. With no key, a labeled sample is returned. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ClickRoofRoof = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /* Illustrative pilot priors, aligned with the sample price sheet in the
     contractor portal mock. Not a bid and not a published market study. */
  var RATES = { "3tab": 450, arch: 580, metal: 1240, premium: 1600 };

  var MATERIALS = [
    { id: "3tab", name: "3-tab asphalt", note: "Lower-cost asphalt shingle" },
    { id: "arch", name: "Architectural shingle", note: "Common laminated shingle" },
    { id: "metal", name: "Metal", note: "Standing seam or exposed-fastener panel" },
    { id: "premium", name: "Premium", note: "Designer asphalt, cedar, tile, or slate" }
  ];

  var SAMPLE = {
    source: "sample",
    squares: 24.7,
    pitchRise: 4,
    planes: 4,
    imageryDate: null,
    imageryQuality: null,
    rangePct: 0.2,
    note: "Sample measurement. No Google Solar API key is set, so these figures are not a measurement of this address."
  };

  function solarKey() {
    try {
      var params = new URLSearchParams(globalThis.location ? globalThis.location.search : "");
      var fromUrl = params.get("solar_key");
      if (fromUrl) return fromUrl.trim();
    } catch (e) {}
    if (globalThis.CLICKROOF_SOLAR_KEY) return String(globalThis.CLICKROOF_SOLAR_KEY).trim();
    try {
      var stored = globalThis.localStorage && globalThis.localStorage.getItem("clickroof_solar_key");
      if (stored) return stored.trim();
    } catch (e) {}
    return "";
  }

  function stripSolarKeyFromUrl() {
    try {
      var url = new URL(globalThis.location.href);
      if (!url.searchParams.has("solar_key")) return;
      url.searchParams.delete("solar_key");
      globalThis.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function pitchDegreesToRise(deg) {
    var rise = 12 * Math.tan(Number(deg) * Math.PI / 180);
    if (!isFinite(rise) || rise < 0) return null;
    return Math.round(rise * 10) / 10;
  }

  function formatImageryDate(imageryDate) {
    if (!imageryDate || !imageryDate.year) return null;
    var month = imageryDate.month ? String(imageryDate.month).padStart(2, "0") : "";
    var day = imageryDate.day ? String(imageryDate.day).padStart(2, "0") : "";
    return [imageryDate.year, month, day].filter(Boolean).join("-");
  }

  function roofFromSolar(data) {
    var potential = data.solarPotential || {};
    var segments = potential.roofSegmentStats || [];
    var whole = potential.wholeRoofStats || {};
    var areaM2 = Number(whole.areaMeters2);
    if (!isFinite(areaM2) || areaM2 <= 0) {
      areaM2 = segments.reduce(function (sum, seg) {
        var part = seg && seg.stats ? Number(seg.stats.areaMeters2) : 0;
        return sum + (isFinite(part) ? part : 0);
      }, 0);
    }
    var largest = null;
    segments.forEach(function (seg) {
      var part = seg && seg.stats ? Number(seg.stats.areaMeters2) : 0;
      if (!largest || part > largest.area) largest = { area: part, pitch: seg.pitchDegrees };
    });
    var quality = data.imageryQuality || "BASE";
    var squares = Math.round((areaM2 * 10.76391041671 / 100) * 10) / 10;
    var rise = largest ? pitchDegreesToRise(largest.pitch) : null;
    if (!squares || !segments.length || rise == null) {
      return Object.assign({}, SAMPLE, {
        note: SAMPLE.note + " Solar returned a building without usable roof segments."
      });
    }
    return {
      source: "google-solar",
      squares: squares,
      pitchRise: rise,
      planes: segments.length,
      imageryDate: formatImageryDate(data.imageryDate),
      imageryQuality: quality,
      rangePct: quality === "HIGH" ? 0.1 : 0.2,
      note: "Google Solar buildingInsights (" + quality +
        (data.imageryDate && data.imageryDate.year ? ", imagery " + formatImageryDate(data.imageryDate) : "") +
        "). LiDAR was not cross-checked. This is a range, not a bid."
    };
  }

  function detectRoof(lat, lon) {
    var key = solarKey();
    if (!key) return Promise.resolve(Object.assign({}, SAMPLE));
    var endpoint = "https://solar.googleapis.com/v1/buildingInsights:findClosest" +
      "?location.latitude=" + encodeURIComponent(lat) +
      "&location.longitude=" + encodeURIComponent(lon) +
      "&requiredQuality=BASE&key=" + encodeURIComponent(key);
    return fetch(endpoint)
      .then(function (res) {
        if (!res.ok) {
          return Object.assign({}, SAMPLE, {
            note: SAMPLE.note + " Solar request failed (" + res.status + ")."
          });
        }
        return res.json().then(roofFromSolar);
      })
      .catch(function () {
        return Object.assign({}, SAMPLE, {
          note: SAMPLE.note + " Solar request could not be completed from this browser."
        });
      });
  }

  function complexityMultiplier(planes) {
    var n = Number(planes) || 0;
    if (n <= 4) return 1;
    if (n <= 8) return 1.12;
    if (n <= 12) return 1.28;
    return 1.45;
  }

  function steepMultiplier(pitchRise) {
    var rise = Number(pitchRise) || 0;
    if (rise >= 10) return 1.26;
    if (rise >= 7) return 1.16;
    return 1;
  }

  function priceRange(roof, materialId) {
    var rate = RATES[materialId];
    if (!rate || !roof) return null;
    var complexity = complexityMultiplier(roof.planes);
    var steep = steepMultiplier(roof.pitchRise);
    var pct = Number(roof.rangePct);
    if (!isFinite(pct) || pct <= 0) pct = 0.2;
    var mid = Number(roof.squares) * rate * complexity * steep;
    return {
      low: Math.round(mid * (1 - pct)),
      high: Math.round(mid * (1 + pct)),
      mid: Math.round(mid),
      pct: pct,
      complexity: complexity,
      steep: steep
    };
  }

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  return {
    MATERIALS: MATERIALS,
    SAMPLE: SAMPLE,
    solarKey: solarKey,
    stripSolarKeyFromUrl: stripSolarKeyFromUrl,
    detectRoof: detectRoof,
    roofFromSolar: roofFromSolar,
    priceRange: priceRange,
    money: money,
    complexityMultiplier: complexityMultiplier,
    steepMultiplier: steepMultiplier
  };
});
