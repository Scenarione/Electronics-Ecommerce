from pymongo import MongoClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings

engine = create_engine(
    settings().database_url, pool_pre_ping=True, connect_args={"connect_timeout": 5}
)
SessionLocal = sessionmaker(engine, expire_on_commit=False)
mongo_client = MongoClient(settings().mongo_url, serverSelectionTimeoutMS=3000)
catalog = mongo_client[settings().mongo_db]


def get_db():
    with SessionLocal() as session:
        yield session
