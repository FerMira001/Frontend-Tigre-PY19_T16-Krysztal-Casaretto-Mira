
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import AppLayout from "../components/layout/AppLayout";
import SectionCardComponent from "../components/common/SectionCardComponent";
import LoadStateComponent from "../components/common/LoadStateComponent";

import CreatePickingOrderFormComponent from "../components/pickingOrders/CreatePickingOrderFormComponent";

import { getErrorMessage } from "../services/ApiClient";

import {
    getPickingOrders,
    getPickingOrderDetail
} from "../services/PickingOrderService";

import "../styles/PickingOrders.css";

const STATUS_LABELS = {
    pending: "Pendiente",
    in_progress: "En proceso",
    completed: "Finalizada"
};

const TYPE_LABELS = {
    picking: "Picking",
    replenishment: "Reposición"
};

// Mostrar las fechas en formato DD/MM/AAAA
const formatDate = (value, delivery = false) => {
    if (!value) return "Sin fecha";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Fecha no válida";
    }

    return new Intl.DateTimeFormat("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(delivery ? { timeZone: "UTC" } : {})
    }).format(date);
};

// Orden predeterminado por entrega y luego por antigüedad
const compareDates = (a, b) => {
    const dateA = a.deliveryDate
        ? new Date(a.deliveryDate).getTime()
        : Infinity;

    const dateB = b.deliveryDate
        ? new Date(b.deliveryDate).getTime()
        : Infinity;

    if (dateA !== dateB) {
        return dateA - dateB;
    }

    return new Date(a.createdAt).getTime()
        - new Date(b.createdAt).getTime();
};

const normalizeText = (text) => String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const PickingOrdersPage = () => {
    const selectedWarehouse = useSelector(
        (state) => state.warehouse.selected
    );

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refresh, setRefresh] = useState(0);

    // null = listado, manual = creación manual, excel = importación
    const [mode, setMode] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("delivery");

    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailError, setDetailError] = useState("");
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRetry, setDetailRetry] = useState(0);

    // Obtener todas las órdenes del backend
    useEffect(() => {
        let active = true;

        const loadOrders = async () => {
            setLoading(true);
            setError("");

            try {
                const data = await getPickingOrders();

                if (active) {
                    setOrders(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (active) {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadOrders();

        return () => {
            active = false;
        };
    }, [refresh]);

    // Obtener detalle de una orden
    useEffect(() => {
        if (!selectedOrderId) return;

        let active = true;

        const loadDetail = async () => {
            setDetail(null);
            setDetailError("");
            setDetailLoading(true);

            try {
                const data = await getPickingOrderDetail(
                    selectedOrderId
                );

                if (active) {
                    setDetail(data);
                }
            } catch (err) {
                if (active) {
                    setDetailError(getErrorMessage(err));
                }
            } finally {
                if (active) {
                    setDetailLoading(false);
                }
            }
        };

        loadDetail();

        return () => {
            active = false;
        };
    }, [selectedOrderId, detailRetry]);

    // Mostrar únicamente órdenes de la planta seleccionada
    const warehouseOrders = useMemo(() => {
        if (!selectedWarehouse?._id) return [];

        return orders.filter((order) =>
            String(order.warehouse?._id || order.warehouse) ===
            String(selectedWarehouse._id)
        );
    }, [orders, selectedWarehouse]);

    // Indicadores superiores
    const summary = useMemo(() => ({
        total: warehouseOrders.length,

        pending: warehouseOrders.filter(
            (order) => order.status === "pending"
        ).length,

        inProgress: warehouseOrders.filter(
            (order) => order.status === "in_progress"
        ).length,

        completed: warehouseOrders.filter(
            (order) => order.status === "completed"
        ).length
    }), [warehouseOrders]);

    // Búsqueda, filtros y ordenamiento
    const visibleOrders = useMemo(() => {
        const query = normalizeText(search.trim());

        const filtered = warehouseOrders.filter((order) => {
            if (
                statusFilter !== "all" &&
                order.status !== statusFilter
            ) {
                return false;
            }

            if (
                typeFilter !== "all" &&
                order.operationType !== typeFilter
            ) {
                return false;
            }

            if (!query) return true;

            const fields = [
                order.orderCode,
                order.sapReference,
                order.customerName,
                order.warehouse?.name,
                ...(order.items || []).flatMap((item) => [
                    item.product?.description,
                    item.product?.sapCode
                ])
            ];

            return normalizeText(
                fields.join(" ")
            ).includes(query);
        });

        return filtered.sort((a, b) => {
            if (sortBy === "created-asc") {
                return new Date(a.createdAt)
                    - new Date(b.createdAt);
            }

            if (sortBy === "created-desc") {
                return new Date(b.createdAt)
                    - new Date(a.createdAt);
            }

            return compareDates(a, b);
        });

    }, [
        warehouseOrders,
        search,
        statusFilter,
        typeFilter,
        sortBy
    ]);

    // Cuando se crea una orden, actualizar el listado
    const created = () => {
        setMode(null);
        setSelectedOrderId(null);
        setDetail(null);

        setRefresh((count) => count + 1);
    };

    return (
        <AppLayout title="Órdenes de picking" back>
            <div className="po-page">

                <div className="po-intro">
                    <h2>Picking y reposición</h2>

                    <p>
                        Consultá los pedidos de la planta, sus fechas
                        de entrega y los operarios asignados.
                    </p>
                </div>

                {/* Indicadores superiores */}
                <div className="po-summary">
                    {[
                        ["Total", summary.total],
                        ["Pendientes", summary.pending],
                        ["En proceso", summary.inProgress],
                        ["Finalizadas", summary.completed]
                    ].map(([label, value]) => (
                        <div
                            className="po-summary-item"
                            key={label}
                        >
                            <span>{label}</span>
                            <strong>{value}</strong>
                        </div>
                    ))}
                </div>

                {mode ? (

                    // El mismo formulario para manual y Excel
                    <SectionCardComponent
                        title={
                            mode === "manual"
                                ? "Nueva orden manual"
                                : "Nueva orden desde Excel"
                        }
                    >
                        <CreatePickingOrderFormComponent
                            key={
                                `${mode}-${selectedWarehouse?._id || ""}`
                            }
                            mode={mode}
                            onCreated={created}
                            onCancel={() => setMode(null)}
                        />
                    </SectionCardComponent>

                ) : (
                    <>
                        {/* Acciones */}
                        <div className="po-actions">
                            <button
                                type="button"
                                className="form-submit"
                                onClick={() => setMode("manual")}
                            >
                                + Nueva orden manual
                            </button>

                            <button
                                type="button"
                                className="form-secondary"
                                onClick={() => setMode("excel")}
                            >
                                Importar desde Excel
                            </button>
                        </div>

                        {/* Listado */}
                        <SectionCardComponent title="Órdenes registradas">

                            <div className="po-filters">

                                <div className="form-field">
                                    <label htmlFor="po-search-orders">
                                        Buscar orden, cliente o producto
                                    </label>

                                    <input
                                        id="po-search-orders"
                                        type="search"
                                        placeholder="Nombre, código o pedido SAP"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="po-filter-grid">
                                    <div className="form-field">
                                        <label htmlFor="po-status">
                                            Estado
                                        </label>

                                        <select
                                            id="po-status"
                                            value={statusFilter}
                                            onChange={(event) =>
                                                setStatusFilter(event.target.value)
                                            }
                                        >
                                            <option value="all">
                                                Todos
                                            </option>
                                            <option value="pending">
                                                Pendientes
                                            </option>
                                            <option value="in_progress">
                                                En proceso
                                            </option>
                                            <option value="completed">
                                                Finalizadas
                                            </option>
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="po-type">
                                            Tipo de operación
                                        </label>

                                        <select
                                            id="po-type"
                                            value={typeFilter}
                                            onChange={(event) =>
                                                setTypeFilter(event.target.value)
                                            }
                                        >
                                            <option value="all">
                                                Todos
                                            </option>
                                            <option value="picking">
                                                Picking
                                            </option>
                                            <option value="replenishment">
                                                Reposición
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="po-sort">
                                        Ordenar por
                                    </label>

                                    <select
                                        id="po-sort"
                                        value={sortBy}
                                        onChange={(event) =>
                                            setSortBy(event.target.value)
                                        }
                                    >
                                        <option value="delivery">
                                            Entrega más próxima (y más antigua si coincide)
                                        </option>
                                        <option value="created-asc">
                                            Creación: más antiguas primero
                                        </option>
                                        <option value="created-desc">
                                            Creación: más recientes primero
                                        </option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    className="form-secondary"
                                    onClick={() =>
                                        setRefresh((count) => count + 1)
                                    }
                                >
                                    Actualizar listado
                                </button>
                            </div>

                            {/* Carga del listado */}
                            <LoadStateComponent
                                loading={loading}
                                loadingText="Cargando órdenes..."
                                error={error}
                                onRetry={() =>
                                    setRefresh((count) => count + 1)
                                }
                            >

                                {visibleOrders.length === 0 && (
                                    <div
                                        className="po-empty-state"
                                        role="status"
                                    >
                                        {warehouseOrders.length === 0 ? (
                                            <>
                                                <strong>
                                                    Esta planta todavía
                                                    no tiene órdenes.
                                                </strong>

                                                <p>
                                                    Creá una orden manual
                                                    o importá sus productos
                                                    desde Excel.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <strong>
                                                    No encontramos órdenes
                                                    con esos filtros.
                                                </strong>

                                                <p>
                                                    Probá cambiar la búsqueda
                                                    o el estado seleccionado.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Órdenes */}
                                <div className="po-list">
                                    {visibleOrders.map((order) => {

                                        const isOpen =
                                            selectedOrderId === order._id;

                                        const customer =
                                            order.customerName ||
                                            (
                                                order.operationType === "replenishment"
                                                    ? "Reposición interna"
                                                    : "Cliente no indicado"
                                            );

                                        return (
                                            <article
                                                key={order._id}
                                                className="po-order-card"
                                            >
                                                <div className="po-order-top">
                                                    <strong className="po-order-code">
                                                        {order.orderCode ||
                                                            "Orden sin código"}
                                                    </strong>

                                                    <span
                                                        className={
                                                            `po-status po-status--${order.status}`
                                                        }
                                                    >
                                                        {STATUS_LABELS[order.status] ||
                                                            order.status}
                                                    </span>
                                                </div>

                                                <h3 className="po-customer">
                                                    {customer}
                                                </h3>

                                                <p className="po-order-type">
                                                    {TYPE_LABELS[
                                                        order.operationType
                                                    ] || order.operationType}

                                                    {order.sapReference &&
                                                        ` · Pedido SAP ${order.sapReference}`}
                                                </p>

                                                <div className="po-dates">
                                                    <div>
                                                        <span>Creada</span>
                                                        <strong>
                                                            {formatDate(
                                                                order.createdAt
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Entrega prevista
                                                        </span>
                                                        <strong>
                                                            {formatDate(
                                                                order.deliveryDate,
                                                                true
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="po-order-meta">
                                                    <span>
                                                        {order.items?.length || 0}
                                                        {" "}productos
                                                    </span>

                                                    <span>
                                                        {order.assignedOperators?.length || 0}
                                                        {" "}operarios
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="po-detail-button"
                                                    aria-expanded={isOpen}
                                                    onClick={() =>
                                                        setSelectedOrderId(
                                                            (id) =>
                                                                id === order._id
                                                                    ? null
                                                                    : order._id
                                                        )
                                                    }
                                                >
                                                    {isOpen
                                                        ? "Ocultar detalle ▲"
                                                        : "Ver productos y operarios ▼"}
                                                </button>

                                                {isOpen && (
                                                    <div className="po-detail">
                                                        <LoadStateComponent
                                                            loading={detailLoading}
                                                            loadingText="Cargando detalle..."
                                                            error={detailError}
                                                            onRetry={() =>
                                                                setDetailRetry(
                                                                    (n) => n + 1
                                                                )
                                                            }
                                                        >

                                                            {detail && (
                                                                <>
                                                                    <h4>
                                                                        Productos{" "}
                                                                        {order.operationType === "replenishment"
                                                                            ? "a reponer"
                                                                            : "a recoger"}
                                                                    </h4>

                                                                    <div className="po-products">
                                                                        {detail.items?.map(
                                                                            (item, index) => (
                                                                                <div
                                                                                    key={
                                                                                        item.product?._id ||
                                                                                        index
                                                                                    }
                                                                                    className="po-product"
                                                                                >
                                                                                    <div className="po-product-main">
                                                                                        <strong>
                                                                                            {item.product?.description ||
                                                                                                "Producto sin descripción"}
                                                                                        </strong>

                                                                                        <small>
                                                                                            Código SAP:{" "}
                                                                                            {item.product?.sapCode ||
                                                                                                "Sin código"}
                                                                                        </small>
                                                                                    </div>

                                                                                    <span className="po-quantity">
                                                                                        {item.quantity} unid.
                                                                                    </span>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>

                                                                    <h4>
                                                                        Operarios asignados
                                                                    </h4>

                                                                    <p className="po-operators">
                                                                        {detail.assignedOperators
                                                                            ?.map(
                                                                                (op) => op.nombreUsuario
                                                                            )
                                                                            .filter(Boolean)
                                                                            .join(", ") ||
                                                                            "Sin información"}
                                                                    </p>

                                                                    <div className="po-route-note">
                                                                        <strong>
                                                                            Ubicaciones y recorrido — RF26
                                                                        </strong>

                                                                        <p>
                                                                            En una etapa posterior
                                                                            se mostrarán las
                                                                            ubicaciones de cada
                                                                            producto y las paradas
                                                                            del recorrido optimizado.
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            )}

                                                        </LoadStateComponent>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>

                            </LoadStateComponent>
                        </SectionCardComponent>
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default PickingOrdersPage;
