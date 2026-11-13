import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  Shield,
  Lock,
  Unlock,
  Search,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Package,
  X,
  Image as ImageIcon
} from 'lucide-react';
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
    QRIS: "Scan QRIS / Transfer ke DANA/GoPay: 0812-XXXX-XXXX a.n. Admin Vault",
    Saweria: "https://saweria.co/usernamekamu",
    Trakteer: "https://trakteer.id/usernamekamu",
    SociaBuzz: "https://sociabuzz.com/usernamekamu/tribe"
  },
  vouchers: [
    { code: "LMN-VIP", discount: 10000, active: true },
    { code: "NEWMEMBER", discount: 5000, active: true }
  ]
};

const formatIDR = (num) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num || 0);

const generateOrderCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'HV-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('store');
  const [user, setUser] = useState(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    () => sessionStorage.getItem('hv_admin_unlocked') === 'true'
  );
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerTelegram, setBuyerTelegram] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMsg, setVoucherMsg] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [lookupQuery, setLookupQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch(() => setLoading(false));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(collection(db, 'photopacks'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProducts(list);
      setLoading(false);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(list);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
      } else {
        setDoc(doc(db, 'settings', 'store'), DEFAULT_SETTINGS).catch(() => {});
      }
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubSettings();
    };
  }, [user]);

  const categories = ['Semua', 'Cosplay', 'Studio', 'VIP Bundle', 'Free Sample'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.active === false) return false;
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch =
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  const searchedOrders = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return [];
    return orders.filter(
      (o) =>
        o.orderCode?.toLowerCase() === q ||
        o.buyerEmail?.toLowerCase() === q ||
        o.buyerTelegram?.toLowerCase().replace('@', '') === q.replace('@', '')
    );
  }, [orders, lookupQuery]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdminUnlock = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('hv_admin_unlocked', 'true');
      setPinError('');
      setPinInput('');
    } else {
      setPinError('PIN salah.');
    }
  };

  const handleAdminLock = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('hv_admin_unlocked');
    setActiveTab('store');
  };

  const openCheckout = (product) => {
    setCheckoutProduct(product);
    setCreatedOrder(null);
    setVoucherInput('');
    setAppliedVoucher(null);
    setVoucherMsg('');
  };

  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    const found = (settings.vouchers || []).find(
      (v) => v.code.toUpperCase() === code && v.active !== false
    );
    if (found) {
      setAppliedVoucher(found);
      setVoucherMsg(`Voucher ${found.code} aktif (-${formatIDR(found.discount)})`);
    } else {
      setAppliedVoucher(null);
      setVoucherMsg('Kode voucher tidak valid.');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!checkoutProduct) return;

    setSubmittingOrder(true);
    try {
      const basePrice = Number(checkoutProduct.price) || 0;
      const discount = appliedVoucher ? Math.min(basePrice, Number(appliedVoucher.discount)) : 0;
      const finalPrice = Math.max(0, basePrice - discount);
      const isFree = finalPrice === 0;
      const orderCode = generateOrderCode();

      const orderPayload = {
        orderCode,
        productId: checkoutProduct.id,
        productTitle: checkoutProduct.title,
        driveLink: checkoutProduct.driveLink || '',
        basePrice,
        discount,
        voucherCode: appliedVoucher ? appliedVoucher.code : null,
        finalPrice,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerTelegram: buyerTelegram.trim(),
        paymentMethod: isFree ? 'FREE_ACCESS' : paymentMethod,
        status: isFree ? 'confirmed' : 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderPayload);
      setCreatedOrder(orderPayload);
      setLookupQuery(orderCode);
    } catch (err) {
      alert('Gagal membuat pesanan. Cek Firestore Rules.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {settings.bannerText && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border-b border-emerald-500/20 px-4 py-2 text-center text-xs sm:text-sm font-medium text-emerald-300">
          {settings.bannerText}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button onClick={() => setActiveTab('store')} className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-sm sm:text-base text-white block leading-none">
                {settings.storeName || 'HYDROGEN // VAULT'}
              </span>
              <span className="text-[10px] tracking-widest uppercase text-zinc-500">
                Digital Photopack Store
              </span>
            </div>
          </button>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 ${
                activeTab === 'store' ? 'bg-emerald-500 text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Storefront</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 ${
                activeTab === 'orders' ? 'bg-emerald-500 text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Cek Pesanan</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-cyan-400 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {isAdminUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Admin</span>
              {pendingOrdersCount > 0 && (
                <span className="px-1.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {activeTab === 'store' && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari karakter atau tema..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-zinc-500 text-sm">Memuat katalog vault...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
              <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium mb-1">Belum ada photopack ditampilkan</p>
              <p className="text-zinc-500 text-xs mb-4">Masuk ke tab Admin untuk menambah katalog.</p>
              <button
                onClick={() => setActiveTab('admin')}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-white"
              >
                Buka Panel Admin
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
                >
                  <div
                    className="relative aspect-[4/3] bg-zinc-950 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setPreviewProduct(item);
                      setPreviewIdx(0);
                    }}
                  >
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                    {item.badge && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-500 text-zinc-950">
                        {item.badge}
                      </span>
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                      {item.category}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-zinc-300">
                      <span>
                        {item.photoCount || 0} Foto {item.videoCount > 0 ? `• ${item.videoCount} Video` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-base text-white mb-1.5 line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 flex-1">{item.description}</p>
                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                      <span className="font-bold text-base text-emerald-400">
                        {item.price === 0 ? 'GRATIS' : formatIDR(item.price)}
                      </span>
                      <button
                        onClick={() => openCheckout(item)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{item.price === 0 ? 'Klaim Gratis' : 'Beli Set'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'orders' && (
        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-1">Cek Status & Akses Google Drive</h2>
            <p className="text-xs text-zinc-400 mb-6">
              Masukkan <strong>Kode Pesanan</strong>, <strong>Email</strong>, atau <strong>Username Telegram</strong>.
            </p>

            <div className="relative mb-6">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Ketik kode pesanan / email / @telegram..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white"
              />
            </div>

            {searchedOrders.map((ord) => (
              <div key={ord.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{ord.orderCode}</span>
                    <h3 className="font-semibold text-sm text-white">{ord.productTitle}</h3>
                    <p className="text-xs text-zinc-500">
                      {ord.buyerName} ({ord.paymentMethod}) • {formatIDR(ord.finalPrice)}
                    </p>
                  </div>
                  {ord.status === 'confirmed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Akses Dibuka
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300">
                      <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                    </span>
                  )}
                </div>

                {ord.status === 'confirmed' ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-zinc-800">
                    <a
                      href={ord.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" /> Buka Google Drive Vault
                    </a>
                    <button
                      onClick={() => handleCopy(ord.driveLink, ord.id)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 flex items-center justify-center gap-1.5"
                    >
                      {copiedId === or
