"""
Seonize Backend - Admin User Management API
僅限超級管理員使用的用戶管理後台
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.models.db_models import User, Project
from app.core.auth import get_current_admin, get_password_hash, get_current_user

router = APIRouter()


class UserUpdateRequest(BaseModel):
    """管理員更新使用者資料"""
    role: Optional[str] = None          # super_admin | vip | user
    credits: Optional[int] = None       # 直接設定點數值
    credits_delta: Optional[int] = None # 增減點數 (正數增加, 負數減少)
    membership_level: Optional[int] = None  # 1: Basic, 2: Pro, 3: Business
    username: Optional[str] = None
    new_password: Optional[str] = None  # 管理員重設密碼


@router.get("")
async def list_users(
    page: int = 1,
    per_page: int = 20,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """
    取得所有使用者清單（分頁 + 篩選）
    僅限超級管理員
    """
    query = db.query(User)

    # 篩選角色
    if role:
        query = query.filter(User.role == role)

    # 搜尋 Email 或顯示名稱
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.username.ilike(f"%{search}%"))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()) \
                 .offset((page - 1) * per_page) \
                 .limit(per_page) \
                 .all()

    # 為每個使用者計算專案數量
    result = []
    for user in users:
        user_dict = user.to_dict()
        project_count = db.query(func.count(Project.id)).filter(
            Project.user_id == user.id
        ).scalar()
        user_dict["project_count"] = project_count
        result.append(user_dict)

    return {
        "users": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """取得單一使用者詳情，僅限超級管理員"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在。")

    user_dict = user.to_dict()
    project_count = db.query(func.count(Project.id)).filter(
        Project.user_id == user.id
    ).scalar()
    user_dict["project_count"] = project_count
    return user_dict


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 改為 get_current_user
):
    """
    更新使用者資料（角色、點數、等級）
    超級管理員可更新任何人，一般使用者僅限更新自己
    """
    if current_user.role != "super_admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="權限不足，僅限更新本人資料或需管理員權限。")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在。")

    # 權限敏感欄位檢查 (僅超管可改角色與點數)
    is_admin = current_user.role == "super_admin"

    if update_data.role:
        if not is_admin:
            raise HTTPException(status_code=403, detail="僅限超級管理員修改角色。")
        if user.id == current_user.id and update_data.role != "super_admin":
            raise HTTPException(status_code=400, detail="不能降低自己的超管權限。")
        if update_data.role not in ["super_admin", "vip", "user"]:
            raise HTTPException(status_code=400, detail="無效的角色值。")
        user.role = update_data.role

    if update_data.username is not None:
        user.username = update_data.username.strip()

    if update_data.credits is not None:
        if not is_admin:
             raise HTTPException(status_code=403, detail="僅限超級管理員修改點數。")
        old_val = user.credits
        user.credits = max(0, update_data.credits)
        from app.services.credit_service import CreditService
        CreditService._write_log(db, user.id, user.credits - old_val, user.credits, "管理員手動調整點數")

    if update_data.credits_delta is not None:
        if not is_admin:
             raise HTTPException(status_code=403, detail="僅限超級管理員修改點數。")
        old_val = user.credits
        user.credits = max(0, user.credits + update_data.credits_delta)
        from app.services.credit_service import CreditService
        CreditService._write_log(db, user.id, user.credits - old_val, user.credits, "管理員調整點數增減")

    if update_data.membership_level is not None:
        if not is_admin:
             raise HTTPException(status_code=403, detail="僅限超級管理員修改會員等級。")
        if update_data.membership_level not in [1, 2, 3]:
            raise HTTPException(status_code=400, detail="無效的會員等級（1-3）。")
        user.membership_level = update_data.membership_level

    if update_data.new_password:
        # 重設密碼，同樣限制長度
        safe_pwd = update_data.new_password.strip()[:72]
        user.hashed_password = get_password_hash(safe_pwd)

    db.commit()
    db.refresh(user)
    return {"message": "使用者資料已更新", "user": user.to_dict()}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    刪除使用者帳號
    僅限超級管理員，不能刪除自己
    """
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="不能刪除自己的帳號。")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在。")

    # 刪除使用者（相關資料保留，user_id 設為 None）
    db.delete(user)
    db.commit()
    return {"message": f"使用者 {user.email} 已刪除。"}


@router.post("/{user_id}/credits")
async def adjust_credits(
    user_id: str,
    amount: int,
    reason: str = "管理員調整",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """
    快速調整點數 (正數增加，負數扣除)
    僅限超級管理員
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在。")

    old_credits = user.credits
    user.credits = max(0, user.credits + amount)
    
    # 記錄異動
    from app.services.credit_service import CreditService
    CreditService._write_log(db, user.id, user.credits - old_credits, user.credits, reason)
    
    db.commit()

    return {
        "message": f"點數調整完成（原因：{reason}）",
        "old_credits": old_credits,
        "new_credits": user.credits,
        "delta": amount
    }


@router.get("/stats/summary")
async def get_users_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """取得用戶統計數據，供管理後台儀表板使用"""
    total = db.query(func.count(User.id)).scalar()
    super_admins = db.query(func.count(User.id)).filter(User.role == "super_admin").scalar()
    vips = db.query(func.count(User.id)).filter(User.role == "vip").scalar()
    regular_users = db.query(func.count(User.id)).filter(User.role == "user").scalar()

    return {
        "total_users": total,
        "super_admins": super_admins,
        "vip_users": vips,
        "regular_users": regular_users,
    }
