import { useNavigate } from 'react-router-dom'

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

// Tarjeta de la home que lleva a una pantalla
const NavCardComponent = ({ to, title, subtitle, Icon }) => {
  const navigate = useNavigate()

  return (
    <button type="button" className="home-card" onClick={() => navigate(to)}>
      <span className="home-card-icon"><Icon /></span>
      <span className="home-card-text">
        <span className="home-card-title">{title}</span>
        <span className="home-card-sub">{subtitle}</span>
      </span>
      <span className="home-card-arrow"><ArrowIcon /></span>
    </button>
  )
}

export default NavCardComponent
