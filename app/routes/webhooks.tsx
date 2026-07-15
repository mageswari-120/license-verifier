import { authenticate } from "../shopify.server";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin && topic !== "APP_UNINSTALLED") {
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      // Note: We do NOT delete license records on uninstall
      // Merchant may reinstall — their licenses remain valid
      // Only session is cleaned up by PrismaSessionStorage automatically
      console.log(`App uninstalled from shop: ${shop}`);
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
