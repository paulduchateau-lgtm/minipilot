import { createRoot } from "react-dom/client";
import { createElement } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import PdfReportRenderer from "../components/PdfReportRenderer";

// ── SVG → Canvas conversion (html2canvas can't render inline SVGs) ──
async function convertSvgsToCanvas(container) {
  const svgs = container.querySelectorAll("svg");
  for (const svg of svgs) {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });

    const rect = svg.getBoundingClientRect();
    const w = rect.width || parseFloat(svg.getAttribute("width")) || 760;
    const h = rect.height || parseFloat(svg.getAttribute("height")) || 280;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * 2);
    canvas.height = Math.round(h * 2);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    svg.parentNode.replaceChild(canvas, svg);
  }
}

// ── Capture a single DOM element to a PNG data URL ──
async function captureBlock(el) {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#F5F4F0",
    logging: false,
    allowTaint: true,
    width: el.scrollWidth,
    height: el.scrollHeight,
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    // Dimensions in "CSS pixels" (not 2x)
    w: canvas.width / 2,
    h: canvas.height / 2,
  };
}

// ── A4 constants (mm) ──
const PDF_W = 210;
const PDF_H = 297;
const MARGIN = { top: 14, bottom: 18, left: 14, right: 14 };
const CONTENT_W = PDF_W - MARGIN.left - MARGIN.right;
const CONTENT_H = PDF_H - MARGIN.top - MARGIN.bottom;

/**
 * Generate and download a PDF from a report object.
 *
 * Strategy: render the report in a hidden container, mark each logical block
 * with [data-pdf-block], capture each block independently, then place them
 * on A4 pages — starting a new page whenever the next block doesn't fit.
 * This guarantees charts and tables are NEVER split across pages.
 */
export async function generatePdf(report) {
  // ── 1. Create off-screen but visible container ──
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed; top: 0; left: -9999px;
    width: 800px; z-index: 99999;
    pointer-events: none;
  `;
  const container = document.createElement("div");
  container.style.cssText = "width: 800px; background: #F5F4F0;";
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  // ── 2. Render React ──
  const root = createRoot(container);
  root.render(createElement(PdfReportRenderer, { report }));
  await new Promise(r => setTimeout(r, 1200));

  try {
    // ── 3. Convert SVGs to canvas ──
    await convertSvgsToCanvas(container);
    await new Promise(r => setTimeout(r, 100));

    // ── 4. Capture each [data-pdf-block] independently ──
    const blocks = container.querySelectorAll("[data-pdf-block]");
    const captures = [];

    if (blocks.length === 0) {
      // Fallback: capture entire container as one block
      captures.push(await captureBlock(container));
    } else {
      for (const block of blocks) {
        captures.push(await captureBlock(block));
      }
    }

    // ── 5. Place blocks on A4 pages with smart page breaks ──
    const pdf = new jsPDF("portrait", "mm", "a4");
    const containerPxW = 800; // CSS pixels width of the rendered container
    const scaleFactor = CONTENT_W / containerPxW; // px → mm

    let cursorY = MARGIN.top; // current Y position in mm on current page
    let pageNum = 1;
    const pageBreaks = []; // track page count for footer

    for (let i = 0; i < captures.length; i++) {
      const cap = captures[i];
      const blockH_mm = cap.h * scaleFactor; // block height in mm

      // If block doesn't fit on current page AND we're not at top → new page
      if (cursorY + blockH_mm > PDF_H - MARGIN.bottom && cursorY > MARGIN.top + 1) {
        pageBreaks.push(pageNum);
        pdf.addPage();
        pageNum++;
        cursorY = MARGIN.top;
      }

      // If a single block is taller than a full page, we need to slice it
      if (blockH_mm > CONTENT_H) {
        // Draw as much as fits, then continue on next page(s)
        const imgW_px = cap.w * 2; // canvas pixels (2x)
        const imgH_px = cap.h * 2;
        let srcY = 0;
        let remainH_mm = blockH_mm;

        while (remainH_mm > 0) {
          const spaceLeft = PDF_H - MARGIN.bottom - cursorY;
          const sliceH_mm = Math.min(remainH_mm, spaceLeft);
          const sliceH_px = Math.round((sliceH_mm / scaleFactor) * 2);

          // Create sliced canvas
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = imgW_px;
          sliceCanvas.height = sliceH_px;
          const ctx = sliceCanvas.getContext("2d");

          // Decode source image
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = cap.dataUrl; });
          ctx.drawImage(img, 0, srcY, imgW_px, sliceH_px, 0, 0, imgW_px, sliceH_px);

          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", MARGIN.left, cursorY, CONTENT_W, sliceH_mm);

          srcY += sliceH_px;
          remainH_mm -= sliceH_mm;
          cursorY += sliceH_mm;

          if (remainH_mm > 0) {
            pageBreaks.push(pageNum);
            pdf.addPage();
            pageNum++;
            cursorY = MARGIN.top;
          }
        }
      } else {
        // Normal case: block fits on current page
        pdf.addImage(cap.dataUrl, "PNG", MARGIN.left, cursorY, CONTENT_W, blockH_mm);
        cursorY += blockH_mm;
      }

      // Small gap between blocks (4mm), except after last
      if (i < captures.length - 1) {
        cursorY += 2;
      }
    }

    // ── 6. Add page numbers on all pages ──
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(140, 138, 130);
      pdf.text(`${p} / ${totalPages}`, PDF_W / 2, PDF_H - 8, { align: "center" });
    }

    // ── 7. Download ──
    const slug = report.title
      ? report.title.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿç]+/g, "-").replace(/(^-|-$)/g, "").substring(0, 50)
      : "rapport";
    pdf.save(`litechange-${slug}.pdf`);

  } finally {
    root.unmount();
    document.body.removeChild(wrapper);
  }
}
