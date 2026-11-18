import { useEffect, useId, useState } from 'react'
import AppLayout from '../components/layout/AppLayout'
import EmptyStateComponent from '../components/common/EmptyStateComponent'
import LoadStateComponent from '../components/common/LoadStateComponent'
import SectionCardComponent from '../components/common/SectionCardComponent'
import UserListComponent from '../components/users/UserListComponent'
import UserWarehousesEditorComponent from '../components/users/UserWarehousesEditorComponent'
import { useWarehouses } from '../hooks/useWarehouses'
import { getErrorMessage } from '../services/ApiClient'
import { listUsers } from '../services/UserService'

const LIMIT = 20

const UsersPage = () => {
  const idSearch = useId()
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Cambiarlo vuelve a pedir la lista
  const [reloadKey, setReloadKey] = useState(0)
  const { warehouses } = useWarehouses()

  useEffect(() => {
    let ignore = false
    listUsers({ search, limit: LIMIT })
      .then(({ data, pagination }) => {
        if (ignore) return
        setUsers(data)
        setTotal(pagination.total)
        setError(null)
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [search, reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  const handleSearch = (event) => {
    event.preventDefault()
    setSearch(text.trim())
  }

  const handleSaved = () => {
    setEditing(null)
    reload()
  }

  if (editing) {
    return (
      <AppLayout title="Usuarios" back>
        <SectionCardComponent title={`Plantas de ${editing.nombreUsuario}`}>
          <UserWarehousesEditorComponent
            user={editing}
            warehouses={warehouses}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </SectionCardComponent>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Usuarios" back>
      <SectionCardComponent title="Buscá un usuario">
        <form className="auth-form" onSubmit={handleSearch}>
          <div className="form-field">
            <label htmlFor={idSearch}>Nombre de usuario o email</label>
            <input id={idSearch} type="search" value={text} onChange={(event) => setText(event.target.value)} autoComplete="off" enterKeyHint="search" maxLength={100} />
          </div>
          <input className="form-submit" type="submit" value="Buscar" />
        </form>
      </SectionCardComponent>

      <SectionCardComponent title="Usuarios">
        <LoadStateComponent loading={loading} loadingText="Cargando usuarios..." error={error} onRetry={reload}>
          {users.length === 0 && <EmptyStateComponent message="No hay usuarios que coincidan con la búsqueda." />}
          {users.length > 0 && (
            <>
              {total > users.length && <p className="twofa-text">Se muestran {users.length} de {total}. Afiná la búsqueda para encontrarlo más rápido.</p>}
              <UserListComponent users={users} onEdit={setEditing} />
            </>
          )}
        </LoadStateComponent>
      </SectionCardComponent>
    </AppLayout>
  )
}

export default UsersPage
