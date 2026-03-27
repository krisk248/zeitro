import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.users import current_active_user
from app.db.engine import get_async_session
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagRead

router = APIRouter(prefix="/tags", tags=["tags"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]


@router.get("", response_model=list[TagRead])
async def list_tags(session: SessionDep, user: UserDep) -> list[Tag]:
    result = await session.execute(
        select(Tag).where(Tag.user_id == user.id).order_by(Tag.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=TagRead, status_code=201)
async def create_tag(body: TagCreate, session: SessionDep, user: UserDep) -> Tag:
    tag = Tag(user_id=user.id, name=body.name, color=body.color)
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: uuid.UUID, session: SessionDep, user: UserDep) -> None:
    result = await session.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await session.delete(tag)
    await session.commit()
