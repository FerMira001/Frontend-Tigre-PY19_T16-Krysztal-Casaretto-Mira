import { useId, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AppLayout from '../components/layout/AppLayout'
import EmptyStateComponent from '../components/common/EmptyStateComponent'
import LoadStateComponent from '../components/common/LoadStateComponent'
import SectionCardComponent from '../components/common/SectionCardComponent'
import EditorSaveBarComponent from '../components/map/EditorSaveBarComponent'
import RackGridComponent from '../components/map/RackGridComponent'
import RackLegendComponent from '../components/map/RackLegendComponent'
import RackSelectionPanelComponent from '../components/map/RackSelectionPanelComponent'
import UnsavedChangesModalComponent from '../components/map/UnsavedChangesModalComponent'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { useWarehouseMap } from '../hooks/useWarehouseMap'
import { getErrorMessage } from '../services/ApiClient'
import { updateElement } from '../services/WarehouseElementService'
import { toRackPayload } from '../utils/RackUtils'
import '../styles/WarehouseMap.css'

// CU15 A1: la estantería se edita en borrador y se guarda todo junto
const RackEditorPage = () => {
  const { elementId } = useParams()
  const warehouseId = useSelector((state) => state.warehouse.selected?._id)
  const { elements, setElements, loading, error, reload } = useWarehouseMap(warehouseId)
  const [draft, setDraft] = useState(null)
  const [selection, setSelection] = useState(null)
  const [saving, setSaving] = useState(false)
  const guard = useUnsavedChangesGuard(draft !== null)
  const idName = useId()

  const rack = draft ?? elements.find(({ _id }) => _id === elementId) ?? null

  const applyChange = (change) => setDraft(change(rack))

  const discard = () => {
    setDraft(null)
    setSelection(null)
  }

  const saveRack = async () => {
    setSaving(true)
    try {
      const updated = await updateElement(warehouseId, elementId, toRackPayload(draft))
      setElements((current) => current.map((element) => (element._id === elementId ? updated : element)))
      setDraft(null)
      toast.success('Estantería guardada.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Editar estantería" back confirmLogout={guard.confirmLogout}>
      <div className="map-page">
        <Link className="form-secondary" to="/estructura-planta">Volver al plano</Link>
        <LoadStateComponent loading={loading} loadingText="Cargando la estantería..." error={error} onRetry={reload}>
          {!rack && <EmptyStateComponent message="Esta estantería ya no existe." />}
          {rack && (
            <div className="editor-layout">
              <div className="editor-layout-main">
                <SectionCardComponent title={rack.name || 'Estantería'}>
                  <div className="form-field">
                    <label htmlFor={idName}>Nombre de la estantería</label>
                    <input id={idName} type="text" maxLength={60} autoComplete="off" value={rack.name} onChange={(event) => applyChange((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <RackGridComponent rack={rack} selection={selection} onSelect={setSelection} editable />
                  <RackLegendComponent />
                </SectionCardComponent>
                {draft && <EditorSaveBarComponent saving={saving} onSave={saveRack} onDiscard={discard} />}
              </div>
              <div className="editor-layout-side">
                <SectionCardComponent title="Elemento elegido">
                  <RackSelectionPanelComponent rack={rack} selection={selection} onChange={applyChange} onClear={() => setSelection(null)} />
                </SectionCardComponent>
              </div>
            </div>
          )}
        </LoadStateComponent>
      </div>
      {guard.asking && <UnsavedChangesModalComponent onStay={guard.stay} onLeave={guard.leave} />}
    </AppLayout>
  )
}

export default RackEditorPage
