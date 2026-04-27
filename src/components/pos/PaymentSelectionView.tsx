import { POSCartItem } from '@/types/pos'
import { useState } from 'react'

export type PaymentMethod = 'cash' | 'qris' | 'transfer'

interface PaymentSelectionViewProps {
  cart: POSCartItem[]
  onBack: () => void
  onNext: (method: PaymentMethod) => void
}

export default function PaymentSelectionView({ cart, onBack, onNext }: PaymentSelectionViewProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="flex-1 flex flex-col bg-[#F3F4F6] min-h-screen overflow-hidden animate-fade-in">
      {/* Header Baru yang Lebih Mewah */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-5">
          <button 
            onClick={onBack}
            className="group p-3 rounded-full bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all duration-300"
            title="Kembali ke Keranjang"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-blue-600 transition-colors">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pilih Cara Bayar</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5">Silakan tentukan metode pembayaran pesanan Anda</p>
          </div>
        </div>
      </header>

      {/* Main Content dengan Layout Grid & Flexbox */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 transition-all duration-500">
            <h3 className="text-xl font-bold text-gray-800 mb-8 text-center tracking-tight">Metode Pembayaran Tersedia</h3>
            
            {/* Grid Tombol Pembayaran */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              
              {/* Opsi Tunai */}
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
                  paymentMethod === 'cash' 
                    ? 'border-green-500 bg-green-50/50 shadow-[0_8px_30px_rgb(34,197,94,0.15)] transform scale-[1.02] ring-4 ring-green-500/10' 
                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30 hover:shadow-md'
                }`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">💵</div>
                <div className="text-center">
                  <span className={`block font-bold text-xl mb-1 ${paymentMethod === 'cash' ? 'text-green-800' : 'text-gray-800'}`}>
                    Tunai
                  </span>
                  <span className={`block text-sm font-medium ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-500'}`}>
                    Bayar di Kasir
                  </span>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm animate-bounce-in">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </button>

              {/* Opsi QRIS */}
              <button
                onClick={() => setPaymentMethod('qris')}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
                  paymentMethod === 'qris' 
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-[0_8px_30px_rgb(99,102,241,0.15)] transform scale-[1.02] ring-4 ring-indigo-500/10' 
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md'
                }`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">📱</div>
                <div className="text-center">
                  <span className={`block font-bold text-xl mb-1 ${paymentMethod === 'qris' ? 'text-indigo-800' : 'text-gray-800'}`}>
                    QRIS
                  </span>
                  <span className={`block text-sm font-medium ${paymentMethod === 'qris' ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Scan Barcode Digital
                  </span>
                </div>
                {paymentMethod === 'qris' && (
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-sm animate-bounce-in">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </button>

              {/* Opsi Transfer */}
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
                  paymentMethod === 'transfer' 
                    ? 'border-sky-500 bg-sky-50/50 shadow-[0_8px_30px_rgb(14,165,233,0.15)] transform scale-[1.02] ring-4 ring-sky-500/10' 
                    : 'border-gray-200 bg-white hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-md'
                }`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏦</div>
                <div className="text-center">
                  <span className={`block font-bold text-xl mb-1 ${paymentMethod === 'transfer' ? 'text-sky-800' : 'text-gray-800'}`}>
                    Transfer Bank
                  </span>
                  <span className={`block text-sm font-medium ${paymentMethod === 'transfer' ? 'text-sky-600' : 'text-gray-500'}`}>
                    Virtual Account / VA
                  </span>
                </div>
                {paymentMethod === 'transfer' && (
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-sm animate-bounce-in">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </button>

            </div>

            {/* Panel Total & Aksi */}
            <div className="flex flex-col md:flex-row justify-between items-center py-6 px-8 bg-gray-50 border border-gray-200 rounded-2xl gap-6">
              <div className="flex flex-col text-center md:text-left">
                <span className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Total Tagihan ({cart.length} item)</span>
                <span className="text-3xl font-black text-gray-900 tracking-tight">{formatRupiah(totalAmount)}</span>
              </div>
              
              <button 
                onClick={() => onNext(paymentMethod)}
                className="w-full md:w-auto bg-[#124aa1] hover:bg-[#0e3d87] text-white font-bold py-5 px-10 rounded-xl shadow-[0_8px_20px_rgb(18,74,161,0.3)] hover:shadow-[0_12px_25px_rgb(18,74,161,0.4)] transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
              >
                <span className="text-lg">Lanjut ke Konfirmasi</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
