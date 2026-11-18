import SectionCardComponent from '../common/SectionCardComponent'

const Stat = ({ value, label, variant }) => (
  <div className={variant ? `catalog-stat catalog-stat--${variant}` : 'catalog-stat'}>
    <span className="catalog-stat-value">{value}</span>
    <span className="catalog-stat-label">{label}</span>
  </div>
)

// Resumen de la importación: filas nuevas, actualizadas y rechazadas, y los códigos de barras asociados
const CatalogImportResultComponent = ({ result }) => (
  <SectionCardComponent title="Resultado" aria-live="polite">
    <p className="twofa-text">{result.fileName}</p>
    <div className="catalog-summary">
      <Stat value={result.importedRows} label="Nuevos" variant="ok" />
      <Stat value={result.updatedRows} label="Actualizados" />
      <Stat value={result.rejectedRows} label="Rechazados" variant={result.rejectedRows > 0 ? 'rejected' : undefined} />
    </div>
    {result.assignedBarcodes > 0 && (
      <p className="catalog-barcodes">
        {result.assignedBarcodes === 1
          ? 'Se asoció 1 código de barras.'
          : `Se asociaron ${result.assignedBarcodes} códigos de barras.`}
      </p>
    )}
    {result.rejections.length > 0 && (
      <>
        <h3 className="catalog-rejections-title">Filas rechazadas</h3>
        <p className="twofa-text">Corregilas en el archivo y volvé a importarlo: las filas válidas no se duplican.</p>
        <ul className="catalog-rejections">
          {result.rejections.map((rejection) => (
            <li key={rejection.row}>
              <span className="catalog-rejection-row">Fila {rejection.row}</span>
              <span>{rejection.reason}</span>
            </li>
          ))}
        </ul>
      </>
    )}
  </SectionCardComponent>
)

export default CatalogImportResultComponent
