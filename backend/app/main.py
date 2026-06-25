# Stamp the moment this module starts importing. The dependency-tree import is
# the dominant, measurable part of a serverless cold start, so /health surfaces
# it (import_ms) plus how long this instance has been warm (proc_uptime_ms).
import time as _t

_PROC_START = _t.perf_counter()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from app.api import (
    auth,
    locations,
    spiritual,
    users,
    events,
    admin_spiritual,
    google_auth,
    config,
    streaks,
)
from app.database import init_db

# Time spent importing the app's dependency tree (FastAPI, pydantic, libSQL,
# etc.). Captured once at module load; surfaced via /health.
_IMPORT_MS = round((_t.perf_counter() - _PROC_START) * 1000, 1)

# Import models to register them with SQLAlchemy


app = FastAPI(
    title="Darshan Backend",
    description="Spiritual practice tracker with location-based services",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import logging
    from fastapi.responses import JSONResponse

    # Log the exception with stack trace
    logging.getLogger("uvicorn.error").exception("Unhandled exception: %s", exc)
    # Return a generic 500 response to the client
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.on_event("startup")
async def on_startup():
    # The provisioned DB already has its schema/data, so skip init on cold
    # starts unless explicitly asked (INIT_DB_ON_STARTUP=1). Re-running schema
    # creation + seeding on every serverless cold boot round-trips to the DB
    # region and inflates cold-start latency.
    from app.config import settings

    if not settings.INIT_DB_ON_STARTUP:
        return
    try:
        await init_db()
    except Exception as e:
        import logging

        logging.error(f"Error initializing database: {e}")
        # We don't raise here so the app can still start and we can see the logs
        pass


@app.on_event("shutdown")
async def on_shutdown():
    from app.config import settings

    if settings.use_turso:
        from app.turso import close_client

        await close_client()


# include routers
app.include_router(auth.router, prefix="/sgvd/auth", tags=["auth"])
app.include_router(google_auth.router, prefix="/sgvd/auth", tags=["auth"])
app.include_router(users.router, prefix="/sgvd/users", tags=["users"])
app.include_router(locations.router, prefix="/sgvd/locations", tags=["locations"])
app.include_router(spiritual.router, prefix="/sgvd/spiritual", tags=["spiritual"])
app.include_router(admin_spiritual.router, prefix="/sgvd")
app.include_router(events.router, prefix="/sgvd/events", tags=["events"])
app.include_router(config.router, prefix="/sgvd/config", tags=["config"])
app.include_router(streaks.router, prefix="/sgvd/streaks", tags=["streaks"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "import_ms": _IMPORT_MS,
        "proc_uptime_ms": round((_t.perf_counter() - _PROC_START) * 1000, 1),
    }


def custom_openapi():
    """Custom OpenAPI schema with OAuth2 password flow for Swagger UI."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Darshan Backend",
        version="1.0.0",
        description="Spiritual practice tracker with location-based services",
        routes=app.routes,
    )

    # Add OAuth2 password flow for Swagger UI
    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "oauth2",
            "flows": {"password": {"tokenUrl": "/sgvd/auth/token", "scopes": {}}},
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema



# API docs are served only by Scalar at /docs. The duplicate Swagger UI
# (/swagger) and ReDoc (/redoc) renderings of the same OpenAPI schema were
# removed — one docs UI is enough.
@app.get("/docs", include_in_schema=False)
async def scalar_docs():
    # Lazy import: scalar_fastapi is only needed to render this page, so keep it
    # off the cold-start import path.
    from scalar_fastapi import get_scalar_api_reference

    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )


app.openapi = custom_openapi
