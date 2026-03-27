import uuid

from pydantic import BaseModel


class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"


class TagRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    color: str

    model_config = {"from_attributes": True}
