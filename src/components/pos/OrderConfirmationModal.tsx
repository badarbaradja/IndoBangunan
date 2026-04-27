import { POSCartItem } from '@/types/pos'
import { PaymentMethod } from './PaymentSelectionView'

interface OrderConfirmationModalProps {
  cart: POSCartItem[]
  paymentMethod: PaymentMethod
  onClose: () => void
  onConfirm: () => Promise<void>
  isProcessing: boolean
  errorMsg: string
}

export default function OrderConfirmationModal({ 
  cart, 
  paymentMethod, 
  onClose, 
  onConfirm,
  isProcessing,
  errorMsg
}: OrderConfirmationModalProps) {
  
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  // Explicit literal styling for each method
  const methodConfig = {
    cash: { icon: '💵', label: 'Tunai', sub: 'Bayar di Kasir', bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800' },
    qris: { icon: '📱', label: 'QRIS', sub: 'Scan Barcode Digital', bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-800' },
    transfer: { icon: '🏦', label: 'Transfer Bank', sub: 'Virtual Account / VA', bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-800' },
  }
  const selectedConfig = methodConfig[paymentMethod]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in border border-white/20">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50/80">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Konfirmasi Pesanan</h2>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mx-8 mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm font-medium flex items-start gap-3 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-8 overflow-y-auto">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Ringkasan Item</h3>
          
          <div className="space-y-4 mb-8">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center py-2 border-b border-dashed border-gray-200 last:border-0">
                <div className="flex items-start gap-4">
                  <span className="font-bold text-[#124aa1] bg-blue-50 px-3 py-1 rounded-md text-sm">{item.qty}×</span>
                  <span className="text-gray-800 font-semibold">{item.product.name}</span>
                </div>
                <span className="font-bold text-gray-900">{formatRupiah(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center py-5 border-y border-gray-200 mb-8 bg-gray-50/50 px-4 rounded-xl">
            <span className="font-bold text-gray-700">Total Pembayaran</span>
            <span className="text-2xl font-black text-[#124aa1]">{formatRupiah(totalAmount)}</span>
          </div>

          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Metode Pembayaran</h3>
          <div className={`flex items-center gap-5 p-5 rounded-2xl border ${selectedConfig.border} ${selectedConfig.bg} shadow-sm`}>
            <span className="text-4xl bg-white p-2 rounded-xl shadow-sm">{selectedConfig.icon}</span>
            <div>
              <div className={`font-bold text-lg ${selectedConfig.text}`}>{selectedConfig.label}</div>
              <div className="text-sm font-medium text-gray-600 mt-0.5">{selectedConfig.sub}</div>
            </div>
          </div>

          {/* Contextual Info */}
          <div className="mt-8 p-5 bg-yellow-50 border border-yellow-200 rounded-2xl flex gap-4">
            <div className="text-yellow-600 text-2xl">💡</div>
            <div className="text-sm text-yellow-800 font-medium leading-relaxed">
              {paymentMethod === 'cash' ? (
                <>Setelah menekan tombol <strong>"Konfirmasi & Cetak Struk"</strong>, Anda akan mendapatkan nomor pesanan. Silakan bawa struk ke kasir untuk melakukan pembayaran tunai.</>
              ) : (
                <>Setelah menekan tombol <strong>"Lanjut ke Pembayaran Digital"</strong>, Anda akan diarahkan langsung ke halaman pembayaran aman. Selesaikan transaksi Anda di sana.</>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 border-t border-gray-200 flex gap-4">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 hover:border-gray-400 transition-all disabled:opacity-50 text-lg"
          >
            Kembali
          </button>
          <button 
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-[2] px-6 py-4 rounded-xl bg-[#124aa1] text-white font-bold hover:bg-[#0e3d87] shadow-[0_8px_20px_rgb(18,74,161,0.3)] hover:shadow-[0_12px_25px_rgb(18,74,161,0.4)] transition-all disabled:opacity-70 flex items-center justify-center gap-3 text-lg transform hover:-translate-y-1 active:translate-y-0"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Memproses Pesanan...
              </>
            ) : paymentMethod === 'cash' ? (
              'Konfirmasi & Cetak Struk'
            ) : (
              'Lanjut Pembayaran Digital'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
