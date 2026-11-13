import React, { useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Settings,
  Package,
  DollarSign,
  X,
  LogOut,
  Ticket
} from 'lucide-react';

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

export default function AdminPanel({
  db,
  products,
  orders,
  settings,
  formatIDR,
  onLock
}) {
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

  const [settingsForm, setSettingsForm] = useState(settings);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(5000);
  const [savingSettings, setSavingSettings] = useState(false);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'confirmed')
    .reduce((acc, o) => acc + (Number(o.finalPrice) || 0), 0);

  const handleSeedDemo = async () => {
    try {
      for (const item of DEMO_PRODUCTS) {
        await addDoc(collection(db, 'photopacks'), {
          ...item,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      alert('Gagal mengisi katalog demo. Cek Firestore Rules.');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    await updateDoc(doc(db, 'orders', orderId), { status: 'confirmed' });
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Hapus data pesanan ini?')) {
      await deleteDoc(doc(db, 'orders', orderId));
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
  };

  const handleToggleProductActive = async (prod) => {
    await updateDoc(doc(db, 'photopacks', prod.id), {
      active: !(prod.active !== false)
    });
  };

  const handleDeleteProduct = async (prodId) => {
    if (window.confirm('Hapus photopack ini dari katalog?')) {
      await deleteDoc(doc(db, 'photopacks', prodId));
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
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Panel Kontrol Store</h1>
          <p className="text-xs text-zinc-400">
            Kelola verifikasi order, link Drive Vault, katalog, dan voucher diskon.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {products.length === 0 && (
            <button
              onClick={handleSeedDemo}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Isi Katalog Demo
            </button>
          )}
          <button
            onClick={onLock}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Kunci Admin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Pendapatan</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">{formatIDR(totalRevenue)}</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Menunggu Verifikasi</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300">{pendingOrdersCount} Pesanan</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Total Order</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">{orders.length}</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Katalog Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">
            {products.filter((p) => p.active !== false).length} / {products.length}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setAdminSubTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            adminSubTab === 'orders' ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Pesanan ({orders.length})
        </button>
        <button
          onClick={() => setAdminSubTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            adminSubTab === 'catalog' ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          <Package className="w-4 h-4" /> Katalog ({products.length})
        </button>
        <button
          onClick={() => {
            setSettingsForm(settings);
            setAdminSubTab('settings');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            adminSubTab === 'settings' ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          <Settings className="w-4 h-4" /> Pengaturan & Voucher
        </button>
      </div>

      {adminSubTab === 'orders' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {['all', 'pending', 'confirmed'].map((f) => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs capitalize ${
                  orderFilter === f ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'pending' ? 'Pending' : 'Terkonfirmasi'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {orders
              .filter((o) => orderFilter === 'all' || o.status === orderFilter)
              .map((ord) => (
                <div
                  key={ord.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{ord.orderCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {ord.status}
                      </span>
                      <span className="text-xs text-zinc-500">• {ord.paymentMethod}</span>
                    </div>
                    <div className="font-semibold text-sm text-white">
                      {ord.productTitle} —{' '}
                      <span className="text-emerald-400">{formatIDR(ord.finalPrice)}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Pembeli: <strong>{ord.buyerName}</strong> | {ord.buyerEmail} | TG:{' '}
                      {ord.buyerTelegram || '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ord.status === 'pending' && (
                      <button
                        onClick={() => handleConfirmOrder(ord.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Konfirmasi & Buka Akses
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteOrder(ord.id)}
                      className="p-2 rounded-xl bg-zinc-950 text-zinc-400 hover:text-rose-400 border border-zinc-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {adminSubTab === 'catalog' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openNewProductForm}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Photopack
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex gap-4 items-center"
              >
                <img
                  src={prod.coverUrl || 'https://via.placeholder.com/100'}
                  alt={prod.title}
                  className="w-16 h-16 rounded-lg object-cover bg-zinc-950 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">{prod.title}</h4>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {prod.price === 0 ? 'GRATIS' : formatIDR(prod.price)} • {prod.category}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    Drive: {prod.driveLink || 'Belum diisi'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleProductActive(prod)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300"
                  >
                    {prod.active === false ? 'Aktifkan' : 'Sembunyikan'}
                  </button>
                  <button
                    onClick={() => openEditProductForm(prod)}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-cyan-400"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white">Identitas & Banner Promo</h3>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nama Toko</label>
              <input
                type="text"
                value={settingsForm.storeName}
                onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Teks Banner Atas</label>
              <input
                type="text"
                value={settingsForm.bannerText}
                onChange={(e) => setSettingsForm({ ...settingsForm, bannerText: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white">Link / Instruksi Pembayaran</h3>
            {['QRIS', 'Saweria', 'Trakteer', 'SociaBuzz'].map((method) => (
              <div key={method}>
                <label className="block text-xs text-zinc-400 mb-1">{method}</label>
                <input
                  type="text"
                  value={settingsForm.paymentInfo?.[method] || ''}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      paymentInfo: { ...settingsForm.paymentInfo, [method]: e.target.value }
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
            ))}
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-emerald-400" /> Kode Voucher Diskon
            </h3>
            <div className="flex flex-wrap gap-2">
              {(settingsForm.vouchers || []).map((v) => (
                <span
                  key={v.code}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                >
                  <strong className="text-emerald-400">{v.code}</strong>
                  <span className="text-zinc-400">(-{formatIDR(v.discount)})</span>
                  <button
                    type="button
