import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const hail = require("../public/js/hail.js");
const roof = require("../public/js/roof.js");
const data = JSON.parse(readFileSync(new URL("../public/data/hail-bismarck.json", import.meta.url), "utf8"));

if (data.label === "sample") {
  throw new Error("hail file is sample data; expected a NOAA pull");
}

const downtown = hail.findHail(data, 46.8083, -100.7837, 10);
if (!downtown.match) throw new Error("downtown Bismarck should match a >=1 inch signature");
if (downtown.match.date !== "2026-08-12") {
  throw new Error("expected Aug 12 UTC as the largest nearby day, got " + downtown.match.date);
}
if (downtown.match.inches < 1.75) {
  throw new Error("expected at least 1.75 inches, got " + downtown.match.inches);
}
const sentence = hail.hailSentence(downtown.match, downtown.label);
if (!sentence.includes("possible hail damage")) throw new Error(sentence);
if (/confirmed|was damaged|your roof was/i.test(sentence)) throw new Error(sentence);
if (!sentence.startsWith("Radar estimated ~")) throw new Error(sentence);

const far = hail.findHail(data, 47.9, -100.78, 10);
if (far.match) throw new Error("a point far north of Bismarck should not match");

const high = roof.roofFromSolar({
  imageryQuality: "HIGH",
  imageryDate: { year: 2024, month: 6, day: 1 },
  solarPotential: {
    wholeRoofStats: { areaMeters2: 230 },
    roofSegmentStats: [
      { pitchDegrees: 18.43, stats: { areaMeters2: 120 } },
      { pitchDegrees: 22, stats: { areaMeters2: 110 } }
    ]
  }
});
if (high.source !== "google-solar") throw new Error("solar parse failed");
if (high.planes !== 2) throw new Error("planes");
if (high.rangePct !== 0.1) throw new Error("HIGH imagery should be ±10%");
const base = roof.roofFromSolar({
  imageryQuality: "BASE",
  solarPotential: {
    wholeRoofStats: { areaMeters2: 200 },
    roofSegmentStats: [{ pitchDegrees: 30, stats: { areaMeters2: 200 } }]
  }
});
if (base.rangePct !== 0.2) throw new Error("BASE imagery should be ±20%");

const range = roof.priceRange({ squares: 24.7, pitchRise: 4, planes: 4, rangePct: 0.2 }, "arch");
const mid = 24.7 * 580;
if (range.low !== Math.round(mid * 0.8) || range.high !== Math.round(mid * 1.2)) {
  throw new Error("unexpected range " + JSON.stringify(range));
}
if (range.low >= range.high) throw new Error("range inverted");

const page = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const step2 = page.indexOf('id="step2"');
const step3 = page.indexOf('id="step3"');
const step4 = page.indexOf('id="step4"');
if (!(step2 < step3 && step3 < step4)) throw new Error("price range must sit before the contact step");
const contact = page.slice(step4, page.indexOf('id="stepDone"'));
if (!contact.includes("contactName") || !contact.includes("contactPhone") || !contact.includes("contactEmail")) {
  throw new Error("contact step missing name/phone/email");
}
if (contact.includes("id=\"materialList\"")) throw new Error("materials rendered inside contact");
if (/Sara R|Mike K|Jennifer L|Steven T|\$31B|4\.9★/.test(page)) {
  throw new Error("fabricated testimonial or unsourced stat still on the home page");
}
if (!page.includes("NDCC 26.1-39.2")) throw new Error("missing ND notice");
if (page.includes("Which Roof Looks Like Yours")) throw new Error("photo picker still present");

console.log(sentence);
console.log("downtown distance km", downtown.match.distanceKm.toFixed(2), "inches", downtown.match.inches);
console.log("ok");
