
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import AppLayout from "../components/layout/AppLayout";
import SectionCardComponent from "../components/common/SectionCardComponent";
import LoaderPata from "../components/common/LoaderPata";
import {
    getWarehouseStockSummary,
    getProductStockSummary
} from "../services/StockLocationService";
import "../styles/StockConsult.css";
import writeExcelFile from "write-excel-file/browser";

// CU09: consulta de stock para el administrador
const StockConsultPage = () => {

    const warehouse = useSelector((state) => state.warehouse.selected);
    const warehouseId = warehouse?._id;

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [selectedProductId, setSelectedProductId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // Cargar el resumen general de stock de la planta
    useEffect(() => {
        if (!warehouseId) return;

        let active = true;

        const loadStock = async () => {
            setLoading(true);
            setError("");
            setProducts([]);
            setSelectedProductId(null);
            setDetail(null);

            try {
                const data = await getWarehouseStockSummary(warehouseId);

                if (active) {
                    setProducts(data.products);
                }
            } catch (error) {
                if (active) {
                    setError("No se pudo cargar el resumen de stock.");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadStock();

        return () => {
            active = false;
        };
    }, [warehouseId]);

    // Consultar las ubicaciones y el último movimiento de un producto
    useEffect(() => {
        if (!warehouseId || !selectedProductId) return;

        let active = true;

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");
            setDetail(null);

            try {
                const data = await getProductStockSummary(
                    warehouseId,
                    selectedProductId
                );

                if (active) setDetail(data);
            } catch (error) {
                if (active) {
                    setDetailError("No se pudo cargar el detalle del producto.");
                }
            } finally {
                if (active) setDetailLoading(false);
            }
        };

        loadDetail();

        return () => {
            active = false;
        };
    }, [warehouseId, selectedProductId]);

    // Filtrar el resumen por código SAP o descripción
    const filteredProducts = products.filter((product) =>
        `${product.sapCode} ${product.description}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    // CU09: descargar el resumen general en Excel
    const downloadSummary = async () => {

        const rows = [
            ["Código SAP", "Producto", "Stock total"],
            ...products.map((product) => [
                String(product.sapCode ?? ""),
                String(product.description ?? ""),
                Number(product.totalQuantity ?? 0)
            ])
        ];

        try {
            await writeExcelFile(rows).toFile("resumen-stock.xlsx");
        } catch (error) {
            console.error("Error al descargar Excel:", error);
            alert("No se pudo descargar el Excel.");
        }
    };

    return (
        <AppLayout title="Consulta de stock" back>

            <p className="stock-intro">
                Planta: <strong>{warehouse?.name}</strong>
            </p>

            {/* Mostrar resumen o detalle según el producto seleccionado */}
            {!selectedProductId ? (

                // Resumen general de stock
                <SectionCardComponent title="Resumen general de stock">

                    <p className="stock-description">
                        Cantidad total de cada producto en la planta,
                        sin detallar las ubicaciones.
                    </p>

                    {loading && <LoaderPata texto="Cargando stock..." />}

                    {error && <p className="stock-error">{error}</p>}

                    {!loading && !error && (
                        <>
                            <p className="stock-count">
                                Productos con stock: <strong>{products.length}</strong>
                            </p>

                            <input
                                type="search"
                                className="stock-search"
                                placeholder="Buscar por código SAP o producto"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />

                            <div className="stock-table-wrapper">
                                <table className="stock-table">
                                    <thead>
                                        <tr>
                                            <th>Código SAP</th>
                                            <th>Producto</th>
                                            <th>Stock total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product) => (
                                            <tr
                                                key={product.productId}
                                                onClick={() => {
                                                    setSelectedProductId(product.productId);
                                                    window.scrollTo(0, 0);
                                                }}
                                                className="stock-clickable"
                                            >
                                                <td>{product.sapCode}</td>
                                                <td>{product.description}</td>
                                                <td>{product.totalQuantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredProducts.length === 0 && (
                                <p className="stock-description">
                                    No se encontraron productos.
                                </p>
                            )}

                            <p className="stock-description">
                                Seleccioná un producto para ver sus ubicaciones.
                            </p>

                            <button
                                type="button"
                                className="form-submit"
                                onClick={downloadSummary}
                                disabled={products.length === 0}
                            >
                                Descargar resumen en Excel
                            </button>
                        </>
                    )}

                </SectionCardComponent>

            ) : (

                // Detalle del producto seleccionado
                <SectionCardComponent title="Detalle del producto">

                    {/* Volver al resumen general */}
                    <button
                        type="button"
                        className="form-submit"
                        onClick={() => {
                            setSelectedProductId(null);
                            setDetail(null);
                        }}
                    >
                        ← Volver al resumen
                    </button>

                    {detailLoading && (
                        <LoaderPata texto="Cargando detalle..." />
                    )}

                    {detailError && (
                        <p className="stock-error">{detailError}</p>
                    )}

                    {detail && !detailLoading && (
                        <>
                            <h3>{detail.product.description}</h3>

                            <p>
                                <strong>Código SAP:</strong>{" "}
                                {detail.product.sapCode}
                            </p>

                            <p>
                                <strong>Stock total:</strong>{" "}
                                {detail.totalQuantity}
                            </p>

                            <h3>Ubicaciones</h3>

                            {detail.locations.length === 0 ? (
                                <p>Sin stock disponible.</p>
                            ) : (
                                <ul className="stock-locations">
                                    {detail.locations.map((location) => (
                                        <li key={location.stockLocationId}>
                                            <span>{location.location}</span>
                                            <strong>{location.quantity}</strong>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <h3>Último movimiento</h3>

                            {detail.lastMovement ? (
                                <div className="stock-movement">
                                    <p>
                                        <strong>Usuario:</strong>{" "}
                                        {detail.lastMovement.user ?? "Sin dato"}
                                    </p>
                                    <p>
                                        <strong>Fecha:</strong>{" "}
                                        {new Date(
                                            detail.lastMovement.date
                                        ).toLocaleString("es-UY")}
                                    </p>
                                    <p>
                                        <strong>Tipo:</strong>{" "}
                                        {detail.lastMovement.type === "add"
                                            ? "Ingreso"
                                            : "Retiro"}
                                    </p>
                                    <p>
                                        <strong>Cantidad:</strong>{" "}
                                        {detail.lastMovement.quantity}
                                    </p>
                                </div>
                            ) : (
                                <p>No hay movimientos registrados.</p>
                            )}
                        </>
                    )}

                </SectionCardComponent>
            )}

        </AppLayout>
    );
};

export default StockConsultPage;
