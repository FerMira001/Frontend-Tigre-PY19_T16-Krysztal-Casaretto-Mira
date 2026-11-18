import NavCardComponent from '../common/NavCardComponent'

const MapIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
)

// Tarjeta de la home para todos los perfiles (CU03)
const MapNavCardComponent = () => (
  <NavCardComponent to="/mapa" title="Mapa" subtitle="Ver el plano de la planta y sus estanterías" Icon={MapIcon} />
)

export default MapNavCardComponent
