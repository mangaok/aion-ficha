// Ponte entre a ficha e o Firebase: login por e-mail e Firestore com cache offline.
import { firebaseConfig } from "./firebase-config.js";
const V = "10.14.1";
const ui = {
  box: document.getElementById("auth"),
  form: document.getElementById("authForm"),
  msg: document.getElementById("authMsg"),
  setup: document.getElementById("authSetup"),
};
function show(state, text){
  ui.box.dataset.state = state; ui.box.hidden = state === "hidden";
  if(text !== undefined) ui.msg.textContent = text;
}
if(!firebaseConfig){ show("setup"); }
else {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  await A.setPersistence(auth, A.indexedDBLocalPersistence).catch(()=>{});
  let fs;
  try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch { fs = F.getFirestore(app); }

  const mapErr = e => ({ code: e && e.code === "permission-denied" ? "invalid_argument" : (e && e.code === "unavailable" ? "unavailable" : "unknown"), message: e && e.message });
  const meta = m => ({ fromCache: m.fromCache, hasPendingWrites: m.hasPendingWrites });
  function makeDb(uid){
    const root = `users/${uid}`;
    const docRef = p => {
      const r = F.doc(fs, `${root}/${p}`);
      return {
        id: r.id, path: p,
        get: async () => { const s = await F.getDoc(r); return { id: s.id, exists: s.exists(), data: () => s.data(), metadata: meta(s.metadata) }; },
        set: d => F.setDoc(r, d).catch(e => { throw mapErr(e); }),
        update: d => F.updateDoc(r, d).catch(e => { throw mapErr(e); }),
        delete: () => F.deleteDoc(r).catch(e => { throw mapErr(e); }),
        onSnapshot: (next, err) => F.onSnapshot(r, { includeMetadataChanges: true },
          s => next({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: meta(s.metadata) }), e => err && err(mapErr(e))),
      };
    };
    const colRef = p => {
      const c = F.collection(fs, `${root}/${p}`);
      return {
        path: p,
        doc: id => docRef(`${p}/${id || crypto.randomUUID().slice(0, 12)}`),
        get: async () => { const s = await F.getDocs(c); return { docs: s.docs.map(x => ({ id: x.id, exists: true, data: () => x.data() })) }; },
        onSnapshot: (next, err) => F.onSnapshot(c, s => next({ docs: s.docs.map(x => ({ id: x.id, exists: true, data: () => x.data() })), metadata: meta(s.metadata) }), e => err && err(mapErr(e))),
      };
    };
    return { doc: docRef, collection: colRef };
  }

  async function seedIfEmpty(db){
    const ref = F.doc(fs, `users/${auth.currentUser.uid}/ficha/aion`);
    let snap;
    try { snap = await F.getDocFromServer(ref); } catch { return; } // offline: não semeia às cegas
    if(snap.exists()) return;
    const seed = await fetch("./seed.json", { cache: "no-store" }).then(r => r.json());
    await importAll(db, seed);
  }
  async function importAll(db, data){
    const batch = F.writeBatch(fs); const uid = auth.currentUser.uid;
    batch.set(F.doc(fs, `users/${uid}/ficha/aion`), data.ficha);
    (data.notas || []).forEach(n => { const { id, ...rest } = n; batch.set(F.doc(fs, `users/${uid}/notas/${id}`), rest); });
    (data.tarefas || []).forEach(t => { const { id, ...rest } = t; batch.set(F.doc(fs, `users/${uid}/tarefas/${id}`), rest); });
    await batch.commit();
  }
  async function exportAll(){
    const uid = auth.currentUser.uid;
    const f = await F.getDoc(F.doc(fs, `users/${uid}/ficha/aion`));
    const ns = await F.getDocs(F.collection(fs, `users/${uid}/notas`));
    const ts = await F.getDocs(F.collection(fs, `users/${uid}/tarefas`));
    return { versao: 1, exportado: new Date().toISOString(), ficha: f.data(), notas: ns.docs.map(d => ({ id: d.id, ...d.data() })), tarefas: ts.docs.map(d => ({ id: d.id, ...d.data() })) };
  }

  window.AionAuth = {
    signOut: () => A.signOut(auth).then(() => location.reload()),
    exportAll, importAll: data => importAll(window.__aionDb, data),
    email: () => auth.currentUser && auth.currentUser.email,
  };

  ui.form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = ui.form.email.value.trim(), senha = ui.form.senha.value;
    show("login", "Entrando…");
    try { await A.signInWithEmailAndPassword(auth, email, senha); }
    catch (err) {
      const c = err.code || "";
      show("login", c.includes("invalid") || c.includes("wrong") || c.includes("user-not-found") ? "E-mail ou senha errados." : c.includes("network") ? "Sem internet. Tente de novo quando conectar." : "Não deu para entrar (" + c + ").");
    }
  });
  document.getElementById("authReset").addEventListener("click", async () => {
    const email = ui.form.email.value.trim();
    if(!email){ show("login", "Digite o e-mail acima e toque de novo."); return; }
    try { await A.sendPasswordResetEmail(auth, email); show("login", "Enviei um link de nova senha para " + email + "."); }
    catch { show("login", "Não consegui enviar o e-mail de nova senha."); }
  });

  let started = false;
  A.onAuthStateChanged(auth, async user => {
    if(!user){ show("login", ""); return; }
    show("hidden");
    if(started) return; started = true;
    const db = makeDb(user.uid); window.__aionDb = db;
    await seedIfEmpty(db).catch(() => {});
    window.__dbReady(db);
  });
}
