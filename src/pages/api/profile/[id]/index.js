import * as Handlers from "../handlers";
import * as Methods from "../../methods";
import { requireAdmin } from "helpers/apiGuard";

export default async function handler(req, res) {
  const method = req.method;
  switch (method) {
    case Methods.DELETE:
      if (!(await requireAdmin(req, res))) return;
      return await Handlers.handlerDelete(req, res);
    case Methods.PUT:
      if (!(await requireAdmin(req, res))) return;
      return await Handlers.handlerPut(req, res);
    case Methods.GET:
      if (!(await requireAdmin(req, res))) return;
      return await Handlers.handlerGetById(req, res);
    default:
      res.status(400).json({
        message: "400 Bad Request : invalid method",
      });
  }
}
