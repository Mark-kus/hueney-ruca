import * as Handlers from "../handlers";
import { requireSession } from "helpers/apiGuard";

export default async function handler(req, res) {
    const method = req.method;
    switch (method) {
        case "GET":
            if (!(await requireSession(req, res))) return;
            return await Handlers.handlerGetProfileBookings(req, res);
        default:
            res.status(400).json({
                message: "400 Bad Request : invalid method",
            });
            break;
    }
}
