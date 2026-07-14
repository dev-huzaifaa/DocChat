from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime


class Document(Base):

    __tablename__ = "documents"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    filename = Column(
        String,
        nullable=False
    )


    status = Column(
        String,
        default="processing"
    )


    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )