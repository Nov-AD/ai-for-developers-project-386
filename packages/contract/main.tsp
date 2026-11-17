import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("API for scheduling calls with a single calendar owner.")
@service(#{ title: "Call scheduling API" })
@server("http://localhost:3000", "Local development")
namespace CallScheduling;

@doc("Service health check.")
@route("/health")
@get
op getHealth(): HealthResponse;

@doc("Health check response.")
model HealthResponse {
  @doc("Service status.")
  status: "ok";
}
