import EmptyStateComponent from './EmptyStateComponent'
import LoaderPata from './LoaderPata'

// Loader mientras carga, el error con "Reintentar" si falló, y el contenido cuando está listo
const LoadStateComponent = ({ loading, loadingText, error, onRetry, retryClassName = 'form-secondary', children }) => {
  if (loading) return <LoaderPata texto={loadingText} />
  if (error) {
    return (
      <EmptyStateComponent message={error}>
        {onRetry && <button type="button" className={retryClassName} onClick={onRetry}>Reintentar</button>}
      </EmptyStateComponent>
    )
  }
  return children
}

export default LoadStateComponent
