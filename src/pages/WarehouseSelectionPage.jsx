import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import EmptyStateComponent from '../components/common/EmptyStateComponent'
import LoadStateComponent from '../components/common/LoadStateComponent'
import SectionCardComponent from '../components/common/SectionCardComponent'
import WarehouseOptionsComponent from '../components/warehouses/WarehouseOptionsComponent'
import { useWarehouses } from '../hooks/useWarehouses'
import { selectWarehouse } from '../slices/WarehouseSlice'

const WarehouseSelectionPage = () => {
  const { warehouses, loading, error, reload } = useWarehouses()
  const selected = useSelector((state) => state.warehouse.selected)
  const rol = useSelector((state) => state.usuario.rol)
  const [chosenId, setChosenId] = useState(selected?._id ?? null)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const enter = (warehouse) => {
    dispatch(selectWarehouse(warehouse))
    navigate('/home', { replace: true })
  }

  // Con una sola planta no hay nada que elegir
  useEffect(() => {
    if (warehouses.length !== 1) return
    dispatch(selectWarehouse(warehouses[0]))
    navigate('/home', { replace: true })
  }, [warehouses, dispatch, navigate])

  const chosen = warehouses.find((warehouse) => warehouse._id === chosenId)

  return (
    <AppLayout title="Elegí la planta" back={Boolean(selected)}>
      <LoadStateComponent loading={loading} loadingText="Cargando plantas..." error={error} onRetry={reload} retryClassName="form-submit">
        {warehouses.length === 0 && (
          rol === 'Administrador' ? (
            <EmptyStateComponent message="Todavía no hay plantas registradas.">
              <Link className="form-submit warehouse-link" to="/plantas">Crear la primera planta</Link>
            </EmptyStateComponent>
          ) : (
            <EmptyStateComponent message="No tenés plantas asignadas. Pedile a un administrador que te asigne una." />
          )
        )}

        {warehouses.length > 1 && (
          <SectionCardComponent title="Sobre la que vas a trabajar">
            <WarehouseOptionsComponent warehouses={warehouses} value={chosenId} onChange={setChosenId} legend="Plantas disponibles" hideLegend />
            <button type="button" className="form-submit" disabled={!chosen} onClick={() => enter(chosen)}>Continuar</button>
          </SectionCardComponent>
        )}
      </LoadStateComponent>
    </AppLayout>
  )
}

export default WarehouseSelectionPage
