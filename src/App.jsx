import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Settings,
  Package,
  DollarSign,
  X,
  AlertTriangle,
  LogOut,
  Image as ImageIcon,
  Ticket
} from 'lucide-react';

// ============================================================================
// KONFIGURASI FIREBASE & PIN ADMIN
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAu_-Vmp8m2ADpXbyIOeV9eUWIus5gwH20",
  authDomain: "lumine---vault.firebaseapp.com",
  projectId: "lumine---vault",
  storageBucket: "lumine---vault.firebasestorage.app",
  messagingSenderId: "1065438668083",
  appId: "1:1065438668083:web:b62ae3d5c98872ac00ca46",
  measurementId: "G-1NBRD5V9PQ"
};

const ADMIN_PIN = "123456"; // Ubah angka ini jika ingin mengganti PIN panel Admin
// ============================================================================

const isFirebaseConfigured =
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("GANTI_");

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const DEFAULT_SETTINGS = {
  storeName: "LUMINE PHOTOPACK",
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

const DEMO_PRODUCTS = [
  {
    title: "Furina Fontaine - Hydro Archon Set",
    category: "Cosplay",
    price: 45000,
    photoCount: 38,
    videoCount: 4,
    badge: "BEST SELLER",
    active: true,
    coverUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    previewUrls: [
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
    ],
    driveLink: "https://drive.google.com/drive/folders/contoh-link-vault-1",
    description: "Full HD 4K RAW + Edited set lengkap dengan 4 video behind the scene."
  },
  {
    title: "Neon Cyber Maid - Night Studio",
    category: "Studio",
    price: 35000,
    photoCount: 25,
    videoCount: 2,
    badge: "NEW",
    active: true,
    coverUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    previewUrls: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
    ],
    driveLink: "https://drive.google.com/drive/folders/contoh-link-vault-2",
    description: "Konsep studio cyberpunk pencahayaan neon, resolusi tinggi tanpa kompresi."
  },
  {
    title: "Starter Pack Sample - Free Vault",
    category: "Free Sample",
    price: 0,
    photoCount: 8,
    videoCount: 0,
    badge: "GRATIS",
    active: true,
    coverUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80",
    previewUrls: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80"
    ],
    driveLink: "https://drive.google.com/drive/folders/contoh-link-free-sample",
    description: "Sample gratis untuk cek kualitas resolusi sebelum membeli paket VIP."
  }
];

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
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('hv_admin_unlocked') === 'true';
  });
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

  const [adminSubTab, setAdminSubTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'Cosplay',
    price: 35000,
    photoCount: 20,
    videoCount: 0,
    badge: '',
    active: true,
    coverUrl: '',
    previewUrlsText: '',
    driveLink: '',
    description: ''
  });

  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(5000);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('Auth error:', err);
          setLoading(false);
        });
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;

    const unsubProducts = onSnapshot(
      collection(db, 'photopacks'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setProducts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Products listener error:', err);
        setLoading(false);
      }
    );

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrders(list);
      },
      (err) => console.error('Orders listener error:', err)
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'store'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { ...DEFAULT_SETTINGS, ...docSnap.data() };
          setSettings(data);
          setSettingsForm(data);
        } else {
          setDoc(doc(db, 'settings', 'store'), DEFAULT_SETTINGS).catch(() => {});
        }
      },
      (err) => console.error('Settings listener error:', err)
    );

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

  const totalRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'confirmed')
        .reduce((acc, o) => acc + (Number(o.finalPrice) || 0), 0),
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
      setPinError('PIN salah. Periksa konstanta ADMIN_PIN di App.jsx.');
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
      setVoucherMsg('Kode voucher tidak valid atau sudah nonaktif.');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!checkoutProduct || !isFirebaseConfigured) return;

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
      console.error('Order creation failed:', err);
      alert('Gagal membuat pesanan. Pastikan Firestore Rules sudah mengizinkan write.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!isFirebaseConfigured) return;
    try {
      for (const item of DEMO_PRODUCTS) {
        await addDoc(collection(db, 'photopacks'), {
          ...item,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Seed error:', err);
      alert('Gagal mengisi katalog demo. Cek izin Firestore.');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'confirmed' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Hapus data pesanan ini?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.error(err);
    }
  };

  const openNewProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      title: '',
      category: 'Cosplay',
      price: 35000,
      photoCount: 25,
      videoCount: 0,
      badge: 'NEW',
      active: true,
      coverUrl: '',
      previewUrlsText: '',
      driveLink: '',
      description: ''
    });
    setShowProductForm(true);
  };

  const openEditProductForm = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      title: prod.title || '',
      category: prod.category || 'Cosplay',
      price: prod.price ?? 0,
      photoCount: prod.photoCount ?? 0,
      videoCount: prod.videoCount ?? 0,
      badge: prod.badge || '',
      active: prod.active !== false,
      coverUrl: prod.coverUrl || '',
      previewUrlsText: (prod.previewUrls || []).join('\n'),
      driveLink: prod.driveLink || '',
      description: prod.description || ''
    });
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const previewList = productForm.previewUrlsText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    const payload = {
      title: productForm.title.trim(),
      category: productForm.category,
      price: Number(productForm.price) || 0,
      photoCount: Number(productForm.photoCount) || 0,
      videoCount: Number(productForm.videoCount) || 0,
      badge: productForm.badge.trim(),
      active: Boolean(productForm.active),
      coverUrl: productForm.coverUrl.trim(),
      previewUrls: previewList.length > 0 ? previewList : [productForm.coverUrl.trim()].filter(Boolean),
      driveLink: productForm.driveLink.trim(),
      description: productForm.description.trim()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'photopacks', editingProduct.id), payload);
      } else {
        await addDoc(collection(db, 'photopacks'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setShowProductForm(false);
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan produk.');
    }
  };

  const handleToggleProductActive = async (prod) => {
    try {
      await updateDoc(doc(db, 'photopacks', prod.id), {
        active: !(prod.active !== false)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm('Hapus photopack ini dari katalog?')) return;
    try {
      await deleteDoc(doc(db, 'photopacks', prodId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVoucher = () => {
    const code = newVoucherCode.trim().toUpperCase();
    if (!code) return;
    const updated = [
      ...(settingsForm.vouchers || []).filter((v) => v.code !== code),
      { code, discount: Number(newVoucherDiscount) || 5000, active: true }
    ];
    setSettingsForm({ ...settingsForm, vouchers: updated });
    setNewVoucherCode('');
  };

  const handleRemoveVoucher = (code) => {
    setSettingsForm({
      ...settingsForm,
      vouchers: (settingsForm.vouchers || []).filter((v) => v.code !== code)
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'store'), settingsForm);
      alert('Pengaturan toko berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {!isFirebaseConfigured && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-3 text-amber-200 text-xs sm:text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Setup Belum Selesai:</strong> Masukkan <code className="bg-zinc-900 px-1.5 py-0.5 rounded">firebaseConfig</code> milikmu di bagian atas file <code className="bg-zinc-900 px-1.5 py-0.5 rounded">src/App.jsx</code> agar database aktif.
          </span>
        </div>
      )}

      {settings.bannerText && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border-b border-emerald-500/20 px-4 py-2 text-center text-xs sm:text-sm font-medium text-emerald-300">
          {settings.bannerText}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => setActiveTab('store')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
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
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                activeTab === 'store'
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Storefront</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Cek Pesanan</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs s
