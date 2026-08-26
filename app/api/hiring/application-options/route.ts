import { apiError, apiOk } from "@/lib/api/response";
import { getHiringOptions } from "@/lib/hiring/application-option-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = apiOk(await getHiringOptions());
    response.headers.set("Cache-Control", "private, max-age=300");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
