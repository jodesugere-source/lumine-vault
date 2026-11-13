import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Shield, Lock, Unlock, Search, ShoppingBag, Eye, CheckCircle2, Clock, ExternalLink, Copy, Check, Package, X } from 'lucide-react';
import AdminPanel from './AdminPanel.jsx';

const firebaseConfig = {
  apiKey: "AIzaSyAu_-Vmp8m2ADpXbyIOeV9eUWIus5gwH20",
  authDomain: "lumine---vault.firebaseapp.com",
  projectId: "lumine---vault",
  storageBucket: "lumine---vault.firebasestorage.app",
  messagingSenderId: "1065438668083",
  appId: "1:1065438668083:web:b62ae3d5c98872ac00ca46",
  measurementId: "G-1NBRD5V9PQ"
};

const ADMIN_PIN = "123456";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_SETTINGS = {
  storeName: "HYDROGEN // VAULT",
  bannerText: "⚡ PROMO RILIS BARU: Gunakan kode LMN-VIP untuk diskon Rp 10.000!",
  paymentInfo: {
    QRIS: "Scan QRIS / Transfer DANA/GoPay: 0812-XXXX-XXXX",
    Saweria: "https://saweria.co/usernamekamu",
    Trakteer: "https://trakteer.id/usernamekamu",
    SociaBuzz: "https://sociabuzz.com/usernamekamu/tribe"
  },
  vouchers: [
    { code: "LMN-VIP", discount: 10000, active: true },
    { code: "NEWMEMBER", discount: 5000, active: true }
  ]
};

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const makeCode = () => 'HV-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export default function App() {
  const [tab, setTab] = useState('store');
  const [user, setUser] = useState(null);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('hv_admin') === 'true');
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState('');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Semua');
  const [preview, setPreview] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [doneOrder, setDoneOrder] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tg, setTg] = useState('');
  const [payMethod, setPayMethod] = useState('QRIS');
  const [vCode, setVCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [vMsg, setVMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [lookup, setLookup] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => u ? setUser(u) : signInAnonymously(auth).catch(() => setLoading(false))), []);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(collection(db, 'photopacks'), (s) => {
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'orders'), (s) => {
      setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const u3 = onSnapshot(doc(db, 'settings', 'store'), (d) => {
      if (d.exists()) setSettings({ ...DEFAULT_SETTINGS, ...d.data() });
      else setDoc(doc(db, 'settings', 'store'), DEFAULT_SETTINGS).catch(() => {});
    });
    return () => { u1(); u2(); u3(); };
  }, [user]);

  const list = useMemo(() => products.filter((p) => p.active !== false && (cat === 'Semua' || p.category === cat) && (p.title?.toLowerCase().includes(query.toLowerCase()) || p.description?.toLowerCase().includes(query.toLowerCase()))), [products, cat, query]);
  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);
  const foundOrders = useMemo(() => {
    const q = lookup.trim().toLowerCase();
    return q ? orders.filter((o) => o.orderCode?.toLowerCase() === q || o.buyerEmail?.toLowerCase() === q || o.buyerTelegram?.toLowerCase().replace('@', '') === q.replace('@', '')) : [];
  }, [orders, lookup]);

  const copyText = (txt, id) => { navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!checkout) return;
    setBusy(true);
    try {
      const base = Number(checkout.price) || 0;
      const disc = voucher ? Math.min(base, Number(voucher.discount)) : 0;
      const finalPrice = Math.max(0, base - disc);
      const orderCode = makeCode();
      const payload = {
        orderCode, productId: checkout.id, productTitle: checkout.title, driveLink: checkout.driveLink || '',
        basePrice: base, discount: disc, voucherCode: voucher ? voucher.code : null, finalPrice,
        buyerName: name.trim(), buyerEmail: email.trim(), buyerTelegram: tg.trim(),
        paymentMethod: finalPrice === 0 ? 'FREE_ACCESS' : payMethod,
        status: finalPrice === 0 ? 'confirmed' : 'pending', createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'orders'), payload);
      setDoneOrder(payload);
      setLookup(orderCode);
    } catch { alert('Gagal membuat pesanan. Cek Firestore Rules.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {settings.bannerText && <div className="bg-emerald-500/15 border-b border-emerald-500/20 px-4 py-2 text-center text-xs text-emerald-300">{settings.bannerText}</div>}

      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <button onClick={() => setTab('store')} className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center"><Shield className="w-4 h-4 text-emerald-400" /></div>
            <span className="font-bold text-sm text-white">{settings.storeName}</span>
          </button>
          <nav className="flex items-center gap-1.5">
            <button onClick={() => setTab('store')} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${tab === 'store' ? 'bg-emerald-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}><ShoppingBag className="w-3.5 h-3.5" /> Toko</button>
            <button onClick={() => setTab('orders')} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${tab === 'orders' ? 'bg-emerald-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}><Search className="w-3.5 h-3.5" /> Cek Order</button>
            <button onClick={() => setTab('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-zinc-800 ${tab === 'admin' ? 'bg-cyan-400 text-zinc-950 font-semibold' : 'text-zinc-400'}`}>
              {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} Admin
              {pendingCount > 0 && <span className="px-1.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">{pendingCount}</span>}
            </button>
          </nav>
        </div>
      </header>

      {tab === 'store' && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['Semua', 'Cosplay', 'Studio', 'VIP Bundle', 'Free Sample'].map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap ${cat === c ? 'bg-emerald-500 text-zinc-950 font-semibold' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>{c}</button>
              ))}
            </div>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari photopack..." className="w-full md:w-64 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white" />
          </div>

          {loading ? <p className="text-center py-16 text-zinc-500 text-xs">Memuat katalog...</p> : list.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center">
              <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-300 mb-3">Katalog masih kosong</p>
              <button onClick={() => setTab('admin')} className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-white">Buka Panel Admin</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((item) => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] bg-zinc-950 cursor-pointer" onClick={() => setPreview(item)}>
                    {item.coverUrl && <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />}
                    {item.badge && <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-zinc-950">{item.badge}</span>}
                    <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-zinc-950/80 text-[11px] text-emerald-400 flex items-center gap-1"><Eye className="w-3 h-3" /> Preview</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm text-white mb-1">{item.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 flex-1">{item.description}</p>
                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                      <span className="font-bold text-sm text-emerald-400">{item.price === 0 ? 'GRATIS' : formatIDR(item.price)}</span>
                      <button onClick={() => { setCheckout(item); setDoneOrder(null); setVoucher(null); setVMsg(''); }} className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">{item.price === 0 ? 'Klaim' : 'Beli'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {tab === 'orders' && (
        <main className="max-w-xl mx-auto px-4 py-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-bold text-base text-white mb-1">Cek Status & Link Google Drive</h2>
            <p className="text-xs text-zinc-400 mb-4">Masukkan Kode Pesanan, Email, atau Username Telegram.</p>
            <input type="text" value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Contoh: HV-9X2K1A" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mb-4" />
            {foundOrders.map((o) => (
              <div key={o.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{o.orderCode}</span>
                    <h3 className="font-semibold text-sm text-white">{o.productTitle}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${o.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>
                    {o.status === 'confirmed' ? <><CheckCircle2 className="w-3 h-3" /> Aktif</> : <><Clock className="w-3 h-3" /> Pending</>}
                  </span>
                </div>
                {o.status === 'confirmed' ? (
                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <a href={o.driveLink} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Buka Drive</a>
                    <button onClick={() => copyText(o.driveLink, o.id)} className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-1">{copied === o.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} Salin</button>
                  </div>
                ) : <p className="text-xs text-zinc-500">Menunggu konfirmasi pembayaran oleh admin.</p>}
              </div>
            ))}
          </div>
        </main>
      )}

      {tab === 'admin' && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          {!unlocked ? (
            <div className="max-w-xs mx-auto mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
              <Lock className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
              <h2 className="font-bold text-sm text-white mb-3">Masukkan PIN Admin</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (pin === ADMIN_PIN) { setUnlocked(true); sessionStorage.setItem('hv_admin', 'true'); setPinErr(''); } else setPinErr('PIN salah'); }} className="space-y-3">
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center text-sm text-white" />
                {pinErr && <p className="text-xs text-rose-400">{pinErr}</p>}
                <button type="submit" className="w-full py-2 rounded-xl bg-cyan-400 text-zinc-950 font-semibold text-xs">Masuk</button>
              </form>
            </div>
          ) : (
            <AdminPanel db={db} products={products} orders={orders} settings={settings} formatIDR={formatIDR} onLock={() => { setUnlocked(false); sessionStorage.removeItem('hv_admin'); setTab('store'); }} />
          )}
        </main>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="p-1 rounded bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative bg-zinc-950 aspect-[4/3] flex items-center justify-center overflow-hidden select-none">
              <img src={(preview.previewUrls && preview.previewUrls[0]) || preview.coverUrl} alt="Preview" className="max-h-full max-w-full object-contain pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25 -rotate-12 text-white font-black tracking-widest text-lg">HYDROGEN VAULT • PREVIEW</div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-bold text-emerald-400 text-sm">{preview.price === 0 ? 'GRATIS' : formatIDR(preview.price)}</span>
              <button onClick={() => { const p = preview; setPreview(null); setCheckout(p); setDoneOrder(null); }} className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">Checkout</button>
            </div>
          </div>
        </div>
      )}

      {checkout && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-white">{doneOrder ? 'Pesanan Dibuat!' : 'Checkout'}</h3>
              <button onClick={() => setCheckout(null)} className="p-1 rounded bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            {doneOrder ? (
              <div className="space-y-3 text-center">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-[11px] text-emerald-300">Kode Pesananmu:</p>
                  <p className="text-xl font-mono font-bold text-white my-1">{doneOrder.orderCode}</p>
                  <button onClick={() => copyText(doneOrder.orderCode, 'code')} className="px-3 py-1 rounded bg-zinc-900 text-xs text-emerald-400">{copied === 'code' ? 'Tersalin' : 'Salin Kode'}</button>
                </div>
                {doneOrder.finalPrice > 0 && (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-1">
                    <p className="text-zinc-400">Transfer <strong className="text-emerald-400">{formatIDR(doneOrder.finalPrice)}</strong> via <strong>{doneOrder.paymentMethod}</strong>:</p>
                    {settings.paymentInfo?.[doneOrder.paymentMethod]?.startsWith('http') ? (
  doneOrder.paymentMethod === 'QRIS' ? (
    <img src={settings.paymentInfo.QRIS} alt="QRIS" className="w-48 mx-auto rounded-lg bg-white p-2 mt-2" />
  ) : (
    <a href={settings.paymentInfo[doneOrder.paymentMethod]} target="_blank" rel="noreferrer" className="block text-emerald-400 underline break-all">{settings.paymentInfo[doneOrder.paymentMethod]}</a>
  )
) : (
  <p className="font-mono text-zinc-200 break-all">{settings.paymentInfo?.[doneOrder.paymentMethod]}</p>
)}
                  </div>
                )}
                <button onClick={() => { setCheckout(null); setTab('orders'); }} className="w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">Buka Halaman Cek Order</button>
              </div>
            ) : (
              <form onSubmit={submitOrder} className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex justify-between text-xs">
                  <span className="font-semibold text-white">{checkout.title}</span>
                  <span className="font-bold text-emerald-400">{checkout.price === 0 ? 'GRATIS' : formatIDR(checkout.price)}</span>
                </div>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama / Nickname *" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" />
                <input type="text" value={tg} onChange={(e) => setTg(e.target.value)} placeholder="Username Telegram (opsional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" />
                {checkout.price > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {['QRIS', 'Saweria', 'Trakteer', 'SociaBuzz'].map((m) => (
                        <button type="button" key={m} onClick={() => setPayMethod(m)} className={`py-2 px-3 rounded-xl text-xs border text-left ${payMethod === m ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>{m}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={vCode} onChange={(e) => setVCode(e.target.value)} placeholder="Kode Voucher" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white uppercase" />
                      <button type="button" onClick={() => { const f = (settings.vouchers || []).find((v) => v.code.toUpperCase() === vCode.trim().toUpperCase() && v.active !== false); setVoucher(f || null); setVMsg(f ? `Diskon ${formatIDR(f.discount)}` : 'Voucher tidak valid'); }} className="px-3 py-2 rounded-xl bg-zinc-800 text-xs text-white">Pakai</button>
                  </div>
                  {vMsg && <p className={`text-[11px] ${voucher ? 'text-emerald-400' : 'text-rose-400'}`}>{vMsg}</p>}
                </>
              )}
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs">
                <span className="text-zinc-400">Total</span>
                <span className="font-bold text-emerald-400">{formatIDR(Math.max(0, (Number(checkout.price) || 0) - (voucher ? Number(voucher.discount) : 0)))}</span>
              </div>
              <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">{busy ? 'Memproses...' : 'Buat Pesanan'}</button>
            </form>
          )}
        </div>
      </div>
    )}
  </div>
);
}
