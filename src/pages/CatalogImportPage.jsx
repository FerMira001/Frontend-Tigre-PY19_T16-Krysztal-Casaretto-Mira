import { useState } from 'react'
import { toast } from 'react-toastify'
import LoaderPata from '../components/common/LoaderPata'
import SectionCardComponent from '../components/common/SectionCardComponent'
import AppLayout from '../components/layout/AppLayout'
import CatalogFileFieldComponent from '../components/catalog/CatalogFileFieldComponent'
import CatalogImportErrorComponent from '../components/catalog/CatalogImportErrorComponent'
import CatalogImportResultComponent from '../components/catalog/CatalogImportResultComponent'
import CatalogTemplateCardComponent from '../components/catalog/CatalogTemplateCardComponent'
import { importCatalog } from '../services/CatalogImportService'
import { hasCatalogExtension } from '../utils/CatalogUtils'

// CU06: archivo elegido, importación en curso y su resultado o error
const CatalogImportPage = () => {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  // Cambiar la clave vacía el input, para poder volver a elegir el mismo archivo
  const [inputKey, setInputKey] = useState(0)

  const resetInput = () => setInputKey((key) => key + 1)

  const selectFile = (selected) => {
    if (!selected) return
    if (!hasCatalogExtension(selected.name)) {
      toast.error('Formato no admitido. Usá un Excel (.xlsx) o un CSV (.csv).')
      resetInput()
      return
    }
    setFile(selected)
    setResult(null)
    setError(null)
  }

  const submitImport = async (event) => {
    event.preventDefault()
    setImporting(true)
    setResult(null)
    setError(null)

    try {
      const summary = await importCatalog(file)
      setResult(summary)
      setFile(null)
      resetInput()
      toast.success(`Catálogo importado: ${summary.importedRows} nuevos y ${summary.updatedRows} actualizados.`)
    } catch (err) {
      const message = err.response?.data?.message ?? 'No se pudo importar el catálogo.'
      setError({ message, details: err.response?.data?.details ?? [] })
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <AppLayout title="Importar catálogo" back>
      <CatalogTemplateCardComponent />

      <SectionCardComponent title="2. Subí el archivo">
        <p className="twofa-text">Los productos nuevos se dan de alta y los existentes se actualizan por su código SAP. El stock y las ubicaciones no cambian.</p>

        <form className="auth-form" onSubmit={submitImport}>
          <CatalogFileFieldComponent file={file} inputKey={inputKey} disabled={importing} onSelect={selectFile} />
          {importing ? (
            <LoaderPata texto="Importando catálogo..." />
          ) : (
            <button type="submit" className="form-submit" disabled={!file}>Importar</button>
          )}
        </form>
      </SectionCardComponent>

      {error && <CatalogImportErrorComponent error={error} />}
      {result && <CatalogImportResultComponent result={result} />}
    </AppLayout>
  )
}

export default CatalogImportPage
