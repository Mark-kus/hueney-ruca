import * as Handlers from "./handlers";
import * as Methods from "../methods";
import { requireAdmin, requireSession } from "helpers/apiGuard";

export default async function handlerComments(req, res) {
  const method = req.method;

  switch (method) {
    case Methods.GET:
      return await Handlers.handlerGet(req, res);
    case Methods.POST:
      if (!(await requireSession(req, res))) return;
      return await Handlers.handlerPost(req, res);
    case Methods.PUT:
      if (!(await requireAdmin(req, res))) return;
      return await Handlers.handlerPut(req, res);
    case Methods.DELETE:
      if (!(await requireAdmin(req, res))) return;
      return await Handlers.handlerDelete(req, res);
    default:
      return res
        .status(400)
        .json({ message: "400 Bad Request: invalid method" });
  }
}
