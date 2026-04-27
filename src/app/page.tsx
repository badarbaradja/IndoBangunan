'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { POSProduct } from '@/types/pos'

export default function Home() {
  const [scrollY, setScrollY] = useState(0)
  const [featuredProducts, setFeaturedProducts] = useState<POSProduct[]>([])
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Scroll listener for parallax
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0')
          entry.target.classList.remove('opacity-0', 'translate-y-12')
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

    document.querySelectorAll('.scroll-anim').forEach(el => observer.observe(el))

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    // Fetch products for carousel
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        const json = await res.json()
        if (res.ok && json.data) {
          // Take top 6 products as featured
          setFeaturedProducts(json.data.slice(0, 6))
        }
      } catch (err) {
        console.error('Failed to fetch featured products', err)
      }
    }
    fetchProducts()
  }, [])

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
  }

  return (
    <main className="min-h-screen bg-gray-50 overflow-x-hidden font-sans text-gray-900 selection:bg-blue-200">
      {/* Hero Wrapper (Full Screen & Center) */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image (Absolute) */}
        <img 
          src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2000&auto=format&fit=crop" 
          alt="Modern Construction" 
          className="absolute inset-0 w-full h-full object-cover z-0" 
        />
        
        {/* Dark Overlay (Absolute) */}
        <div className="absolute inset-0 bg-black/60 z-10"></div>

        {/* Navbar (Strict Glassmorphism) */}
        <nav className="absolute top-0 left-0 w-full z-50 bg-white/5 backdrop-blur-md border-b border-white/10 py-4">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="relative z-10 hover:scale-105 transition-transform duration-300">
              <Image src="/logo.png" alt="IndoBangunan" width={200} height={45} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]" style={{ objectFit: 'contain' }} priority />
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/pos" 
                className="group inline-flex items-center justify-center px-7 py-3 rounded-full font-black text-sm bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                Self-Order Kiosk
              </Link>
            </div>
          </div>
        </nav>

        {/* Particles Effect (Absolute) */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-30">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="absolute bg-white rounded-sm opacity-20"
              style={{
                width: Math.random() * 8 + 4 + 'px',
                height: Math.random() * 8 + 4 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                animationDelay: `-${Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        {/* Konten Utama (Relative Content) */}
        <div className="relative z-20 flex flex-col items-center text-center gap-8 px-4 mt-16 max-w-4xl animate-slide-up-fast">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] tracking-tight drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
            Toko Bangunan<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">
              Self-Service
            </span><br/>
            Modern.
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-200 font-medium leading-relaxed drop-shadow-md">
            Pilih material berkualitas, tentukan jumlah, bayar secara mandiri. Pengalaman belanja super cepat untuk proyek renovasi Anda.
          </p>

          <div className="animate-heartbeat">
            <Link 
              href="/pos" 
              className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-bold rounded-full text-gray-900 bg-[#facc15] overflow-hidden transition-all duration-150 active:scale-[0.96] shadow-[0_0_20px_rgba(250,204,21,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-active:translate-y-0 transition-transform duration-150 ease-out"></div>
              <span className="relative flex items-center gap-3">
                Mulai Pesan Sekarang
                <span className="inline-block animate-[bounce-x_1s_infinite]">➔</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section (Now strictly below Hero) */}
      <section className="relative z-30 w-full bg-white pt-24 pb-12">
        <div className="px-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80', title: 'Material Terlengkap', desc: 'Ribuan item dari semen hingga keramik tersedia di satu tempat.' },
              { img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80', title: 'Belanja Mandiri', desc: 'Pilih sendiri via Kiosk tanpa perlu antre panjang.' },
              { img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80', title: 'Harga Transparan', desc: 'Tidak ada biaya tersembunyi, langsung bayar via QRIS/Tunai.' },
            ].map((feat, idx) => (
              <div 
                key={idx} 
                className="scroll-anim opacity-0 translate-y-12 transition-all duration-1000 ease-out bg-white rounded-3xl p-8 shadow-xl border border-gray-100 overflow-hidden relative"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6 ring-4 ring-blue-50 shadow-md">
                  <img src={feat.img} alt={feat.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feat.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="py-32 px-6 bg-[#fafafa] relative overflow-hidden">
        {/* Decorative Background Textures */}
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/80 to-transparent skew-x-12 translate-x-1/4 -z-10"></div>
        
        {/* Floating Decorative Icons */}
        <div className="absolute top-20 left-10 text-4xl opacity-20 rotate-12 scroll-anim">🧱</div>
        <div className="absolute bottom-40 right-20 text-5xl opacity-20 -rotate-12 scroll-anim" style={{ transitionDelay: '300ms' }}>🛒</div>
        <div className="absolute top-40 right-1/4 text-3xl opacity-20 rotate-45 scroll-anim" style={{ transitionDelay: '600ms' }}>🔨</div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24 scroll-anim opacity-0 translate-y-12 transition-all duration-1000">
            <span className="inline-block py-1.5 px-4 rounded-full bg-blue-100 text-blue-700 font-black tracking-widest uppercase text-xs mb-4">Langkah Sederhana</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight">Mudah, Cepat,<br/>Tanpa Antre.</h2>
          </div>

          <div className="relative mt-12">
            {/* Prominent Glowing Connecting Line */}
            <div className="hidden md:block absolute top-[40%] left-10 right-10 h-1.5 bg-gray-200 rounded-full z-0 overflow-hidden">
               <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-yellow-400 opacity-80 scroll-anim transition-all duration-[2s] origin-left scale-x-0 [&.opacity-100]:scale-x-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 relative z-10">
              {[
                { step: '01', title: 'Eksplorasi Katalog', desc: 'Temukan material terbaik dari katalog digital lengkap kami.', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80' },
                { step: '02', title: 'Atur Keranjang', desc: 'Tentukan jumlah dan detail pesanan Anda dengan mudah dalam hitungan detik.', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80' },
                { step: '03', title: 'Bayar & Ambil', desc: 'Selesaikan pembayaran instan dengan aman, barang langsung disiapkan.', img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=80' }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="scroll-anim opacity-0 translate-y-16 transition-all duration-1000 bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-white hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-3 group" 
                  style={{ transitionDelay: `${i * 250}ms` }}
                >
                  <div className="relative w-full aspect-[4/3] rounded-[24px] overflow-hidden mb-8 shadow-inner bg-gray-100">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 ease-in-out" />
                    <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/40 backdrop-blur-3xl rounded-tl-[32px] rounded-br-[24px] flex items-center justify-center border-t border-l border-white/50 shadow-sm">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#124aa1] to-blue-400 filter drop-shadow-sm">
                        {item.step}
                      </span>
                    </div>
                  </div>
                  <div className="px-2 pb-4">
                    <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">{item.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed text-base">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <section className="py-24 px-6 bg-gray-50 border-t border-gray-200/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 scroll-anim opacity-0 translate-y-12 transition-all duration-1000">
            <div>
              <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-2 block">Pilihan Terbaik</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Produk Terlaris</h2>
            </div>
            <Link href="/pos" className="hidden md:inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors">
              Lihat Semua <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>

          <div className="flex overflow-x-auto pb-10 gap-6 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
            {featuredProducts.length > 0 ? featuredProducts.map((prod, i) => (
              <Link href="/pos" key={prod.id} className="scroll-anim opacity-0 translate-y-12 transition-all duration-1000 min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 group snap-start" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-full aspect-square bg-gray-100 rounded-xl mb-5 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform duration-500">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    '🧱'
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{(typeof prod.category === 'object' ? prod.category?.name : prod.category) || 'Material'}</p>
                  <h4 className="text-lg font-bold text-gray-900 truncate">{prod.name}</h4>
                  <p className="text-[#124aa1] font-black text-xl pt-2">{formatRupiah(prod.selling_price)} <span className="text-sm font-medium text-gray-500">/{prod.unit}</span></p>
                </div>
              </Link>
            )) : (
              // Skeleton loading state
              [...Array(4)].map((_, i) => (
                <div key={i} className="min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-5 shadow-sm border border-gray-100 snap-start">
                  <div className="w-full aspect-square bg-gray-100 rounded-xl mb-5 animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-100 rounded w-3/4 mb-4 animate-pulse"></div>
                  <div className="h-6 bg-gray-100 rounded w-1/2 animate-pulse"></div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-6 md:hidden flex justify-center">
             <Link href="/pos" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800">
              Lihat Semua Katalog <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Massive CTA Banner */}
      <section className="relative py-32 px-6 bg-[#0a2d66] overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 150%, #ffffff 0%, transparent 50%)' }}></div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% -20%, #facc15 0%, transparent 50%)' }}></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center scroll-anim opacity-0 translate-y-12 transition-all duration-1000">
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8">
            Siap Membangun?
          </h2>
          <p className="text-xl text-blue-100 mb-12 font-medium max-w-2xl mx-auto">
            Jangan buang waktu mengantre. Gunakan platform Self-Order kami dan dapatkan material Anda dalam hitungan menit.
          </p>
          <Link 
            href="/pos" 
            className="group inline-flex items-center justify-center px-12 py-6 text-2xl font-black text-gray-900 bg-[#facc15] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(250,204,21,0.5)]"
          >
            <span className="relative flex items-center gap-4">
              Buka Self-Order Sekarang
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-2 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
            <Image src="/logo.jpeg" alt="IndoBangunan Logo" width={160} height={32} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <p className="text-gray-500 font-medium">© {new Date().getFullYear()} IndoBangunan. Hak Cipta Dilindungi.</p>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 hidden md:block"></div>
            <Link href="/login" className="text-gray-400 hover:text-[#124aa1] font-bold transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>

      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-50px) rotate(10deg); }
          66% { transform: translateY(20px) rotate(-10deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes slideUpFast {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(6px); }
        }
        .animate-slide-up-fast {
          animation: slideUpFast 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-heartbeat {
          animation: heartbeat 2s ease-in-out infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </main>
  )
}
