export const CedulaOCR = ({ onClose }: { onClose: () => void }) => (
  <div className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center'>
    <div className='bg-white p-6 rounded-xl'>
      <h2 className='text-xl font-bold mb-4'>Scanner Forense</h2>
      <p className='mb-4'>Módulo OCR en proceso de migración...</p>
      <button
        onClick={onClose}
        className='bg-red-500 text-white px-4 py-2 rounded'
      >
        Cerrar Simulador
      </button>
    </div>
  </div>
);
