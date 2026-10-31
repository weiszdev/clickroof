/* Homeowner quote flow v2. Static page; nothing is submitted to a server. */
(function () {
  var track = window.ClickRoofTrack.trackStep;
  var hailApi = window.ClickRoofHail;
  var geoApi = window.ClickRoofGeo;
  var roofApi = window.ClickRoofRoof;

  var ROOFERS = [
    { id: "capital-exteriors", name: "Capital Exteriors", place: "Bismarck, ND" }
  ];

  var stepMeta = {
    1: { label: "Step 1 of 4", title: "Enter your address", sub: "We use it to place a hail check and a roof confirm." },
    2: { label: "Step 2 of 4", title: "Is this your roof?", sub: "Confirm the size, pitch, and planes. Edit them if they look wrong." },
    3: { label: "Step 3 of 4", title: "Price range by material", sub: "An anonymous range, before we ask how to reach you." },
    4: { label: "Step 4 of 4", title: "Request a follow-up", sub: "Name, and a phone or an email. Each roofer needs its own consent." }
  };

  var state = {
    step: 1,
    addressQuery: "",
    geo: null,
    roof: null,
    material: null,
    hailResult: null,
    dataset: null,
    inspection: false
  };

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function showStep(n) {
    state.step = n;
    document.querySelectorAll(".step-content").forEach(function (el) { el.classList.remove("active"); });
    var panel = $("step" + n);
    if (panel) panel.classList.add("active");
    var meta = stepMeta[n];
    $("stepLabel").textContent = meta.label;
    $("stepTitle").textContent = meta.title;
    $("stepSubtitle").textContent = meta.sub;
    $("progressFill").style.width = ((n / 4) * 100) + "%";
    var modal = document.querySelector(".modal");
    if (modal) modal.scrollTop = 0;
  }

  function composedAddress() {
    return ["s1address", "s1city", "s1state", "s1zip"].map(function (id) {
      return ($(id).value || "").trim();
    }).filter(Boolean).join(", ");
  }

  function setError(id, message) {
    var el = $(id);
    if (!el) return;
    el.textContent = message || "";
    el.style.display = message ? "block" : "none";
  }

  function openModal() {
    $("quoteModal").classList.add("active");
    document.body.style.overflow = "hidden";
    if ($("stepDone").classList.contains("active")) showStep(1);
    var hero = $("heroAddress");
    if (hero && hero.value && !$("s1address").value) $("s1address").value = hero.value;
    track("quote_opened", {});
  }

  function closeModal() {
    $("quoteModal").classList.remove("active");
    document.body.style.overflow = "";
  }

  function localClock(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }) + " CT";
    } catch (e) {
      return iso;
    }
  }

  function renderHail(result) {
    var card = $("hailCard");
    if (!result || !result.match) {
      card.innerHTML = '<p class="source-note">No radar hail signature of 1 inch or more within ' +
        (result && result.radiusKm ? result.radiusKm : 10) +
        ' km in the Bismarck dataset. That is not a statement that the roof is undamaged.</p>';
      track("hail_result", { matched: false, label: result && result.label });
      return;
    }
    var match = result.match;
    var sentence = hailApi.hailSentence(match, result.label);
    var other = result.days.slice(1, 4).map(function (day) {
      return hailApi.formatDay(day.date) + " (~" + hailApi.formatInches(day.inches) + "\")";
    });
    var sample = result.label === "sample"
      ? '<p class="source-note">Sample hail data is loaded. This is not a NOAA measurement.</p>'
      : "";
    card.innerHTML =
      sample +
      '<h3>' + esc(sentence) + '</h3>' +
      '<p>About ' + match.distanceKm.toFixed(1) + ' km from the radar signature' +
      (match.time_utc ? ' (' + esc(localClock(match.time_utc)) + ', ' + esc(match.time_utc) + ')' : '') +
      '. Radar size runs high. This is possible hail damage, not a confirmed inspection.</p>' +
      (other.length ? '<p>Other days in range: ' + esc(other.join(", ")) + '.</p>' : '') +
      '<button type="button" class="btn-next" id="inspectionBtn">Request a free inspection</button>';
    $("inspectionBtn").addEventListener("click", function () {
      state.inspection = true;
      track("inspection_requested", {
        hail_date: match.date,
        inches: match.inches,
        label: result.label
      });
      showStep(3);
      renderMaterials(true);
    });
    track("hail_result", {
      matched: true,
      hail_date: match.date,
      inches: match.inches,
      label: result.label
    });
  }

  function renderRoof() {
    var roof = state.roof;
    var geo = state.geo || {};
    $("roofSquares").textContent = roof.squares + " squares";
    $("roofPitch").textContent = roof.pitchRise + "/12 pitch";
    $("roofPlanes").textContent = roof.planes + " planes";
    $("roofNote").textContent = roof.note;
    $("editSquares").value = roof.squares;
    $("editPitch").value = roof.pitchRise;
    $("editPlanes").value = roof.planes;
    if (geo.lat != null) {
      $("editLat").value = Number(geo.lat).toFixed(5);
      $("editLon").value = Number(geo.lon).toFixed(5);
    }
    var where = geo.label ? geo.label : "Location set";
    $("geoNote").textContent = where + (geo.attribution ? " · " + geo.attribution : "");
    if (geo.precision === "city") {
      $("geoNote").textContent += " The hail check uses this city center, so it can miss a house on the edge of town.";
    }
  }

  function renderMaterials(trackView) {
    var list = $("materialList");
    var pctLabel = Math.round((state.roof.rangePct || 0.2) * 100);
    $("rangeWidthNote").textContent = "Illustrative range, about ±" + pctLabel +
      "%. Not a bid. Contact info is on the next step.";
    list.innerHTML = roofApi.MATERIALS.map(function (material) {
      var range = roofApi.priceRange(state.roof, material.id);
      var selected = state.material === material.id ? " selected" : "";
      return '<button type="button" class="option-btn material-row' + selected + '" data-material="' + material.id + '">' +
        '<span><span class="opt-label">' + esc(material.name) + '</span>' +
        '<span class="opt-sub">' + esc(material.note) + '</span></span>' +
        '<span class="price-pill">' + roofApi.money(range.low) + ' – ' + roofApi.money(range.high) + '</span>' +
        '</button>';
    }).join("");
    list.querySelectorAll("[data-material]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.material = btn.getAttribute("data-material");
        renderMaterials(false);
        track("material_chosen", { material: state.material, range_pct: state.roof.rangePct, source: state.roof.source });
      });
    });
    if (trackView) track("price_range_shown", { source: state.roof.source, range_pct: state.roof.rangePct });
  }

  function renderConsents() {
    $("consentList").innerHTML = ROOFERS.map(function (roofer) {
      return '<label class="consent-item">' +
        '<input type="checkbox" name="roofer-consent" value="' + esc(roofer.id) + '">' +
        '<span>I agree that <strong>' + esc(roofer.name) + '</strong> (' + esc(roofer.place) +
        ') may call, text, or email me about this roof quote. Consent is not a condition of purchase.</span>' +
        '</label>';
    }).join("") +
      '<p class="source-note">Only roofers named above can receive this request. Consent is optional for seeing the price range, and it is not required to buy a roof from anyone.</p>';
    $("consentList").querySelectorAll("input").forEach(function (box) {
      box.addEventListener("change", function () {
        if (box.checked) track("roofer_consent", { roofer_id: box.value });
      });
    });
  }

  function applyEdits() {
    var squares = Number($("editSquares").value);
    var pitch = Number($("editPitch").value);
    var planes = Number($("editPlanes").value);
    var lat = Number($("editLat").value);
    var lon = Number($("editLon").value);
    if (!(squares > 0) || !(planes > 0) || !(pitch >= 0)) {
      setError("step2Error", "Enter squares, pitch, and planes greater than zero.");
      return;
    }
    state.roof = {
      source: "homeowner-edit",
      squares: Math.round(squares * 10) / 10,
      pitchRise: Math.round(pitch * 10) / 10,
      planes: Math.round(planes),
      imageryDate: state.roof && state.roof.imageryDate,
      imageryQuality: state.roof && state.roof.imageryQuality,
      rangePct: 0.2,
      note: "You edited the roof figures. The range is widened to about ±20%."
    };
    if (isFinite(lat) && isFinite(lon)) {
      state.geo = Object.assign({}, state.geo, { lat: lat, lon: lon, precision: "manual", attribution: "Coordinates you entered" });
      if (state.dataset) {
        state.hailResult = hailApi.findHail(state.dataset, lat, lon);
        renderHail(state.hailResult);
      }
    }
    renderRoof();
    setError("step2Error", "");
    track("roof_edited", { source: "homeowner-edit" });
  }

  function loadContext(geo) {
    state.geo = geo;
    var hailPromise = state.dataset
      ? Promise.resolve(state.dataset)
      : hailApi.loadDataset("data/hail-bismarck.json").catch(function () { return hailApi.SAMPLE_DATASET; });
    return Promise.all([hailPromise, roofApi.detectRoof(geo.lat, geo.lon)]).then(function (parts) {
      state.dataset = parts[0];
      state.roof = parts[1];
      state.hailResult = hailApi.findHail(state.dataset, geo.lat, geo.lon);
      renderRoof();
      renderHail(state.hailResult);
    });
  }

  function goAddress() {
    setError("step1Error", "");
    var query = composedAddress();
    if (query.length < 5) {
      setError("step1Error", "Enter a street address and a city or ZIP.");
      return;
    }
    var btn = $("addressNext");
    btn.disabled = true;
    btn.textContent = "Looking up the address…";
    state.addressQuery = query;
    geoApi.geocode(query).then(function (geo) {
      track("address_entered", {
        precision: geo.precision,
        in_bismarck_metro: /bismarck|mandan|lincoln/i.test(query) || geo.precision !== "city" && /Bismarck|Mandan|Lincoln/.test(geo.label || "")
      });
      return loadContext(geo);
    }).then(function () {
      showStep(2);
      track("roof_shown", { source: state.roof.source });
    }).catch(function (err) {
      setError("step1Error", err && err.message ? err.message : "Address lookup failed.");
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Continue";
    });
  }

  function goRoof() {
    setError("step2Error", "");
    track("roof_confirmed", { source: state.roof.source, planes: state.roof.planes });
    showStep(3);
    renderMaterials(true);
  }

  function goMaterial() {
    setError("step3Error", "");
    if (!state.material) {
      setError("step3Error", "Choose a material to carry into the follow-up. The ranges above are already visible.");
      return;
    }
    showStep(4);
    $("contactIntent").textContent = state.inspection
      ? "You asked for a free inspection. Add a name and a phone or email, and check the roofer who may contact you."
      : "The price range is already on the previous step. A follow-up is optional.";
    track("contact_shown", { inspection: state.inspection, material: state.material });
  }

  function submitContact() {
    setError("step4Error", "");
    var name = $("contactName").value.trim();
    var phone = $("contactPhone").value.trim();
    var email = $("contactEmail").value.trim();
    var boxes = Array.prototype.slice.call(document.querySelectorAll('input[name="roofer-consent"]:checked'));
    if (!name) {
      setError("step4Error", "Enter your name.");
      return;
    }
    if (!phone && !email) {
      setError("step4Error", "Enter a phone number or an email address.");
      return;
    }
    if (!boxes.length) {
      setError("step4Error", "Check the box for each roofer who may contact you. The price range does not require this.");
      return;
    }
    var rooferIds = boxes.map(function (box) { return box.value; });
    var record = {
      name: name,
      phone: phone,
      email: email,
      roofers: rooferIds,
      material: state.material,
      inspection: state.inspection,
      hail: state.hailResult && state.hailResult.match ? {
        date: state.hailResult.match.date,
        inches: state.hailResult.match.inches
      } : null,
      at: new Date().toISOString()
    };
    try {
      var prior = JSON.parse(localStorage.getItem("clickroof_local_requests") || "[]");
      prior.push(record);
      localStorage.setItem("clickroof_local_requests", JSON.stringify(prior));
    } catch (e) {}
    track("contact_submitted", {
      inspection: state.inspection,
      material: state.material,
      roofer_ids: rooferIds,
      has_phone: Boolean(phone),
      has_email: Boolean(email),
      hail_date: record.hail ? record.hail.date : null
    });
    var names = ROOFERS.filter(function (roofer) { return rooferIds.indexOf(roofer.id) !== -1; })
      .map(function (roofer) { return roofer.name; }).join(", ");
    var hailLine = state.hailResult && state.hailResult.match
      ? '<p>' + esc(hailApi.hailSentence(state.hailResult.match, state.hailResult.label)) + '</p>'
      : "";
    $("step4").classList.remove("active");
    $("stepDone").classList.add("active");
    $("stepLabel").textContent = "Request saved on this device";
    $("stepTitle").textContent = state.inspection ? "Inspection request noted" : "Follow-up request noted";
    $("stepSubtitle").textContent = "Nothing was charged, and nothing was sent to a server.";
    $("doneBody").innerHTML =
      '<p>Thanks, ' + esc(name) + '. This static demo stored the request in this browser only. It was not sent to ' +
      esc(names) + '.</p>' + hailLine +
      '<p>If a roofer later prepares an insurance-claim contract in North Dakota, you may cancel it until midnight of the fifth business day after you sign, or after a coverage denial. NDCC 26.1-39.2.</p>';
  }

  function bind() {
    renderConsents();
    roofApi.stripSolarKeyFromUrl();
    $("addressNext").addEventListener("click", goAddress);
    $("roofNext").addEventListener("click", goRoof);
    $("roofBack").addEventListener("click", function () { showStep(1); });
    $("applyRoofEdit").addEventListener("click", applyEdits);
    $("materialNext").addEventListener("click", goMaterial);
    $("materialBack").addEventListener("click", function () { showStep(2); });
    $("contactBack").addEventListener("click", function () { showStep(3); renderMaterials(false); });
    $("contactSubmit").addEventListener("click", submitContact);
    $("saveSolarKey").addEventListener("click", function () {
      var key = $("solarKeyInput").value.trim();
      if (!key) return;
      try { localStorage.setItem("clickroof_solar_key", key); } catch (e) {}
      $("solarKeyInput").value = "";
      if (!state.geo) {
        $("roofNote").textContent = "Key saved in this browser. Continue from your address to run Solar.";
        return;
      }
      roofApi.detectRoof(state.geo.lat, state.geo.lon).then(function (roof) {
        state.roof = roof;
        renderRoof();
      });
    });
    document.querySelectorAll("[data-open-quote]").forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        openModal();
      });
    });
    $("quoteModal").addEventListener("click", function (event) {
      if (event.target === $("quoteModal")) closeModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
    document.querySelectorAll(".contractor-quote").forEach(function (el) {
      el.addEventListener("click", function () {
        document.querySelectorAll(".contractor-quote").forEach(function (q) { q.classList.remove("selected"); });
        el.classList.add("selected");
      });
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get("address")) $("s1address").value = params.get("address");
    if (params.get("inspection") === "1") state.inspection = true;
    if (params.get("address") || params.get("inspection") === "1") openModal();
  }

  window.openModal = openModal;
  window.closeModal = closeModal;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
