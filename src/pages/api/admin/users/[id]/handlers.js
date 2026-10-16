const handlerUserId = {};
import userRoleController from "./controllers.js";

handlerUserId.updateRole = async (req, res) => {
    const { id } = req.query;
    const { prevRole } = req.body;

    try {
        // req.profile lo setea requireSuperAdmin (rol verificado contra la DB,
        // no confiamos en ids enviados por el cliente)
        if (req.profile?.role !== 3) {
            throw new Error("Permisos invalidos");
        }
        if (prevRole == 1) {
            const updateUser = await userRoleController.asignAdminRole(id);
            res.json(updateUser);
        } else if (prevRole == 2) {
            const updateUser = await userRoleController.removeAdminRole(id);
            res.json(updateUser);
        } else if (prevRole == 3) {
            res.json({ error: "El superadmin no puede ser modificado" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default handlerUserId;
