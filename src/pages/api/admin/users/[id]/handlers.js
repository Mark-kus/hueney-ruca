const handlerUserId = {};
import { supabase } from "utils/supabase.js";
import userRoleController from "./controllers.js";

handlerUserId.updateRole = async (req, res) => {
    const { id } = req.query;
    const { prevRole, adminRoleSessionId } = req.body;
    try {
        if (prevRole == 1) {
            const updateUser = await userRoleController.asignAdminRole(id);
            res.json(updateUser);
        } else if (prevRole == 2) {
            const updateUser = await userRoleController.removeAdminRole(id);
            res.json(updateUser);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default handlerUserId;
