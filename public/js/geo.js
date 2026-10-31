/* Address → lat/lon for a static page.
   Tries OpenStreetMap Nominatim (browser CORS is open; light use, with attribution).
   Falls back to a Bismarck-metro city center and says so. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ClickRoofGeo = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var FALLBACKS = [
    { name: "Bismarck, ND", test: /bismarck/i, zip: /^5850[1-7]$/, lat: 46.8083, lon: -100.7837 },
    { name: "Mandan, ND", test: /mandan/i, zip: /^58554$/, lat: 46.8267, lon: -100.8896 },
    { name: "Lincoln, ND", test: /lincoln/i, zip: /^58504$/, lat: 46.7622, lon: -100.7004 }
  ];

  function fallbackFor(query) {
    var text = String(query || "");
    var zipMatch = text.match(/\b(58\d{3})\b/);
    var zip = zipMatch ? zipMatch[1] : "";
    for (var i = 0; i < FALLBACKS.length; i++) {
      var item = FALLBACKS[i];
      if (item.test.test(text) || (zip && item.zip.test(zip))) {
        return {
          lat: item.lat,
          lon: item.lon,
          label: item.name + " city center",
          precision: "city",
          attribution: "Approximate city center. Not this rooftop."
        };
      }
    }
    return null;
  }

  function fromNominatim(row) {
    var kind = (row.type || "") + " " + (row.addresstype || "") + " " + (row.category || "");
    var precise = /house|building|residential|address|amenity/.test(kind);
    return {
      lat: Number(row.lat),
      lon: Number(row.lon),
      label: row.display_name || "Matched address",
      precision: precise ? "address" : "place",
      attribution: "Location lookup © OpenStreetMap contributors"
    };
  }

  function agrees(query, hit) {
    var q = String(query || "").toLowerCase();
    var label = String(hit && hit.label || "").toLowerCase();
    if ((/\bnd\b/.test(q) || q.indexOf("north dakota") !== -1) && label.indexOf("north dakota") === -1) return false;
    if (q.indexOf("bismarck") !== -1 && label.indexOf("bismarck") === -1) return false;
    if (q.indexOf("mandan") !== -1 && label.indexOf("mandan") === -1) return false;
    return true;
  }

  function geocode(query) {
    var q = String(query || "").trim();
    if (!q) return Promise.reject(new Error("Enter an address"));
    var cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem("clickroof-geo:" + q) || "null");
    } catch (e) { cached = null; }
    if (cached && isFinite(cached.lat) && isFinite(cached.lon) && agrees(q, cached)) return Promise.resolve(cached);

    var bias = "";
    if (/bismarck|mandan|lincoln|\b5850|\b58554/i.test(q)) {
      bias = "&viewbox=-101.35,47.15,-100.25,46.45&bounded=1";
    }
    var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=us" + bias + "&q=" +
      encodeURIComponent(q);
    return fetch(url, { headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("geocoder " + res.status);
        return res.json();
      })
      .then(function (rows) {
        var hit = null;
        (rows || []).some(function (row) {
          var candidate = fromNominatim(row);
          if (agrees(q, candidate)) {
            hit = candidate;
            return true;
          }
          return false;
        });
        if (!hit) throw new Error("no match");
        try { sessionStorage.setItem("clickroof-geo:" + q, JSON.stringify(hit)); } catch (e) {}
        return hit;
      })
      .catch(function () {
        var fb = fallbackFor(q);
        if (fb) return fb;
        throw new Error("Could not locate that address. In the Bismarck area, include the city or a 585xx ZIP.");
      });
  }

  return { geocode: geocode, fallbackFor: fallbackFor };
});
