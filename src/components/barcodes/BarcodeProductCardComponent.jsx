import { useState } from 'react'
import { toast } from 'react-toastify'
import SectionCardComponent from '../common/SectionCardComponent'
import ProductDetailsComponent from '../products/ProductDetailsComponent'
import BarcodeConfirmComponent from './BarcodeConfirmComponent'
import BarcodeFormComponent from './BarcodeFormComponent'
import { assignBarcode } from '../../services/ProductService'

const BarcodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14" />
  </svg>
)

// CU19 con el producto elegido: ver, ingresar el código ('entry') o confirmar ('confirmation')
const BarcodeProductCardComponent = ({ product: initialProduct, onAssigned, onClose }) => {
  const [product, setProduct] = useState(initialProduct)
  const [step, setStep] = useState('product')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  const requestConfirmation = (value) => {
    setCode(value)
    setStep('confirmation')
  }

  const cancel = () => {
    setStep('product')
    setCode('')
    toast.info('Operación cancelada. No se registraron cambios.')
  }

  const confirmBarcode = async () => {
    setSaving(true)
    try {
      const updated = await assignBarcode(product._id, code)
      setProduct(updated)
      setStep('product')
      setCode('')
      onAssigned(updated)
      toast.success('Código de barras asociado correctamente.')
    } catch (err) {
      // E1 o formato inválido: se vuelve a pedir el código
      setStep('entry')
      toast.error(err.response?.data?.message ?? 'No fue posible registrar la asociación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCardComponent title={product.sapCode}>
      <ProductDetailsComponent product={product} />

      {step === 'product' && (
        <div className="barcode-actions">
          <button type="button" className="form-submit barcode-button" onClick={() => setStep('entry')}>
            <BarcodeIcon />
            {product.barcode ? 'Reemplazar código de barras' : 'Asociar código de barras'}
          </button>
          <button type="button" className="form-secondary" onClick={onClose}>Elegir otro producto</button>
        </div>
      )}

      {step === 'entry' && (
        <BarcodeFormComponent product={product} initialCode={code} onContinue={requestConfirmation} onCancel={cancel} />
      )}

      {step === 'confirmation' && (
        <BarcodeConfirmComponent product={product} code={code} saving={saving} onConfirm={confirmBarcode} onCancel={cancel} />
      )}
    </SectionCardComponent>
  )
}

export default BarcodeProductCardComponent
