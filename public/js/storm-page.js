/* Storm landing page: map of one UTC day's signatures + address check. */
(function () {
  var track = window.ClickRoofTrack.trackStep;
  var hailApi = window.ClickRoofHail;
  var geoApi = window.ClickRoofGeo;
  var date = document.body.getAttribute("data-storm-date");

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function project(lat, lon, bbox, width, height) {
    var x = (lon - bbox.west) / (bbox.east - bbox.west) * width;
    var y = (bbox.north - lat) / (bbox.north - bbox.south) * height;
    return [x, y];
  }

  function colorFor(inches) {
    if (inches >= 2) return "#F59E0B";
    if (inches >= 1.75) return "#FBBF24";
    if (inches >= 1) return "#FCD34D";
    return "#64748B";
  }

  function draw(dataset) {
    var bbox = dataset.area.bbox;
    var width = 640;
    var height = 480;
    var dayEvents = (dataset.events || []).filter(function (ev) { return ev.date === date; });
    var maxInches = dayEvents.reduce(function (max, ev) { return Math.max(max, Number(ev.inches) || 0); }, 0);
    $("stormTitle").textContent = hailApi.formatDay(date) + " " + date.slice(0, 4) + " UTC — hail near Bismarck";
    $("stormLead").textContent = dayEvents.length
      ? "NOAA radar hail signatures on this UTC date. The largest dot on this map is about " +
        hailApi.formatInches(maxInches) +
        " inches. Check an address for the size within about 10 km. Possible hail damage only — not a confirmed inspection."
      : "No signatures for this date are in the local dataset.";
    if (dataset.label === "sample") {
      $("stormLead").textContent = "Sample map for layout only. Not a NOAA measurement. " + $("stormLead").textContent;
    }

    var center = dataset.area.center;
    var svg = ['<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Hail signatures near Bismarck">'];
    svg.push('<rect width="' + width + '" height="' + height + '" fill="#0D1E3B" rx="12"/>');
    var ring = project(center.lat, center.lon, bbox, width, height);
    var latRad = center.lat * Math.PI / 180;
    var kmPerLat = 111;
    var kmPerLon = 111 * Math.cos(latRad);
    var rx = (10 / kmPerLon) / (bbox.east - bbox.west) * width;
    var ry = (10 / kmPerLat) / (bbox.north - bbox.south) * height;
    svg.push('<ellipse cx="' + ring[0].toFixed(1) + '" cy="' + ring[1].toFixed(1) +
      '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) +
      '" fill="none" stroke="rgba(250,250,250,0.35)" stroke-dasharray="4 4"/>');
    dayEvents.forEach(function (ev) {
      var pt = project(Number(ev.lat), Number(ev.lon), bbox, width, height);
      var r = 3 + Math.min(Number(ev.inches) || 0, 4);
      svg.push('<circle cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="' + colorFor(Number(ev.inches)) + '" fill-opacity="0.85"><title>' +
        hailApi.formatInches(ev.inches) + ' in, ' + (ev.radar || "") + '</title></circle>');
    });
    svg.push('<circle cx="' + ring[0].toFixed(1) + '" cy="' + ring[1].toFixed(1) + '" r="4" fill="#FAFAFA"/>');
    svg.push('<text x="16" y="28" fill="#94A3B8" font-size="13" font-family="DM Sans, sans-serif">Dashed ring is 10 km around downtown Bismarck. Dot size grows with estimated hail size.</text>');
    svg.push("</svg>");
    $("mapWrap").innerHTML = svg.join("");
    $("stormCount").textContent = dayEvents.length + " radar signatures on this UTC date in the Bismarck-area file.";
  }

  function checkAddress(event) {
    event.preventDefault();
    var query = ["addr", "city", "region", "zip"].map(function (id) {
      return ($(id).value || "").trim();
    }).filter(Boolean).join(", ");
    var result = $("checkResult");
    result.textContent = "Checking…";
    geoApi.geocode(query).then(function (geo) {
      return hailApi.loadDataset("../data/hail-bismarck.json").catch(function () {
        return hailApi.SAMPLE_DATASET;
      }).then(function (dataset) {
        return { geo: geo, dataset: dataset };
      });
    }).then(function (ctx) {
      var found = hailApi.findHail(ctx.dataset, ctx.geo.lat, ctx.geo.lon);
      track("storm_address_checked", {
        storm_date: date,
        matched: Boolean(found.match),
        hail_date: found.match ? found.match.date : null,
        precision: ctx.geo.precision
      });
      if (!found.match) {
        result.textContent = "No radar hail signature of 1 inch or more within " + found.radiusKm +
          " km of that location in this Bismarck file. That is not a confirmation the roof is fine.";
      } else {
        var sentence = hailApi.hailSentence(found.match, found.label);
        result.textContent = sentence + " (" + found.match.distanceKm.toFixed(1) +
          " km from the signature). This is not a confirmed inspection.";
      }
      var link = $("quoteLink");
      link.hidden = false;
      link.href = "../index.html?address=" + encodeURIComponent(query) + (found.match ? "&inspection=1" : "");
      link.textContent = found.match ? "Continue — request a free inspection" : "Continue to the quote";
    }).catch(function (err) {
      result.textContent = err && err.message ? err.message : "Address check failed.";
    });
  }

  hailApi.loadDataset("../data/hail-bismarck.json").catch(function () {
    return hailApi.SAMPLE_DATASET;
  }).then(draw).catch(function (err) {
    $("stormLead").textContent = err && err.message ? err.message : "Could not load the hail file.";
  });

  var form = $("checkForm");
  if (form) form.addEventListener("submit", checkAddress);
  track("storm_page_viewed", { storm_date: date });
})();
