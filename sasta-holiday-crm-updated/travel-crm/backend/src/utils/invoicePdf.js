const PDFDocument = require("pdfkit");

// Streams a simple invoice PDF directly to the HTTP response.
function generateInvoicePdf(res, { lead, booking }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${booking.invoice_number}.pdf`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .fillColor("#0F3D6E")
    .text("Sasta Holiday CRM", { align: "left" })
    .fontSize(10)
    .fillColor("#647088")
    .text("Travel & Holiday Bookings", { align: "left" });

  doc.moveDown(1.5);

  doc
    .fontSize(16)
    .fillColor("#16243D")
    .text("Invoice", { align: "right" })
    .fontSize(10)
    .fillColor("#647088")
    .text(booking.invoice_number, { align: "right" })
    .text(new Date(booking.created_at).toLocaleDateString("en-IN"), { align: "right" });

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#DCE3EE").stroke();
  doc.moveDown(1);

  // Customer details
  doc.fontSize(12).fillColor("#16243D").text("Billed to:");
  doc.fontSize(11).fillColor("#16243D").text(lead.customer_name);
  doc.fontSize(10).fillColor("#647088").text(lead.phone);
  doc.text(lead.email);

  doc.moveDown(1.5);

  // Trip details
  doc.fontSize(12).fillColor("#16243D").text("Trip details:");
  doc.fontSize(10).fillColor("#647088");
  doc.text(`Destination: ${lead.destination || "—"}`);
  doc.text(`Travel date: ${lead.travel_date ? new Date(lead.travel_date).toLocaleDateString("en-IN") : "—"}`);
  doc.text(`Lead ID: ${lead.lead_number}`);

  doc.moveDown(1.5);

  // Amount table
  const tableTop = doc.y;
  doc.fontSize(11).fillColor("#16243D");
  doc.text("Description", 50, tableTop);
  doc.text("Amount", 450, tableTop, { width: 95, align: "right" });

  doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).strokeColor("#DCE3EE").stroke();

  let rowY = tableTop + 28;
  doc.fontSize(10).fillColor("#16243D");
  doc.text("Total package amount", 50, rowY);
  doc.text(formatINR(booking.total_amount), 450, rowY, { width: 95, align: "right" });

  rowY += 22;
  doc.text("Advance paid", 50, rowY);
  doc.text(formatINR(booking.advance_paid), 450, rowY, { width: 95, align: "right" });

  rowY += 22;
  doc.moveTo(50, rowY - 4).lineTo(545, rowY - 4).strokeColor("#DCE3EE").stroke();
  doc.fontSize(11).fillColor("#0F3D6E");
  doc.text("Balance due", 50, rowY + 4);
  doc.text(formatINR(booking.balance_due), 450, rowY + 4, { width: 95, align: "right" });

  doc.moveDown(4);
  doc
    .fontSize(9)
    .fillColor("#8A93A6")
    .text("Thank you for booking with Sasta Holiday CRM.", 50, doc.y, { align: "center" });

  doc.end();
}

function formatINR(amount) {
  const num = Number(amount);
  return "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

module.exports = { generateInvoicePdf };
