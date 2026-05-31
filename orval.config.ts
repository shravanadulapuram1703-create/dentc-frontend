import { defineConfig } from "orval";

/**
 * Generates the typed API client (models + TanStack Query hooks + axios calls)
 * from the committed FastAPI schema at ./openapi.json.
 *
 *   npm run api:sync   # re-fetch schema from the running backend, then generate
 *   npm run api:gen    # generate from the committed openapi.json
 *
 * Everything under src/api/generated/ is build output — do not edit by hand.
 * Field casing is left as-is (snake_case) to mirror the backend exactly and
 * avoid any client-side case mapping.
 */
export default defineConfig({
  dentc: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "tags-split", // one folder per FastAPI tag
      target: "./src/api/generated/endpoints",
      schemas: "./src/api/generated/model",
      client: "react-query",
      httpClient: "axios",
      clean: true, // wipe stale generated files each run
      biome: false,
      prettier: false,
      override: {
        mutator: {
          path: "./src/api/mutator/axiosInstance.ts",
          name: "customInstance",
        },
        // Let Orval pick query vs mutation by HTTP method
        // (GET -> useQuery, POST/PUT/PATCH/DELETE -> useMutation).
        // Global defaults like staleTime live on the QueryClient
        // (src/shared/config/queryClient.ts), not in codegen.
        query: {
          signal: true,
        },
      },
    },
  },
});
