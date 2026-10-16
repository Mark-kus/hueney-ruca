import * as Handlers from "../handlers";
import * as Methods from "../../methods";
import { requireAdmin, requireSession } from "helpers/apiGuard";

export default async function handler(req, res) {
    const method = req.method;
    switch (method) {
        case Methods.DELETE:
            if (!(await requireAdmin(req, res))) return;
            return await Handlers.handlerDelete(req, res);
        case Methods.GET:
            if (!(await requireAdmin(req, res))) return;
            return await Handlers.handlerGetById(req, res);
        case Methods.PUT: {
            // Con session_id es la verificación de pago (thank-you).
            // Sin session_id es la edición desde el panel admin.
            const isPaymentVerification = req.query.session_id !== undefined;
            const auth = await (isPaymentVerification
                ? requireSession(req, res)
                : requireAdmin(req, res));
            if (!auth) return;
            return await Handlers.handlerUpdateById(req, res);
        }
        default:
            res.status(400).json({
                message: "400 Bad Request : invalid method",
            });
    }
}
