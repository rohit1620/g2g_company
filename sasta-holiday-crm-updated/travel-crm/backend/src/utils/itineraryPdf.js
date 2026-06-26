const PDFDocument = require("pdfkit");

// ============================================
// Brand palette — matches the frontend's CSS variables (app/globals.css)
// plus the warm "Sasta Holiday" cover-page accent colors from the
// reference brand sheet (teal cover, rust/red headings, dark navy text).
// ============================================
const COLORS = {
  navy: "#0F3D6E",
  navyLight: "#1A5A99",
  accent: "#2E7BD6",
  foreground: "#16243D",
  muted: "#647088",
  border: "#DCE3EE",
  surface: "#FFFFFF",
  background: "#F4F6FA",
  rust: "#C1440E",
  rustLight: "#E0653A",
  teal: "#6FD6C6",
  tealDark: "#3FAE9C",
  tagBorder: "#C1440E",
  green: "#0E5A3F",
};

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function formatDateLong(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const TOUR_TYPE_LABELS = {
  PRIVATE: "PRIVATE",
  SIC: "SIC",
  TICKET_ONLY: "TICKET ONLY",
};

// ============================================
// Main entry point — streams the PDF directly to the HTTP response.
// ============================================
function generateItineraryPdf(res, { lead, itinerary, days, hotels, sightseeing }) {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, autoFirstPage: false });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=itinerary-${(itinerary.title || "itinerary").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`
  );

  doc.pipe(res);

  drawCoverPage(doc, { lead, itinerary });
  drawSummaryPage(doc, { itinerary });
  drawDayWisePages(doc, { days: days || [] });
  drawHotelsAndSightseeingPage(doc, { hotels: hotels || [], sightseeing: sightseeing || [] });
  drawTermsPage(doc, { itinerary });
  drawClosingPage(doc);

  doc.end();
}

// ============================================
// PAGE 1 — Cover page
// Teal/aqua gradient backdrop, tagline, brand lockup, then the trip
// summary card (title / duration / highlights / dates / pax).
// ============================================
function drawCoverPage(doc, { lead, itinerary }) {
  doc.addPage({ size: "A4", margin: 0 });

  // Backdrop — soft teal gradient band across the top third
  const bandHeight = 260;
  const grad = doc.linearGradient(0, 0, PAGE_WIDTH, bandHeight);
  grad.stop(0, "#7FE0D2").stop(1, "#5BC9B8");
  doc.rect(0, 0, PAGE_WIDTH, bandHeight).fill(grad);

  // Decorative corner accents (simple geometric leaves, vector-only so the
  // PDF never depends on an external photo being available)
  drawLeafCluster(doc, PAGE_WIDTH - 150, 10);
  drawLeafCluster(doc, -30, 60);

  // Tagline
  doc
    .fillColor(COLORS.green)
    .font("Helvetica-Bold")
    .fontSize(26)
    .text("Beyond the blur", PAGE_MARGIN, 60);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1F4A40")
    .text("The picture is just a hint —", PAGE_MARGIN, 96)
    .text("the real experience is crystal clear.", PAGE_MARGIN, 112);

  // Brand lockup card
  const cardY = 175;
  doc.roundedRect(PAGE_MARGIN, cardY, 290, 60, 8).fill(COLORS.surface);
  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Sasta", PAGE_MARGIN + 16, cardY + 20, { continued: true })
    .fillColor("#D9A30B")
    .text(" Holiday", { continued: false });
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text("By Globitude Travels", PAGE_MARGIN + 16, cardY + 42);

  // Title block
  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica-Bold")
    .fontSize(30)
    .text(itinerary.title, PAGE_MARGIN, bandHeight + 60, { width: CONTENT_WIDTH, align: "center" });

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(12)
    .text(`Prepared for ${lead.customer_name}`, PAGE_MARGIN, bandHeight + 100, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  // Summary table card
  const tableY = bandHeight + 150;
  const tableX = PAGE_MARGIN;
  const tableWidth = CONTENT_WIDTH;
  doc.roundedRect(tableX, tableY, tableWidth, 220, 10).fillAndStroke(COLORS.background, COLORS.border);

  let rowY = tableY + 22;
  centeredLabelValue(doc, tableX, rowY, tableWidth, "Duration", itinerary.duration || "—");
  rowY += 50;
  drawDivider(doc, tableX + 16, rowY - 8, tableWidth - 32);
  centeredLabelValue(doc, tableX, rowY, tableWidth, "Highlights", itinerary.highlights || "—", { wrap: true });
  rowY += 70;
  drawDivider(doc, tableX + 16, rowY - 8, tableWidth - 32);

  const half = tableWidth / 2;
  labelValueBlock(doc, tableX, rowY, half, "Departure", formatDateLong(itinerary.departure_date) || "—");
  labelValueBlock(doc, tableX + half, rowY, half, "Arrival", formatDateLong(itinerary.arrival_date) || "—");
  rowY += 50;
  drawDivider(doc, tableX + 16, rowY - 8, tableWidth - 32);

  const third = tableWidth / 3;
  labelValueBlock(doc, tableX, rowY, third, "Adults", String(itinerary.adults ?? "—"));
  labelValueBlock(doc, tableX + third, rowY, third, "Children", String(itinerary.children ?? "—"));
  labelValueBlock(doc, tableX + third * 2, rowY, third, "Rooms", String(itinerary.total_rooms ?? "—"));

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text(`Lead ${lead.lead_number}`, PAGE_MARGIN, PAGE_HEIGHT - 40, { width: CONTENT_WIDTH, align: "center" });
}

function centeredLabelValue(doc, x, y, width, label, value) {
  doc.fillColor(COLORS.foreground).font("Helvetica-Bold").fontSize(13).text(label, x, y, {
    width,
    align: "center",
  });
  doc
    .fillColor(COLORS.rust)
    .font("Helvetica")
    .fontSize(11)
    .text(value, x + 20, y + 18, { width: width - 40, align: "center" });
}

function labelValueBlock(doc, x, y, width, label, value) {
  doc.fillColor(COLORS.foreground).font("Helvetica-Bold").fontSize(12).text(label, x, y, {
    width,
    align: "center",
  });
  doc.fillColor(COLORS.rust).font("Helvetica").fontSize(11).text(value, x, y + 16, {
    width,
    align: "center",
  });
}

function drawDivider(doc, x, y, width) {
  doc.moveTo(x, y).lineTo(x + width, y).strokeColor(COLORS.border).lineWidth(1).stroke();
}

function drawLeafCluster(doc, x, y) {
  doc.save();
  doc.opacity(0.35);
  for (let i = 0; i < 4; i++) {
    doc
      .save()
      .translate(x + i * 18, y + i * 10)
      .rotate(20 * i, { origin: [x + i * 18, y + i * 10] })
      .path("M0,0 C 20,-10 40,0 40,20 C 20,15 5,15 0,0 Z")
      .fill("#2F8F76")
      .restore();
  }
  doc.opacity(1);
  doc.restore();
}

// ============================================
// PAGE 2 — Summary / overview page (mirrors the on-screen "Tour title /
// Duration / Highlights / Dates / Pax" card, as a clean printed page)
// ============================================
function drawSummaryPage(doc, { itinerary }) {
  doc.addPage({ size: "A4", margin: 0 });
  drawHeader(doc, "Trip Overview");

  let y = 130;
  y = drawSectionCard(doc, y, "Tour Title", itinerary.title);
  if (itinerary.duration) y = drawSectionCard(doc, y, "Duration", itinerary.duration);
  if (itinerary.highlights) y = drawSectionCard(doc, y, "Highlights", itinerary.highlights);

  const colWidth = (CONTENT_WIDTH - 16) / 2;
  doc
    .roundedRect(PAGE_MARGIN, y, colWidth, 60, 8)
    .fillAndStroke(COLORS.background, COLORS.border);
  miniLabelValue(doc, PAGE_MARGIN, y, colWidth, "Departure Date", formatDateShort(itinerary.departure_date) || "—");

  doc
    .roundedRect(PAGE_MARGIN + colWidth + 16, y, colWidth, 60, 8)
    .fillAndStroke(COLORS.background, COLORS.border);
  miniLabelValue(
    doc,
    PAGE_MARGIN + colWidth + 16,
    y,
    colWidth,
    "Arrival Date",
    formatDateShort(itinerary.arrival_date) || "—"
  );
  y += 76;

  const third = (CONTENT_WIDTH - 32) / 3;
  [
    ["Adults", itinerary.adults ?? "—"],
    ["Children", itinerary.children ?? "—"],
    ["Total Rooms", itinerary.total_rooms ?? "—"],
  ].forEach(([label, value], i) => {
    const x = PAGE_MARGIN + i * (third + 16);
    doc.roundedRect(x, y, third, 60, 8).fillAndStroke(COLORS.background, COLORS.border);
    miniLabelValue(doc, x, y, third, label, String(value));
  });
  y += 76;

  if (itinerary.tour_cost) {
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 64, 8).fillAndStroke("#E0F4EC", "#BFE6D6");
    doc
      .fillColor(COLORS.green)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Tour Cost", PAGE_MARGIN + 20, y + 14);
    doc
      .fillColor(COLORS.foreground)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(itinerary.tour_cost, PAGE_MARGIN + 20, y + 32);
  }

  drawFooter(doc);
}

function drawSectionCard(doc, y, label, value) {
  doc.font("Helvetica").fontSize(12);
  const textHeight = doc.heightOfString(value || "—", { width: CONTENT_WIDTH - 32 });
  const boxHeight = Math.max(56, textHeight + 38);
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 8).fillAndStroke(COLORS.surface, COLORS.border);
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(10).text(label.toUpperCase(), PAGE_MARGIN + 16, y + 12);
  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica")
    .fontSize(12)
    .text(value || "—", PAGE_MARGIN + 16, y + 28, { width: CONTENT_WIDTH - 32 });
  return y + boxHeight + 14;
}

function miniLabelValue(doc, x, y, width, label, value) {
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text(label.toUpperCase(), x + 16, y + 14, {
    width: width - 32,
  });
  doc.fillColor(COLORS.foreground).font("Helvetica-Bold").fontSize(13).text(value, x + 16, y + 32, {
    width: width - 32,
  });
}

// ============================================
// PAGES 3+ — Day-wise itinerary
// ============================================
function drawDayWisePages(doc, { days }) {
  doc.addPage({ size: "A4", margin: 0 });
  drawHeader(doc, "Day-wise Itinerary");

  let y = 130;

  if (days.length === 0) {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(12).text("No days added yet.", PAGE_MARGIN, y);
    drawFooter(doc);
    return;
  }

  days.forEach((day, index) => {
    const label = day.title || (day.day_date ? formatDateLong(day.day_date) : `Day ${day.day_number}`);
    const description = day.description || day.activities || "";
    doc.font("Helvetica").fontSize(10.5);
    const descHeight = doc.heightOfString(description || "—", { width: CONTENT_WIDTH - 36 });
    const blockHeight = 34 + descHeight + 24;

    if (y + blockHeight > PAGE_HEIGHT - 70) {
      drawFooter(doc);
      doc.addPage({ size: "A4", margin: 0 });
      drawHeader(doc, "Day-wise Itinerary (cont.)");
      y = 130;
    }

    // Day pill
    doc
      .roundedRect(PAGE_MARGIN, y, 70, 24, 12)
      .fill(COLORS.navy);
    doc
      .fillColor("#fff")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(`DAY ${day.day_number}`, PAGE_MARGIN, y + 6, { width: 70, align: "center" });

    doc
      .fillColor(COLORS.foreground)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(label, PAGE_MARGIN + 84, y + 4, { width: CONTENT_WIDTH - 84 });

    y += 34;

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(10.5)
      .text(description || "—", PAGE_MARGIN + 18, y, { width: CONTENT_WIDTH - 36 });

    y += descHeight + 20;

    if (index < days.length - 1) {
      drawDivider(doc, PAGE_MARGIN, y - 6, CONTENT_WIDTH);
      y += 14;
    }
  });

  drawFooter(doc);
}

// ============================================
// Hotels + Sightseeing page(s)
// ============================================
function drawHotelsAndSightseeingPage(doc, { hotels, sightseeing }) {
  doc.addPage({ size: "A4", margin: 0 });
  drawHeader(doc, "Hotel & Sightseeing");

  let y = 130;

  doc.fillColor(COLORS.rust).font("Helvetica-Bold").fontSize(16).text("Hotel", PAGE_MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  y += 30;

  if (hotels.length === 0) {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(11).text("No hotels added.", PAGE_MARGIN, y);
    y += 26;
  } else {
    hotels.forEach((hotel) => {
      if (y > PAGE_HEIGHT - 160) {
        drawFooter(doc);
        doc.addPage({ size: "A4", margin: 0 });
        drawHeader(doc, "Hotel & Sightseeing (cont.)");
        y = 130;
      }
      y = drawHotelCard(doc, y, hotel);
    });
  }

  y += 10;
  doc.fillColor(COLORS.rust).font("Helvetica-Bold").fontSize(16).text("Sightseeing", PAGE_MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  y += 30;

  if (sightseeing.length === 0) {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(11).text("No sightseeing added.", PAGE_MARGIN, y);
  } else {
    sightseeing.forEach((item) => {
      if (y > PAGE_HEIGHT - 90) {
        drawFooter(doc);
        doc.addPage({ size: "A4", margin: 0 });
        drawHeader(doc, "Sightseeing (cont.)");
        y = 130;
      }
      y = drawSightseeingRow(doc, y, item);
    });
  }

  drawFooter(doc);
}

function drawHotelCard(doc, y, hotel) {
  const cardHeight = 100;
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, cardHeight, 8).fillAndStroke(COLORS.surface, COLORS.border);

  // Icon block
  doc.roundedRect(PAGE_MARGIN + 16, y + 16, 56, 56, 8).fill("#E3EFFC");
  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("H", PAGE_MARGIN + 16, y + 34, { width: 56, align: "center" });

  const textX = PAGE_MARGIN + 88;
  const textWidth = CONTENT_WIDTH - 88 - 140;

  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(hotel.hotel_name, textX, y + 14, { width: textWidth });

  if (hotel.star_rating) {
    doc
      .fillColor(COLORS.rust)
      .font("Helvetica")
      .fontSize(10)
      .text("*".repeat(hotel.star_rating) + ` (${hotel.star_rating}-star)`, textX, y + 32);
  }

  if (hotel.location) {
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(9.5)
      .text(hotel.location, textX, y + 46, { width: textWidth });
  }

  const detailParts = [
    hotel.rooms ? `${hotel.rooms} Room${hotel.rooms > 1 ? "s" : ""}` : null,
    hotel.guests ? `${hotel.guests} Guest${hotel.guests > 1 ? "s" : ""}` : null,
    hotel.room_type || null,
    hotel.meal_type ? `Meal: ${hotel.meal_type}` : null,
  ].filter(Boolean);
  if (detailParts.length) {
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(9)
      .text(detailParts.join("  ·  "), textX, y + 62, { width: textWidth });
  }

  const datesX = PAGE_MARGIN + CONTENT_WIDTH - 130;
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text("CHECK-IN", datesX, y + 16, { width: 114, align: "right" });
  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica")
    .fontSize(10)
    .text(formatDateShort(hotel.check_in) || "—", datesX, y + 28, { width: 114, align: "right" });

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text("CHECK-OUT", datesX, y + 48, { width: 114, align: "right" });
  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica")
    .fontSize(10)
    .text(formatDateShort(hotel.check_out) || "—", datesX, y + 60, { width: 114, align: "right" });

  return y + cardHeight + 14;
}

function drawSightseeingRow(doc, y, item) {
  const textWidth = CONTENT_WIDTH - 32 - 130;
  doc.font("Helvetica").fontSize(10.5);
  const textHeight = doc.heightOfString(`•  ${item.title}`, { width: textWidth });
  const rowHeight = Math.max(38, textHeight + 18);

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 6).fillAndStroke(COLORS.surface, COLORS.border);
  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica")
    .fontSize(10.5)
    .text(`•  ${item.title}`, PAGE_MARGIN + 16, y + rowHeight / 2 - textHeight / 2, { width: textWidth });

  const tag = TOUR_TYPE_LABELS[item.tour_type] || item.tour_type;
  const tagWidth = doc.widthOfString(tag, { font: "Helvetica-Bold", size: 8.5 }) + 22;
  const tagX = PAGE_MARGIN + CONTENT_WIDTH - tagWidth - 14;
  const tagY = y + rowHeight / 2 - 10;
  doc.roundedRect(tagX, tagY, tagWidth, 20, 10).stroke(COLORS.tagBorder);
  doc
    .fillColor(COLORS.tagBorder)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(tag, tagX, tagY + 5, { width: tagWidth, align: "center" });

  return y + rowHeight + 10;
}

// ============================================
// Terms page — Inclusions / Exclusions / Payment / Cancellation / Terms / Note
// + Tour Cost recap. Sections only render if toggled on AND have text.
// ============================================
function drawTermsPage(doc, { itinerary }) {
  const sections = [
    { show: itinerary.show_inclusions, label: "Inclusions", text: itinerary.inclusions_text, color: COLORS.green },
    { show: itinerary.show_exclusions, label: "Exclusions", text: itinerary.exclusions_text, color: COLORS.rust },
    {
      show: itinerary.show_payment_policy,
      label: "Payment Policy",
      text: itinerary.payment_policy_text,
      color: COLORS.navy,
    },
    {
      show: itinerary.show_cancellation_policy,
      label: "Cancellation Policy",
      text: itinerary.cancellation_policy_text,
      color: COLORS.navy,
    },
    { show: itinerary.show_terms, label: "Terms & Conditions", text: itinerary.terms_text, color: COLORS.navy },
    { show: itinerary.show_note, label: "Note", text: itinerary.note_text, color: "#7A4E0E" },
  ].filter((s) => s.show && s.text && s.text.trim());

  if (sections.length === 0 && !itinerary.tour_cost) return;

  doc.addPage({ size: "A4", margin: 0 });
  drawHeader(doc, "Terms & Inclusions");

  let y = 130;
  sections.forEach((section) => {
    doc.font("Helvetica").fontSize(10);
    const textHeight = doc.heightOfString(section.text, { width: CONTENT_WIDTH - 32 });
    const boxHeight = textHeight + 46;

    if (y + boxHeight > PAGE_HEIGHT - 100) {
      drawFooter(doc);
      doc.addPage({ size: "A4", margin: 0 });
      drawHeader(doc, "Terms & Inclusions (cont.)");
      y = 130;
    }

    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 8).fillAndStroke(COLORS.surface, COLORS.border);
    doc.rect(PAGE_MARGIN, y, 4, boxHeight).fill(section.color);
    doc
      .fillColor(section.color)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(section.label.toUpperCase(), PAGE_MARGIN + 16, y + 12);
    doc
      .fillColor(COLORS.foreground)
      .font("Helvetica")
      .fontSize(10)
      .text(section.text, PAGE_MARGIN + 16, y + 30, { width: CONTENT_WIDTH - 32 });

    y += boxHeight + 14;
  });

  if (itinerary.tour_cost) {
    if (y + 64 > PAGE_HEIGHT - 100) {
      drawFooter(doc);
      doc.addPage({ size: "A4", margin: 0 });
      drawHeader(doc, "Terms & Inclusions (cont.)");
      y = 130;
    }
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 64, 8).fillAndStroke("#E0F4EC", "#BFE6D6");
    doc.fillColor(COLORS.green).font("Helvetica-Bold").fontSize(12).text("Tour Cost", PAGE_MARGIN + 20, y + 14);
    doc
      .fillColor(COLORS.foreground)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(itinerary.tour_cost, PAGE_MARGIN + 20, y + 32);
  }

  drawFooter(doc);
}

// ============================================
// Closing brand page — mirrors the "Purveyors of Smart Travel" brand sheet
// ============================================
function drawClosingPage(doc) {
  doc.addPage({ size: "A4", margin: 0 });

  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica-Bold")
    .fontSize(28)
    .text("Sasta Holiday", PAGE_MARGIN, 60, { width: CONTENT_WIDTH, align: "center" });
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Oblique")
    .fontSize(11)
    .text("'Purveyors of Smart Travel'", PAGE_MARGIN, 96, { width: CONTENT_WIDTH, align: "center" });
  drawDivider(doc, PAGE_MARGIN + 60, 122, CONTENT_WIDTH - 120);

  const paragraphs = [
    "What if we told you that 'sasta' is not about spending less — it's about getting more? " +
      "More sunsets, more stories, more experiences that money can't buy, and still having change to spare.",
    "We don't do cheap; we do clever. We connect value, quality, and experiences that redefine affordable travel — " +
      "boutique stays, immersive cultures, and bucket-list destinations, all wrapped in packages that feel smart.",
    "Welcome to the future of travel, where value meets wanderlust.",
  ];

  let y = 150;
  doc.fillColor(COLORS.foreground).font("Helvetica").fontSize(10.5);
  paragraphs.forEach((p) => {
    doc.text(p, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: "center", lineGap: 3 });
    y = doc.y + 14;
  });

  doc
    .fillColor(COLORS.foreground)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Smart. 'Sasta'. Spectacular.", PAGE_MARGIN, y + 10, { width: CONTENT_WIDTH, align: "center" });

  // Contact block
  const contactY = y + 70;
  doc.roundedRect(PAGE_MARGIN, contactY, CONTENT_WIDTH, 150, 10).fillAndStroke(COLORS.background, COLORS.border);

  const lines = [
    ["Phone", "+91 978 507 2782"],
    ["Website", "www.sasta.holiday"],
    ["Email", "info@sasta.holiday"],
  ];
  let lineY = contactY + 24;
  lines.forEach(([label, value]) => {
    doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text(label.toUpperCase(), PAGE_MARGIN + 24, lineY);
    doc.fillColor(COLORS.foreground).font("Helvetica").fontSize(11).text(value, PAGE_MARGIN + 110, lineY - 1);
    lineY += 24;
  });

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text(
      "WeWork DLF Two Horizon Centre, Gurugram  ·  2nd Floor Deep Shree Tower, Kota  ·  Covent Garden, London",
      PAGE_MARGIN + 24,
      lineY + 6,
      { width: CONTENT_WIDTH - 48 }
    );

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text(
      "This itinerary is a proposed plan and may be adjusted based on availability.",
      PAGE_MARGIN,
      PAGE_HEIGHT - 50,
      { width: CONTENT_WIDTH, align: "center" }
    );
}

// ============================================
// Shared header / footer for inner pages
// ============================================
function drawHeader(doc, title) {
  doc.rect(0, 0, PAGE_WIDTH, 90).fill(COLORS.navy);
  doc
    .fillColor("#fff")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("Sasta Holiday", PAGE_MARGIN, 28);
  doc
    .fillColor("#BFD7EF")
    .font("Helvetica")
    .fontSize(9)
    .text("Travel & Holiday Bookings", PAGE_MARGIN, 48);
  doc
    .fillColor("#fff")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(title, PAGE_MARGIN, 28, { width: CONTENT_WIDTH, align: "right" });
}

function drawFooter(doc) {
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(8.5)
    .text("Sasta Holiday — sasta.holiday", PAGE_MARGIN, PAGE_HEIGHT - 30, {
      width: CONTENT_WIDTH,
      align: "center",
    });
}

module.exports = { generateItineraryPdf };
