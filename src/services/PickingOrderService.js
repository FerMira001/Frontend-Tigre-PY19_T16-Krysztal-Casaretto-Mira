
import { apiClient } from "./ApiClient";

// CU25: listado y detalle (administrador)
export const getPickingOrders = async () => {
    const { data } = await apiClient.get("/picking-orders");
    return data.data;
};

export const getPickingOrderDetail = async (orderId) => {
    const { data } = await apiClient.get(`/picking-orders/${orderId}`);
    return data.data;
};

// CU25: creación manual de órdenes
export const createPickingOrder = async (order) => {
    const { data } = await apiClient.post("/picking-orders", {
        ...order,
        source: "manual"
    });
    return data.data;
};

// CU25: analizar un Excel sin crear una orden
export const previewPickingOrderExcel = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await apiClient.post(
        "/picking-orders/preview",
        formData,
        { timeout: 60000 }
    );

    return data.data;
};

// CU25: crear la orden usando los productos del Excel
// Cliente, fecha, tipo y operarios llegan desde el formulario.
export const importPickingOrder = async (file, order) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("warehouse", order.warehouse);
    formData.append("operationType", order.operationType);
    formData.append(
        "assignedOperators",
        JSON.stringify(order.assignedOperators)
    );

    if (order.customerName) {
        formData.append("customerName", order.customerName);
    }

    if (order.deliveryDate) {
        formData.append("deliveryDate", order.deliveryDate);
    }

    if (order.sapReference) {
        formData.append("sapReference", order.sapReference);
    }

    const { data } = await apiClient.post(
        "/picking-orders/import",
        formData,
        { timeout: 60000 }
    );

    return data.data;
};

// CU25: órdenes asignadas al operario
export const getMyPickingOrders = async () => {
    const { data } = await apiClient.get(
        "/picking-orders/my-orders"
    );
    return data.data;
};
