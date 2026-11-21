
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { searchProducts } from "../../services/ProductService";
import { listUsers } from "../../services/UserService";

import {
    createPickingOrder,
    importPickingOrder,
    previewPickingOrderExcel
} from "../../services/PickingOrderService";

import { getErrorMessage } from "../../services/ApiClient";
import CatalogFileFieldComponent from "../catalog/CatalogFileFieldComponent";
import { hasCatalogExtension } from "../../utils/CatalogUtils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PAGE_SIZE = 50;


// Validar que la cantidad sea un entero positivo
const isPositiveInteger = (value) =>
    /^[1-9]\d*$/.test(String(value)) &&
    Number.isSafeInteger(Number(value));


// Convertir DD/MM/AAAA a AAAA-MM-DD para el backend
const parseDeliveryDate = (text) => {

    const value = text.trim();

    if (!value) return null;

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

    if (!match) return undefined;

    const [, dd, mm, yyyy] = match;

    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);

    if (year < 1900) return undefined;

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return undefined;
    }

    return `${yyyy}-${mm}-${dd}`;
};


// Obtener la fecha actual
const todayLocalISO = () => {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};


// Validar que la fecha no sea anterior a hoy
const getDeliveryDateError = (text) => {

    const parsed = parseDeliveryDate(text);

    if (parsed === undefined) {
        return "Ingresá una fecha válida con formato DD/MM/AAAA.";
    }

    if (parsed && parsed < todayLocalISO()) {
        return "La fecha de entrega no puede ser anterior a hoy.";
    }

    return "";
};


// Obtener el identificador de una planta
const getWarehouseId = (warehouse) =>
    String(warehouse?._id || warehouse || "");


// CU25: formulario compartido para órdenes manuales y Excel
const CreatePickingOrderFormComponent = ({
    mode = "manual",
    onCreated,
    onCancel
}) => {

    const isExcel = mode === "excel";

    const selectedWarehouse = useSelector(
        (state) => state.warehouse.selected
    );

    const searchInputRef = useRef(null);


    // Datos generales de la orden
    const [operationType, setOperationType] = useState("picking");
    const [customerName, setCustomerName] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [dateTouched, setDateTouched] = useState(false);
    const [sapReference, setSapReference] = useState("");

    const [assignedOperators, setAssignedOperators] = useState([]);


    // Operarios de la planta
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [usersRefresh, setUsersRefresh] = useState(0);


    // Catálogo real de productos de Tigre
    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);


    // Producto seleccionado y cantidad pendiente de confirmar
    const [pendingProduct, setPendingProduct] = useState(null);
    const [pendingQuantity, setPendingQuantity] = useState("1");


    // Productos agregados manualmente a la orden
    const [manualItems, setManualItems] = useState([]);


    // Edición de cantidades ya agregadas
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingQuantity, setEditingQuantity] = useState("");


    // Importación desde Excel
    const [file, setFile] = useState(null);
    const [fileKey, setFileKey] = useState(0);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);


    // Revisión y confirmación de la orden
    const [step, setStep] = useState("edit");
    const [saving, setSaving] = useState(false);


    // =====================================================
    // CARGAR OPERARIOS DE LA PLANTA
    // =====================================================

    useEffect(() => {

        let active = true;

        const loadOperators = async () => {

            setLoadingUsers(true);
            setUsersError("");

            try {

                const result = [];
                let page = 1;
                let total = 0;

                do {

                    const response = await listUsers({
                        page,
                        limit: 50
                    });

                    const batch = Array.isArray(response.data)
                        ? response.data
                        : [];

                    result.push(...batch);

                    total = Number(
                        response.pagination?.total ?? result.length
                    );

                    page++;

                    if (!batch.length) break;

                } while (result.length < total);

                if (active) {
                    setUsers(result);
                }

            } catch (error) {

                if (active) {
                    setUsersError(getErrorMessage(error));
                }

            } finally {

                if (active) {
                    setLoadingUsers(false);
                }
            }
        };

        loadOperators();

        return () => {
            active = false;
        };

    }, [usersRefresh]);


    // Mostrar únicamente operarios de la planta seleccionada
    const availableOperators = useMemo(() => {

        if (!selectedWarehouse?._id) return [];

        return users.filter((user) =>

            user.rol === "Operario" &&

            user.warehouses?.some((warehouse) =>
                getWarehouseId(warehouse) ===
                String(selectedWarehouse._id)
            )
        );

    }, [users, selectedWarehouse]);


    const selectedOperators = availableOperators.filter(
        (user) => assignedOperators.includes(user._id)
    );


    // Los productos dependen del modo de creación
    const items = isExcel
        ? (preview?.products || [])
        : manualItems;


    const dateError = getDeliveryDateError(deliveryDate);


    // =====================================================
    // CU25: CARGAR AUTOMÁTICAMENTE EL CATÁLOGO REAL
    // =====================================================

    // Al abrir Nueva orden manual, consultar directamente
    // los productos registrados en MongoDB mediante
    // el servicio existente ProductService.
    //
    // No se crean productos ni se utilizan datos de prueba.

    useEffect(() => {

        if (isExcel) return;

        let active = true;

        const loadCatalog = async () => {

            setSearching(true);
            setHasSearched(false);

            try {

                const response = await searchProducts({
                    search: "",
                    page: 1,
                    limit: PAGE_SIZE
                });

                if (!active) return;

                const products = Array.isArray(response.data)
                    ? response.data
                    : [];

                const total = Number(
                    response.pagination?.total ?? products.length
                );

                const pages = Number(
                    response.pagination?.totalPages ??
                    Math.ceil(total / PAGE_SIZE)
                );

                setSearchResults(products);
                setTotalResults(total);
                setTotalPages(pages);
                setCurrentPage(1);
                setActiveSearch("");
                setHasSearched(true);

            } catch (error) {

                if (active) {
                    toast.error(
                        "No se pudo cargar el catálogo: " +
                        getErrorMessage(error)
                    );
                }

            } finally {

                if (active) {
                    setSearching(false);
                }
            }
        };

        loadCatalog();

        return () => {
            active = false;
        };

    }, [isExcel]);


    // =====================================================
    // BUSCAR PRODUCTOS O CARGAR MÁS RESULTADOS
    // =====================================================

    const findProducts = async (
        page = 1,
        query = search.trim()
    ) => {

        if (searching) return;

        setSearching(true);

        try {

            const response = await searchProducts({
                search: query,
                page,
                limit: PAGE_SIZE
            });

            const batch = Array.isArray(response.data)
                ? response.data
                : [];

            const pagination = response.pagination || {};

            const total = Number(
                pagination.total ?? batch.length
            );

            const pages = Number(
                pagination.totalPages ??
                Math.ceil(total / PAGE_SIZE)
            );

            setSearchResults((current) =>
                page === 1
                    ? batch
                    : [...current, ...batch]
            );

            setTotalResults(total);
            setTotalPages(pages);
            setCurrentPage(page);
            setActiveSearch(query);
            setHasSearched(true);

        } catch (error) {

            toast.error(getErrorMessage(error));

        } finally {

            setSearching(false);
        }
    };


    // =====================================================
    // SELECCIÓN MANUAL DE PRODUCTOS
    // =====================================================

    // Seleccionar un producto del catálogo
    const selectProduct = (product) => {

        const alreadyAdded = manualItems.some(
            (item) => item._id === product._id
        );

        if (alreadyAdded) return;

        setPendingProduct(product);
        setPendingQuantity("1");
    };


    // Confirmar la cantidad y agregar a la orden
    const addProductToOrder = () => {

        if (!pendingProduct) return;

        if (!isPositiveInteger(pendingQuantity)) {

            toast.error(
                "Ingresá una cantidad entera mayor a cero."
            );

            return;
        }

        setManualItems((current) => [

            ...current,

            {
                _id: pendingProduct._id,
                description: pendingProduct.description,
                sapCode: pendingProduct.sapCode,
                quantity: Number(pendingQuantity)
            }
        ]);

        setPendingProduct(null);
        setPendingQuantity("1");

        toast.success("Producto agregado a la orden.");
    };


    // Comenzar a editar la cantidad de un producto
    const startEditQuantity = (item) => {

        setEditingItemId(item._id);
        setEditingQuantity(String(item.quantity));
    };


    // Guardar la nueva cantidad
    const saveEditedQuantity = () => {

        if (!isPositiveInteger(editingQuantity)) {

            toast.error(
                "Ingresá una cantidad entera mayor a cero."
            );

            return;
        }

        setManualItems((current) =>
            current.map((item) =>
                item._id === editingItemId
                    ? {
                        ...item,
                        quantity: Number(editingQuantity)
                    }
                    : item
            )
        );

        setEditingItemId(null);
        setEditingQuantity("");
    };


    // =====================================================
    // IMPORTACIÓN DESDE EXCEL
    // =====================================================

    const chooseFile = (chosen) => {

        setPreview(null);
        setFile(chosen || null);

        if (!chosen) return;

        if (!hasCatalogExtension(chosen.name)) {

            toast.error("Seleccioná un archivo .xlsx o .csv.");

            setFile(null);
            setFileKey((value) => value + 1);

        } else if (chosen.size > MAX_FILE_SIZE) {

            toast.error("El archivo no puede superar los 5 MB.");

            setFile(null);
            setFileKey((value) => value + 1);
        }
    };


    // Obtener vista previa del archivo sin crear la orden
    const requestPreview = async () => {

        if (!file) {

            toast.error("Primero seleccioná un Excel o CSV.");
            return;
        }

        setPreviewing(true);
        setPreview(null);

        try {

            const result = await previewPickingOrderExcel(file);

            if (
                !Array.isArray(result?.products) ||
                !result.products.length
            ) {

                toast.error(
                    "El archivo no contiene productos válidos."
                );

                return;
            }

            setPreview(result);

            toast.success(
                "Archivo validado. Revisá los productos y cantidades."
            );

        } catch (error) {

            toast.error(getErrorMessage(error));

        } finally {

            setPreviewing(false);
        }
    };


    // =====================================================
    // SELECCIÓN DE OPERARIOS
    // =====================================================

    const toggleOperator = (id) => {

        setAssignedOperators((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };


    // =====================================================
    // REVISAR LA ORDEN ANTES DE CREARLA
    // =====================================================

    const reviewOrder = () => {

        if (!selectedWarehouse?._id) {

            toast.error("Primero seleccioná una planta.");
            return;
        }

        if (dateError) {

            setDateTouched(true);
            toast.error(dateError);

            return;
        }

        if (!isExcel && pendingProduct) {

            toast.error(
                "Confirmá la cantidad del producto seleccionado o cancelá esa selección."
            );

            return;
        }

        if (!items.length || (isExcel && !preview)) {

            toast.error(
                isExcel
                    ? "Primero validá el Excel para cargar los productos."
                    : "Agregá al menos un producto a la orden."
            );

            return;
        }

        if (
            items.some(
                (item) => !isPositiveInteger(item.quantity)
            )
        ) {

            toast.error(
                "Todas las cantidades deben ser enteros mayores a cero."
            );

            return;
        }

        if (loadingUsers || usersError) {

            toast.error(
                "No se pudo verificar la lista de operarios."
            );

            return;
        }

        if (
            !assignedOperators.length ||
            selectedOperators.length !== assignedOperators.length
        ) {

            toast.error(
                "Seleccioná al menos un operario de la planta."
            );

            return;
        }

        setStep("review");
    };


    // =====================================================
    // CONFIRMAR Y GUARDAR LA ORDEN
    // =====================================================

    const confirmOrder = async () => {

        if (saving) return;

        const currentDateError = getDeliveryDateError(
            deliveryDate
        );

        if (currentDateError) {

            setDateTouched(true);
            setStep("edit");

            toast.error(currentDateError);
            return;
        }

        const data = {

            warehouse: selectedWarehouse._id,

            operationType,

            customerName: customerName.trim() || null,

            deliveryDate: parseDeliveryDate(deliveryDate),

            sapReference: sapReference.trim() || null,

            assignedOperators
        };

        setSaving(true);

        try {

            if (isExcel) {

                await importPickingOrder(file, data);

            } else {

                await createPickingOrder({

                    ...data,

                    items: manualItems.map((item) => ({
                        product: item._id,
                        quantity: Number(item.quantity)
                    }))
                });
            }

            toast.success(
                isExcel
                    ? "Orden importada correctamente."
                    : "Orden creada correctamente."
            );

            onCreated?.();

        } catch (error) {

            toast.error(getErrorMessage(error));

        } finally {

            setSaving(false);
        }
    };


    // =====================================================
    // INTERFAZ
    // =====================================================

    return (

        <div className="po-create-form">

            {step === "edit" ? (

                <div className="po-form">

                    <p className="po-form-help">

                        {isExcel
                            ? "El Excel aporta los productos y cantidades. Completá los demás datos de la orden."
                            : "Seleccioná los productos del catálogo de Tigre, confirmá sus cantidades y asigná operarios."}

                        {" "}Podrás revisar todo antes de guardar.

                    </p>


                    {/* Tipo de operación */}

                    <div className="form-field">

                        <label htmlFor="po-operation">
                            Tipo de operación
                        </label>

                        <select
                            id="po-operation"
                            value={operationType}
                            onChange={(event) =>
                                setOperationType(event.target.value)
                            }
                        >

                            <option value="picking">
                                Picking — recoger productos
                            </option>

                            <option value="replenishment">
                                Reposición — reponer stock
                            </option>

                        </select>

                    </div>


                    {/* Planta seleccionada */}

                    <div className="form-field">

                        <label>Planta</label>

                        <div className="po-form-info">

                            {selectedWarehouse?.name ||
                                "No hay planta seleccionada"}

                        </div>

                        <small>
                            Se utiliza la planta seleccionada en Tigre.
                        </small>

                    </div>


                    {/* Cliente y fecha de entrega */}

                    <div className="po-filter-grid">

                        <div className="form-field">

                            <label htmlFor="po-customer">

                                {operationType === "picking"
                                    ? "Cliente o destinatario"
                                    : "Destino interno"}

                                {" "}(opcional)

                            </label>

                            <input
                                id="po-customer"
                                type="text"
                                maxLength={150}
                                placeholder={
                                    operationType === "picking"
                                        ? "Nombre del cliente"
                                        : "Sector de destino"
                                }
                                value={customerName}
                                onChange={(event) =>
                                    setCustomerName(event.target.value)
                                }
                            />

                        </div>


                        <div className="form-field">

                            <label htmlFor="po-date">
                                Fecha prevista de entrega (opcional)
                            </label>

                            <input
                                id="po-date"
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="DD/MM/AAAA"
                                value={deliveryDate}
                                onChange={(event) =>
                                    setDeliveryDate(event.target.value)
                                }
                                onBlur={() => setDateTouched(true)}
                                aria-invalid={Boolean(
                                    dateTouched && dateError
                                )}
                            />

                            <small>
                                DD/MM/AAAA. Hoy o una fecha futura.
                            </small>

                            {dateTouched && dateError && (

                                <p
                                    className="po-form-error"
                                    role="alert"
                                >
                                    {dateError}
                                </p>

                            )}

                        </div>

                    </div>


                    {/* Referencia del pedido SAP */}

                    <div className="form-field">

                        <label htmlFor="po-reference">
                            Número de pedido SAP (opcional)
                        </label>

                        <input
                            id="po-reference"
                            type="text"
                            maxLength={80}
                            placeholder="Referencia del pedido original"
                            value={sapReference}
                            onChange={(event) =>
                                setSapReference(event.target.value)
                            }
                        />

                    </div>


                    {/* =================================================
                        PRODUCTOS Y CANTIDADES
                       ================================================= */}

                    <section className="po-form-section">

                        <h3>Productos y cantidades</h3>

                        {isExcel ? (

                            // =========================================
                            // MODALIDAD EXCEL
                            // =========================================

                            <>

                                <p className="po-form-help">

                                    El archivo debe incluir{" "}

                                    <strong>Código SAP</strong>
                                    {" "}(o Material) y{" "}

                                    <strong>Cantidad</strong>.

                                    {" "}El nombre se obtiene del catálogo.

                                </p>


                                <CatalogFileFieldComponent
                                    file={file}
                                    inputKey={fileKey}
                                    disabled={previewing || saving}
                                    onSelect={chooseFile}
                                />


                                <button
                                    type="button"
                                    className="form-secondary"
                                    disabled={!file || previewing}
                                    onClick={requestPreview}
                                >

                                    {previewing
                                        ? "Validando archivo..."
                                        : "Validar y ver productos"}

                                </button>


                                {preview && (

                                    <p
                                        className="po-preview-success"
                                        role="status"
                                    >

                                        Archivo validado:
                                        {" "}{preview.totalProducts} productos,
                                        {" "}{preview.totalUnits} unidades.

                                    </p>

                                )}

                            </>

                        ) : (

                            // =========================================
                            // MODALIDAD MANUAL - CATÁLOGO REAL
                            // =========================================

                            <>

                                <p className="po-form-help">

                                    Se muestran los productos registrados
                                    en el catálogo de Tigre.

                                    {" "}Podés recorrer la lista o buscar
                                    por nombre o código SAP.

                                </p>


                                {/* Buscador */}

                                <div className="po-product-search">

                                    <div className="form-field">

                                        <label htmlFor="po-search-product">
                                            Buscar producto
                                        </label>

                                        <input
                                            id="po-search-product"
                                            ref={searchInputRef}
                                            type="search"
                                            value={search}
                                            placeholder="Nombre o código SAP"
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            onKeyDown={(event) => {

                                                if (event.key === "Enter") {

                                                    event.preventDefault();
                                                    findProducts(1);
                                                }
                                            }}
                                        />

                                    </div>


                                    <button
                                        type="button"
                                        className="form-secondary"
                                        disabled={searching}
                                        onClick={() => findProducts(1)}
                                    >

                                        {searching
                                            ? "Cargando..."
                                            : search.trim()
                                                ? "Buscar"
                                                : "Ver catálogo"}

                                    </button>

                                </div>


                                {/* Listado real de productos */}

                                {searching && !hasSearched && (

                                    <p className="po-form-help">
                                        Cargando productos del catálogo...
                                    </p>

                                )}


                                {hasSearched && (

                                    <div className="po-search-results">

                                        <p className="po-form-help">

                                            Mostrando{" "}
                                            {searchResults.length}
                                            {" "}de{" "}
                                            {totalResults}
                                            {" "}productos.

                                            {activeSearch &&
                                                ` Búsqueda: «${activeSearch}».`}

                                        </p>


                                        {searchResults.length === 0 && (

                                            <p className="po-form-help">

                                                {activeSearch
                                                    ? "No se encontraron productos con esa búsqueda."
                                                    : "No hay productos disponibles en el catálogo."}

                                            </p>

                                        )}


                                        {searchResults.map((product) => {

                                            const added = manualItems.some(
                                                (item) =>
                                                    item._id === product._id
                                            );

                                            const selected =
                                                pendingProduct?._id === product._id;

                                            return (

                                                <button
                                                    type="button"
                                                    key={product._id}
                                                    className="po-product-result"
                                                    disabled={added || selected}
                                                    onClick={() =>
                                                        selectProduct(product)
                                                    }
                                                >

                                                    <span>

                                                        <strong>
                                                            {product.description}
                                                        </strong>

                                                        <small>

                                                            Código SAP:
                                                            {" "}{product.sapCode}

                                                        </small>

                                                    </span>


                                                    <span>

                                                        {added
                                                            ? "Agregado"
                                                            : selected
                                                                ? "Seleccionado"
                                                                : "+ Seleccionar"}

                                                    </span>

                                                </button>
                                            );
                                        })}


                                        {/* Cargar más productos del catálogo */}

                                        {currentPage < totalPages && (

                                            <button
                                                type="button"
                                                className="form-secondary"
                                                disabled={searching}
                                                onClick={() =>
                                                    findProducts(
                                                        currentPage + 1,
                                                        activeSearch
                                                    )
                                                }
                                            >

                                                {searching
                                                    ? "Cargando..."
                                                    : "Ver más productos"}

                                            </button>

                                        )}

                                    </div>
                                )}


                                {/* Confirmar cantidad del producto seleccionado */}

                                {pendingProduct && (

                                    <div className="po-form-info">

                                        <div className="po-product-main">

                                            <strong>
                                                {pendingProduct.description}
                                            </strong>

                                            <small>

                                                Código SAP:
                                                {" "}{pendingProduct.sapCode}

                                            </small>

                                        </div>


                                        <div className="po-form-actions">

                                            <div className="form-field po-quantity-field">

                                                <label htmlFor="po-new-quantity">
                                                    Cantidad
                                                </label>

                                                <input
                                                    id="po-new-quantity"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={pendingQuantity}
                                                    onChange={(event) =>
                                                        setPendingQuantity(
                                                            event.target.value
                                                        )
                                                    }
                                                    onKeyDown={(event) => {

                                                        if (event.key === "Enter") {

                                                            event.preventDefault();
                                                            addProductToOrder();
                                                        }
                                                    }}
                                                />

                                            </div>


                                            <button
                                                type="button"
                                                className="form-submit"
                                                onClick={addProductToOrder}
                                            >
                                                Agregar a la orden
                                            </button>


                                            <button
                                                type="button"
                                                className="form-secondary"
                                                onClick={() =>
                                                    setPendingProduct(null)
                                                }
                                            >
                                                Cancelar selección
                                            </button>

                                        </div>

                                    </div>
                                )}

                            </>
                        )}


                        {/* Productos agregados a la orden */}

                        <h4>
                            Productos de la orden ({items.length})
                        </h4>


                        {items.length === 0 ? (

                            <p className="po-form-help">
                                Todavía no agregaste productos a la orden.
                            </p>

                        ) : (

                            <div className="po-products">

                                {items.map((item, index) => (

                                    <div
                                        className="po-product"
                                        key={
                                            item._id ||
                                            item.product ||
                                            index
                                        }
                                    >

                                        <div className="po-product-main">

                                            <strong>

                                                {item.description ||
                                                    "Sin descripción"}

                                            </strong>


                                            <small>

                                                Código SAP:
                                                {" "}{item.sapCode}

                                            </small>


                                            {/* Editar cantidad en modo manual */}

                                            {!isExcel &&
                                                editingItemId === item._id ? (

                                                <div className="po-form-actions">

                                                    <div className="form-field po-quantity-field">

                                                        <label
                                                            htmlFor={`po-edit-${item._id}`}
                                                        >
                                                            Cantidad
                                                        </label>

                                                        <input
                                                            id={`po-edit-${item._id}`}
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            value={editingQuantity}
                                                            onChange={(event) =>
                                                                setEditingQuantity(
                                                                    event.target.value
                                                                )
                                                            }
                                                        />

                                                    </div>


                                                    <button
                                                        type="button"
                                                        className="form-secondary"
                                                        onClick={saveEditedQuantity}
                                                    >
                                                        Guardar cantidad
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="form-secondary"
                                                        onClick={() =>
                                                            setEditingItemId(null)
                                                        }
                                                    >
                                                        Cancelar
                                                    </button>

                                                </div>

                                            ) : (

                                                <span className="po-quantity">

                                                    Cantidad:
                                                    {" "}{item.quantity} unid.

                                                </span>

                                            )}

                                        </div>


                                        {!isExcel &&
                                            editingItemId !== item._id && (

                                            <div className="po-product-actions">

                                                <button
                                                    type="button"
                                                    className="form-secondary"
                                                    onClick={() =>
                                                        startEditQuantity(item)
                                                    }
                                                >
                                                    Cambiar cantidad
                                                </button>


                                                <button
                                                    type="button"
                                                    className="form-secondary"
                                                    onClick={() =>
                                                        setManualItems(
                                                            (current) =>
                                                                current.filter(
                                                                    (product) =>
                                                                        product._id !== item._id
                                                                )
                                                        )
                                                    }
                                                >
                                                    Quitar
                                                </button>

                                            </div>
                                        )}

                                    </div>
                                ))}

                            </div>
                        )}


                        {/* Agregar más productos */}

                        {!isExcel && manualItems.length > 0 && (

                            <button
                                type="button"
                                className="form-secondary"
                                onClick={() => {

                                    searchInputRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center"
                                    });

                                    searchInputRef.current?.focus();
                                }}
                            >
                                + Agregar otro producto
                            </button>

                        )}


                        {isExcel && preview && (

                            <p className="po-form-help">

                                Para corregir productos o cantidades,
                                cambiá el archivo y volvé a validar
                                la vista previa.

                            </p>

                        )}

                    </section>


                    {/* =================================================
                        OPERARIOS ASIGNADOS
                       ================================================= */}

                    <section className="po-form-section">

                        <h3>Operarios asignados</h3>

                        <p className="po-form-help">

                            Seleccioná uno o más operarios de la planta.

                        </p>


                        {loadingUsers && (

                            <p className="po-form-help">
                                Cargando operarios...
                            </p>

                        )}


                        {!loadingUsers && usersError && (

                            <div
                                className="po-form-error"
                                role="alert"
                            >

                                {usersError}

                                <button
                                    type="button"
                                    className="form-secondary"
                                    onClick={() =>
                                        setUsersRefresh(
                                            (value) => value + 1
                                        )
                                    }
                                >
                                    Reintentar
                                </button>

                            </div>
                        )}


                        {!loadingUsers &&
                            !usersError &&
                            availableOperators.length === 0 && (

                                <p className="po-form-help">

                                    No hay operarios asignados
                                    a esta planta.

                                </p>
                            )}


                        {!loadingUsers &&
                            !usersError &&
                            availableOperators.map((operator) => (

                                <label
                                    key={operator._id}
                                    className="po-operator-option"
                                >

                                    <input
                                        type="checkbox"
                                        checked={assignedOperators.includes(
                                            operator._id
                                        )}
                                        onChange={() =>
                                            toggleOperator(operator._id)
                                        }
                                    />


                                    <span>

                                        <strong>
                                            {operator.nombreUsuario}
                                        </strong>

                                        <small>
                                            {operator.email}
                                        </small>

                                    </span>

                                </label>
                            ))}


                        <p className="po-form-help">

                            Operarios seleccionados:
                            {" "}{assignedOperators.length}

                        </p>

                    </section>


                    {/* Revisar antes de guardar */}

                    <div className="po-form-actions">

                        <button
                            type="button"
                            className="form-submit"
                            disabled={
                                loadingUsers ||
                                Boolean(usersError) ||
                                previewing
                            }
                            onClick={reviewOrder}
                        >
                            Revisar orden
                        </button>


                        <button
                            type="button"
                            className="form-secondary"
                            onClick={onCancel}
                        >
                            Cancelar
                        </button>

                    </div>

                </div>

            ) : (

                // =================================================
                // RESUMEN DE LA ORDEN ANTES DE CONFIRMAR
                // =================================================

                <div className="po-order-review">

                    <h3>Revisar la orden antes de crearla</h3>

                    <p className="po-form-help">
                        Todavía no se guardó nada en MongoDB.
                    </p>


                    <dl className="po-review-summary">

                        <div>

                            <dt>Origen</dt>

                            <dd>
                                {isExcel ? "Excel" : "Manual"}
                            </dd>

                        </div>


                        <div>

                            <dt>Tipo</dt>

                            <dd>

                                {operationType === "picking"
                                    ? "Picking"
                                    : "Reposición"}

                            </dd>

                        </div>


                        <div>

                            <dt>Planta</dt>

                            <dd>
                                {selectedWarehouse?.name}
                            </dd>

                        </div>


                        <div>

                            <dt>Cliente o destino</dt>

                            <dd>
                                {customerName.trim() || "No indicado"}
                            </dd>

                        </div>


                        <div>

                            <dt>Fecha de entrega</dt>

                            <dd>
                                {deliveryDate || "Sin fecha"}
                            </dd>

                        </div>


                        <div>

                            <dt>Pedido SAP</dt>

                            <dd>
                                {sapReference.trim() || "Sin referencia"}
                            </dd>

                        </div>

                    </dl>


                    <h4>
                        Productos ({items.length})
                    </h4>


                    <div className="po-products">

                        {items.map((item, index) => (

                            <div
                                className="po-product"
                                key={
                                    item._id ||
                                    item.product ||
                                    index
                                }
                            >

                                <div className="po-product-main">

                                    <strong>

                                        {item.description ||
                                            "Sin descripción"}

                                    </strong>


                                    <small>

                                        Código SAP:
                                        {" "}{item.sapCode}

                                    </small>

                                </div>


                                <span className="po-quantity">

                                    {item.quantity} unid.

                                </span>

                            </div>
                        ))}

                    </div>


                    <h4>Operarios asignados</h4>


                    <p className="po-operators">

                        {selectedOperators
                            .map((user) => user.nombreUsuario)
                            .join(", ")}

                    </p>


                    <p className="po-form-help">

                        Al confirmar, se genera un identificador
                        interno y se registra automáticamente la
                        fecha de creación.

                        {" "}No se modifica el stock.

                    </p>


                    <div className="po-form-actions">

                        <button
                            type="button"
                            className="form-submit"
                            disabled={saving}
                            onClick={confirmOrder}
                        >

                            {saving
                                ? "Guardando..."
                                : "Confirmar y crear orden"}

                        </button>


                        <button
                            type="button"
                            className="form-secondary"
                            disabled={saving}
                            onClick={() => setStep("edit")}
                        >
                            Volver a editar
                        </button>

                    </div>

                </div>
            )}

        </div>
    );
};

export default CreatePickingOrderFormComponent;
