import handlerUserId from "./handlers";
import { requireSuperAdmin } from "helpers/apiGuard";

export default async function handlerUserIdRoles(req, res) {
    const method = req.method;
    switch (method) {
        case "PUT": {
            // req.profile queda seteado por el guard (rol verificado server-side)
            if (!(await requireSuperAdmin(req, res))) return;
            await handlerUserId.updateRole(req, res);
            break;
        }
        default:
            res.status(500).json({ error: "Invalid Method" });
            break;
    }
}
