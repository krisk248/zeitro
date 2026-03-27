import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.currency_transaction import TransactionType


class CurrencyTransactionRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: int
    transaction_type: TransactionType
    task_id: uuid.UUID | None
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CurrencyBalance(BaseModel):
    balance: int
    total_earned: int
    total_lost: int
