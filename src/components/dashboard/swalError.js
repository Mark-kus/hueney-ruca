import Swal from "sweetalert2";

export default function swalError() {
    Swal.fire(
        "Ocurrió un error",
        "No podimos cumplir con tu pedido\nIntentalo más tarde",
        "error"
    )
}