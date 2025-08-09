/* script.js
 - Prototype to match your amendments:
   * Header: CCAgree + charge all outstanding + request one-time + amount enable
   * Section A: dynamic policy entries up to 4; relationship Ownself first
   * Card details: name on card, brand radio, 4x4-digit inputs with auto-jump & paste split
   * Signature canvas
   * Generate filled PDF using pdf-lib (embed signature image on page 3 index 2)
*/

const PDF_FILENAME = "Credit Card Enrolment Form_LF4092_200524_fillable.pdf";

// ---------- HEADER behavior ----------
const oneTimeTick = document.getElementById("Onetimecharge_tick");
const oneTimeAmt = document.getElementById("Onetimecharge_amt");
oneTimeTick.addEventListener("change", () => {
  oneTimeAmt.disabled = !oneTimeTick.checked;
  if (!oneTimeTick.checked) oneTimeAmt.value = "";
});

// ---------- Policy entries dynamic ----------
const policiesContainer = document.getElementById("policiesContainer");
const addPolicyBtn = document.getElementById("addPolicy");
let policyCount = 0;
const MAX_POLICIES = 4;

function createPolicyEntry(index) {
  // container
  const wrap = document.createElement("div");
  wrap.className = "policy";
  wrap.dataset.index = index;

  const title = document.createElement("h3");
  title.textContent = `Policy Entry ${index}`;
  wrap.appendChild(title);

  // policy no
  const labelPolicy = document.createElement("label");
  labelPolicy.textContent = "Policy No.";
  const inpPolicy = document.createElement("input");
  inpPolicy.type = "text";
  inpPolicy.id = `PolicyNo${index}`;
  inpPolicy.placeholder = `PolicyNo${index}`;
  labelPolicy.appendChild(inpPolicy);
  wrap.appendChild(labelPolicy);

  // insured name
  const labelInsured = document.createElement("label");
  labelInsured.textContent = "Insured Name";
  const inpInsured = document.createElement("input");
  inpInsured.type = "text";
  inpInsured.id = `Insured${index}`;
  inpInsured.placeholder = `Insured${index}`;
  labelInsured.appendChild(inpInsured);
  wrap.appendChild(labelInsured);

  // relationships - Ownself first
  const fieldset = document.createElement("fieldset");
  fieldset.className = "relationship";
  const legend = document.createElement("legend");
  legend.textContent = "Relationship (choose one)";
  fieldset.appendChild(legend);

  const relOrder = ["Ownself","spouse","children","Parent","Grandparent","Sibling","Company"];
  relOrder.forEach((name) => {
    const id = `Relationship${index}_${name}`;
    const lab = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `rel${index}`;
    radio.id = id;
    radio.value = id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(" " + (name === "Ownself" ? "Ownself" : (name.charAt(0).toUpperCase()+name.slice(1)))));
    fieldset.appendChild(lab);
  });

  wrap.appendChild(fieldset);

  return wrap;
}

function addPolicy() {
  if (policyCount >= MAX_POLICIES) return;
  policyCount++;
  const node = createPolicyEntry(policyCount);
  // layout: show two per row if wide
  if (policyCount === 1) {
    const grid = document.createElement("div");
    grid.className = "policy-grid";
    policiesContainer.appendChild(grid);
    grid.appendChild(node);
  } else {
    const grid = policiesContainer.querySelector(".policy-grid");
    grid.appendChild(node);
  }
  if (policyCount >= MAX_POLICIES) addPolicyBtn.disabled = true;
}

addPolicyBtn.addEventListener("click", addPolicy);

// start with one entry
addPolicy();

// ---------- Card number 4x inputs with auto-jump & paste split ----------
const cardDigits = [
  document.getElementById("CardNo_1"),
  document.getElementById("CardNo_2"),
  document.getElementById("CardNo_3"),
  document.getElementById("CardNo_4")
];

cardDigits.forEach((el, idx) => {
  el.addEventListener("input", (e) => {
    // strip non-digits
    el.value = el.value.replace(/\D/g,'').slice(0,4);
    if (el.value.length === 4 && idx < cardDigits.length - 1) {
      cardDigits[idx+1].focus();
    }
  });

  el.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && el.value.length === 0 && idx > 0) {
      cardDigits[idx-1].focus();
    }
  });

  el.addEventListener("paste", (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const digits = paste.replace(/\D/g,'').slice(0,16).padEnd(16,' ');
    // distribute
    for (let i=0;i<4;i++){
      cardDigits[i].value = digits.slice(i*4, i*4+4).trim();
    }
    // focus last non-empty or last
    for (let i=0;i<4;i++){
      if (cardDigits[i].value.length < 4) { cardDigits[i].focus(); break; }
      if (i === 3) cardDigits[3].focus();
    }
  });
});

// expiry auto-jump
const mm = document.getElementById("CardExpry_M");
const yy = document.getElementById("CardExpry_Y");
mm.addEventListener("input", ()=>{ mm.value = mm.value.replace(/\D/g,'').slice(0,2); if (mm.value.length===2) yy.focus(); });
yy.addEventListener("input", ()=>{ yy.value = yy.value.replace(/\D/g,'').slice(0,2); });

// ---------- Signature Canvas ----------
const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas(){
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
resizeCanvas(); window.addEventListener("resize", resizeCanvas);
let drawing=false;
function pos(e){
  const rect = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: cx - rect.left, y: cy - rect.top };
}
canvas.addEventListener("mousedown", (e)=>{ drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y);});
canvas.addEventListener("mousemove", (e)=>{ if(!drawing) return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke();});
canvas.addEventListener("mouseup", ()=>drawing=false);
canvas.addEventListener("mouseout", ()=>drawing=false);
canvas.addEventListener("touchstart",(e)=>{ e.preventDefault(); drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y);},{passive:false});
canvas.addEventListener("touchmove",(e)=>{ e.preventDefault(); if(!drawing) return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke();},{passive:false});
canvas.addEventListener("touchend", ()=>drawing=false);
document.getElementById("clearSig").addEventListener("click", ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); });

// ---------- Helpers to set PDF fields ----------
function safeSetText(form, name, text){
  try{ form.getTextField(name).setText(String(text || "")); } catch(e){ console.warn("Missing text field:", name); }
}
function safeCheck(form, name, checked){
  try{ const cb = form.getCheckBox(name); if (checked) cb.check(); else cb.uncheck(); } catch(e){ console.warn("Missing checkbox:", name); }
}

// write card digits into CardNo_1..16 (our PDF uses CardNo_1..CardNo_16 fields)
function writeCardToPdf(form){
  // combine the 4 groups into 16 single-digit fields if PDF has CardNo_1..CardNo_16 (your PDF has single digit fields)
  // But earlier PDF had CardNo_1..CardNo_16; in our mapping we used CardNo_1..CardNo_16 as single digits.
  // Here we distribute each char to CardNo_1..CardNo_16
  const combined = cardDigits.map(d => d.value.padEnd(4,' ')).join('').slice(0,16);
  for (let i=0;i<16;i++){
    const field = `CardNo_${i+1}`;
    const ch = combined[i] && combined[i] !== ' ' ? combined[i] : "";
    safeSetText(form, field, ch);
  }
}

// relationship application for group index n: uncheck all then check selected
function applyRelationship(form, n){
  const names = ["Ownself","spouse","children","Parent","Grandparent","Sibling","Company"];
  names.forEach(name => {
    const fname = `Relationship${n}_${name}`;
    safeCheck(form, fname, false);
  });
  const sel = document.querySelector(`input[name="rel${n}"]:checked`);
  if (sel) safeCheck(form, sel.id, true);
}

// ---------- Generate PDF ----------
async function fillPDF(){
  try {
    document.getElementById("generate").disabled = true;

    const res = await fetch(PDF_FILENAME);
    if (!res.ok) throw new Error("Cannot load PDF: " + PDF_FILENAME);
    const bytes = await res.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);
    const form = pdfDoc.getForm();

    // header
    safeCheck(form, "CCAgree", document.getElementById("CCAgree").checked);
    safeCheck(form, "Onetimecharge_alloutstanding", document.getElementById("Onetimecharge_alloutstanding").checked);
    safeCheck(form, "Onetimecharge_tick", document.getElementById("Onetimecharge_tick").checked);
    safeSetText(form, "Onetimecharge_amt", document.getElementById("Onetimecharge_amt").value || "");

    // policies - up to policyCount
    for (let i=1;i<=MAX_POLICIES;i++){
      safeSetText(form, `PolicyNo${i}`, document.getElementById(`PolicyNo${i}` ? `PolicyNo${i}`.value : "") );
      // but we must reference DOM elements safely
    }
    // safer approach: iterate real existing created entries
    const created = policiesContainer.querySelectorAll(".policy");
    created.forEach(p => {
      const idx = p.dataset.index;
      const policyVal = p.querySelector(`#PolicyNo${idx}`)?.value || "";
      const insuredVal = p.querySelector(`#Insured${idx}`)?.value || "";
      safeSetText(form, `PolicyNo${idx}`, policyVal);
      safeSetText(form, `Insured${idx}`, insuredVal);
      applyRelationship(form, idx);
    });

    // card type checkboxes
    safeCheck(form, "CC_Tick", document.getElementById("CC_Tick").checked);
    safeCheck(form, "DebitC_Tick", document.getElementById("DebitC_Tick").checked);

    // card digits -> pdf
    writeCardToPdf(form);

    // card brand
    safeCheck(form, "Visa_Tick", document.getElementById("Visa_Tick").checked);
    safeCheck(form, "Master_Tick", document.getElementById("Master_Tick").checked);

    // expiry split to fields CardExpry_M1, M2, Y1, Y2 (if exist)
    const mmVal = (document.getElementById("CardExpry_M").value || "").padStart(2,' ').slice(0,2);
    const yyVal = (document.getElementById("CardExpry_Y").value || "").padStart(2,' ').slice(0,2);
    safeSetText(form, "CardExpry_M1", mmVal[0] || "");
    safeSetText(form, "CardExpry_M2", mmVal[1] || "");
    safeSetText(form, "CardExpry_Y1", yyVal[0] || "");
    safeSetText(form, "CardExpry_Y2", yyVal[1] || "");

    safeSetText(form, "CardBank", document.getElementById("CardBank").value || "");
    safeSetText(form, "CardName", document.getElementById("CardName").value || "");

    // signature owner name/NIRC & sign date fields
    safeSetText(form, "Sign_OwnerName", document.getElementById("Sign_OwnerName").value || "");
    safeSetText(form, "Sign_OwnerNIRC", document.getElementById("Sign_OwnerNIRC").value || "");
    safeSetText(form, "Sign_Date", document.getElementById("Sign_Date").value || "");
    safeSetText(form, "Sign_Month", document.getElementById("Sign_Month").value || "");
    safeSetText(form, "Sign_Year", document.getElementById("Sign_Year").value || "");
    safeSetText(form, "Sign_State", document.getElementById("Sign_State").value || "");

    // third party fields
    safeCheck(form, "ThirdPP_Yes", document.getElementById("ThirdPP_Yes").checked);
    safeSetText(form, "ThirdPP_Name", document.getElementById("ThirdPP_Name").value || "");
    safeSetText(form, "ThirdPP_Email", document.getElementById("ThirdPP_Email").value || "");
    safeCheck(form, "ThirdPP_SourceFund_Self", document.getElementById("ThirdPP_SourceFund_Self").checked);
    safeCheck(form, "ThirdPP_SourceFund_Parent", document.getElementById("ThirdPP_SourceFund_Parent").checked);
    safeCheck(form, "ThirdPP_SourceFund_Spouse", document.getElementById("ThirdPP_SourceFund_Spouse").checked);
    safeCheck(form, "ThirdPP_SourceFund_Others", document.getElementById("ThirdPP_SourceFund_Others").checked);
    safeSetText(form, "ThirdPP_SourceFund_Others_Write", document.getElementById("ThirdPP_SourceFund_Others_Write").value || "");

    safeCheck(form, "ThirdPP_SourceWealth_EmployBus", document.getElementById("ThirdPP_SourceWealth_EmployBus").checked);
    safeCheck(form, "ThirdPP_SourceWealth_Invest", document.getElementById("ThirdPP_SourceWealth_Invest").checked);
    safeCheck(form, "ThirdPP_SourceWealth_Inherit", document.getElementById("ThirdPP_SourceWealth_Inherit").checked);
    safeCheck(form, "ThirdPP_SourceWealth_Savings", document.getElementById("ThirdPP_SourceWealth_Savings").checked);
    safeCheck(form, "ThirdPP_SourceWealth_Parents", document.getElementById("ThirdPP_SourceWealth_Parents").checked);
    safeCheck(form, "ThirdPP_SourceWealth_Spouse", document.getElementById("ThirdPP_SourceWealth_Spouse").checked);
    safeCheck(form, "ThirdPP_SourceWealth_Others", document.getElementById("ThirdPP_SourceWealth_Others").checked);
    safeSetText(form, "ThirdPP_SourceWealth_Others_Write", document.getElementById("ThirdPP_SourceWealth_Others_Write").value || "");

    // embed signature if user drew something
    const sigDataUrl = canvas.toDataURL("image/png");
    // detect blank by sampling pixels; a conservative approach: check if canvas has any non-white pixel
    let isBlank = true;
    try {
      const img = ctx.getImageData(0, 0, 10, 1).data;
      for (let i=0;i<img.length;i+=4){
        if (img[i+3] !== 0) { // alpha
          // if pixel not pure white? we'll assume drawn
          if (!(img[i]===255 && img[i+1]===255 && img[i+2]===255)) { isBlank = false; break; }
        }
      }
    } catch(e){ isBlank = false; }

    if (!isBlank) {
      const sigBytes = await fetch(sigDataUrl).then(r=>r.arrayBuffer());
      try {
        const pngImage = await pdfDoc.embedPng(sigBytes);
        const pages = pdfDoc.getPages();
        const pageIndex = Math.min(2, pages.length-1); // approx page 3
        const page = pages[pageIndex];
        page.drawImage(pngImage, {
          x: 360,
          y: 90,
          width: 160,
          height: 50
        });
      } catch(e){ console.warn("Signature embed failed:", e); }
    }

    // save and download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Filled_Credit_Card_Form.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2500);

  } catch (err) {
    console.error(err);
    alert("PDF generation failed: " + (err.message || err));
  } finally {
    document.getElementById("generate").disabled = false;
  }
}

// ---------- Reset All ----------
function resetAll(){
  document.querySelectorAll("input").forEach(inp=>{
    if (inp.type === "checkbox" || inp.type === "radio") inp.checked = false;
    else inp.value = "";
  });
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // remove policy nodes and recreate 1
  policiesContainer.innerHTML = "";
  policyCount = 0;
  addPolicyBtn.disabled = false;
  addPolicy();
}

document.getElementById("generate").addEventListener("click", fillPDF);
document.getElementById("resetAll").addEventListener("click", resetAll);
