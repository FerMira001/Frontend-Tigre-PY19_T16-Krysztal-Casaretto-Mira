import { useEffect, useMemo, useState } from 'react'
import LoadStateComponent from '../common/LoadStateComponent'
import SectionCardComponent from '../common/SectionCardComponent'
import LocationStockComponent from './LocationStockComponent'
import RackGridComponent from './RackGridComponent'
import RackLegendComponent from './RackLegendComponent'
import { getErrorMessage } from '../../services/ApiClient'
import { listElementStock } from '../../services/StockLocationService'
import { isRack } from '../../utils/MapUtils'
import { findPosition } from '../../utils/RackUtils'

const PositionHeader = ({ rack, positionId }) => {
  const { level, position } = findPosition(rack, positionId)

  return (
    <dl className="map-position-summary">
      <dt>Posición</dt>
      <dd>{position.label}</dd>
      <dt>Nivel</dt>
      <dd>{level.label}</dd>
      {position.fixedProduct && (
        <>
          <dt>Producto fijo</dt>
          <dd>{position.fixedProduct.sapCode} · {position.fixedProduct.description}</dd>
        </>
      )}
    </dl>
  )
}

// Productos de una posición de la estantería; para una zona de piso, positionId es null
const stockAt = (stock, positionId) => stock.filter((item) => (item.positionId ?? null) === (positionId ?? null))

// CU08: al tocar un elemento del plano se ve su contenido. En una estantería, primero se elige la posición
const ElementStockDetailComponent = ({ warehouseId, element, onClose }) => {
  const [selection, setSelection] = useState(null)
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Cambiarlo vuelve a pedir el stock
  const [reloadKey, setReloadKey] = useState(0)

  // CU08 pasos 2 y 3: el stock de toda la estantería se pide una vez, así tocar otra posición no espera a la red
  useEffect(() => {
    let ignore = false
    listElementStock(warehouseId, element._id)
      .then((list) => {
        if (ignore) return
        setStock(list)
        setError(null)
      })
      .catch((err) => {
        // ER1: no se muestra información parcial como válida
        if (ignore) return
        setStock([])
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [warehouseId, element._id, reloadKey])

  const reload = () => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // RN37: una posición con al menos un producto con stock se pinta como ocupada
  const occupiedIds = useMemo(() => new Set(stock.map((item) => item.positionId).filter(Boolean)), [stock])
  const rack = isRack(element)
  const positionId = selection?.type === 'position' ? selection.id : null

  return (
    <SectionCardComponent title={element.name}>
      {rack ? (
        <>
          <RackGridComponent rack={element} selection={selection} onSelect={setSelection} occupiedIds={occupiedIds} />
          <RackLegendComponent showOccupied />
        </>
      ) : (
        element.description && <p className="twofa-text">{element.description}</p>
      )}
      <LoadStateComponent loading={loading} loadingText="Cargando el contenido..." error={error} onRetry={reload}>
        {!rack && <LocationStockComponent items={stockAt(stock, null)} />}
        {rack && !positionId && <p className="twofa-text map-position-hint">Tocá una posición para ver sus productos.</p>}
        {rack && positionId && (
          <>
            <PositionHeader rack={element} positionId={positionId} />
            <LocationStockComponent key={positionId} items={stockAt(stock, positionId)} />
          </>
        )}
      </LoadStateComponent>
      <button type="button" className="form-secondary map-back" onClick={onClose}>Volver al plano</button>
    </SectionCardComponent>
  )
}

export default ElementStockDetailComponent
