import NavCardComponent from '../common/NavCardComponent'

const WarehouseIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21V9l9-5 9 5v12" />
    <path d="M7 21v-8h10v8M7 17h10" />
  </svg>
)

const UsersIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="4" />
    <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    <path d="M16 4.5a4 4 0 0 1 0 7M18 14.5c2.4.7 4 2.8 4 5.5" />
  </svg>
)

const StructureIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
)

const CycleCountIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="4" width="14" height="18" rx="2" />
    <path d="M9 4V2h6v2" />
    <path d="M8 11l2 2 3-3" />
    <path d="M8 17h8" />
  </svg>
)

const PickingOrderIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V2h6v2" />
    <path d="M9 10h6" />
    <path d="M9 14h6" />
    <path d="M9 18l2 2 4-4" />
  </svg>
)

const CARDS = [
  { path: '/estructura-planta', title: 'Estructura de planta', subtitle: 'Configurar el plano y las estanterías', Icon: StructureIcon },
  { path: '/plantas', title: 'Plantas', subtitle: 'Crear y editar las plantas', Icon: WarehouseIcon },
  { path: '/usuarios', title: 'Usuarios', subtitle: 'Asignar operarios a cada planta', Icon: UsersIcon },
  { path: '/inventarios-ciclicos', title: 'Inventarios cíclicos', subtitle: 'Gestionar los inventarios de stock', Icon: CycleCountIcon },
  { path: '/ordenes-de-picking', title: 'Órdenes de picking', subtitle: 'Gestionar órdenes de picking y reposición', Icon: PickingOrderIcon },
  { path: '/consulta-stock', title: 'Consulta de stock', subtitle: 'Consultar y descargar el stock de productos', Icon: WarehouseIcon },
]

// Tarjetas de la home para el perfil Administrador (CU17)
const AdminNavCardsComponent = () => (
  CARDS.map(({ path, title, subtitle, Icon }) => <NavCardComponent key={path} to={path} title={title} subtitle={subtitle} Icon={Icon} />)
)

export default AdminNavCardsComponent
