// Pixel-perfect PDF export from a DOM node.
// We temporarily neutralize any parent CSS transforms (scale) so html2canvas
// captures the real, full-size resume page rather than a blurry / clipped scaled version.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportNodeToPdf(node: HTMLElement, filename = "resume.pdf") {
  // Walk up and clear any `transform` on ancestors during capture.
  const touched: { el: HTMLElement; prev: string }[] = [];
  let p: HTMLElement | null = node.parentElement;
  while (p && p !== document.body) {
    const t = p.style.transform;
    const computed = window.getComputedStyle(p).transform;
    if ((t && t !== "none") || (computed && computed !== "none")) {
      touched.push({ el: p, prev: p.style.transform });
      p.style.transform = "none";
    }
    p = p.parentElement;
  }

  // Force the node itself to its natural size (it already is 8.5in wide).
  const prevWidth = node.style.width;
  const prevMinH = node.style.minHeight;

  try {
    // Wait a frame so layout settles after removing transforms.
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
      width: node.scrollWidth,
      height: node.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH, undefined, "FAST");
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH, undefined, "FAST");
      heightLeft -= pageH;
    }

    pdf.save(filename);
  } finally {
    // Restore transforms
    touched.forEach(({ el, prev }) => { el.style.transform = prev; });
    node.style.width = prevWidth;
    node.style.minHeight = prevMinH;
  }
}
