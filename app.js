const $ = s => document.querySelector(s);

const APP_CONFIG = {
  // HARD-CODED CONFIG
  // Paste your correct Supabase URL and anon public key here before deploying.
  SUPABASE_URL: "https://cuymppzwitmjxjfbazww.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eW1wcHp3aXRtanhqZmJhend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MTY3MTYsImV4cCI6MjA5NDM5MjcxNn0.TS-JaYk3d1iPPfNNfwDZqbCP4n-i_GN1NDn2Avd_PWQ",

  // Optional. Paste Google Apps Script Web App URL here later.
  GOOGLE_SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwv7gQtBX-jXVSZ7JJ-j-sochhHZgU_fbUz79CyQEkxZDEWxrBQdMjQXCVqjof9WXMu/exec",

  BRAND_NAME: "2FLY Payment Verification Hub",

  GCASH_ACCOUNTS: [
    { id:"gcash_1", label:"GCash 1", accountName:"Lorna Diaz", accountNumber:"0912 669 9412" },
    { id:"gcash_2", label:"GCash 2", accountName:"Monaliza V.", accountNumber:"09605971283" },
    { id:"gcash_3", label:"GCash 3", accountName:"Myra V.", accountNumber:"09949839551" }
  ]
};

function cleanUrl(url){
  return String(url || "")
    .trim()
    .replace(/\/rest\/v1\/?$/,"")
    .replace(/\/+$/,"");
}

function getConfig(){
  return APP_CONFIG;
}

function configured(){
  return cleanUrl(APP_CONFIG.SUPABASE_URL).startsWith("https://") &&
    APP_CONFIG.SUPABASE_ANON_KEY &&
    APP_CONFIG.SUPABASE_ANON_KEY.length > 50 &&
    !APP_CONFIG.SUPABASE_ANON_KEY.includes("PASTE_");
}

function initSupabase(){
  if(!configured()){
    alert("Hard-coded Supabase config is missing. Open app.js and paste your anon public key.");
    throw new Error("Missing hard-coded Supabase config.");
  }

  supabaseClient = window.supabase.createClient(
    cleanUrl(APP_CONFIG.SUPABASE_URL),
    APP_CONFIG.SUPABASE_ANON_KEY.trim()
  );

  return supabaseClient;
}

function money(v){
  return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2}).format(Number(v||0));
}
function today(){ return new Date().toISOString().slice(0,10); }
function localDT(v){
  if(!v) return "—";
  return new Date(v).toLocaleString("en-PH",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function esc(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function notice(id,msg,type=""){
  const el = document.getElementById(id);
  if(!el) return;
  el.className = `notice ${type}`.trim();
  el.textContent = msg;
  el.hidden = !msg;
}
function setText(id,v){
  const el = document.getElementById(id);
  if(el) el.textContent = v;
}
function debounce(fn,ms=250){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); };
}

function paymentLabel(v){
  const cfg = getConfig();
  const found = (cfg.GCASH_ACCOUNTS || []).find(a=>a.id===v);
  if(found) return `${found.label} — ${found.accountName}`;
  return ({cash:"Cash",bank_transfer:"Bank Transfer",other:"Other"}[v]) || v || "—";
}

function fillPaymentSelect(id="paymentMethod", all=false){
  const el = document.getElementById(id);
  if(!el) return;
  const cfg = getConfig();
  const first = all ? `<option value="all">All Methods</option>` : `<option value="">Select payment method</option>`;
  el.innerHTML = first +
    (cfg.GCASH_ACCOUNTS || []).map(a=>`<option value="${a.id}">${a.label} — ${a.accountName} — ${a.accountNumber}</option>`).join("") +
    `<option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>`;
}

function statusPill(status){
  return `<span class="pill ${status}">${String(status||"pending").replace("_"," ").toUpperCase()}</span>`;
}

async function logActivity(action, paymentId=null, details=""){
  try{
    await supabaseClient.from("admin_activity").insert({
      user_id: currentUser?.id || null,
      payment_id: paymentId,
      action,
      details
    });
  }catch(e){
    console.warn("Activity log skipped:", e.message);
  }
}

async function requireAuth(){
  initSupabase();
  const {data,error} = await supabaseClient.auth.getUser();
  if(error || !data.user){
    window.location.href = "login.html";
    return null;
  }
  currentUser = data.user;

  const {data: profile} = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  currentProfile = profile || {
    id: currentUser.id,
    email: currentUser.email,
    full_name: currentUser.email,
    role:"admin"
  };

  setText("userLabel", `${currentProfile.full_name || currentUser.email} • ${currentProfile.role || "admin"}`);
  return currentUser;
}

async function logout(){
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
window.logout = logout;

async function setupPage(){
  const cfg = getConfig();
  const status = configured()
    ? "Hard-coded config is ready. Staff can go straight to login."
    : "Hard-coded config is missing. Open app.js and paste your anon public key.";

  const urlEl = document.getElementById("hardcodedUrl");
  const keyEl = document.getElementById("hardcodedKey");
  const statusEl = document.getElementById("hardcodedStatus");

  if(urlEl) urlEl.textContent = cleanUrl(cfg.SUPABASE_URL) || "Not set";
  if(keyEl) keyEl.textContent = cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("PASTE_") ? "Anon key is set" : "Anon key missing";
  if(statusEl) statusEl.textContent = status;
}

async function loginPage(){
  initSupabase();

  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault();
    notice("loginNotice","Logging in...","");
    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    const {error} = await supabaseClient.auth.signInWithPassword({email,password});
    if(error){
      notice("loginNotice", error.message || "Login failed.","bad");
      return;
    }
    window.location.href = "admin.html";
  });
}

async function uploadProof(file, orderId, referenceNumber){
  if(!file) return null;
  const safe = x => String(x||"file").replace(/[^a-zA-Z0-9_-]/g,"-");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${today()}/${safe(orderId)}-${safe(referenceNumber)}-${Date.now()}.${ext}`;

  const {error} = await supabaseClient.storage
    .from("payment-proofs")
    .upload(path,file,{cacheControl:"3600",upsert:false});

  if(error) throw error;

  return supabaseClient.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl;
}

async function findDuplicateReference(ref){
  if(!ref) return null;
  const {data,error} = await supabaseClient
    .from("payments")
    .select("id,order_id,status,amount")
    .eq("reference_number",ref)
    .limit(1);
  if(error) return null;
  return data?.[0] || null;
}

async function submitPaymentPage(){
  await requireAuth();
  fillPaymentSelect("paymentMethod", false);

  $("#paymentForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const f=e.target;
    notice("formNotice","Uploading payment...","");

    try{
      const order_id = f.order_id.value.trim();
      if(!order_id){
        notice("formNotice","Order ID is required. For walk-in, use your manual code like WALKIN-20260515-001.","bad");
        return;
      }

      const reference_number = f.reference_number.value.trim();
      let status = "pending";
      let notes = f.notes.value.trim() || null;

      const dup = await findDuplicateReference(reference_number);
      if(dup){
        status = "duplicate";
        notes = `[AUTO DUPLICATE WARNING] Possible duplicate of ${dup.order_id}. ${notes||""}`.trim();
      }

      const proofUrl = await uploadProof(f.proof.files[0], order_id, reference_number);

      const payload = {
        order_id,
        customer_name: f.customer_name.value.trim() || "Walk-in Customer",
        customer_type: f.customer_type.value,
        payment_method: f.payment_method.value,
        amount: Number(f.amount.value || 0),
        reference_number: reference_number || null,
        proof_image_url: proofUrl,
        status,
        notes,
        submitted_by: currentUser.id
      };

      const {data,error} = await supabaseClient.from("payments").insert(payload).select().single();
      if(error) throw error;

      await logActivity("created_payment", data.id, `Created ${data.order_id} for ${money(data.amount)}`);

      f.reset();
      fillPaymentSelect("paymentMethod", false);
      notice("formNotice", status==="duplicate" ? "Uploaded but marked as DUPLICATE." : "Payment uploaded successfully.","good");
    }catch(err){
      notice("formNotice", err.message || "Upload failed.","bad");
    }
  });
}

async function fetchPayments(filters={}){
  let q = supabaseClient
    .from("payments")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(700);

  if(filters.status && filters.status !== "all") q = q.eq("status",filters.status);
  if(filters.customer_type && filters.customer_type !== "all") q = q.eq("customer_type",filters.customer_type);
  if(filters.payment_method && filters.payment_method !== "all") q = q.eq("payment_method",filters.payment_method);

  if(filters.date){
    q = q.gte("created_at",`${filters.date}T00:00:00`).lte("created_at",`${filters.date}T23:59:59`);
  }

  if(filters.search){
    const s = filters.search.trim();
    if(s) q = q.or(`order_id.ilike.%${s}%,customer_name.ilike.%${s}%,reference_number.ilike.%${s}%`);
  }

  const {data,error} = await q;
  if(error) throw error;
  return data || [];
}

function summarize(list){
  const verified = list.filter(p=>p.status==="verified");
  const byMethod = {};
  const byType = {};
  let total = 0;

  verified.forEach(p=>{
    const amount = Number(p.amount || 0);
    total += amount;
    byMethod[p.payment_method] = (byMethod[p.payment_method] || 0) + amount;
    byType[p.customer_type] = (byType[p.customer_type] || 0) + amount;
  });

  return {
    total,
    verified: verified.length,
    pending: list.filter(p=>p.status==="pending").length,
    review: list.filter(p=>p.status==="needs_review").length,
    rejected: list.filter(p=>p.status==="rejected").length,
    duplicate: list.filter(p=>p.status==="duplicate").length,
    byMethod,
    byType
  };
}

function renderMetrics(s){
  setText("metricTotal", money(s.total));
  setText("metricVerified", s.verified);
  setText("metricPending", s.pending);
  setText("metricReview", s.review);
  setText("metricRejected", s.rejected);
  setText("metricDuplicate", s.duplicate);

  setText("metricOnline", money(s.byType.online || 0));
  setText("metricWalkin", money(s.byType.walkin || 0));
  setText("metricGcash1", money(s.byMethod.gcash_1 || 0));
  setText("metricGcash2", money(s.byMethod.gcash_2 || 0));
  setText("metricGcash3", money(s.byMethod.gcash_3 || 0));
  setText("metricCash", money(s.byMethod.cash || 0));
}

function renderPaymentCards(list){
  const mount = $("#paymentList");
  if(!mount) return;
  if(!list.length){
    mount.innerHTML = `<div class="empty">No payments found.</div>`;
    return;
  }

  mount.innerHTML = list.map(p=>`
    <div class="payment">
      <div class="payment-top">
        <div>
          <div class="title">${esc(p.order_id)}</div>
          <div class="helper">${esc(p.customer_name)} • ${localDT(p.created_at)}</div>
          <div class="meta">
            ${statusPill(p.status)}
            <span class="pill">${String(p.customer_type).toUpperCase()}</span>
            <span class="pill">${paymentLabel(p.payment_method)}</span>
            <span class="pill">${money(p.amount)}</span>
            <span class="pill">REF: ${esc(p.reference_number || "—")}</span>
          </div>
        </div>
        <button class="btn secondary small" onclick="openModal('${p.id}')">View Proof</button>
      </div>

      ${p.notes ? `<div class="notice">${esc(p.notes)}</div>` : ""}

      <div class="actions">
        <button class="btn good small" onclick="updateStatus('${p.id}','verified')">Verify</button>
        <button class="btn info small" onclick="updateStatus('${p.id}','needs_review')">Needs Review</button>
        <button class="btn bad small" onclick="updateStatus('${p.id}','rejected')">Reject</button>
        ${currentProfile?.role === "owner" ? `<button class="btn bad small" onclick="deletePayment('${p.id}')">Delete</button>` : ""}
      </div>
    </div>
  `).join("");
}

async function openModal(id){
  const {data,error} = await supabaseClient.from("payments").select("*").eq("id",id).single();
  if(error){ alert(error.message); return; }

  $("#modalContent").innerHTML = `
    <div class="card-head">
      <div>
        <h2>${esc(data.order_id)}</h2>
        <p>${esc(data.customer_name)} • ${localDT(data.created_at)}</p>
      </div>
      <button class="btn secondary small" onclick="closeModal()">Close</button>
    </div>

    <div class="grid two">
      <div class="metric"><div class="metric-label">Amount</div><div class="metric-value">${money(data.amount)}</div></div>
      <div class="metric"><div class="metric-label">Status</div><div class="metric-value">${String(data.status).replace("_"," ")}</div></div>
    </div>

    <div class="meta">
      <span class="pill">${String(data.customer_type).toUpperCase()}</span>
      <span class="pill">${paymentLabel(data.payment_method)}</span>
      <span class="pill">REF: ${esc(data.reference_number || "—")}</span>
      <span class="pill">Verified: ${localDT(data.verified_at)}</span>
    </div>

    ${data.notes ? `<div class="notice">${esc(data.notes)}</div>` : ""}
    ${data.proof_image_url ? `<a href="${data.proof_image_url}" target="_blank"><img class="proof" src="${data.proof_image_url}" alt="Payment proof"></a>` : `<div class="empty">No proof uploaded.</div>`}

    <div class="actions">
      <button class="btn good" onclick="updateStatus('${data.id}','verified')">Verify / Good to Go</button>
      <button class="btn info" onclick="updateStatus('${data.id}','needs_review')">Needs Review</button>
      <button class="btn bad" onclick="updateStatus('${data.id}','rejected')">Reject</button>
      ${currentProfile?.role === "owner" ? `<button class="btn bad" onclick="deletePayment('${data.id}')">Delete</button>` : ""}
    </div>
  `;

  $("#modal").classList.add("show");
}
function closeModal(){ $("#modal")?.classList.remove("show"); }

async function updateStatus(id,status){
  try{
    const payload = { status, updated_at: new Date().toISOString() };
    if(status === "verified"){
      payload.verified_by = currentUser.id;
      payload.verified_at = new Date().toISOString();
    }

    const {data,error} = await supabaseClient.from("payments").update(payload).eq("id",id).select().single();
    if(error) throw error;

    await logActivity(`marked_${status}`, id, `Marked ${data.order_id} as ${status}`);

    if(status === "verified"){
      await syncToSheets(data);
    }

    closeModal();
    if(window.loadAdmin) await window.loadAdmin();
    if(window.loadReports) await window.loadReports();
  }catch(err){
    alert(err.message || "Update failed.");
  }
}

async function deletePayment(id){
  if(currentProfile?.role !== "owner"){
    alert("Only owner can delete records.");
    return;
  }
  if(!confirm("Delete this payment record?")) return;

  const {error} = await supabaseClient.from("payments").delete().eq("id",id);
  if(error){ alert(error.message); return; }

  await logActivity("deleted_payment", id, "Owner deleted payment");
  closeModal();
  if(window.loadAdmin) await window.loadAdmin();
}

async function syncToSheets(payment){
  const cfg = getConfig();
  if(!cfg.GOOGLE_SHEETS_WEBHOOK_URL) return;

  const payload = {
    payment: {
      ...payment,
      payment_method: paymentLabel(payment.payment_method),
      verified_by: currentProfile?.full_name || currentUser?.email || ""
    }
  };

  try{
    await fetch(cfg.GOOGLE_SHEETS_WEBHOOK_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
  }catch(e){
    console.warn("Google Sheets sync skipped:", e.message);
  }
}

async function adminPage(){
  await requireAuth();
  fillPaymentSelect("paymentMethodFilter", true);

  window.loadAdmin = async ()=>{
    const list = await fetchPayments({
      status: $("#statusFilter").value,
      customer_type: $("#typeFilter").value,
      payment_method: $("#paymentMethodFilter").value,
      search: $("#searchInput").value
    });

    renderMetrics(summarize(list));
    renderPaymentCards(list);
  };

  ["statusFilter","typeFilter","paymentMethodFilter"].forEach(id=>{
    document.getElementById(id).addEventListener("change",window.loadAdmin);
  });
  $("#searchInput").addEventListener("input",debounce(window.loadAdmin,350));

  await window.loadAdmin();
}

function renderReportRows(list){
  const body = $("#reportRows");
  if(!body) return;

  if(!list.length){
    body.innerHTML = `<tr><td colspan="10">No records found.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(p=>`
    <tr>
      <td>${localDT(p.created_at)}</td>
      <td>${localDT(p.verified_at)}</td>
      <td>${esc(p.order_id)}</td>
      <td>${esc(p.customer_name)}</td>
      <td>${String(p.customer_type).toUpperCase()}</td>
      <td>${paymentLabel(p.payment_method)}</td>
      <td>${money(p.amount)}</td>
      <td>${esc(p.reference_number || "—")}</td>
      <td>${String(p.status).replace("_"," ").toUpperCase()}</td>
      <td>${p.proof_image_url ? `<a href="${p.proof_image_url}" target="_blank">View</a>` : "—"}</td>
    </tr>
  `).join("");
}

function exportCsvFromRows(){
  const rows = Array.from(document.querySelectorAll("#reportRows tr")).map(tr=>Array.from(tr.children).map(td=>`"${td.textContent.replaceAll('"','""')}"`).join(","));
  const header = `"Date Submitted","Date Verified","Order ID","Customer","Type","Method","Amount","Reference","Status","Proof"`;
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `2fly-payment-report-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
window.exportCsvFromRows = exportCsvFromRows;

async function reportsPage(){
  await requireAuth();
  fillPaymentSelect("paymentMethodFilter", true);
  $("#reportDate").value = today();

  window.loadReports = async ()=>{
    const list = await fetchPayments({
      date: $("#reportDate").value,
      customer_type: $("#typeFilter").value,
      payment_method: $("#paymentMethodFilter").value,
      status:"all"
    });

    renderMetrics(summarize(list));
    renderReportRows(list);
  };

  ["reportDate","typeFilter","paymentMethodFilter"].forEach(id=>{
    document.getElementById(id).addEventListener("change",window.loadReports);
  });

  await window.loadReports();
}

async function activityPage(){
  await requireAuth();

  const {data,error} = await supabaseClient
    .from("admin_activity")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(250);

  const body = $("#activityRows");
  if(error){
    body.innerHTML = `<tr><td colspan="4">${esc(error.message)}</td></tr>`;
    return;
  }
  if(!data?.length){
    body.innerHTML = `<tr><td colspan="4">No activity yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map(r=>`
    <tr>
      <td>${localDT(r.created_at)}</td>
      <td>${esc(r.action)}</td>
      <td>${esc(r.details || "")}</td>
      <td>${esc(r.payment_id || "")}</td>
    </tr>
  `).join("");
}

window.openModal = openModal;
window.closeModal = closeModal;
window.updateStatus = updateStatus;
window.deletePayment = deletePayment;

document.addEventListener("DOMContentLoaded", async ()=>{
  const page = document.body.dataset.page;
  try{
    if(page==="setup") await setupPage();
    if(page==="login") await loginPage();
    if(page==="submit") await submitPaymentPage();
    if(page==="admin") await adminPage();
    if(page==="reports") await reportsPage();
    if(page==="activity") await activityPage();
  }catch(err){
    console.error(err);
    alert(err.message || "Something went wrong.");
  }
});
