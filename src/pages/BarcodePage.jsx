import { useState } from 'react'
import SectionCardComponent from '../components/common/SectionCardComponent'
import AppLayout from '../components/layout/AppLayout'
import BarcodeProductCardComponent from '../components/barcodes/BarcodeProductCardComponent'
import ProductSearchFormComponent from '../components/products/ProductSearchFormComponent'
import ProductSearchResultsComponent from '../components/products/ProductSearchResultsComponent'
import { useProductSearch } from '../hooks/useProductSearch'
import { isValidBarcode } from '../utils/BarcodeUtils'

const noResultsMessage = (text) => (
  isValidBarcode(text)
    ? `El código de barras ${text} no tiene correspondencia registrada. Buscá el producto por código SAP o descripción.`
    : `No hay productos que coincidan con "${text}".`
)

const BarcodePage = () => {
  const { text, setText, searching, results, search, replaceProduct } = useProductSearch()
  const [selected, setSelected] = useState(null)

  const handleSearch = async () => {
    const found = await search()
    // Si se leyó un código de barras y hay un solo producto, se abre directo
    if (found?.products.length === 1 && found.products[0].barcode === found.text) setSelected(found.products[0])
  }

  if (selected) {
    return (
      <AppLayout title="Códigos de barras" back>
        <BarcodeProductCardComponent product={selected} onAssigned={replaceProduct} onClose={() => setSelected(null)} />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Códigos de barras" back>
      <SectionCardComponent title="Buscá el producto">
        <p className="twofa-text">Por código SAP o descripción. También podés leer el código de barras de la caja para ver a qué producto corresponde.</p>
        <ProductSearchFormComponent value={text} onChange={setText} searching={searching} onSubmit={handleSearch} />
      </SectionCardComponent>

      {results?.products.length === 0 && (
        <p className="home-alert catalog-error" role="alert">{noResultsMessage(results.text)}</p>
      )}

      {results?.products.length > 0 && (
        <ProductSearchResultsComponent products={results.products} total={results.total} onSelect={setSelected} />
      )}
    </AppLayout>
  )
}

export default BarcodePage
