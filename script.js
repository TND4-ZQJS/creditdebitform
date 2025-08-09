// script.js
// NOTE: this script assumes the PDF file named exactly like below is in same folder:
const PDF_FILENAME = "Credit Card Enrolment Form_LF4092_200524_fillable.pdf";

//
// --- Signature Canvas (high-DPI)
//
const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = 150 * ratio;
  canvas.style.height = "150px";
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let drawing = false;
function getPos(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}
canvas.addEventListener("mousedown", (e)=>{ drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
canvas.addEventListener("mousemove", (e)=>{ if(!drawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
canvas.addEventListener("mouseup", ()=>drawing=false);
canvas.addEventListener("mouseout", ()=>drawing=false);
canvas.addEventListener("touchstart", (e)=>{ e.preventDefault(); drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
canvas.addEventListener("touchmove", (e)=>{ e.preventDefault(); if(!drawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); }, {passive:false});
canvas.addEventListener("touchend", ()=>drawing=false);

document.getElementById("clearSig").addEventListener("click", ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); });

//
// --- Utility: convenience to set/unset checkboxes
//
function setPdfCheck(form, pdfFieldName, checked) {
  try {
    const cb = form.getCheckBox(pdfFieldName);
    if (checked) cb.check(); else cb.uncheck();
  } catch (e) { /* field missing */ console.warn("Checkbox missing:", pdfFieldName); }
}

function setPdfText(form, pdfFieldName, text) {
  try {
    form.getTextField(pdfFieldName).setText(text || "");
  } catch (e) { console.warn("Text field missing:", pdfFieldName); }
}

//
// --- Card number splitting helper
//
function writeCardDigits(form, cardNumber) {
  // Remove non-digits and pad left if needed
  const digits = (cardNumber||"").replace(/\D/g,'').padEnd(16, ' ');
  for (let i=0;i<16;i++){
    const field = "CardNo_" + (i+1);
    const ch = digits[i] === ' ' ? "" : digits[i];
    setPdfText(form, field, ch);
  }
}

//
// --- Relationship groups: uncheck all then check selected
//
const relationshipGroups = [
  1,2,3,4
];

function applyRelationshipGroup(form, groupIndex) {
  const names = [
    "spouse","children","Parent","Grandparent","Sibling","Company","Ownself"
  ];
  // uncheck all first
  names.forEach(name => {
    const fname = `Relationship${groupIndex}_${name}`;
    setPdfCheck(form, fname, false);
  });
  // find selected radio in DOM
  const selected = document.querySelector(`input[name="rel${groupIndex}"]:checked`);
  if (selected) {
    const id = selected.id; // matches the pdf field name
    setPdfCheck(form, id, true);
  }
}

//
// --- Main mapping and fill function
//
async function fillPDF() {
  try {
    document.getElementById("generate").disabled = true;

    // load PDF
    const res = await fetch(PDF_FILENAME);
    if (!res.ok) throw new Error("Could not load PDF file: " + PDF_FILENAME);
    const existingBytes = await res.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(existingBytes);
    const form = pdfDoc.getForm();

    // Header / payment options
    setPdfText(form, "Onetimecharge_amt", document.getElementById("onetime_amt").value || "");
    setPdfCheck(form, "Onetimecharge_alloutstanding", document.getElementById("onetime_alloutstanding").checked);
    setPdfCheck(form, "Onetimecharge_tick", document.getElementById("onetime_tick").checked);
    setPdfCheck(form, "CCAgree", document.getElementById("ccagree").checked);

    // Policies 1..4
    setPdfText(form, "PolicyNo1", document.getElementById("policy1_no").value || "");
    setPdfText(form, "Insured1", document.getElementById("insured1_name").value || "");
    applyRelationshipGroup(form, 1);

    setPdfText(form, "PolicyNo2", document.getElementById("policy2_no").value || "");
    setPdfText(form, "Insured2", document.getElementById("insured2_name").value || "");
    applyRelationshipGroup(form, 2);

    setPdfText(form, "PolicyNo3", document.getElementById("policy3_no").value || "");
    setPdfText(form, "Insured3", document.getElementById("insured3_name").value || "");
    applyRelationshipGroup(form, 3);

    setPdfText(form, "PolicyNo4", document.getElementById("policy4_no").value || "");
    setPdfText(form, "Insured4", document.getElementById("insured4_name").value || "");
    applyRelationshipGroup(form, 4);

    // Card details: card type (credit/debit)
    // We store radio in DOM but PDF fields are checkboxes; check the one that matches
    setPdfCheck(form, "CC_Tick", document.getElementById("CC_Tick").checked);
    setPdfCheck(form, "DebitC_Tick", document.getElementById("DebitC_Tick").checked);

    // Card number split into 16 digit fields
    const cardNumber = document.getElementById("card_number").value || "";
    writeCardDigits(form, cardNumber);

    // card brand
    setPdfCheck(form, "Visa_Tick", document.getElementById("Visa_Tick").checked);
    setPdfCheck(form, "Master_Tick", document.getElementById("Master_Tick").checked);

    // expiry
    const mm = (document.getElementById("card_exp_mm").value||"").padStart(2,' ').slice(0,2);
    const yy = (document.getElementById("card_exp_yy").value||"").padStart(2,' ').slice(0,2);
    setPdfText(form, "CardExpry_M1", mm[0] || "");
    setPdfText(form, "CardExpry_M2", mm[1] || "");
    setPdfText(form, "CardExpry_Y1", yy[0] || "");
    setPdfText(form, "CardExpry_Y2", yy[1] || "");

    setPdfText(form, "CardBank", document.getElementById("CardBank").value || "");
    setPdfText(form, "CardName", document.getElementById("CardName").value || "");

    // Signature owner fields (name & NIRC)
    setPdfText(form, "Sign_OwnerName", document.getElementById("Sign_OwnerName").value || "");
    setPdfText(form, "Sign_OwnerNIRC", document.getElementById("Sign_OwnerNIRC").value || "");

    // Third party
    setPdfCheck(form, "ThirdPP_Yes", document.getElementById("ThirdPP_Yes").checked);
    setPdfText(form, "ThirdPP_Name", document.getElementById("ThirdPP_Name").value || "");
    setPdfText(form, "ThirdPP_Email", document.getElementById("ThirdPP_Email").value || "");

    // Source of funds
    setPdfCheck(form, "ThirdPP_SourceFund_Self", document.getElementById("ThirdPP_SourceFund_Self").checked);
    setPdfCheck(form, "ThirdPP_SourceFund_Parent", document.getElementById("ThirdPP_SourceFund_Parent").checked);
    setPdfCheck(form, "ThirdPP_SourceFund_Spouse", document.getElementById("ThirdPP_SourceFund_Spouse").checked);
    setPdfCheck(form, "ThirdPP_SourceFund_Others", document.getElementById("ThirdPP_SourceFund_Others").checked);
    setPdfText(form, "ThirdPP_SourceFund_Others_Write", document.getElementById("ThirdPP_SourceFund_Others_Write").value || "");

    // Source of wealth
    setPdfCheck(form, "ThirdPP_SourceWealth_EmployBus", document.getElementById("ThirdPP_SourceWealth_EmployBus").checked);
    setPdfCheck(form, "ThirdPP_SourceWealth_Invest", document.getElementById("ThirdPP_SourceWealth_Invest").checked);
    setPdfCheck(form, "ThirdPP_SourceWealth_Inherit", document.getElementById("ThirdPP_SourceWealth_Inherit").checked);
    setPdfCheck(form, "ThirdPP_SourceWealth_Savings", document.getElementById("ThirdPP_SourceWealth_Savings").checked);
    setPdfCheck(form, "ThirdPP_SourceWealth_Parents", document.getElementById("ThirdPP_SourceWealth_Parents").checked);
    setPdfCheck(form, "ThirdPP_SourceWealth_Spouse", document.getElementById("ThirdPP_SourceWealth_Spouse").checked);
    setPdfCheck(form, "ThirdPP_SourceWealth_Others", document.getElementById("ThirdPP_SourceWealth_Others").checked);
    setPdfText(form, "ThirdPP_SourceWealth_Others_Write", document.getElementById("ThirdPP_SourceWealth_Others_Write").value || "");

    // Embed signature image (if any strokes)
    const sigDataUrl = canvas.toDataURL("image/png");
    // detect blank canvas by checking data length small
    if (!sigDataUrl.includes("iVBORw0KGgoAAAANSUhEUgAA") || ctx.getImageData(0,0,1,1)) {
      // if has some drawing (dataURL length > minimal) -> embed
      // we'll check a quick heuristic:
    }
    // better heuristic: check if canvas is blank by scanning pixel alpha
    const isBlank = (() => {
      const w = canvas.width, h = canvas.height;
      // sample a few pixels rather than full scan for perf
      try {
        const imgd = ctx.getImageData(0,0, Math.min(10, canvas.width), 1).data;
        // if every pixel fully transparent white? We'll approximate: if all channels are 0 or 255 and alpha 0
        let nonEmpty = false;
        for (let i=0;i<imgd.length;i+=4){
          const a = imgd[i+3];
          const r = imgd[i], g = imgd[i+1], b = imgd[i+2];
          if (a !== 0 && !(r===255 && g===255 && b===255)) { nonEmpty = true; break; }
        }
        return !nonEmpty;
      } catch(e){ return false; }
    })();

    if (!isBlank) {
      const sigBytes = await fetch(sigDataUrl).then(r=>r.arrayBuffer());
      try {
        const pngImage = await pdfDoc.embedPng(sigBytes);
        const pages = pdfDoc.getPages();
        // put signature on page 3 (index 2) or last page if fewer pages
        const pageIndex = Math.min(2, pages.length-1);
        const page = pages[pageIndex];
        // adjust x,y,width,height to suit location — tweak as needed
        page.drawImage(pngImage, {
          x: 360, // move right if needed
          y: 90,  // from bottom
          width: 160,
          height: 50
        });
      } catch (e) {
        console.warn("Signature embed failed:", e);
      }
    }

    // Save PDF and download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Filled_Credit_Card_Form.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // cleanup
    setTimeout(()=>URL.revokeObjectURL(url), 2000);

  } catch (err) {
    console.error("Generation failed:", err);
    alert("PDF generation failed: " + (err.message || err));
  } finally {
    document.getElementById("generate").disabled = false;
  }
}

// Reset all inputs
function resetAll() {
  document.querySelectorAll("input").forEach(inp=>{
    if (inp.type === "checkbox" || inp.type === "radio") inp.checked = false;
    else inp.value = "";
  });
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

// Hook up buttons
document.getElementById("generate").addEventListener("click", fillPDF);
document.getElementById("resetAll").addEventListener("click", resetAll);
