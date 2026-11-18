// Lista de plantas para elegir. Con `multiple`, varias (checkbox, `value` es un array de ids): alta de usuario y
// editor de plantas de un operario. Sin `multiple`, una sola (radio, `value` es un id): selección de planta (mockup P09)
const WarehouseOptionsComponent = ({ warehouses, value, onChange, multiple = false, legend = 'Plantas', hideLegend = false }) => {
  const isChecked = (id) => (multiple ? value.includes(id) : value === id)

  const toggle = (id) => {
    if (!multiple) return onChange(id)
    onChange(value.includes(id) ? value.filter((current) => current !== id) : [...value, id])
  }

  return (
    <fieldset className="warehouse-options">
      <legend className={hideLegend ? 'visually-hidden' : 'warehouse-options-legend'}>{legend}</legend>
      {warehouses.map((warehouse) => (
        <label key={warehouse._id} className="warehouse-option">
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={multiple ? undefined : 'warehouse'}
            checked={isChecked(warehouse._id)}
            onChange={() => toggle(warehouse._id)}
          />
          <span className="warehouse-option-text">
            <span className="warehouse-option-name">{warehouse.name}</span>
            <span className="warehouse-option-address">{warehouse.address}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export default WarehouseOptionsComponent
