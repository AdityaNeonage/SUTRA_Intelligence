from fastapi import FastAPI
app = FastAPI(
    title="SUTRA API",
    description="Secure Unified Threat & Relationship Analytics",
    version="1.0.0"
)

origins = ["http://localhost:5173/",
           ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to SUTRA API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }